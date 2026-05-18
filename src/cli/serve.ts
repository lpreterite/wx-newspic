import { Command } from 'commander';
import { getCredential } from '../config/credential.js';

/**
 * 注册 serve 子命令
 */
export function registerServeCommand(program: Command): void {
  program
    .command('serve')
    .description('启动中转 HTTP 服务（固定 IP 代理微信 API）')
    .option('--port, -p <number>', '监听端口（默认 3000）')
    .requiredOption('--api-key, -k <string>', 'API Key 认证密钥（必填）')
    .option('--app-id <string>', '微信 APP_ID（可选，默认从凭证配置读取）')
    .option('--app-secret <string>', '微信 APP_SECRET（可选，默认从凭证配置读取）')
    .option('--host <string>', '监听地址（默认 0.0.0.0）')
    .option('--log-level <string>', '日志级别（默认 info）')
    .action(handleServe);
}

/**
 * 处理 serve 命令
 */
async function handleServe(options: Record<string, string>): Promise<void> {
  const port = options.port ? parseInt(options.port, 10) : 3000;
  const host = options.host || '0.0.0.0';
  const apiKey = options.apiKey;
  const logLevel = options.logLevel || 'info';

  // 读取凭证
  const cred = getCredential({
    appId: options.appId,
    appSecret: options.appSecret,
  });

  // 动态导入 createServer（避免在非 serve 命令时加载 Fastify）
  const { createServer } = await import('../server/index.js');

  await createServer({
    port,
    host,
    apiKey,
    appId: cred.appId,
    appSecret: cred.appSecret,
    logLevel,
  });
}
