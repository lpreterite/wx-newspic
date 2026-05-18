import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { statSync } from 'node:fs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MaterialManager } from '../../../src/wechat/material.js';
import { WechatClient, WechatClientError } from '../../../src/wechat/client.js';

// 包装 fs.statSync 为 vi.fn，使其可被 mock（ESM 兼容）
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  const actualStatSync = actual.statSync;
  return {
    ...actual,
    statSync: vi.fn((...args: Parameters<typeof actual.statSync>) => actualStatSync(...args)),
  };
});

const FIXTURE_IMAGE = new URL('../../fixtures/test-image.png', import.meta.url).pathname;

function mockJsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(data) } as Response;
}

function createClient(mockFetch: ReturnType<typeof vi.fn>): WechatClient {
  return new WechatClient({ timeout: 5000, fetch: mockFetch });
}

describe('MaterialManager', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let tmpDir: string;

  beforeEach(() => {
    mockFetch = vi.fn();
    tmpDir = mkdtempSync(join(tmpdir(), 'material-test-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('uploadImage', () => {
    it('文件不存在时应抛出 FILE_NOT_FOUND', async () => {
      const manager = new MaterialManager({ client: createClient(mockFetch) });

      const err = await manager.uploadImage('/tmp/nonexistent/image.png', 'token').catch(e => e);
      expect(err).toBeInstanceOf(WechatClientError);
      expect(err.code).toBe('FILE_NOT_FOUND');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('不支持的格式时应抛出 INVALID_IMAGE_FORMAT', async () => {
      // 创建一个存在的文件，但扩展名不合法
      const bmpPath = join(tmpDir, 'test.bmp');
      writeFileSync(bmpPath, Buffer.alloc(100));

      const manager = new MaterialManager({ client: createClient(mockFetch) });
      const err = await manager.uploadImage(bmpPath, 'token').catch(e => e);
      expect(err).toBeInstanceOf(WechatClientError);
      expect(err.code).toBe('INVALID_IMAGE_FORMAT');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('图片超出大小时应抛出 IMAGE_TOO_LARGE', async () => {
      const largePath = join(tmpDir, 'large.png');
      writeFileSync(largePath, Buffer.alloc(100));

      // mock statSync 返回超大尺寸
      (statSync as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
        if (path === largePath) return { size: 11 * 1024 * 1024, isFile: () => true } as ReturnType<typeof statSync>;
        return { size: 100, isFile: () => true } as ReturnType<typeof statSync>;
      });

      const manager = new MaterialManager({ client: createClient(mockFetch) });
      const err = await manager.uploadImage(largePath, 'token').catch(e => e);
      expect(err).toBeInstanceOf(WechatClientError);
      expect(err.code).toBe('IMAGE_TOO_LARGE');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('上传成功应返回 UploadResult', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ media_id: 'media123', url: 'https://example.com/img' }));
      const manager = new MaterialManager({ client: createClient(mockFetch) });

      const result = await manager.uploadImage(FIXTURE_IMAGE, 'test_token');

      expect(result).toEqual({
        image_media_id: 'media123',
        url: 'https://example.com/img',
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('请求应包含正确的 URL、方法和 Content-Type', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ media_id: 'm', url: 'u' }));
      const manager = new MaterialManager({ client: createClient(mockFetch) });

      await manager.uploadImage(FIXTURE_IMAGE, 'test_token');

      const callArgs = mockFetch.mock.calls[0];
      const url = callArgs[0] as string;
      const init = callArgs[1] as RequestInit;

      expect(url).toContain('/cgi-bin/material/add_material');
      expect(url).toContain('access_token=test_token');
      expect(url).toContain('type=image');
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>)['Content-Type']).toContain('multipart/form-data');
      expect(init.body).toBeInstanceOf(Buffer);
    });
  });

  describe('uploadImages', () => {
    it('空列表应返回空数组', async () => {
      const manager = new MaterialManager({ client: createClient(mockFetch) });

      const result = await manager.uploadImages([], 'token');
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('超过 20 张时应抛出 TOO_MANY_IMAGES', async () => {
      const paths = Array.from({ length: 21 }, (_, i) => join(tmpDir, `img${i}.png`));
      const manager = new MaterialManager({ client: createClient(mockFetch) });

      const err = await manager.uploadImages(paths, 'token').catch(e => e);
      expect(err).toBeInstanceOf(WechatClientError);
      expect(err.code).toBe('TOO_MANY_IMAGES');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('批量校验失败时不应上传任何图片', async () => {
      const goodPath = join(tmpDir, 'good.png');
      writeFileSync(goodPath, Buffer.alloc(100));

      const paths = [goodPath, '/nonexistent/img.png', goodPath];
      const manager = new MaterialManager({ client: createClient(mockFetch) });

      const err = await manager.uploadImages(paths, 'token').catch(e => e);
      expect(err).toBeInstanceOf(WechatClientError);
      expect(err.code).toBe('FILE_NOT_FOUND');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('应顺序上传并返回所有结果', async () => {
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ media_id: 'm1', url: 'u1' }))
        .mockResolvedValueOnce(mockJsonResponse({ media_id: 'm2', url: 'u2' }));

      const manager = new MaterialManager({ client: createClient(mockFetch) });

      const results = await manager.uploadImages([FIXTURE_IMAGE, FIXTURE_IMAGE], 'token');

      expect(results).toHaveLength(2);
      expect(results[0].image_media_id).toBe('m1');
      expect(results[1].image_media_id).toBe('m2');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
