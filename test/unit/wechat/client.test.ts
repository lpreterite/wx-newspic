import { describe, it, expect, vi } from 'vitest';
import { WechatClient, WechatClientError } from '../../../src/wechat/client.js';

/**
 * 创建一个模拟的 fetch 响应
 */
function mockJsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(data) } as Response;
}

/**
 * 创建一个模拟的 fetch 函数，按顺序返回给定的响应
 */
function createMockFetch(...responses: Response[]) {
  const mockFn = vi.fn();
  responses.forEach((r) => mockFn.mockResolvedValueOnce(r));
  return mockFn;
}

describe('WechatClient', () => {
  describe('成功请求', () => {
    it('应返回 JSON 数据', async () => {
      const mockFetch = createMockFetch(mockJsonResponse({ access_token: 'abc123', expires_in: 7200 }));
      const client = new WechatClient({ timeout: 5000, fetch: mockFetch });

      const result = await client.request('/cgi-bin/token');

      expect(result).toEqual({ access_token: 'abc123', expires_in: 7200 });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('errcode=0 也应视为成功', async () => {
      const mockFetch = createMockFetch(mockJsonResponse({ errcode: 0, errmsg: 'ok' }));
      const client = new WechatClient({ timeout: 5000, fetch: mockFetch });

      const result = await client.request('/test');
      expect(result).toEqual({ errcode: 0, errmsg: 'ok' });
    });
  });

  describe('错误码映射', () => {
    const testCases: Array<{ errcode: number; expectedCode: string; retryable: boolean }> = [
      { errcode: -1,     expectedCode: 'WECHAT_SYSTEM_BUSY',   retryable: true  },
      { errcode: 40001,  expectedCode: 'TOKEN_INVALID',        retryable: true  },
      { errcode: 40005,  expectedCode: 'INVALID_IMAGE_FORMAT', retryable: false },
      { errcode: 40009,  expectedCode: 'IMAGE_TOO_LARGE',      retryable: false },
      { errcode: 40013,  expectedCode: 'INVALID_APP_ID',       retryable: false },
      { errcode: 41005,  expectedCode: 'MISSING_MEDIA_DATA',   retryable: false },
      { errcode: 45001,  expectedCode: 'TOO_MANY_IMAGES',      retryable: false },
      { errcode: 45009,  expectedCode: 'RATE_LIMITED',         retryable: true  },
      { errcode: 99999,  expectedCode: 'WECHAT_API_ERROR',     retryable: false },
    ];

    testCases.forEach(({ errcode, expectedCode }) => {
      it(`应将 errcode ${errcode} 映射为 ${expectedCode}`, async () => {
        const mockFetch = createMockFetch(mockJsonResponse({ errcode, errmsg: `error ${errcode}` }));
        const client = new WechatClient({ timeout: 5000, fetch: mockFetch });

        // retryCount=0 保证不重试，所有错误都立即抛出
        const err = await client.request('/test', {}, 0).catch(e => e);
        expect(err).toBeInstanceOf(WechatClientError);
        expect((err as WechatClientError).code).toBe(expectedCode);
      });
    });
  });

  describe('重试机制', () => {
    it('系统繁忙（-1）重试后成功', async () => {
      const mockFetch = createMockFetch(
        mockJsonResponse({ errcode: -1, errmsg: 'system busy' }),
        mockJsonResponse({ errcode: -1, errmsg: 'system busy' }),
        mockJsonResponse({ access_token: 'abc' }),
      );
      const client = new WechatClient({ timeout: 5000, fetch: mockFetch });

      const result = await client.request('/test', {}, 3);
      expect(result).toEqual({ access_token: 'abc' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('重试耗尽后应抛出错误', async () => {
      const mockFetch = createMockFetch(
        mockJsonResponse({ errcode: -1, errmsg: 'system busy' }),
      );
      const client = new WechatClient({ timeout: 5000, fetch: mockFetch });

      // retryCount=0 表示不重试
      const err = await client.request('/test', {}, 0).catch(e => e);
      expect(err).toBeInstanceOf(WechatClientError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('不可重试的错误不应重试', async () => {
      const mockFetch = createMockFetch(mockJsonResponse({ errcode: 40005, errmsg: 'invalid file type' }));
      const client = new WechatClient({ timeout: 5000, fetch: mockFetch });

      const err = await client.request('/test', {}, 3).catch(e => e);
      expect(err).toBeInstanceOf(WechatClientError);
      expect((err as WechatClientError).code).toBe('INVALID_IMAGE_FORMAT');
      expect(mockFetch).toHaveBeenCalledTimes(1); // 无重试
    });
  });

  describe('网络错误', () => {
    it('网络异常应重试然后成功', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'abc' }));
      const client = new WechatClient({ timeout: 5000, fetch: mockFetch });

      const result = await client.request('/test', {}, 2);
      expect(result).toEqual({ access_token: 'abc' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('请求体格式', () => {
    it('JSON 请求应设置 Content-Type', async () => {
      const mockFetch = createMockFetch(mockJsonResponse({ errcode: 0, errmsg: 'ok' }));
      const client = new WechatClient({ timeout: 5000, fetch: mockFetch });

      await client.request('/test', { method: 'POST', body: { title: 'test' } });

      const callArgs = mockFetch.mock.calls[0];
      const init = callArgs[1] as RequestInit;
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect(init.body).toBe(JSON.stringify({ title: 'test' }));
    });

    it('formData 请求不应设置 Content-Type', async () => {
      const mockFetch = createMockFetch(mockJsonResponse({ errcode: 0, errmsg: 'ok' }));
      const client = new WechatClient({ timeout: 5000, fetch: mockFetch });
      const form = new FormData();
      form.append('test', 'value');

      await client.request('/test', { method: 'POST', formData: form });

      const callArgs = mockFetch.mock.calls[0];
      const init = callArgs[1] as RequestInit;
      expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
      expect(init.body).toBe(form);
    });
  });
});
