import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { WechatClientError } from '../../wechat/client.js';

/**
 * 统一错误处理
 *
 * 捕获所有路由抛出的错误，返回统一 JSON 格式：
 * { success: false, error: { code, message, detail? } }
 */
export function errorHandler(error: FastifyError | Error, _request: FastifyRequest, reply: FastifyReply): void {
  // WechatClientError → 已知业务错误
  if (error instanceof WechatClientError) {
    const statusCode = mapErrorCodeToStatus(error.code);
    reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.detail ? { detail: error.detail } : {}),
      },
    });
    return;
  }

  // Fastify 内置错误（如路由验证失败）
  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode) {
    reply.status(fastifyError.statusCode).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: fastifyError.message,
      },
    });
    return;
  }

  // 未知错误
  reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误',
    },
  });
}

/**
 * 将业务错误码映射为 HTTP 状态码
 */
function mapErrorCodeToStatus(code: string): number {
  switch (code) {
    case 'INVALID_IMAGE_FORMAT':
    case 'IMAGE_TOO_LARGE':
    case 'TOO_MANY_IMAGES':
    case 'FILE_NOT_FOUND':
    case 'VALIDATION_ERROR':
    case 'CREDENTIAL_NOT_FOUND':
      return 400;

    case 'AUTH_FAILED':
      return 401;

    case 'INVALID_APP_ID':
    case 'TOKEN_INVALID':
    case 'WECHAT_API_ERROR':
    case 'WECHAT_SYSTEM_BUSY':
    case 'RATE_LIMITED':
      return 502;

    case 'SERVER_UNAVAILABLE':
      return 503;

    default:
      return 500;
  }
}
