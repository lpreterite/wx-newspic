import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { DraftManager } from '../../wechat/draft.js';
import type { TokenManager } from '../../wechat/token.js';

export interface DraftsRouteOptions {
  draftManager: DraftManager;
  tokenManager: TokenManager;
}

interface DraftsQueryString {
  offset?: string;
  count?: string;
  no_content?: string;
}

/**
 * GET /api/wechat/drafts
 *
 * 查询草稿列表。
 */
export function registerDraftsRoute(app: FastifyInstance, options: DraftsRouteOptions): void {
  app.get('/api/wechat/drafts', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as DraftsQueryString;
    const offset = Number(query.offset) || 0;
    const count = Number(query.count) || 20;
    const noContent = Number(query.no_content) || 0;

    const result = await options.tokenManager.executeWithToken(
      (token) => options.draftManager.listDrafts(token, offset, count, noContent),
    );

    reply.send({
      success: true,
      data: {
        total_count: result.total_count,
        item_count: result.item_count,
        items: result.items,
      },
    });
  });
}
