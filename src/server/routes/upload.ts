import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { MaterialManager } from '../../wechat/material.js';
import type { TokenManager } from '../../wechat/token.js';

export interface UploadRouteOptions {
  materialManager: MaterialManager;
  tokenManager: TokenManager;
}

/**
 * POST /api/wechat/upload-image
 *
 * 上传图片为永久素材，返回 image_media_id。
 * 请求格式：multipart/form-data，字段名 "image"
 */
export function registerUploadRoute(app: FastifyInstance, options: UploadRouteOptions): void {
  app.post('/api/wechat/upload-image', async (request: FastifyRequest, reply: FastifyReply) => {
    const contentType = request.headers['content-type'] || '';
    if (!contentType.startsWith('multipart/form-data')) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少图片文件，请求需要 multipart/form-data 格式',
        },
      });
      return;
    }

    const file = await request.file();

    if (!file) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少图片文件，请使用字段名 "image" 上传',
        },
      });
      return;
    }

    // 生成临时文件
    const tmpDir = mkdtempSync(join(tmpdir(), 'upload-'));
    const ext = file.filename ? file.filename.substring(file.filename.lastIndexOf('.')) || '.bin' : '.bin';
    const tmpPath = join(tmpDir, `upload${ext}`);

    try {
      // 读取文件内容
      const chunks: Buffer[] = [];
      for await (const chunk of file.file) {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      // 写入临时文件
      writeFileSync(tmpPath, buffer);

      // 获取 token 并上传（遇 40001 自动刷新重试）
      const result = await options.tokenManager.executeWithToken(
        (token) => options.materialManager.uploadImage(tmpPath, token),
      );

      reply.send({
        success: true,
        data: {
          image_media_id: result.image_media_id,
          url: result.url,
        },
      });
    } finally {
      // 清理临时文件
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* 忽略清理失败 */ }
    }
  });
}
