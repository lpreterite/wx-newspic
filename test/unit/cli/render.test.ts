import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockExecSync = vi.fn();
const mockRenderArticle = vi.fn();
const mockExistsSync = vi.fn();

vi.mock('node:fs', () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  existsSync: mockExistsSync,
}));

vi.mock('node:child_process', () => ({
  execSync: mockExecSync,
}));

vi.mock('../../../src/renderer/index.js', () => ({
  renderArticle: mockRenderArticle,
}));

describe('render command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync.mockReturnValue('# Hello\n\nWorld');
    mockRenderArticle.mockResolvedValue({
      content: '<h1>Hello</h1>\n<p>World</p>',
      title: 'Hello',
    });
  });

  it('reads markdown file and writes HTML output', async () => {
    const { handleRender } = await import('../../../src/cli/render.js');

    await handleRender({ md: '/tmp/article.md' });

    expect(mockReadFileSync).toHaveBeenCalledWith('/tmp/article.md', 'utf-8');
    expect(mockRenderArticle).toHaveBeenCalledWith({
      content: '# Hello\n\nWorld',
      theme: 'default',
      hlTheme: undefined,
    });
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/article\.html$/),
      '<h1>Hello</h1>\n<p>World</p>',
      'utf-8',
    );
  });

  it('supports custom output path', async () => {
    const { handleRender } = await import('../../../src/cli/render.js');

    await handleRender({ md: '/tmp/article.md', output: '/tmp/preview.html' });

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      '/tmp/preview.html',
      expect.any(String),
      'utf-8',
    );
  });

  it('supports custom theme', async () => {
    const { handleRender } = await import('../../../src/cli/render.js');

    await handleRender({
      md: '/tmp/article.md',
      theme: 'orangeheart',
      hlTheme: 'solarized-light',
    });

    expect(mockRenderArticle).toHaveBeenCalledWith({
      content: '# Hello\n\nWorld',
      theme: 'orangeheart',
      hlTheme: 'solarized-light',
    });
  });

  it('opens browser with --open flag', async () => {
    const { handleRender } = await import('../../../src/cli/render.js');

    await handleRender({ md: '/tmp/article.md', open: 'true' });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('open'),
    );
  });

  it('does not open browser without --open', async () => {
    const { handleRender } = await import('../../../src/cli/render.js');

    await handleRender({ md: '/tmp/article.md' });

    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('supports --theme-file option', async () => {
    mockExistsSync.mockReturnValue(true);
    const { handleRender } = await import('../../../src/cli/render.js');

    await handleRender({
      md: '/tmp/article.md',
      theme: 'mytheme',
      themeFile: '/tmp/mytheme.css',
    });

    expect(mockRenderArticle).toHaveBeenCalledWith({
      content: '# Hello\n\nWorld',
      theme: 'mytheme',
      hlTheme: undefined,
      themeFile: '/tmp/mytheme.css',
    });
  });

  it('validates theme file existence', async () => {
    mockExistsSync.mockReturnValue(false);
    const { handleRender } = await import('../../../src/cli/render.js');

    await expect(handleRender({
      md: '/tmp/article.md',
      themeFile: '/tmp/nonexistent.css',
    })).rejects.toThrow();
  });
});
