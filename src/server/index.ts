import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import type { ServerOptions } from '../config/server.js';
import { WechatClient } from '../wechat/client.js';
import { TokenManager } from '../wechat/token.js';
import { MaterialManager } from '../wechat/material.js';
import { DraftManager } from '../wechat/draft.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { registerTokenRoute } from './routes/token.js';
import { registerUploadRoute } from './routes/upload.js';
import { registerDraftRoute } from './routes/draft.js';
import { registerDraftsRoute } from './routes/drafts.js';

/**
 * 创建并启动中转服务
 *
 * @param options - 服务配置
 * @returns Fastify 实例和 stop 函数
 */
export async function createServer(options: ServerOptions) {
  const {
    port = 3000,
    host = '0.0.0.0',
    apiKey,
    appId,
    appSecret,
    logLevel = 'info',
  } = options;

  // 创建 Fastify 实例
  const app = Fastify({
    logger: {
      level: logLevel,
    },
  });

  // 注册 multipart 支持
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

  // 创建微信 API 客户端和模块
  const wechatClient = new WechatClient();
  const tokenManager = new TokenManager({ appId, appSecret, client: wechatClient });
  const materialManager = new MaterialManager({ client: wechatClient });
  const draftManager = new DraftManager({ client: wechatClient });

  // 注册全局错误处理器
  app.setErrorHandler(errorHandler);

  // 注册认证中间件（所有 /api/wechat/* 路由都需要认证）
  const authMiddleware = createAuthMiddleware(apiKey);
  app.addHook('preHandler', async (request, reply) => {
    // 只对 /api/wechat/* 路径进行认证
    if (request.url.startsWith('/api/wechat/')) {
      await authMiddleware(request, reply);
    }
  });

  // 注册路由
  registerTokenRoute(app, { tokenManager });
  registerUploadRoute(app, { materialManager, tokenManager });
  registerDraftRoute(app, { draftManager, tokenManager });
  registerDraftsRoute(app, { draftManager, tokenManager });

  // 健康检查
  app.get('/api/health', async () => {
    return { success: true, data: { status: 'ok', timestamp: new Date().toISOString() } };
  });

  // 启动服务
  const address = await app.listen({ port, host });
  app.log.info(`中转服务已启动: ${address}`);
  app.log.info(`API 基础路径: /api/wechat`);

  // 自动开始 token 续期（后台定时刷新）
  tokenManager.getToken().catch((err) => {
    app.log.error({ err }, '初始获取 access_token 失败');
  });

  // 优雅关闭
  const stop = async () => {
    app.log.info('正在关闭服务...');
    tokenManager.stopAutoRefresh();
    await app.close();
    app.log.info('服务已关闭');
  };

  // 监听关闭信号
  const shutdown = async (signal: string) => {
    app.log.info(`收到 ${signal} 信号`);
    await stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { app, stop, tokenManager, materialManager, draftManager };
}
