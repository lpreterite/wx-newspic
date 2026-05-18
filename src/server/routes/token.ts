import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { TokenManager } from '../../wechat/token.js';

export interface TokenRouteOptions {
  tokenManager: TokenManager;
}

/**
 * POST /api/wechat/token
 *
 * 获取或刷新 access_token。
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
