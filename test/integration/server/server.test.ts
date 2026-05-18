import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../../src/server/index.js';
import type { ServerOptions } from '../../../src/config/server.js';

const TEST_OPTIONS: ServerOptions = {
  port: 0, // 随机端口
  host: '127.0.0.1',
  apiKey: 'test-api-key-123',
  appId: 'wx_test_app_id',
  appSecret: 'test_app_secret',
  logLevel: 'silent',
};

let app: Awaited<ReturnType<typeof createServer>>['app'];
let url: string;

beforeAll(async () => {
  const server = await createServer(TEST_OPTIONS);
  app = server.app;
  url = `http://127.0.0.1:${server.app.server.address()}`.replace('http://', 'http://');
  // Fastify returns address info differently
  const addr = server.app.server.address();
  if (typeof addr === 'object' && addr) {
    url = `http://127.0.0.1:${addr.port}`;
  }
});

afterAll(async () => {
  await app.close();
});

/**
 * 注入 HTTP 请求到 Fastify 实例
 */
function inject(
  method: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string> } = {},
) {
  return app.inject({
    method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: path,
    ...(options.body ? { body: options.body } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
  });
}

describe('认证中间件', () => {
  it('缺少 Authorization 头应返回 401', async () => {
    const res = await inject('POST', '/api/wechat/token');
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTH_FAILED');
  });

  it('错误的 API Key 应返回 401', async () => {
    const res = await inject('POST', '/api/wechat/token', {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTH_FAILED');
  });

  it('正确的 API Key 应通过认证', async () => {
    const res = await inject('POST', '/api/wechat/token', {
      headers: { Authorization: 'Bearer test-api-key-123' },
    });
    // 认证通过，但后续会因微信 API 调用失败而返回 502
    // 重点是认证已过（不返回 401）
    expect(res.statusCode).not.toBe(401);
  });

  it('健康检查路径无需认证', async () => {
    const res = await inject('GET', '/api/health');
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
  });
});

describe('POST /api/wechat/token', () => {
  it('认证正确时应请求微信 API（会因无网络返回 502）', async () => {
    const res = await inject('POST', '/api/wechat/token', {
      headers: { Authorization: 'Bearer test-api-key-123' },
    });
    // 没有微信 API 响应，预期 502
    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});

describe('POST /api/wechat/upload-image', () => {
  it('缺少文件应返回 400', async () => {
    const res = await inject('POST', '/api/wechat/upload-image', {
      headers: { Authorization: 'Bearer test-api-key-123' },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/wechat/create-draft', () => {
  it('缺少标题应返回 400', async () => {
    const res = await inject('POST', '/api/wechat/create-draft', {
      headers: {
        Authorization: 'Bearer test-api-key-123',
        'Content-Type': 'application/json',
      },
      body: {},
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('标题超过 32 字符应返回 400', async () => {
    const res = await inject('POST', '/api/wechat/create-draft', {
      headers: {
        Authorization: 'Bearer test-api-key-123',
        'Content-Type': 'application/json',
      },
      body: { title: '超长标题'.repeat(10), image_list: [{ image_media_id: 'mid' }] },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('缺少 image_list 应返回 400', async () => {
    const res = await inject('POST', '/api/wechat/create-draft', {
      headers: {
        Authorization: 'Bearer test-api-key-123',
        'Content-Type': 'application/json',
      },
      body: { title: '测试标题' },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('正确参数应通过校验（会因无微信 API 返回 502）', async () => {
    const res = await inject('POST', '/api/wechat/create-draft', {
      headers: {
        Authorization: 'Bearer test-api-key-123',
        'Content-Type': 'application/json',
      },
      body: {
        title: '测试文章',
        content: '正文内容',
        image_list: [{ image_media_id: 'test_media_id' }],
      },
    });
    // 会先尝试获取 token（无网络 → 502）
    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});

describe('GET /api/wechat/drafts', () => {
  it('应通过认证（会因无微信 API 返回 502）', async () => {
    const res = await inject('GET', '/api/wechat/drafts', {
      headers: { Authorization: 'Bearer test-api-key-123' },
    });
    // 会先尝试获取 token（无网络 → 502）
    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});
