/**
 * 从渲染后 HTML 提取所有 <img src> 的 URL
 */
export function extractImageSrcs(html: string): string[] {
  const regex = /<img[^>]+src\s*=\s*"([^"]+)"/gi;
  const srcs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    srcs.push(match[1]);
  }
  return srcs;
}

/**
 * 用 media_id 映射替换 HTML 中的 <img src>
 *
 * @param html - 原始 HTML
 * @param mapping - src URL → media_id 的映射表
 * @returns 替换后的 HTML
 */
export function replaceImageSrcs(html: string, mapping: Record<string, string>): string {
  let result = html;
  for (const [src, mediaId] of Object.entries(mapping)) {
    result = result.replaceAll(src, mediaId);
  }
  return result;
}

/**
 * 提取首张图片的 src（用于 cover 兜底）
 */
export function extractFirstImage(html: string): string | undefined {
  const srcs = extractImageSrcs(html);
  return srcs.length > 0 ? srcs[0] : undefined;
}
