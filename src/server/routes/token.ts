import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { TokenManager } from '../../wechat/token.js';

export interface TokenRouteOptions {
  tokenManager: TokenManager;
}

/**
 * POST /api/wechat/token
 *
 * 获取或刷新 access_token。
 *
 * 响应格式 (data)：
 * - `access_token`: 微信接口调用凭据
 * - `expires_in`: token 原始有效期（秒），默认 7200
 * - `expires_at`: ISO 8601 格式字符串，token 过期时刻
 */
export function registerTokenRoute(app: FastifyInstance, options: TokenRouteOptions): void {
  app.post('/api/wechat/token', async (_request: FastifyRequest, reply: FastifyReply) => {
    const accessToken = await options.tokenManager.getToken();
    const tokenInfo = options.tokenManager.getTokenInfo();

    reply.send({
      success: true,
      data: {
        access_token: accessToken,
        expires_in: tokenInfo?.expires_in ?? 7200,
        expires_at: tokenInfo ? new Date(tokenInfo.expires_at * 1000).toISOString() : new Date().toISOString(),
      },
    });
  });
}
