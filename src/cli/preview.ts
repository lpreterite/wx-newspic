import { Command } from 'commander';

export function registerPreviewCommand(program: Command): void {
  program
    .command('preview')
    .description('启动本地预览服务（分屏编辑器 + 即时主题切换）')
    .option('-p, --port <number>', '监听端口', '3030')
    .action(handlePreview);
}

async function handlePreview(options: Record<string, string>): Promise<void> {
  const port = parseInt(options.port, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    console.error('错误：端口号必须在 1–65535 之间');
    process.exit(1);
  }

  const { createPreviewServer } = await import('../preview/server.js');

  await createPreviewServer({
    port,
    onReady: (p: number) => {
      console.log(`Preview: http://localhost:${p}`);
    },
  });
}
