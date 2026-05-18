import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftManager } from '../../../src/wechat/draft.js';
import type { DraftArticle } from '../../../src/wechat/draft.js';
import { WechatClient, WechatClientError } from '../../../src/wechat/client.js';

function mockJsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(data) } as Response;
}

function createClient(mockFetch: ReturnType<typeof vi.fn>): WechatClient {
  return new WechatClient({ timeout: 5000, fetch: mockFetch });
}

const sampleArticle: DraftArticle = {
  title: '测试文章',
  thumb_media_id: 'thumb_media_123',
  author: '测试作者',
  digest: '这是一篇测试文章',
  content: '<p>正文内容</p>',
  content_source_url: 'https://example.com/article',
  need_open_comment: 1,
  only_fans_can_comment: 0,
};

describe('DraftManager', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  describe('createDraft', () => {
    it('应返回 DraftResult 包含 media_id 和 created_at', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ media_id: 'draft_media_456' }));
      const manager = new DraftManager({ client: createClient(mockFetch) });

      const result = await manager.createDraft([sampleArticle], 'test_token');

      expect(result.media_id).toBe('draft_media_456');
      expect(result.created_at).toBeDefined();
      expect(result.created_at).toMatch(/^\d{10}$/); // unix timestamp
    });

    it('应 POST 到正确的 API 路径', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ media_id: 'm' }));
      const manager = new DraftManager({ client: createClient(mockFetch) });

      await manager.createDraft([sampleArticle], 'test_token');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/cgi-bin/draft/add');
      expect(url).toContain('access_token=test_token');
    });

    it('请求体应包含 articles 数组', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ media_id: 'm' }));
      const manager = new DraftManager({ client: createClient(mockFetch) });

      await manager.createDraft([sampleArticle, { title: '第二篇', thumb_media_id: 't2' }], 'token');

      const init = mockFetch.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(init.body as string);

      expect(body.articles).toHaveLength(2);
      expect(body.articles[0].title).toBe('测试文章');
      expect(body.articles[1].title).toBe('第二篇');
    });

    it('请求方法应为 POST', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ media_id: 'm' }));
      const manager = new DraftManager({ client: createClient(mockFetch) });

      await manager.createDraft([sampleArticle], 'token');

      const init = mockFetch.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe('POST');
    });

    it('API 返回错误时应抛出 WechatClientError', async () => {
      // 使用不可重试的错误码（40005），避免超时
      mockFetch.mockResolvedValue(mockJsonResponse({ errcode: 41005, errmsg: 'missing media data' }));
      const manager = new DraftManager({ client: createClient(mockFetch) });

      const err = await manager.createDraft([sampleArticle], 'bad_token').catch(e => e);
      expect(err).toBeInstanceOf(WechatClientError);
      expect(err.code).toBe('MISSING_MEDIA_DATA');
    });

    it('应该能创建单篇文章的草稿', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ media_id: 'single_media' }));
      const manager = new DraftManager({ client: createClient(mockFetch) });

      const result = await manager.createDraft([sampleArticle], 'token');
      expect(result.media_id).toBe('single_media');
    });
  });
});
