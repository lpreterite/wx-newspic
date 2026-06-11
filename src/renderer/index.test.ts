import { describe, it, expect } from 'vitest';
import { renderArticle } from './index.js';

describe('renderArticle', () => {
  it('renders heading and paragraph', async () => {
    const result = await renderArticle({
      content: '# Hello\n\nThis is a paragraph.',
    });

    expect(result.content).toContain('Hello');
    expect(result.content).toContain('paragraph');
    expect(result.content).toContain('style=');
  });

  it('extracts title from frontmatter', async () => {
    const result = await renderArticle({
      content: '---\ntitle: My Title\n---\n\n# Not this title\n\nBody',
    });

    expect(result.title).toBe('My Title');
    expect(result.content).toContain('Not this title');
  });

  it('handles empty content', async () => {
    const result = await renderArticle({ content: '' });

    expect(result.content).toBe('');
    expect(result.title).toBe('');
  });

  it('handles content without frontmatter', async () => {
    const result = await renderArticle({ content: 'Just plain text content' });

    expect(result.title).toBe('');
    expect(result.content).toContain('plain text content');
  });

  it('extracts cover from frontmatter', async () => {
    const result = await renderArticle({
      content: '---\ntitle: With Cover\ncover: https://example.com/cover.jpg\n---\n\nBody',
    });

    expect(result.cover).toBe('https://example.com/cover.jpg');
  });

  it('renders with code block', async () => {
    const result = await renderArticle({
      content: '# Code\n\n```js\nconsole.log("hello");\n```',
    });

    expect(result.content).toContain('hello');
    expect(result.content).toContain('code');
  });

  it('supports custom theme', async () => {
    const result = await renderArticle({
      content: '# Hello\n\nWorld',
      theme: 'default',
    });

    expect(result.content).toContain('style=');
  });

  it('renders image tag', async () => {
    const result = await renderArticle({
      content: '# Img\n\n![alt](https://example.com/img.png)',
    });

    expect(result.content).toContain('<img');
    expect(result.content).toContain('src="https://example.com/img.png"');
  });
});
