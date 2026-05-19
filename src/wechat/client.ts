/**
 * 微信 API 错误码 → 结构化错误映射
 *
 * 参考：技术方案 4.5 节 错误转换层
 */
const WECHAT_ERROR_MAP: Record<string, { code: string; message: string; retryable: boolean }> = {
  '-1':   { code: 'WECHAT_SYSTEM_BUSY',    message: '系统繁忙，请稍后重试',                           retryable: true  },
  '0':    { code: 'OK',                     message: '成功',                                          retryable: false },
  '40001': { code: 'TOKEN_INVALID',         message: 'access_token 无效或过期',                        retryable: true  },
  '40005': { code: 'INVALID_IMAGE_FORMAT',  message: '不支持的图片格式，仅支持 PNG/JPEG/JPG/GIF',       retryable: false },
  '40009': { code: 'IMAGE_TOO_LARGE',       message: '图片尺寸或大小超出限制',                          retryable: false },
  '40013': { code: 'INVALID_APP_ID',        message: '不合法的 APPID，请检查微信凭证',                  retryable: false },
  '41005': { code: 'MISSING_MEDIA_DATA',    message: '缺少多媒体文件数据',                             retryable: false },
  '45001': { code: 'TOO_MANY_IMAGES',       message: '多媒体文件数量超过限制',                          retryable: false },
  '45009': { code: 'RATE_LIMITED',          message: 'API 调用频率限制，请稍后重试',                    retryable: true  },
};

/**
 * 微信 API 客户端错误
 */
/**
 * 应用层自定义错误码
 *
 * 这些错误码不属于微信 API errcode 映射范围，
 * 由项目代码直接抛出的 WechatClientError 使用。
 * 所有错误码必须在 error.ts 的 mapErrorCodeToStatus 中有对应的 HTTP 状态映射。
 */
export const AppErrorCode = {
  /** 未找到微信凭证 */
  CREDENTIAL_NOT_FOUND: 'CREDENTIAL_NOT_FOUND',
  /** 中转服务不可用 */
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',
  /** 中转服务器地址未指定 */
  SERVER_URL_MISSING: 'SERVER_URL_MISSING',
} as const;

export class WechatClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly originalErrcode?: number,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'WechatClientError';
  }
}

export interface WechatClientOptions {
  /** 微信 API 基础地址（默认 https://api.weixin.qq.com） */
  baseUrl?: string;
  /** 请求超时时间（毫秒，默认 15000） */
  timeout?: number;
  /** 自定义 fetch 实现（用于测试注入） */
  fetch?: typeof globalThis.fetch;
}

export interface RequestOptions {
  method?: string;
  /** JSON body */
  body?: unknown;
  /** multipart/form-data body */
  formData?: FormData;
  /** 原始 body（Buffer 或字符串），不做 JSON 序列化，不覆盖 Content-Type */
  rawBody?: string | Buffer;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

/**
 * 微信 API HTTP 客户端
 *
 * 职责：
 * - 封装 HTTP 请求（JSON / multipart）
 * - 微信 errcode 自动转换中文错误信息
 * - 自动重试（系统繁忙 -1 指数退避、频率限制 45009 长等待）
 */
export class WechatClient {
  private baseUrl: string;
  private timeout: number;
  private fetchFn: typeof globalThis.fetch;

  constructor(options: WechatClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.weixin.qq.com';
    this.timeout = options.timeout ?? 15_000;
    this.fetchFn = options.fetch ?? globalThis.fetch;
  }

  /**
   * 发起微信 API 请求
   *
   * @param path - API 路径（如 `/cgi-bin/token`）
   * @param options - 请求选项
   * @param retryCount - 剩余重试次数（默认 3）
   */
  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
    retryCount = 3,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl).toString();
    const method = options.method ?? 'GET';

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const fetchInit: RequestInit = {
          method,
          headers: { ...options.headers } as Record<string, string>,
          signal: AbortSignal.timeout(this.timeout),
        };

        if (options.formData) {
          fetchInit.body = options.formData;
        } else if (options.rawBody) {
          fetchInit.body = options.rawBody as BodyInit;
        } else if (options.body) {
          fetchInit.headers = { ...(fetchInit.headers as Record<string, string>), 'Content-Type': 'application/json' };
          fetchInit.body = JSON.stringify(options.body);
        }

        const response = await this.fetchFn(url, fetchInit);
        const data = await response.json() as Record<string, unknown>;

        // 微信 API 错误检测
        if (data.errcode !== undefined && data.errcode !== 0) {
          const errcode = Number(data.errcode);
          const errInfo = WECHAT_ERROR_MAP[errcode.toString()];

          // 可重试的错误且还有重试次数
          if (errInfo?.retryable && attempt < retryCount) {
            const delay = getRetryDelay(errcode, attempt);
            await sleep(delay);
            continue;
          }

          throw new WechatClientError(
            errInfo?.code ?? 'WECHAT_API_ERROR',
            errInfo?.message ?? `微信接口调用失败: ${data.errmsg ?? '未知错误'}`,
            errcode,
            data,
          );
        }

        return data as T;
      } catch (error) {
        // 已转换的自定义错误直接抛出
        if (error instanceof WechatClientError) {
          throw error;
        }

        // 网络/超时错误 - 可重试
        if (attempt < retryCount) {
          const delay = getRetryDelay(0, attempt);
          await sleep(delay);
          continue;
        }

        throw new WechatClientError(
          'WECHAT_API_ERROR',
          `微信 API 请求失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    throw new WechatClientError('WECHAT_API_ERROR', '微信 API 请求失败（已达最大重试次数）');
  }
}

/**
 * 根据错误码和尝试次数计算重试延迟
 */
function getRetryDelay(errcode: number, attempt: number): number {
  if (errcode === 45_009) {
    return (attempt + 1) * 60_000;
  }
  if (errcode === -1 || errcode === 0) {
    return Math.pow(2, attempt) * 1000;
  }
  // 网络错误: 1s, 3s, 5s
  return attempt === 0 ? 1000 : attempt === 1 ? 3000 : 5000;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
