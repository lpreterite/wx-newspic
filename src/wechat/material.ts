import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { WechatClient, WechatClientError } from './client.js';

/** 支持的图片格式 */
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg', '.gif'];

/** 单张图片大小限制（字节） */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** 批量上传最大数量 */
const MAX_BATCH_COUNT = 20;

export interface UploadResult {
  image_media_id: string;
  url: string;
}

export interface MaterialManagerOptions {
  client: WechatClient;
}

/**
 * 永久素材管理器
 *
 * 职责：
 * - 上传单张图片为永久素材
 * - 批量上传（顺序执行，全部成功或全部失败）
 * - 上传前校验：格式、大小、存在性
 */
export class MaterialManager {
  private client: WechatClient;

  constructor(options: MaterialManagerOptions) {
    this.client = options.client;
  }

  /**
   * 上传单张图片为永久素材
   *
   * @param imagePath - 图片文件路径
   * @param accessToken - 有效的 access_token
   */
  async uploadImage(imagePath: string, accessToken: string): Promise<UploadResult> {
    // 1. 校验文件存在性
    this.validateImagePath(imagePath);

    // 2. 校验格式
    const ext = extname(imagePath).toLowerCase();
    this.validateImageFormat(ext);

    // 3. 校验大小
    this.validateImageSize(imagePath);

    // 4. 读取文件
    const buffer = readFileSync(imagePath);

    // 5. 构造 multipart/form-data
    const boundary = `----FormBoundary${Date.now()}`;
    const body = this.buildMultipartBody(buffer, boundary, `image${ext}`);

    // 6. 发送请求
    const data = await this.client.request<{ media_id: string; url: string }>(
      `/cgi-bin/material/add_material?access_token=${accessToken}&type=image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        rawBody: body,
      },
    );

    return {
      image_media_id: data.media_id,
      url: data.url,
    };
  }

  /**
   * 批量上传图片
   *
   * 顺序执行上传，任一张失败则整体失败。
   *
   * @param imagePaths - 图片路径列表
   * @param accessToken - 有效的 access_token
   */
  async uploadImages(imagePaths: string[], accessToken: string): Promise<UploadResult[]> {
    if (imagePaths.length === 0) {
      return [];
    }

    if (imagePaths.length > MAX_BATCH_COUNT) {
      throw new WechatClientError(
        'TOO_MANY_IMAGES',
        `图片数量不能超过 ${MAX_BATCH_COUNT} 张，当前 ${imagePaths.length} 张`,
      );
    }

    // 先批量校验
    for (const path of imagePaths) {
      const ext = extname(path).toLowerCase();
      this.validateImagePath(path);
      this.validateImageFormat(ext);
      this.validateImageSize(path);
    }

    // 顺序上传
    const results: UploadResult[] = [];
    for (const path of imagePaths) {
      const result = await this.uploadImage(path, accessToken);
      results.push(result);
    }

    return results;
  }

  /**
   * 校验文件存在性
   */
  private validateImagePath(imagePath: string): void {
    try {
      statSync(imagePath);
    } catch {
      throw new WechatClientError(
        'FILE_NOT_FOUND',
        `图片文件不存在: ${imagePath}`,
      );
    }
  }

  /**
   * 校验图片格式
   */
  private validateImageFormat(ext: string): void {
    if (!SUPPORTED_FORMATS.includes(ext)) {
      throw new WechatClientError(
        'INVALID_IMAGE_FORMAT',
        `不支持的图片格式: ${ext}，仅支持 ${SUPPORTED_FORMATS.join(', ')}`,
      );
    }
  }

  /**
   * 校验图片大小
   */
  private validateImageSize(imagePath: string): void {
    const stats = statSync(imagePath);
    if (stats.size > MAX_IMAGE_SIZE) {
      throw new WechatClientError(
        'IMAGE_TOO_LARGE',
        `图片大小超出 10MB 限制: ${(stats.size / 1024 / 1024).toFixed(2)}MB`,
      );
    }
  }

  /**
   * 构造 multipart/form-data 请求体
   *
   * 微信 API 要求字段名为 "media"。
   */
  private buildMultipartBody(buffer: Buffer, boundary: string, filename: string): Buffer {
    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="media"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`,
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

    return Buffer.concat([header, buffer, footer]);
  }
}
