import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, extname, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { Command } from 'commander';
import { renderArticle } from '../renderer/index.js';

/**
 * 注册 render 子命令
 */
export function registerRenderCommand(program: Command): void {
  program
    .command('render')
    .description('本地预览 Markdown 渲染效果（不调用微信 API）')
    .requiredOption('--md, -m <path>', 'Markdown 文件路径（必填）')
    .option('--theme <string>', '排版主题（默认 default）')
    .option('--hl-theme <string>', '代码高亮主题')
    .option('--output, -o <path>', '输出 HTML 文件路径（默认 ./{文件名}.html）')
    .option('--open, -O', '渲染后用默认浏览器打开')
    .action(handleRender);
}

export async function handleRender(options: Record<string, string>): Promise<void> {
  const mdPath = resolve(String(options.md));
  const theme = (options.theme as string) || 'default';
  const hlTheme = options.hlTheme as string | undefined;

  const markdown = readFileSync(mdPath, 'utf-8');
  const result = await renderArticle({ content: markdown, theme, hlTheme });

  const outputPath = resolve(
    String(options.output || basename(mdPath, extname(mdPath)) + '.html'),
  );

  writeFileSync(outputPath, result.content, 'utf-8');
  console.log(`渲染完成：${outputPath}`);

  if (options.open || options.O) {
    execSync(`open "${outputPath}"`);
  }
}
