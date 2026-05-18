/**
 * 中转服务配置
 */
export interface ServerOptions {
  /** 监听端口（默认 3000） */
  port?: number;
  /** 监听地址（默认 0.0.0.0） */
  host?: string;
  /** API Key 认证密钥 */
  apiKey: string;
  /** 微信 APP_ID */
  appId: string;
  /** 微信 APP_SECRET */
  appSecret: string;
  /** 日志级别 */
  logLevel?: string;
}
