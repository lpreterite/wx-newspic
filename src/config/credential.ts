import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { WechatClientError } from '../wechat/client.js';

const NEW_ENV_PATH = resolve(homedir(), '.openclaw/skills/wx-newspic/.env');
const OLD_ENV_PATH = resolve(homedir(), '.openclaw/skills/wechat-publisher/.env');

function resolveEnvPath(optionsEnvPath?: string): string {
  if (optionsEnvPath) return optionsEnvPath;
  if (existsSync(NEW_ENV_PATH)) return NEW_ENV_PATH;
  return OLD_ENV_PATH; // fallback to old path
}

export interface CredentialOptions {
  /** 微信 APP_ID（CLI 参数传入） */
  appId?: string;
  /** 微信 APP_SECRET（CLI 参数传入） */
  appSecret?: string;
  /** .env 文件路径（默认 ~/.openclaw/skills/wx-newspic/.env） */
  envPath?: string;
}

export interface Credential {
  appId: string;
  appSecret: string;
}

/**
 * 获取微信凭证
 *
 * 优先级（高 → 低）：
 * 1. CLI 参数（options.appId / options.appSecret）
 * 2. 环境变量（WECHAT_APP_ID / WECHAT_APP_SECRET）
 * 3. .env 文件自动读取
 *
 * 如果所有来源都找不到凭证，抛出错误。
 */
export function getCredential(options: CredentialOptions = {}): Credential {
  // 1. CLI 参数优先
  if (options.appId && options.appSecret) {
    return { appId: options.appId, appSecret: options.appSecret };
  }

  // 2. 环境变量
  const envAppId = process.env.WECHAT_APP_ID;
  const envAppSecret = process.env.WECHAT_APP_SECRET;
  if (envAppId && envAppSecret) {
    return { appId: envAppId, appSecret: envAppSecret };
  }

  // 3. 自动读取 .env 文件
  const envPath = resolveEnvPath(options.envPath);
  if (existsSync(envPath)) {
    const envVars = parseDotenv(readFileSync(envPath, 'utf-8'));
    const fileAppId = envVars.APP_ID || envVars.WECHAT_APP_ID;
    const fileAppSecret = envVars.APP_SECRET || envVars.WECHAT_APP_SECRET;
    if (fileAppId && fileAppSecret) {
      return { appId: fileAppId, appSecret: fileAppSecret };
    }
  }

  throw new WechatClientError(
    'CREDENTIAL_NOT_FOUND',
    '无法获取微信凭证。请通过以下任一方式配置：\n' +
    '  1. CLI 参数 --app-id --app-secret\n' +
    '  2. 环境变量 WECHAT_APP_ID / WECHAT_APP_SECRET\n' +
    `  3. 执行 wx-newspic credential set`,
  );
}

/**
 * 简易 .env 文件解析器
 *
 * 支持：KEY=VALUE、引号包裹的值、行注释（#）
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

    // 去掉引号
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}
