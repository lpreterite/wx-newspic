import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, extname, basename, homedir } from 'node:path';
import { Command } from 'commander';
import { listThemes } from '../renderer/themes.js';

const THEMES_DIR = resolve(homedir(), '.wx-newspic', 'themes');

function ensureDir(): void {
  if (!existsSync(THEMES_DIR)) {
    mkdirSync(THEMES_DIR, { recursive: true });
  }
}

function listCustomThemes(): { id: string; name: string }[] {
  ensureDir();
  const files = readdirSync(THEMES_DIR);
  return files
    .filter((f) => f.endsWith('.css'))
    .map((f) => {
      const id = basename(f, '.css');
      return { id, name: id };
    });
}

export function registerThemeCommand(program: Command): void {
  const cmd = program
    .command('theme')
    .description('管理自定义主题（列出 / 添加 / 删除）');

  cmd
    .command('list')
    .description('列出所有可用主题（内置 + 自定义）')
    .action(handleList);

  cmd
    .command('add')
    .description('添加自定义主题')
    .argument('<name>', '主题名称')
    .argument('<path>', '主题 CSS 文件路径')
    .action(handleAdd);

  cmd
    .command('remove')
    .description('删除自定义主题')
    .argument('<name>', '主题名称')
    .action(handleRemove);
}

export function handleList(): void {
  const builtin = listThemes();
  const custom = listCustomThemes();

  console.log('内置主题:');
  if (builtin.length === 0) {
    console.log('  (无)');
  } else {
    for (const t of builtin) {
      console.log(`  ${t.id.padEnd(16)} ${t.name}`);
    }
  }

  console.log('');
  console.log('自定义主题:');
  if (custom.length === 0) {
    console.log('  (无)');
  } else {
    for (const t of custom) {
      console.log(`  ${t.id.padEnd(16)} ${t.name}`);
    }
  }
}

export function handleAdd(name: string, path: string): void {
  const cssPath = resolve(path);

  if (!existsSync(cssPath)) {
    console.error(`错误：CSS 文件不存在: ${cssPath}`);
    process.exit(1);
  }

  const ext = extname(cssPath).toLowerCase();
  if (ext !== '.css') {
    console.error(`错误：文件必须是 .css 格式，当前: ${ext}`);
    process.exit(1);
  }

  ensureDir();
  const dest = resolve(THEMES_DIR, `${name}.css`);

  if (existsSync(dest)) {
    console.error(`错误：主题 "${name}" 已存在，请先删除`);
    process.exit(1);
  }

  copyFileSync(cssPath, dest);
  console.log(`主题 "${name}" 已添加（${dest}）`);
  console.log(`用法: wx-newspic render --theme-file ${dest} --theme ${name}`);
}

export function handleRemove(name: string): void {
  ensureDir();
  const dest = resolve(THEMES_DIR, `${name}.css`);

  if (!existsSync(dest)) {
    console.error(`错误：主题 "${name}" 不存在`);
    process.exit(1);
  }

  unlinkSync(dest);
  console.log(`主题 "${name}" 已删除`);
}
