import { readFileSync, statSync } from 'node:fs';
import { extname, basename } from 'node:path';
import { Command } from 'commander';
import { globbySync } from 'globby';
import { getCredential } from '../config/credential.js';
import { WechatClientError } from '../wechat/client.js';

/** 支持的图片格式 */
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif'];

/** 单张图片大小限制（字节） */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** 图片数量限制 */
const MAX_IMAGE_COUNT = 20;

/** 标题最大长度 */
const MAX_TITLE_LENGTH = 32;

export interface PublishOptions {
  title: string;
  content: string;
  images: string[];
  author?: string;
  digest?: string;
  server?: string;
  appId?: string;
  appSecret?: string;
  apiKey?: string;
}

interface DraftResult {
  media_id: string;
  created_at: string;
  success: true;
}

/**
 * 注册 publish 子命令
 */
export function registerPublishCommand(program: Command): void {
  program
    .command('publish')
    .description('发布图片消息到公众号草稿箱')
    .requiredOption('--title, -t <string>', '标题（必填，最长 32 字）')
    .requiredOption('--content, -c <string>', '正文内容（纯文本）')
    .requiredOption('--images, -i <path...>', '图片路径列表（支持 glob，最多 20 张）')
    .option('--author, -a <string>', '作者')
    .option('--digest, -d <string>', '摘要')
    .option('--server, -s <url>', '中转服务器地址')
    .option('--app-id <string>', '微信 APP_ID')
    .option('--app-secret <string>', '微信 APP_SECRET')
    .option('--api-key <string>', '中转服务器 API Key')
    .action(handlePublish);
}

/**
 * 处理 publish 命令
 */
async function handlePublish(options: Record<string, string | string[]>): Promise<void> {
  // 1. 提取并校验参数
  const title = String(options.title || '').trim();
  const content = String(options.content || '').trim();
  const imageArgs = Array.isArray(options.images) ? options.images : [String(options.images)];

  validateTitle(title);
  validateContent(content);

  // 2. 解析图片路径（支持 glob）
  const imagePaths = resolveImagePaths(imageArgs);
  validateImages(imagePaths);

  // 3. 读取凭证
  const cred = getCredential({
    appId: options.appId as string | undefined,
    appSecret: options.appSecret as string | undefined,
  });

  // 4. 确定服务器地址
  const serverUrl = (options.server as string) || process.env.WECHAT_SERVER_URL || process.env.WX_NEWSPIC_SERVER || '';
  const apiKey = (options.apiKey as string) || process.env.WECHAT_API_KEY || process.env.WX_NEWSPIC_API_KEY || '';

  // 5. 执行发布
  const result = await executePublish({
    title,
    content,
    imagePaths,
    author: options.author as string | undefined,
    digest: options.digest as string | undefined,
    serverUrl,
    apiKey,
    appId: cred.appId,
    appSecret: cred.appSecret,
  });

  // 6. 输出结果
  console.log(JSON.stringify(result, null, 2));
}

/**
 * 校验标题
 */
export function validateTitle(title: string): void {
  if (!title) {
    console.error('错误：标题不能为空');
    process.exit(1);
  }
  if (title.length > MAX_TITLE_LENGTH) {
    console.error(`错误：标题不能超过 ${MAX_TITLE_LENGTH} 个字，当前 ${title.length} 个字`);
    process.exit(1);
  }
}

/**
 * 校验正文
 */
export function validateContent(content: string): void {
  if (!content) {
    console.error('错误：正文不能为空');
    process.exit(1);
  }
}

/**
 * 解析图片路径列表（支持 glob）
 */
export function resolveImagePaths(args: string[]): string[] {
  const paths: string[] = [];

  for (const arg of args) {
    const resolved = globbySync(arg, { onlyFiles: true });
    if (resolved.length > 0) {
      paths.push(...resolved);
    } else {
      // 尝试作为单个文件路径
      try {
        statSync(arg);
        paths.push(arg);
      } catch {
        console.error(`错误：未找到匹配的图片: ${arg}`);
        process.exit(1);
      }
    }
  }

  // 去重并按文件名排序
  return [...new Set(paths)].sort();
}

