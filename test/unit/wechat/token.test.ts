import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenManager } from '../../../src/wechat/token.js';
import { WechatClient } from '../../../src/wechat/client.js';

function createMockClient(fetchFn: typeof globalThis.fetch): WechatClient {
  return new WechatClient({ timeout: 5000, fetch: fetchFn });
}

function mockJsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(data) } as Response;
}

describe('TokenManager', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  describe('getToken', () => {
    it('缓存有效时应直接返回缓存的 token', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ access_token: 'cached_token', expires_in: 7200 }));
      const client = createMockClient(mockFetch);
      const tokenManager = new TokenManager({ appId: 'wx_test', appSecret: 'secret', client });

      const token1 = await tokenManager.getToken();
      expect(token1).toBe('cached_token');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const token2 = await tokenManager.getToken();
      expect(token2).toBe('cached_token');
      expect(mockFetch).toHaveBeenCalledTimes(1); // 无新请求
    });

    it('token 即将过期时应自动刷新', async () => {
      vi.useFakeTimers();
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'expiring', expires_in: 60 }))
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'refreshed', expires_in: 7200 }));

      const client = createMockClient(mockFetch);
      const tokenManager = new TokenManager({ appId: 'wx_test', appSecret: 'secret', client });

      const token1 = await tokenManager.getToken();
      expect(token1).toBe('expiring');

      // 快进 56 秒（还剩 4 秒 < 5 分钟阈值）
      vi.advanceTimersByTime(56_000);

      const token2 = await tokenManager.getToken();
      expect(token2).toBe('refreshed');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('token 过期时应自动刷新', async () => {
      vi.useFakeTimers();
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'old', expires_in: 7200 }))
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'new', expires_in: 7200 }));

      const client = createMockClient(mockFetch);
      const tokenManager = new TokenManager({ appId: 'wx_test', appSecret: 'secret', client });

      await tokenManager.getToken();
      vi.advanceTimersByTime(7200 * 1000 + 1000); // 过期后 +1 秒

      const token = await tokenManager.getToken();
      expect(token).toBe('new');

      vi.useRealTimers();
    });
  });

  describe('并发安全', () => {
    it('多个并发请求应共享同一次刷新', async () => {
      // 使用真实定时器（不需要 vi.useFakeTimers）
      let callCount = 0;
      mockFetch.mockImplementation(async () => {
        callCount++;
        await new Promise(r => setTimeout(r, 10));
        return mockJsonResponse({ access_token: `token_${callCount}`, expires_in: 7200 });
      });

      const client = createMockClient(mockFetch);
      const tokenManager = new TokenManager({ appId: 'wx_test', appSecret: 'secret', client });

      const [t1, t2, t3] = await Promise.all([
        tokenManager.getToken(),
        tokenManager.getToken(),
        tokenManager.getToken(),
      ]);

      expect(t1).toBe(t2);
      expect(t2).toBe(t3);
      expect(callCount).toBe(1);
    });
  });

  describe('refreshToken', () => {
    it('应返回新的 access_token，请求 URL 包含正确参数', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ access_token: 'fresh_token', expires_in: 7200 }));
      const client = createMockClient(mockFetch);
      const tokenManager = new TokenManager({ appId: 'wx_test', appSecret: 'secret', client });

      const token = await tokenManager.refreshToken();
      expect(token).toBe('fresh_token');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('grant_type=client_credential');
      expect(url).toContain('appid=wx_test');
      expect(url).toContain('secret=secret');
    });
  });

  describe('定时刷新', () => {
    it('获取 token 后应安排定时刷新', async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValue(mockJsonResponse({ access_token: 'token', expires_in: 7200 }));
      const client = createMockClient(mockFetch);
      const tokenManager = new TokenManager({ appId: 'wx_test', appSecret: 'secret', client });

      await tokenManager.getToken();

      // 快进到过期前 5 分钟（定时器在 expires_at - now - 300 秒后触发）
      // expires_at = now + 7200，所以 delay = 7200 - 300 = 6900s
      vi.advanceTimersByTime(6900 * 1000);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('stopAutoRefresh 应停止定时器', async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValue(mockJsonResponse({ access_token: 'token', expires_in: 7200 }));
      const client = createMockClient(mockFetch);
      const tokenManager = new TokenManager({ appId: 'wx_test', appSecret: 'secret', client });

      await tokenManager.getToken();
      tokenManager.stopAutoRefresh();

      vi.advanceTimersByTime(6900 * 1000);
      expect(mockFetch).toHaveBeenCalledTimes(1); // 没有自动刷新
      vi.useRealTimers();
    });
  });

  describe('getTokenInfo', () => {
    it('未获取前应返回 null', () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ access_token: 'token', expires_in: 7200 }));
      const client = createMockClient(mockFetch);
      const tokenManager = new TokenManager({ appId: 'wx_test', appSecret: 'secret', client });

      expect(tokenManager.getTokenInfo()).toBeNull();
    });

    it('获取后应返回 token 信息', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ access_token: 'test_token', expires_in: 7200 }));
      const client = createMockClient(mockFetch);
      const tokenManager = new TokenManager({ appId: 'wx_test', appSecret: 'secret', client });

      await tokenManager.getToken();

      const info = tokenManager.getTokenInfo();
      expect(info).not.toBeNull();
      expect(info!.access_token).toBe('test_token');
      expect(info!.expires_in).toBe(7200);
      expect(info!.expires_at).toBeGreaterThan(Date.now() / 1000);
    });
  });
});
