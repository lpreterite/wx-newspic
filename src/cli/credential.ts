import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { Command } from 'commander';
import { getCredential, getServerConfig, parseDotenv } from '../config/credential.js';
import { WechatClient } from '../wechat/client.js';

const NEW_ENV_PATH = resolve(homedir(), '.openclaw/skills/wx-newspic/.env');
const OLD_ENV_PATH = resolve(homedir(), '.openclaw/skills/wechat-publisher/.env');

function getDefaultEnvPath(): string {
  // 优先使用新路径，兼容旧路径的已有配置
  const newDir = dirname(NEW_ENV_PATH);
  if (!existsSync(newDir)) {
    mkdirSync(newDir, { recursive: true });
  }
  return NEW_ENV_PATH;
}

/**
 * 注册 credential 子命令
 */
export function registerCredentialCommand(program: Command): void {
  const cmd = program
    .command('credential')
    .description('管理微信凭证和中转服务器配置');

  cmd
    .command('show')
    .description('显示当前凭证状态（隐藏 SECRET 字段）')
    .action(handleShow);

  cmd
    .command('set')
    .description('设置凭证和中转服务器配置')
    .option('--app-id <string>', '微信 APP_ID')
    .option('--app-secret, -s <string>', '微信 APP_SECRET')
    .option('--server <url>', '中转服务器地址')
    .option('--api-key <string>', '中转服务器 API Key')
    .option('--file, -f <path>', '从 .env 文件导入')
    .action(handleSet);

  cmd
    .command('check')
    .description('检查凭证是否有效（尝试获取 access_token）')
    .action(handleCheck);
}

/**
 * 处理 credential show
 */
async function handleShow(): Promise<void> {
  const hasCred = (() => {
    try {
      getCredential();
      return true;
    } catch {
      return false;
    }
  })();

  if (hasCred) {
    const cred = getCredential();
    const masked = cred.appSecret.length > 8
      ? cred.appSecret.slice(0, 4) + '****' + cred.appSecret.slice(-4)
      : '****';

    console.log('微信凭证：');
    console.log(`  APP_ID:    ${cred.appId}`);
    console.log(`  APP_SECRET: ${masked}`);
    console.log(`  来源: ${describeCredSource()}`);
  } else {
    console.log('微信凭证：未配置');
  }

  const serverConfig = getServerConfig();
  console.log('');
  console.log('中转服务器配置：');
  if (serverConfig.serverUrl && serverConfig.apiKey) {
    const maskedKey = serverConfig.apiKey.length > 8
      ? serverConfig.apiKey.slice(0, 4) + '****' + serverConfig.apiKey.slice(-4)
      : '****';
    console.log(`  服务器: ${serverConfig.serverUrl}`);
    console.log(`  API Key: ${maskedKey}`);
    console.log(`  来源: ${describeServerSource()}`);
  } else {
    console.log('  未配置（使用直连模式时无需配置）');
  }

  if (!hasCred) {
    console.log('');
    console.log('请通过以下任一方式配置：');
    console.log('  1. wx-newspic credential set --app-id <id> --app-secret <secret>');
    console.log('  2. 环境变量 WECHAT_APP_ID / WECHAT_APP_SECRET');
    console.log(`  3. 创建 ${NEW_ENV_PATH} 并填入 APP_ID/APP_SECRET`);
  }
}

/**
 * 处理 credential set
 */
