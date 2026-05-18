import { describe, it, expect } from 'vitest';
import { createAuthMiddleware } from '../../../../src/server/middleware/auth.js';
import { WechatClientError } from '../../../../src/wechat/client.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * 创建模拟的 Fastify request 对象
 */
function mockRequest(headers: Record<string, string | undefined>): FastifyRequest {
  return {
    headers,
    // 只提供测试需要的属性
  } as unknown as FastifyRequest;
}

function mockReply(): FastifyReply {
  return {} as FastifyReply;
}

describe('createAuthMiddleware', () => {
  const authMiddleware = createAuthMiddleware('my-secret-key');

  it('缺少 Authorization 头应抛出 AUTH_FAILED', async () => {
    const req = mockRequest({});
    await expect(authMiddleware(req, mockReply())).rejects.toThrow(WechatClientError);
    await expect(authMiddleware(req, mockReply())).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    });
  });

  it('Authorization 格式错误应抛出 AUTH_FAILED', async () => {
    const req = mockRequest({ authorization: 'Basic mykey' });
    await expect(authMiddleware(req, mockReply())).rejects.toThrow(WechatClientError);
    await expect(authMiddleware(req, mockReply())).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    });
  });

  it('错误的 API Key 应抛出 AUTH_FAILED', async () => {
    const req = mockRequest({ authorization: 'Bearer wrong-key' });
    await expect(authMiddleware(req, mockReply())).rejects.toThrow(WechatClientError);
    await expect(authMiddleware(req, mockReply())).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    });
  });

  it('正确的 API Key 应通过验证', async () => {
    const req = mockRequest({ authorization: 'Bearer my-secret-key' });
    await expect(authMiddleware(req, mockReply())).resolves.toBeUndefined();
  });
});
