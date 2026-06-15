#!/usr/bin/env node
// 质量门禁修正循环 — Step 3
// 用法: node apply-correction.mjs <theme-name> <css-file-path>
// 输出: JSON { pass, file, corrections, rounds }
//
// 该脚本执行质量门禁验证，输出结构化失败项。
// AI 解析输出、修正 CSS、重新调用本脚本，最多 3 轮。

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const themeName = process.argv[2];
const cssFile = process.argv[3];
const scriptDir = new URL('.', import.meta.url).pathname;
const validateScript = path.join(scriptDir, 'validate-theme.sh');

if (!themeName || !cssFile) {
  console.error(JSON.stringify({ error: '用法: node apply-correction.mjs <theme-name> <css-file-path>' }));
  process.exit(1);
}

if (!fs.existsSync(cssFile)) {
  console.error(JSON.stringify({ error: `CSS 文件不存在: ${cssFile}` }));
  process.exit(1);
}

// 确定这是第几轮（通过 CSS 文件名后缀）
const roundMatch = cssFile.match(/\.round(\d+)\.css$/);
const round = roundMatch ? parseInt(roundMatch[1]) : 1;

if (round > 3) {
  const result = { pass: false, error: '超过 3 轮修正上限', round, file: cssFile };
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

// 运行验证
const validateOut = execSync(`bash "${validateScript}" "${cssFile}"`, { encoding: 'utf-8' });
const validation = JSON.parse(validateOut);
validation.round = round;
validation.file = cssFile;

if (validation.pass) {
  // 通过 → 写入正式主题
  const themesDir = path.join(getHome(), '.wx-newspic', 'themes');
  fs.mkdirSync(themesDir, { recursive: true });
  const dest = path.join(themesDir, `${themeName}.css`);
  fs.copyFileSync(cssFile, dest);
  validation.savedTo = dest;
  console.log(JSON.stringify(validation, null, 2));
} else {
  // 不通过 → 输出失败项详情供 AI 修正
  const fails = validation.checks.filter(c => !c.pass);
  validation.failDetails = fails.map(f => ({
    name: f.name,
    detail: f.detail || '请检查 CSS 定义',
    suggestion: getSuggestion(f.name),
  }));
  validation.nextFile = cssFile.replace(/\.round\d*\.css$/, '') + `.round${round + 1}.css`;
  console.log(JSON.stringify(validation, null, 2));
  process.exit(0);
}

function getHome() {
  return process.env.HOME || process.env.USERPROFILE || '/tmp';
}

function getSuggestion(name) {
  const map = {
    '无 position 定位': '删除 position: absolute/fixed/relative 属性',
    '无媒体查询/动画': '移除 @media 和 @keyframes 规则',
    '选择器前缀 #wenyan': '所有选择器必须以 #wenyan 开头，如 #wenyan h1, #wenyan p',
    '根 line-height 1.75': '在 #wenyan {} 中添加 line-height: 1.75',
    '根 font-size 16px': '在 #wenyan {} 中添加 font-size: 16px',
    '图片 max-width 100%': '添加 #wenyan img { max-width: 100%; height: auto }',
    '表格 border-collapse': '添加 #wenyan table { border-collapse: collapse }',
    '引用块左边框': '添加 #wenyan blockquote { border-left: 4px solid #ddd; padding-left: 1em }',
    '内联代码区分': '添加 #wenyan p code { background: #f5f5f5; padding: 2px 4px }',
    '标题层级区分': '分别为 #wenyan h1 和 #wenyan h2 定义不同的 font-size',
    '正文避免纯黑': '将正文 color 从 #000 改为 #3f3f3f 或 #333',
  };
  return map[name] || '请检查该项 CSS 定义';
}
