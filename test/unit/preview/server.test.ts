import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request as httpRequest } from 'node:http';
import type { Server, IncomingHttpHeaders } from 'node:http';
import { createPreviewServer } from '../../../src/preview/server.js';

let server: Server | undefined;
let port: number;

const HOST = '127.0.0.1';

beforeAll(async () => {
  server = await createPreviewServer({
    port: 0,
    host: HOST,
  });
  const addr = server.address();
  if (addr && typeof addr === 'object') {
    port = addr.port;
  } else {
    throw new Error('Failed to get server port');
  }
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function request(method: string, path: string, body?: unknown): Promise<{ status: number; headers: IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { hostname: HOST, port, path, method, headers: body ? { 'Content-Type': 'application/json' } : undefined },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf-8'),
          });
        });
      },
    );
    req.on('error', reject);
    if (body !== undefined) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('POST /render — 响应格式', () => {
  it('完整 frontmatter 返回 JSON 含所有字段', async () => {
    const md = `---
title: 测试文章
type: article
created: 2026-06-26
cover: cover.png
tags: [AI, 测试]
author: 叶帕奇
source_url: https://example.com
digest: 这是一段摘要
description: 这是一段引言
need_open_comment: true
only_fans_can_comment: false
---

# Hello World

正文内容
`;

    const res = await request('POST', '/render', { content: md });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');

    const data = JSON.parse(res.body);
    expect(data.title).toBe('测试文章');
    expect(data.type).toBe('article');
    expect(data.created).toBe('2026-06-26');
    expect(data.cover).toBe('cover.png');
    expect(data.tags).toEqual(['AI', '测试']);
    expect(data.author).toBe('叶帕奇');
    expect(data.source_url).toBe('https://example.com');
    expect(data.digest).toBe('这是一段摘要');
    expect(data.description).toBe('这是一段引言');
    expect(data.need_open_comment).toBe(true);
    expect(data.only_fans_can_comment).toBe(false);

    expect(data.content).toContain('Hello World');
    expect(data.content).toContain('<h1');
  });

  it('无 frontmatter 返回 JSON 含空字段', async () => {
    const res = await request('POST', '/render', { content: 'Plain text content' });
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.title).toBe('');
    expect(data.content).toContain('Plain text content');
  });

  it('空的 content 返回 400', async () => {
    const res = await request('POST', '/render', { content: '' });
    expect(res.status).toBe(400);
    expect(res.body).toContain('缺少 content');
  });
});

describe('POST /render — 错误处理', () => {
  it('缺少 content 字段返回 400', async () => {
    const res = await request('POST', '/render', {});
    expect(res.status).toBe(400);
    expect(res.body).toContain('缺少 content');
  });

  it('无效 JSON body 返回 400', async () => {
    const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = httpRequest(
        { hostname: HOST, port, path: '/render', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf-8') }));
        },
      );
      req.on('error', reject);
      req.write('not-json');
      req.end();
    });
    expect(res.status).toBe(400);
    expect(res.body).toContain('JSON 解析失败');
  });

  it('content 不是字符串返回 400', async () => {
    const res = await request('POST', '/render', { content: 123 });
    expect(res.status).toBe(400);
    expect(res.body).toContain('缺少 content');
  });
});

describe('POST /render — 前端集成', () => {
  it('响应 JSON 的 content 字段可直接用于 iframe srcdoc', async () => {
    const res = await request('POST', '/render', { content: '# Hello\n\nWorld' });
    const data = JSON.parse(res.body);
    expect(typeof data.content).toBe('string');
    expect(data.content.length).toBeGreaterThan(0);
    expect(data.content).toContain('Hello');
    expect(data.content).toContain('World');
  });
});
