import { Command } from 'commander';
import { registerPublishCommand } from './publish.js';
import { registerRenderCommand } from './render.js';
import { registerServeCommand } from './serve.js';
import { registerCredentialCommand } from './credential.js';
import { registerThemeCommand } from './theme.js';
import { registerPreviewCommand } from './preview.js';
import { VERSION } from './version.js';

/**
 * 运行 CLI
 */
export async function runCLI(): Promise<void> {
  const program = new Command();

  program
    .name('wx-newspic')
    .description('微信公众号「图片消息」（小绿书）自动化发布工具')
    .version(VERSION, '--version', '查看版本号')
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
