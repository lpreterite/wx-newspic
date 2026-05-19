import { WechatClient, WechatClientError } from './client.js';

/**
 * Token 存储结构
 */
interface TokenStore {
  access_token: string;
  /** Unix 时间戳（秒），过期时刻 */
  expires_at: number;
  /** 原始有效期（秒） */
  expires_in: number;
}

/**
 * Token 管理器选项
 */
export interface TokenManagerOptions {
  appId: string;
  appSecret: string;
  /** 提前刷新时间（秒），默认 300（5 分钟） */
  refreshBefore?: number;
  /** 自定义微信客户端 */
  client?: WechatClient;
}

/**
 * access_token 管理器
 *
 * 职责：
 * - 获取 access_token（优先返回缓存）
 * - 过期前自动刷新（默认提前 5 分钟）
 * - Promise 锁防止并发重复刷新
 * - 定时器自动续期
 */
export class TokenManager {
  private store: TokenStore | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRefresh: Promise<string> | null = null;
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly refreshBefore: number;
  private readonly client: WechatClient;

  constructor(options: TokenManagerOptions) {
    this.appId = options.appId;
    this.appSecret = options.appSecret;
    this.refreshBefore = options.refreshBefore ?? 300;
    this.client = options.client ?? new WechatClient();
  }

  /**
   * 获取 access_token
   *
   * 优先返回缓存中的 token。如果缓存已过期或将在 5 分钟内过期，自动刷新。
   */
  async getToken(): Promise<string> {
    // 缓存有效 → 直接返回
    if (this.store && this.store.expires_at > Date.now() / 1000 + this.refreshBefore) {
      return this.store.access_token;
    }

    // 缓存过期或即将过期 → 刷新
    return this.refreshToken();
  }

  /**
   * 强制刷新 access_token
   *
   * 使用 Promise 锁防止并发重复刷新。多个等待者共享同一次刷新结果。
   */
  async refreshToken(): Promise<string> {
    if (this.pendingRefresh) {
      return this.pendingRefresh;
    }

    this.pendingRefresh = this.doRefresh();

    try {
      return await this.pendingRefresh;
    } finally {
      this.pendingRefresh = null;
    }
  }

  /**
   * 执行实际的 token 刷新请求
   */
  private async doRefresh(): Promise<string> {
    const query = new URLSearchParams({
      grant_type: 'client_credential',
      appid: this.appId,
      secret: this.appSecret,
    });

    const data = await this.client.request<{ access_token: string; expires_in: number }>(
      `/cgi-bin/token?${query.toString()}`,
    );

    this.store = {
      access_token: data.access_token,
      expires_in: data.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    };

    // 启动定时器自动续期
    this.scheduleRefresh();

    return data.access_token;
  }

  /**
   * 安排定时刷新
   *
   * 在 token 过期前 refreshBefore 秒触发刷新
   */
  private scheduleRefresh(): void {
    this.stopAutoRefresh();

    if (!this.store) return;

    const expiresAt = this.store.expires_at;
    const now = Date.now() / 1000;
    const delay = Math.max(0, (expiresAt - now - this.refreshBefore)) * 1000;

    if (delay <= 0) {
      // 已经需要刷新了，立即执行
      this.refreshToken().catch(() => { /* 静默处理后台刷新失败 */ });
      return;
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshToken().catch(() => { /* 静默处理后台刷新失败 */ });
    }, delay);
  }

  /**
   * 停止自动续期定时器
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 获取当前缓存的 token 信息（用于调试）
   *
   * 返回字段：
   * - `access_token`: 微信接口调用凭据
   * - `expires_at`: Unix 时间戳（秒），token 过期时刻
   * - `expires_in`: token 原始有效期（秒）
   */
  getTokenInfo(): { access_token: string; expires_at: number; expires_in: number } | null {
    return this.store ? { ...this.store } : null;
  }
}