/**
 * 校验图片列表
 */
export function validateImages(imagePaths: string[]): void {
  if (imagePaths.length === 0) {
    console.error('错误：至少需要一张图片');
    process.exit(1);
  }

  if (imagePaths.length > MAX_IMAGE_COUNT) {
    console.error(`错误：图片数量不能超过 ${MAX_IMAGE_COUNT} 张，当前 ${imagePaths.length} 张`);
    process.exit(1);
  }

  for (const imgPath of imagePaths) {
    // 校验文件存在性
    try {
      statSync(imgPath);
    } catch {
      console.error(`错误：图片文件不存在: ${imgPath}`);
      process.exit(1);
    }

    // 校验格式
    const ext = extname(imgPath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      console.error(`错误：不支持的图片格式 "${ext}"，仅支持 PNG/JPEG/JPG/GIF: ${imgPath}`);
      process.exit(1);
    }

    // 校验大小
    const stats = statSync(imgPath);
    if (stats.size > MAX_IMAGE_SIZE) {
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.error(`错误：图片超过 10MB 限制 (${sizeMB}MB): ${imgPath}`);
      process.exit(1);
    }
  }
}

/**
 * 执行发布流程
 *
 * 与中转服务器通信，上传图片并创建草稿。
 */
export async function executePublish(params: {
  title: string;
  content: string;
  imagePaths: string[];
  author?: string;
  digest?: string;
  serverUrl: string;
  apiKey: string;
  appId: string;
  appSecret: string;
}): Promise<DraftResult> {
  const { title, content, imagePaths, author, digest, serverUrl, apiKey } = params;

  if (!serverUrl) {
    throw new WechatClientError(
      'SERVER_URL_MISSING',
      '未指定中转服务器地址。请通过 --server 参数或 WECHAT_SERVER_URL 环境变量指定。',
    );
  }

  const baseUrl = serverUrl.replace(/\/+$/, '');
  const authHeaders: Record<string, string> = apiKey
    ? { 'Authorization': `Bearer ${apiKey}` }
    : {};

  // 3.1 上传图片
  const imageMediaIds: string[] = [];

  for (const imagePath of imagePaths) {
    const buffer = readFileSync(imagePath);
    const filename = basename(imagePath);
    const blob = new Blob([buffer]);

    const formData = new FormData();
    formData.append('image', blob, filename);

    const uploadRes = await fetch(`${baseUrl}/api/wechat/upload-image`, {
      method: 'POST',
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    const uploadResult = await uploadRes.json() as { success: boolean; data?: { image_media_id: string }; error?: { code: string; message: string } };

    if (!uploadResult.success || !uploadResult.data) {
      throw new WechatClientError(
        uploadResult.error?.code || 'UPLOAD_FAILED',
        uploadResult.error?.message || `图片上传失败: ${filename}`,
      );
    }

    imageMediaIds.push(uploadResult.data.image_media_id);
  }

  // 3.2 创建草稿
  const draftBody = {
    article_type: 'wx-newspic',
    title,
    content,
    author,
    digest,
    image_list: imageMediaIds.map((id) => ({ image_media_id: id })),
    need_open_comment: 0,
    only_fans_can_comment: 0,
  };

  const draftRes = await fetch(`${baseUrl}/api/wechat/create-draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(draftBody),
  });

  const draftResult = await draftRes.json() as {
    success: boolean;
    data?: { media_id: string; created_at: string };
    error?: { code: string; message: string };
  };

  if (!draftResult.success || !draftResult.data) {
    throw new WechatClientError(
      draftResult.error?.code || 'DRAFT_FAILED',
      draftResult.error?.message || '创建草稿失败',
    );
  }

  return {
    media_id: draftResult.data.media_id,
    created_at: draftResult.data.created_at,
    success: true,
  };
}
