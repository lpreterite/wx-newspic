import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { Command } from 'commander';

export function registerPreviewCommand(program: Command): void {
  program
    .command('preview')
    .description('启动本地预览服务（分屏编辑器 + 即时主题切换 + 文件浏览器）')
    .option('-p, --port <number>', '监听端口', '3030')
    .option('-f, --theme-file <path>', '自定义主题 CSS 文件路径')
    .option('--hl-theme <string>', '默认代码高亮主题')
    .option('-w, --watch-dir <paths...>', '监视目录（支持多个，默认当前工作目录）')
    .action(handlePreview);
}

async function handlePreview(options: Record<string, string | string[]>): Promise<void> {
  const port = parseInt(options.port as string, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    console.error('错误：端口号必须在 1–65535 之间');
    process.exit(1);
  }

  if (options.themeFile) {
    const cssPath = resolve(options.themeFile as string);
    if (!existsSync(cssPath)) {
      console.error(`错误：主题文件不存在: ${cssPath}`);
      process.exit(1);
    }
    if (extname(cssPath).toLowerCase() !== '.css') {
      console.error('错误：主题文件必须是 .css 格式');
      process.exit(1);
    }
    options.themeFile = cssPath;
  }

  let watchDirs: string[];
  if (options.watchDir) {
    const raw = Array.isArray(options.watchDir) ? options.watchDir : [options.watchDir as string];
    watchDirs = raw.flatMap((d: string) => d.split(',').map((s: string) => s.trim())).filter(Boolean);
  } else {
    watchDirs = [process.cwd()];
  }

  for (const dir of watchDirs) {
    const resolved = resolve(dir);
    if (!existsSync(resolved)) {
      console.error(`错误：监视目录不存在: ${resolved}`);
      process.exit(1);
    }
  }

  const { createPreviewServer } = await import('../preview/server.js');

  await createPreviewServer({
    port,
    themeFile: options.themeFile as string | undefined,
    hlTheme: options.hlTheme as string | undefined,
    watchDirs,
    onReady: (p: number) => {
      console.log(`Preview: http://localhost:${p}`);
    },
  });
}
