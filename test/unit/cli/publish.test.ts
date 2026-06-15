import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock 渲染管线
const mockRenderArticle = vi.fn();

vi.mock('../../../src/config/credential.js', () => ({
  getCredential: vi.fn(() => ({ appId: 'test_app_id', appSecret: 'test_app_secret' })),
  getServerConfig: vi.fn(() => ({ serverUrl: '', apiKey: '' })),
}));

vi.mock('../../../src/renderer/index.js', () => ({
  renderArticle: mockRenderArticle,
}));

// Mock 文件系统操作
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => Buffer.from('fake-image-data')),
  writeFileSync: vi.fn(),
  statSync: vi.fn(() => ({ size: 1000 })),
  existsSync: vi.fn(() => true),
}));

// Mock globby
vi.mock('globby', () => ({
  globbySync: vi.fn(),
}));

describe('publish command - parameter validation', () => {
  let processExitSpy: any;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    processExitSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
    consoleLogSpy?.mockRestore();
  });

  describe('validateTitle', () => {
    it('空标题应调用 process.exit', async () => {
      const { validateTitle } = await import('../../../src/cli/publish.js');
      validateTitle('');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('超过 32 字的标题应调用 process.exit', async () => {
      const { validateTitle } = await import('../../../src/cli/publish.js');
      validateTitle('一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十ABCD');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('合法的标题不应退出', async () => {
      const { validateTitle } = await import('../../../src/cli/publish.js');
      validateTitle('正常标题');
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('刚好 32 字的标题应通过', async () => {
      const { validateTitle } = await import('../../../src/cli/publish.js');
      validateTitle('三十二个字的标题在这里测试三十二个字是否');
      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });

  describe('validateContent', () => {
    it('空正文应调用 process.exit', async () => {
      const { validateContent } = await import('../../../src/cli/publish.js');
      validateContent('');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('非空正文不应退出', async () => {
      const { validateContent } = await import('../../../src/cli/publish.js');
      validateContent('这是正文内容');
      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });

  describe('resolveImagePaths', () => {
    it('glob 模式应返回匹配的文件列表并排序', async () => {
      const { globbySync } = await import('globby');
      (globbySync as any).mockImplementation((pattern: string) => {
        if (pattern === './images/*.png') return ['/path/b.png', '/path/a.png'];
        return [];
      });

      const { resolveImagePaths } = await import('../../../src/cli/publish.js');
      const result = resolveImagePaths(['./images/*.png']);

      expect(result).toEqual(['/path/a.png', '/path/b.png']);
      expect(globbySync).toHaveBeenCalledWith('./images/*.png', { onlyFiles: true });
    });

    it('glob 未匹配到文件且路径不存在时应退出', async () => {
      const { globbySync } = await import('globby');
      (globbySync as any).mockReturnValue([]);

      const { statSync } = await import('node:fs');
      (statSync as any).mockImplementation(() => { throw new Error('ENOENT'); });

      const { resolveImagePaths } = await import('../../../src/cli/publish.js');
      resolveImagePaths(['nonexistent.png']);
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('glob 未匹配但单个文件存在时应返回该文件', async () => {
      const { globbySync } = await import('globby');
      (globbySync as any).mockReturnValue([]);

      const { statSync } = await import('node:fs');
      (statSync as any).mockReturnValue({});

      const { resolveImagePaths } = await import('../../../src/cli/publish.js');
      const result = resolveImagePaths(['/path/existing.png']);
      expect(result).toEqual(['/path/existing.png']);
    });

    it('多个 glob 结果应合并并去重排序', async () => {
      const { globbySync } = await import('globby');
      (globbySync as any)
        .mockReturnValueOnce(['/path/c.png'])
        .mockReturnValueOnce(['/path/a.png', '/path/b.png']);

      const { resolveImagePaths } = await import('../../../src/cli/publish.js');
      const result = resolveImagePaths(['./images/*.png', './other/*.png']);
      expect(result).toEqual(['/path/a.png', '/path/b.png', '/path/c.png']);
    });
  });

  describe('validateImages', () => {
    it('空列表应退出', async () => {
      const { validateImages } = await import('../../../src/cli/publish.js');
      validateImages([]);
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('超过 20 张应退出', async () => {
      const { statSync } = await import('node:fs');
      (statSync as any).mockReturnValue({ size: 1000 });
      const mod = await import('../../../src/cli/publish.js');
      const paths = Array.from({ length: 21 }, (_, i) => `/path/img${i}.png`);
      mod.validateImages(paths);
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('不支持的格式应退出', async () => {
      const { statSync } = await import('node:fs');
      (statSync as any).mockReturnValue({ size: 1000 });

      const { validateImages } = await import('../../../src/cli/publish.js');
      validateImages(['/path/image.svg']);
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('合法的图片列表应通过', async () => {
      const { statSync } = await import('node:fs');
      (statSync as any).mockReturnValue({ size: 1000 });

      const { validateImages } = await import('../../../src/cli/publish.js');
      validateImages(['/path/image1.png', '/path/image2.jpg']);
      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });

  describe('executePublish', () => {
    it('缺少 serverUrl 应抛出错误', async () => {
      const { executePublish } = await import('../../../src/cli/publish.js');
      await expect(executePublish({
        title: '测试',
        content: '正文',
        imagePaths: ['/path/img.png'],
        serverUrl: '',
        apiKey: '',
        appId: 'id',
        appSecret: 'secret',
      })).rejects.toThrow('未指定中转服务器地址');
    });

    it('图片上传失败应抛出错误', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          success: false,
          error: { code: 'UPLOAD_FAILED', message: '上传失败' },
        }),
      }));

      const { executePublish } = await import('../../../src/cli/publish.js');
      await expect(executePublish({
        title: '测试',
        content: '正文',
        imagePaths: ['/path/img.png'],
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        appId: 'id',
        appSecret: 'secret',
      })).rejects.toThrow('上传失败');
    });

    it('完整流程应返回 DraftResult', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            success: true,
            data: { image_media_id: 'media_123', url: 'http://mmbiz.qpic.cn/test' },
          }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            success: true,
            data: { media_id: 'draft_456', created_at: '2026-05-18T12:00:00Z' },
          }),
        });

      vi.stubGlobal('fetch', mockFetch);

      const { executePublish } = await import('../../../src/cli/publish.js');
      const result = await executePublish({
        title: '测试标题',
        content: '测试正文',
        imagePaths: ['/path/img1.png'],
        author: '作者',
        digest: '摘要',
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        appId: 'id',
        appSecret: 'secret',
      });

      expect(result.success).toBe(true);
      expect(result.media_id).toBe('draft_456');
      expect(result.created_at).toBe('2026-05-18T12:00:00Z');
    });
  });

  describe('executeNewsPublish', () => {
    it('缺少 serverUrl 应抛出错误', async () => {
      const { executeNewsPublish } = await import('../../../src/cli/publish.js');
      await expect(executeNewsPublish({
        title: '测试',
        content: '<h1>Hello</h1>',
        serverUrl: '',
        apiKey: '',
        appId: 'id',
        appSecret: 'secret',
      })).rejects.toThrow('未指定中转服务器地址');
    });

    it('图片上传和封面处理完整流程', async () => {
      // local.png 上传 + remote.jpg 下载并上传 + 创建草稿 = 4 次 fetch
      const mockFetch = vi.fn()
        // 上传 local.png
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            success: true,
            data: { image_media_id: 'media_001', url: 'http://mmbiz.qpic.cn/001' },
          }),
        })
        // downloadImage 下载远程图片
        .mockResolvedValueOnce({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
        // 上传 remote.jpg
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            success: true,
            data: { image_media_id: 'media_002', url: 'http://mmbiz.qpic.cn/002' },
          }),
        })
        // 创建草稿
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            success: true,
            data: { media_id: 'draft_789', created_at: '2026-05-18T12:00:00Z' },
          }),
        });

      vi.stubGlobal('fetch', mockFetch);

      const { statSync } = await import('node:fs');
      (statSync as any).mockReturnValue({ size: 5000 });

      const { executeNewsPublish } = await import('../../../src/cli/publish.js');
      const result = await executeNewsPublish({
        title: '图文消息',
        content: '<p>正文</p><img src="local.png"><img src="https://example.com/img.jpg">',
        author: '作者',
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        appId: 'id',
        appSecret: 'secret',
      });

      expect(result.success).toBe(true);
      expect(result.media_id).toBe('draft_789');
    });
  });

  describe('handleNewsPublish', () => {
    it('透传 hlTheme 到 renderArticle', async () => {
      mockRenderArticle.mockResolvedValue({
        content: '<h1>Hello</h1>',
        title: 'Hello',
      });

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            success: true,
            data: { media_id: 'draft_999', created_at: '2026-06-15T12:00:00Z' },
          }),
        });

      vi.stubGlobal('fetch', mockFetch);

      const { handlePublish } = await import('../../../src/cli/publish.js');
      await handlePublish({
        type: 'news',
        title: '测试',
        content: '# Hello',
        hlTheme: 'dracula',
        server: 'http://localhost:3000',
        apiKey: 'test-key',
      });

      expect(mockRenderArticle).toHaveBeenCalledWith(
        expect.objectContaining({ hlTheme: 'dracula' }),
      );
    });
  });
});
