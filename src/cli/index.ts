import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerPublishCommand } from './publish.js';
import { registerRenderCommand } from './render.js';
import { registerServeCommand } from './serve.js';
import { registerCredentialCommand } from './credential.js';
import { registerThemeCommand } from './theme.js';
import { registerPreviewCommand } from './preview.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 读取版本号
 */
function getVersion(): string {
  try {
    const pkgPath = resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.1.0';
  } catch {
    return '0.1.0';
  }
}

/**
 * 运行 CLI
 */
export async function runCLI(): Promise<void> {
  const program = new Command();

  program
    .name('wx-newspic')
    .description('微信公众号「图片消息」（小绿书）自动化发布工具')
    .version(getVersion(), '--version', '查看版本号')
    .helpOption('-h, --help', '查看帮助');

  // 注册子命令
  registerPublishCommand(program);
  registerRenderCommand(program);
  registerServeCommand(program);
  registerCredentialCommand(program);
  registerThemeCommand(program);
  registerPreviewCommand(program);

  await program.parseAsync(process.argv);
}