async function handleSet(options: Record<string, string>): Promise<void> {
  let appId = options.appId;
  let appSecret = options.appSecret;
  let serverUrl = options.server;
  let apiKey = options.apiKey;

  // 从文件导入
  if (options.file) {
    const filePath = resolve(options.file);
    if (!existsSync(filePath)) {
      console.error(`错误：文件不存在: ${filePath}`);
      process.exit(1);
    }
    const content = readFileSync(filePath, 'utf-8');
    const vars = parseDotenv(content);
    appId = vars.WECHAT_APP_ID || vars.APP_ID || appId;
    appSecret = vars.WECHAT_APP_SECRET || vars.APP_SECRET || appSecret;
    serverUrl = vars.SERVER || vars.WECHAT_SERVER_URL || vars.WX_NEWSPIC_SERVER || serverUrl;
    apiKey = vars.API_KEY || vars.WECHAT_API_KEY || vars.WX_NEWSPIC_API_KEY || apiKey;
  }

  if (!appId && !appSecret && !serverUrl && !apiKey) {
    console.error('错误：请提供至少一项配置（--app-id / --app-secret / --server / --api-key），或使用 --file 导入 .env 文件');
    process.exit(1);
  }

  // 准备目录
  const envDir = dirname(NEW_ENV_PATH);
  if (!existsSync(envDir)) {
    mkdirSync(envDir, { recursive: true });
  }

  // 读取现有 .env 内容（保留已有字段）
  const existing: Record<string, string> = {};
  if (existsSync(NEW_ENV_PATH)) {
    const existingContent = readFileSync(NEW_ENV_PATH, 'utf-8');
    Object.assign(existing, parseDotenv(existingContent));
  }

  // 合并：CLI 参数覆盖 .env 中的值
  const mergedAppId = appId || existing.APP_ID || '';
  const mergedAppSecret = appSecret || existing.APP_SECRET || '';
  const mergedServerUrl = serverUrl || existing.SERVER || existing.WECHAT_SERVER_URL || '';
  const mergedApiKey = apiKey || existing.API_KEY || existing.WECHAT_API_KEY || '';

  // 写入 .env 文件
  const lines: string[] = [
    '# wx-newspic 微信凭证',
    `APP_ID=${mergedAppId}`,
    `APP_SECRET=${mergedAppSecret}`,
    '',
  ];

  if (mergedServerUrl || mergedApiKey) {
    lines.push('# 中转服务器配置');
    if (mergedServerUrl) lines.push(`SERVER=${mergedServerUrl}`);
    if (mergedApiKey) lines.push(`API_KEY=${mergedApiKey}`);
    lines.push('');
  }

  writeFileSync(NEW_ENV_PATH, lines.join('\n'), 'utf-8');

  const written: string[] = [];
  if (mergedAppId) written.push('APP_ID');
  if (mergedAppSecret) written.push('APP_SECRET');
  if (mergedServerUrl) written.push('SERVER');
  if (mergedApiKey) written.push('API_KEY');
  console.log(`配置已写入: ${NEW_ENV_PATH}`);
  console.log(`  字段: ${written.join(', ')}`);
}

/**
 * 处理 credential check
 */
async function handleCheck(): Promise<void> {
  try {
    const cred = getCredential();
    console.log('正在验证凭证...');
    console.log(`  APP_ID: ${cred.appId}`);

    const client = new WechatClient();
    const query = new URLSearchParams({
      grant_type: 'client_credential',
      appid: cred.appId,
      secret: cred.appSecret,
    });

    const data = await client.request<{ access_token: string; expires_in: number }>(
      `/cgi-bin/token?${query.toString()}`,
    );

    console.log('✅ 凭证有效');
    console.log(`  access_token: ${data.access_token.slice(0, 10)}...`);
    console.log(`  expires_in: ${data.expires_in}秒`);
  } catch (err) {
    console.error('❌ 凭证无效或网络不可达');
    if (err instanceof Error) {
      console.error(`  错误: ${err.message}`);
    }
    process.exit(1);
  }
}

/**
 * 描述凭证来源
 */
function describeCredSource(): string {
  if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
    return '环境变量 WECHAT_APP_ID / WECHAT_APP_SECRET';
  }
  if (existsSync(NEW_ENV_PATH)) {
    return `.env 文件 (${NEW_ENV_PATH})`;
  }
  if (existsSync(OLD_ENV_PATH)) {
    return `.env 文件 (${OLD_ENV_PATH})`;
  }
  return '未知';
}

function describeServerSource(): string {
  if (process.env.WECHAT_SERVER_URL || process.env.WX_NEWSPIC_SERVER) {
    return '环境变量';
  }
  if (existsSync(NEW_ENV_PATH)) {
    return `.env 文件 (${NEW_ENV_PATH})`;
  }
  return '未知';
}

