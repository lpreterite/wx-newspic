#!/usr/bin/env node
// 从公众号文章 URL 提取 HTML 内容
// 用法: node fetch-article.mjs <url>
// 输出: JSON { title, html, styles, images }

const url = process.argv[2];
if (!url) {
  console.error('用法: node fetch-article.mjs <公众号文章URL>');
  process.exit(1);
}

try {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36'
    }
  });
  if (!resp.ok) {
    console.error(JSON.stringify({ error: 'FETCH_FAILED', status: resp.status, statusText: resp.statusText }));
    process.exit(1);
  }
  const html = await resp.text();

  // 提取文章标题
  const titleMatch = html.match(/<h[12]\s+class="rich_media_title[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // 提取正文 HTML（rich_media_content）
  const contentStart = html.indexOf('id="js_content"');
  const contentEnd = html.indexOf('<!-- 付费阅读内容', contentStart);
  let contentHtml = '';
  if (contentStart > 0) {
    // 找到最近的 <section> 或 <div> 开始标签
    const sectionStart = html.indexOf('>', contentStart) + 1;
    const endIdx = contentEnd > contentStart ? contentEnd : html.indexOf('</div>', sectionStart + 1000);
    contentHtml = html.slice(sectionStart, endIdx > sectionStart ? endIdx : sectionStart + 5000);
    // 简化闭合
    contentHtml = contentHtml.replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  // 提取所有内联样式用于分析
  const styleBlocks = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    styleBlocks.push(match[1].trim());
  }

  // 提取文中图片
  const images = [];
  const imgRegex = /<img[^>]*data-src="([^"]+)"[^>]*>/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]);
  }

  const result = {
    title,
    contentHtml: contentHtml.substring(0, 10000), // 限制长度
    styleCount: contentHtml.match(/style="[^"]*"/g)?.length || 0,
    elementTags: [...new Set(contentHtml.match(/<\/(\w+)>/g)?.map(t => t.replace(/<\/|\//g, '')) || [])],
    totalStyles: styleBlocks.length,
    images: images.slice(0, 20)
  };

  console.log(JSON.stringify(result, null, 2));

} catch (err) {
  console.error(JSON.stringify({ error: 'FETCH_FAILED', detail: err.message }));
  process.exit(1);
}
