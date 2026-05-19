import { WechatClient, WechatClientError } from './client.js';

/**
 * 草稿文章
 *
 * 支持普通图文和"小绿书"（图片消息，article_type='newspic'）。
 * 小绿书使用 image_info.image_list 传递多张图片，不传 thumb_media_id。
 */
export interface DraftArticle {
  title: string;
  /** 封面 media_id（普通图文用，小绿书不需要） */
  thumb_media_id?: string;
  /** 文章类型: 'newspic' 表示小绿书图片消息 */
  article_type?: string;
  /** 图片列表（小绿书用） */
  image_info?: { image_list: Array<{ image_media_id: string }> };
  author?: string;
  digest?: string;
  content?: string;
  content_source_url?: string;
  need_open_comment?: number;
  only_fans_can_comment?: number;
}

/**
 * 草稿创建结果
 */
export interface DraftResult {
  media_id: string;
  created_at: string;
}

export interface DraftManagerOptions {
  client: WechatClient;
}

/**
 * 草稿管理器
 *
 * 职责：
 * - 创建图文消息草稿（draft）
 * - 支持单篇/多篇图文
 */
export class DraftManager {
  private client: WechatClient;

  constructor(options: DraftManagerOptions) {
    this.client = options.client;
  }

  /**
   * 创建图文消息草稿
   *
   * 调用微信 API POST /cgi-bin/draft/add
   *
   * @param articles - 图文消息列表（最多 8 篇）
   * @param accessToken - 有效的 access_token
   */
  async createDraft(articles: DraftArticle[], accessToken: string): Promise<DraftResult> {
    const data = await this.client.request<{ media_id: string }>(
      `/cgi-bin/draft/add?access_token=${accessToken}`,
      {
        method: 'POST',
        body: { articles },
      },
    );

    return {
      media_id: data.media_id,
      created_at: String(Math.floor(Date.now() / 1000)),
    };
  }

  /**
   * 查询草稿列表
   *
   * 调用微信 API GET /cgi-bin/draft/list
   *
   * @param accessToken - 有效的 access_token
   * @param offset - 偏移量（默认 0）
   * @param count - 每页数量（默认 20，最大 20）
   * @param noContent - 是否不返回正文（默认 0）
   */
  async listDrafts(
    accessToken: string,
    offset = 0,
    count = 20,
    noContent = 0,
  ): Promise<{ total_count: number; item_count: number; items: unknown[] }> {
    const query = new URLSearchParams({
      access_token: accessToken,
      offset: String(offset),
      count: String(Math.min(count, 20)),
      no_content: String(noContent),
    });

    const data = await this.client.request<{ total_count: number; item_count: number; items: unknown[] }>(
      `/cgi-bin/draft/list?${query.toString()}`,
    );

    return {
      total_count: data.total_count,
      item_count: data.item_count,
      items: data.items,
    };
  }
}
