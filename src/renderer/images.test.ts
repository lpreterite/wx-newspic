import { describe, it, expect } from 'vitest';
import { extractImageSrcs, replaceImageSrcs, extractFirstImage } from './images.js';

describe('extractImageSrcs', () => {
  it('extracts single image src', () => {
    const html = '<img src="https://example.com/img.png" alt="">';
    expect(extractImageSrcs(html)).toEqual(['https://example.com/img.png']);
  });

  it('extracts multiple images', () => {
    const html = '<img src="a.jpg"><img src="b.jpg">';
    expect(extractImageSrcs(html)).toEqual(['a.jpg', 'b.jpg']);
  });

  it('returns empty array for HTML without images', () => {
    expect(extractImageSrcs('<p>text</p>')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(extractImageSrcs('')).toEqual([]);
  });

  it('handles self-closing img tags', () => {
    const html = '<img src="photo.webp"/>';
    expect(extractImageSrcs(html)).toEqual(['photo.webp']);
  });
});

describe('replaceImageSrcs', () => {
  it('replaces src URL with media_id URL', () => {
    const html = '<img src="https://example.com/a.jpg">';
    const result = replaceImageSrcs(html, { 'https://example.com/a.jpg': 'https://mmbiz.qpic.cn/media_id_123' });
    expect(result).toBe('<img src="https://mmbiz.qpic.cn/media_id_123">');
  });

  it('replaces multiple different srcs', () => {
    const html = '<img src="a.jpg"><img src="b.jpg">';
    const result = replaceImageSrcs(html, { 'a.jpg': 'https://mmbiz.qpic.cn/id1', 'b.jpg': 'https://mmbiz.qpic.cn/id2' });
    expect(result).toBe('<img src="https://mmbiz.qpic.cn/id1"><img src="https://mmbiz.qpic.cn/id2">');
  });

  it('replaces same src appearing multiple times', () => {
    const html = '<img src="a.jpg"><img src="a.jpg">';
    const result = replaceImageSrcs(html, { 'a.jpg': 'https://mmbiz.qpic.cn/id1' });
    expect(result).toBe('<img src="https://mmbiz.qpic.cn/id1"><img src="https://mmbiz.qpic.cn/id1">');
  });

  it('returns original HTML when no mapping matches', () => {
    const html = '<img src="a.jpg">';
    const result = replaceImageSrcs(html, { 'b.jpg': 'id' });
    expect(result).toBe(html);
  });

  it('handles empty HTML', () => {
    expect(replaceImageSrcs('', {})).toBe('');
  });
});

describe('extractFirstImage', () => {
  it('returns first image src', () => {
    const html = '<img src="first.jpg"><img src="second.jpg">';
    expect(extractFirstImage(html)).toBe('first.jpg');
  });

  it('returns undefined when no images', () => {
    expect(extractFirstImage('<p>text</p>')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(extractFirstImage('')).toBeUndefined();
  });
});
