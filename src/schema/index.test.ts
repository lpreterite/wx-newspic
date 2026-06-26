import { describe, it, expect } from 'vitest';
import { parseFrontmatter, FrontmatterSchema } from './frontmatter.js';

describe('parseFrontmatter', () => {
  it('parses minimal valid frontmatter', () => {
    const md = `---
title: 测试文章
type: article
created: 2026-06-25
cover: assets/cover.png
---

# 正文内容`;

    const result = parseFrontmatter(md);
    expect(result.frontmatter.title).toBe('测试文章');
    expect(result.frontmatter.type).toBe('article');
    expect(result.frontmatter.created).toBe('2026-06-25');
    expect(result.frontmatter.cover).toBe('assets/cover.png');
    expect(result.content.trim()).toBe('# 正文内容');
  });

  it('parses newspic type without cover', () => {
    const md = `---
title: 图片消息
type: newspic
created: 2026-06-25
---

# 正文`;

    const result = parseFrontmatter(md);
    expect(result.frontmatter.title).toBe('图片消息');
    expect(result.frontmatter.type).toBe('newspic');
    expect(result.frontmatter.cover).toBeUndefined();
  });

  it('strict mode: throws when article type has no cover', () => {
    const md = `---
title: 无封面
type: article
created: 2026-06-25
---

Body`;

    expect(() => parseFrontmatter(md)).toThrow();
  });

  it('strict mode: throws on missing required fields', () => {
    const md = '---\n---\n\nBody';

    expect(() => parseFrontmatter(md)).toThrow();
  });

  it('loose mode: returns warnings on invalid data', () => {
    const md = `---
title: 测试
type: article
created: not-a-date
cover: cover.png
---

Body`;

    const result = parseFrontmatter(md, { strict: false });
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThan(0);
    expect(result.warnings![0]).toContain('created');
  });

  it('loose mode: defaults title/type/created on missing fields', () => {
    const md = '---\n---\n\nBody';

    const result = parseFrontmatter(md, { strict: false });
    expect(result.frontmatter.title).toBe('');
    expect(result.frontmatter.type).toBe('article');
    expect(result.frontmatter.created).toBe('');
  });

  it('parses all optional fields', () => {
    const md = `---
title: 完整
type: article
created: 2026-06-25
cover: assets/cover.png
tags: [标签1, 标签2]
status: draft
images:
  - assets/img1.png
  - assets/img2.png
author: 作者
digest: 摘要
description: 引言
source_url: https://example.com
need_open_comment: true
only_fans_can_comment: false
word_count: 100
---

Body`;

    const result = parseFrontmatter(md);
    expect(result.frontmatter.tags).toEqual(['标签1', '标签2']);
    expect(result.frontmatter.status).toBe('draft');
    expect(result.frontmatter.images).toEqual(['assets/img1.png', 'assets/img2.png']);
    expect(result.frontmatter.author).toBe('作者');
    expect(result.frontmatter.digest).toBe('摘要');
    expect(result.frontmatter.description).toBe('引言');
    expect(result.frontmatter.source_url).toBe('https://example.com');
    expect(result.frontmatter.need_open_comment).toBe(true);
    expect(result.frontmatter.only_fans_can_comment).toBe(false);
    expect(result.frontmatter.word_count).toBe(100);
  });

  it('handles content without frontmatter', () => {
    const result = parseFrontmatter('Just plain text', { strict: false });
    expect(result.frontmatter.title).toBe('');
    expect(result.content).toBe('Just plain text');
  });
});

describe('FrontmatterSchema', () => {
  it('validates created date format', () => {
    expect(() => FrontmatterSchema.parse({
      title: '测试',
      type: 'article',
      created: 'invalid-date',
      cover: 'cover.png',
    })).toThrow('创建日期');
  });

  it('validates type enum', () => {
    expect(() => FrontmatterSchema.parse({
      title: '测试',
      type: 'invalid',
      created: '2026-06-25',
      cover: 'cover.png',
    })).toThrow();
  });

  it('validates status enum', () => {
    expect(() => FrontmatterSchema.parse({
      title: '测试',
      type: 'article',
      created: '2026-06-25',
      cover: 'cover.png',
      status: 'invalid',
    })).toThrow();
  });
});
