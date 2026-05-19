import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { DraftManager } from '../../wechat/draft.js';
import type { TokenManager } from '../../wechat/token.js';

export interface DraftRouteOptions {
  draftManager: DraftManager;
  tokenManager: TokenManager;
}

interface CreateDraftBody {
  article_type?: string;
  title: string;
  author?: string;
  content?: string;
  digest?: string;
  image_list?: Array<{ image_media_id: string }>;
  need_open_comment?: number;
  only_fans_can_comment?: number;
}

/**
 * POST /api/wechat/create-draft
 *
 * 创建图片消息草稿。
 */
export function registerDraftRoute(app: FastifyInstance, options: DraftRouteOptions): void {
  app.post('/api/wechat/create-draft', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as CreateDraftBody;

    if (!body.title || !body.title.trim()) {
      reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '标题不能为空' },
      });
      return;
    }

    if (body.title.length > 32) {
      reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '标题不能超过 32 个字符' },
      });
      return;
    }

    if (!body.image_list || body.image_list.length === 0) {
      reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '至少需要一张图片' },
      });
      return;
    }

    // 仅允许微信 API 识别的 article_type 值
    const articleType = body.article_type === 'newspic' ? 'newspic' : 'newspic';

    // 构造 draft article（小绿书图片消息）
    const articles = [{
      title: body.title,
      article_type: articleType,
      image_info: { image_list: body.image_list },
      author: body.author,
      digest: body.digest,
      content: body.content,
      need_open_comment: body.need_open_comment ?? 0,
      only_fans_can_comment: body.only_fans_can_comment ?? 0,
    }];

    const accessToken = await options.tokenManager.getToken();
    const result = await options.draftManager.createDraft(articles, accessToken);

    reply.send({
      success: true,
      data: {
        media_id: result.media_id,
        article_type: articleType,
        status: 'draft_created',
        created_at: new Date(Number(result.created_at) * 1000).toISOString(),
      },
    });
  });
}
