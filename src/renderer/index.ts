import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { JSDOM } from 'jsdom';
import { createWenyanCore, registerAllBuiltInThemes, registerTheme } from '@wenyan-md/core';
import type { Theme } from '@wenyan-md/core';
import type { RenderOptions, RenderedArticle } from './types.js';

let coreInstance: Awaited<ReturnType<typeof createWenyanCore>> | null = null;
let themesRegistered = false;

function ensureThemesRegistered(): void {
  if (themesRegistered) return;
  registerAllBuiltInThemes();
  themesRegistered = true;
}

async function getCore(): Promise<Awaited<ReturnType<typeof createWenyanCore>>> {
  if (!coreInstance) {
    ensureThemesRegistered();
    coreInstance = await createWenyanCore({ isWechat: true });
  }
  return coreInstance;
}

const dom = new JSDOM('<!DOCTYPE html>');

function registerThemeFromFile(themeFile: string, themeId: string): void {
  const css = readFileSync(themeFile, 'utf-8');
  const name = basename(themeFile, '.css');
  const theme: Theme = {
    meta: {
      id: themeId,
      name,
      description: `Custom theme from ${themeFile}`,
      appName: 'wx-newspic',
      author: 'user',
    },
    getCss() {
      return Promise.resolve(css);
    },
  };
  registerTheme(theme);
}

/**
 * 渲染 Markdown 内容为公众号图文消息 HTML。
 *
 * - news: 解析 frontmatter → 渲染 Markdown → 应用主题 → 返回 HTML
 *
 * 仅做内容转换，不涉及网络 IO（图片上传等由上层处理）。
 */
export async function renderArticle(options: RenderOptions): Promise<RenderedArticle> {
  const { content, theme = 'default', hlTheme, themeFile } = options;

  if (!content) {
    return { content: '', title: '' };
  }

  if (themeFile) {
    registerThemeFromFile(themeFile, theme);
  }

  const core = await getCore();
  const fm = await core.handleFrontMatter(content);
  const mdBody = fm.content;

  const html = await core.renderMarkdown(mdBody);

  const el = dom.window.document.createElement('div');
  el.innerHTML = html;

  const styledContent = await core.applyStylesWithTheme(el, {
    themeId: theme,
    hlThemeId: hlTheme,
  });

  return {
    content: styledContent,
    title: fm.title || '',
    cover: fm.cover,
    author: fm.author,
    source_url: fm.source_url,
    need_open_comment: fm.need_open_comment,
    only_fans_can_comment: fm.only_fans_can_comment,
    image_list: fm.image_list,
  };
}
