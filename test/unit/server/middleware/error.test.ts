import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '../../../../src/server/middleware/error.js';
import { WechatClientError } from '../../../../src/wechat/client.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

function createReplyMock() {
  const status = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();
  return { status, send } as unknown as FastifyReply & { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };
}

function createRequestMock(): FastifyRequest {
  return {} as FastifyRequest;
}

describe('errorHandler', () => {
  describe('WechatClientError', () => {
    it('AUTH_FAILED 应返回 401', () => {
      const reply = createReplyMock();
      const error = new WechatClientError('AUTH_FAILED', 'API Key 认证失败');

      errorHandler(error, createRequestMock(), reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: { code: 'AUTH_FAILED', message: 'API Key 认证失败' },
      });
    });

    it('VALIDATION_ERROR 应返回 400', () => {
      const reply = createReplyMock();
      const error = new WechatClientError('VALIDATION_ERROR', '标题不能为空');

      errorHandler(error, createRequestMock(), reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '标题不能为空' },
      });
    });

    it('WECHAT_API_ERROR 应返回 502', () => {
      const reply = createReplyMock();
      const error = new WechatClientError('WECHAT_API_ERROR', '微信 API 调用失败', 40013, { errcode: 40013, errmsg: 'invalid appid' });

      errorHandler(error, createRequestMock(), reply);

      expect(reply.status).toHaveBeenCalledWith(502);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'WECHAT_API_ERROR',
          message: '微信 API 调用失败',
          detail: { errcode: 40013, errmsg: 'invalid appid' },
        },
      });
    });

    it('TOKEN_INVALID 应返回 502', () => {
      const reply = createReplyMock();
      const error = new WechatClientError('TOKEN_INVALID', 'access_token 无效或过期');

      errorHandler(error, createRequestMock(), reply);

      expect(reply.status).toHaveBeenCalledWith(502);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'access_token 无效或过期' },
      });
    });
  });

  describe('未知错误', () => {
    it('未知错误应返回 500', () => {
      const reply = createReplyMock();
      const error = new Error('未知错误');

      errorHandler(error, createRequestMock(), reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
      });
    });
  });
});
