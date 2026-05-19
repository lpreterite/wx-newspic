import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { Command } from 'commander';
import { getCredential } from '../config/credential.js';
import { WechatClient } from '../wechat/client.js';

const NEW_ENV_PATH = resolve(homedir(), '.openclaw/skills/wechat-newspic/.env');
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
    .description('管理微信凭证（APP_ID / APP_SECRET）');

  cmd
    .command('show')
    .description('显示当前凭证状态（隐藏 SECRET 字段）')
    .action(handleShow);

  cmd
    .command('set')
    .description('设置凭证')
    .option('--app-id <string>', '微信 APP_ID')
    .option('--app-secret, -s <string>', '微信 APP_SECRET')
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
  try {
    const cred = getCredential();
    const masked = cred.appSecret.length > 8
      ? cred.appSecret.slice(0, 4) + '****' + cred.appSecret.slice(-4)
      : '****';

    console.log('当前微信凭证：');
    console.log(`  APP_ID:    ${cred.appId}`);
    console.log(`  APP_SECRET: ${masked}`);
    console.log(`  来源: ${describeSource()}`);
  } catch {
    console.log('未找到微信凭证。');
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
  }

  if (!appId || !appSecret) {
    console.error('错误：请提供 --app-id 和 --app-secret，或使用 --file 导入 .env 文件');
    process.exit(1);
  }

  // 准备目录
  const envDir = dirname(NEW_ENV_PATH);
  if (!existsSync(envDir)) {
    mkdirSync(envDir, { recursive: true });
  }

  // 写入 .env 文件
  const content = [
    '# wechat-newspic 微信凭证',
    `APP_ID=${appId}`,
    `APP_SECRET=${appSecret}`,
    '',
  ].join('\n');

  writeFileSync(NEW_ENV_PATH, content, 'utf-8');
  console.log(`凭证已写入: ${NEW_ENV_PATH}`);
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
function describeSource(): string {
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

/**
 * 简易 .env 文件解析器
 *
 * 支持读取多种键名格式，兼容旧版（WECHAT_APP_ID / WECHAT_APP_SECRET）和新版（APP_ID / APP_SECRET）
 */
function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}
