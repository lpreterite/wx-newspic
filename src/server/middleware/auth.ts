import type { FastifyRequest, FastifyReply } from 'fastify';
import { WechatClientError } from '../../wechat/client.js';

/**
 * Bearer Token 认证中间件
 *
 * 检查请求头 `Authorization: Bearer <api-key>`
 * 将 apiKey 通过装饰器方式注入，这里通过闭包传递
 */
export function createAuthMiddleware(apiKey: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new WechatClientError('AUTH_FAILED', '缺少 Authorization 请求头');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new WechatClientError('AUTH_FAILED', 'Authorization 格式错误，应为 Bearer <api-key>');
    }

    const token = parts[1];
    if (token !== apiKey) {
      throw new WechatClientError('AUTH_FAILED', 'API Key 认证失败');
    }
  };
}
