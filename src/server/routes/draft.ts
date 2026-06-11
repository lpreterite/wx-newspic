import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { DraftManager, DraftArticle } from '../../wechat/draft.js';
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
  thumb_media_id?: string;
  image_list?: Array<{ image_media_id: string }>;
  need_open_comment?: number;
  only_fans_can_comment?: number;
}

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

    const articleType = body.article_type === 'news' ? 'news' : 'newspic';

    if (articleType === 'newspic' && (!body.image_list || body.image_list.length === 0)) {
      reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '图片消息至少需要一张图片' },
      });
      return;
    }

    const articles = articleType === 'news'
      ? [{
          title: body.title,
          article_type: 'news',
          content: body.content || '',
          thumb_media_id: body.thumb_media_id,
          author: body.author,
          need_open_comment: body.need_open_comment ?? 1,
          only_fans_can_comment: body.only_fans_can_comment ?? 0,
        } as DraftArticle]
      : [{
          title: body.title,
          article_type: 'newspic',
          image_info: { image_list: body.image_list || [] },
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
