#!/usr/bin/env node
// 从公众号文章 HTML 中提取视觉参数
// 用法: node extract-visual.mjs <path/to/fetch-output.json>
// 管道: node fetch-article.mjs <url> | node extract-visual.mjs

import fs from 'node:fs';
import { createInterface } from 'node:readline';

const INLINE_TAGS = new Set(['span', 'strong', 'em', 'a', 'code', 'b', 'i', 'u', 's', 'q', 'cite']);

// CSS 颜色名 → 十六进制映射（常用子集）
const NAMED_COLORS = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
  blue: '#0000ff', gray: '#808080', grey: '#808080', silver: '#c0c0c0',
  orange: '#ffa500', purple: '#800080', yellow: '#ffff00',
};

function normalizeColor(val) {
  const v = val.trim().toLowerCase();
  if (v.startsWith('#')) return v.slice(0, 7);
  if (v.startsWith('rgb')) {
    const m = v.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return `#${[m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')}`;
  }
  return NAMED_COLORS[v] || val;
}

function hexToLuminance(hex) {
  const h = hex.replace('#', '');
  if (h.length < 6) return 255;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function suggestHlTheme(isDark) {
  if (isDark) {
    return {
      theme: 'atom-one-dark',
      alternatives: ['dracula', 'github-dark', 'monokai', 'solarized-dark'],
      comment: '/* hljs-theme: atom-one-dark */\n/* 深色背景文章推荐搭配 dark hljs 主题，可用 --hl-theme <名称> 指定 */',
    };
  }
  return {
    theme: 'atom-one-light',
    alternatives: ['github', 'solarized-light', 'xcode'],
    comment: '/* hljs-theme: atom-one-light */\n/* 浅色背景文章推荐搭配 light hljs 主题，可用 --hl-theme <名称> 指定 */',
  };
}

function parseInlineStyle(styleStr) {
  const props = {};
  for (const decl of styleStr.split(';')) {
    const [k, ...v] = decl.split(':');
    if (k && v.length) props[k.trim()] = v.join(':').trim();
  }
  return props;
}

// 主频数统计 — 取出现次数最多的值
function mode(arr) {
  if (!arr.length) return null;
  const freq = {};
  let maxF = 0, maxV = null;
  for (const x of arr) {
    const k = String(x);
    freq[k] = (freq[k] || 0) + 1;
    if (freq[k] > maxF) { maxF = freq[k]; maxV = x; }
  }
  return maxV;
}

// 判断是否为显著的加粗
function isBold(val) {
  if (!val) return false;
  const v = val.toLowerCase().replace('!important', '').trim();
  return v === 'bold' || v === 'bolder' || v === '700' || parseInt(v) >= 600;
}

async function readInput() {
  const filePath = process.argv[2];
  if (filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  // 从 stdin 读取
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

const input = await readInput();

const html = input.contentHtml || '';

// ═══════════════════════════════════════════
// 阶段 1：按标签名聚合（同原有逻辑）
// ═══════════════════════════════════════════

const elements = {}; // tagName → { fontSize[], color[], ... }
const counters = {}; // tagName → count

// 新增：逐元素的行内实例记录
const inlineInstances = []; // { tag, color, fontWeight, fontStyle, bgColor }

const tagRe = /<(\w+)([^>]*?)>/gi;
let m;
while ((m = tagRe.exec(html)) !== null) {
  const [, tag, attrs] = m;
  if (['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tag)) continue;

  counters[tag] = (counters[tag] || 0) + 1;

  const styleMatch = attrs.match(/\bstyle\s*=\s*["']([^"']*)["']/i);
  if (!styleMatch) continue;

  if (!elements[tag]) elements[tag] = { fontSize: [], color: [], bgColor: [], lineHeight: [], fontWeight: [], textAlign: [], padding: [], margin: [], borderLeft: [] };

  const props = parseInlineStyle(styleMatch[1]);
  if (props['font-size']) elements[tag].fontSize.push(props['font-size']);
  if (props['color']) {
    const nc = normalizeColor(props['color']);
    elements[tag].color.push(nc);
  }
  if (props['background-color'] || props['background']) elements[tag].bgColor.push(normalizeColor(props['background-color'] || props['background']));
  if (props['line-height']) elements[tag].lineHeight.push(props['line-height']);
  if (props['font-weight']) elements[tag].fontWeight.push(props['font-weight']);
  if (props['text-align']) elements[tag].textAlign.push(props['text-align']);
  if (props['padding']) elements[tag].padding.push(props['padding']);
  if (props['margin']) elements[tag].margin.push(props['margin']);
  if (props['border-left']) elements[tag].borderLeft.push(props['border-left']);

  // 行内元素直接记录的完整属性组合
  if (INLINE_TAGS.has(tag)) {
    inlineInstances.push({
      tag,
      color: props['color'] ? normalizeColor(props['color']) : null,
      fontWeight: props['font-weight'] || null,
      fontStyle: props['font-style'] || null,
      bgColor: (props['background-color'] || props['background']) ? normalizeColor(props['background-color'] || props['background']) : null,
    });
  }
}

// ═══════════════════════════════════════════
// 阶段 2：行内强调色推断
// ═══════════════════════════════════════════

// 2a. 确定 bodyColor（取自 p 的 color 众数）
const bodyColor = mode((elements['p'] && elements['p'].color) || []) || '#222';

// 2b. 收集加粗实例（fontWeight = bold/bolder/700+）
const boldInstances = inlineInstances.filter(i => isBold(i.fontWeight));

// 按颜色频数分组（排除 bodyColor）
const boldColorFreq = {};
for (const inst of boldInstances) {
  if (inst.color && inst.color !== bodyColor) {
    boldColorFreq[inst.color] = (boldColorFreq[inst.color] || 0) + 1;
  }
}

// 2c. 收集斜体实例（em 标签 或 font-style: italic）
const italicInstances = inlineInstances.filter(i =>
  i.tag === 'em' || (i.fontStyle && i.fontStyle.toLowerCase() === 'italic')
);

const italicColorFreq = {};
for (const inst of italicInstances) {
  if (inst.color && inst.color !== bodyColor) {
    italicColorFreq[inst.color] = (italicColorFreq[inst.color] || 0) + 1;
  }
}

// 2d. 收集链接颜色（a 标签）
const linkColors = inlineInstances
  .filter(i => i.tag === 'a' && i.color)
  .map(i => i.color);

// 2e. 其他强调色：行内元素具有独特颜色且 ≥2 次出现的
const otherColorFreq = {};
for (const inst of inlineInstances) {
  // 排除已纳入 bold/italic/link 的记录
  if (!inst.color || inst.color === bodyColor) continue;
  otherColorFreq[inst.color] = (otherColorFreq[inst.color] || 0) + 1;
}

const isDarkBackground = hexToLuminance(bodyColor) < 128;
const suggestedHlTheme = suggestHlTheme(isDarkBackground);

const inlineAccents = { bodyColor, isDarkBackground, suggestedHlTheme };

// 构建 boldAccent：取频数最高的非 bodyColor 加粗色
const sortedBold = Object.entries(boldColorFreq).sort((a, b) => b[1] - a[1]);
if (sortedBold.length) {
  inlineAccents.boldAccent = {
    color: sortedBold[0][0],
    count: sortedBold[0][1],
    sourceTags: [...new Set(boldInstances.filter(i => i.color === sortedBold[0][0]).map(i => i.tag))],
  };
}

// 构建 italicAccent
if (italicColorFreq) {
  const sortedItalic = Object.entries(italicColorFreq).sort((a, b) => b[1] - a[1]);
  if (sortedItalic.length) {
    inlineAccents.italicAccent = {
      color: sortedItalic[0][0],
      count: sortedItalic[0][1],
      sourceTags: [...new Set(italicInstances.filter(i => i.color === sortedItalic[0][0]).map(i => i.tag))],
    };
  }
}

// 构建 linkColor
if (linkColors.length) {
  const linkColorMode = mode(linkColors);
  const linkCount = linkColors.filter(c => c === linkColorMode).length;
  inlineAccents.linkColor = { color: linkColorMode, count: linkCount };
}

// 构建其他强调色（去掉 boldAccent 和 italicAccent 已计入的颜色）
const accentColorsUsed = new Set([bodyColor]);
if (inlineAccents.boldAccent) accentColorsUsed.add(inlineAccents.boldAccent.color);
if (inlineAccents.italicAccent) accentColorsUsed.add(inlineAccents.italicAccent.color);
if (inlineAccents.linkColor) accentColorsUsed.add(inlineAccents.linkColor.color);

const otherAccents = Object.entries(otherColorFreq)
  .filter(([color, count]) => !accentColorsUsed.has(color) && count >= 2)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([color, count]) => ({ color, count }));

if (otherAccents.length) inlineAccents.otherAccents = otherAccents;

// ═══════════════════════════════════════════
// 输出
// ═══════════════════════════════════════════

const visualProfile = {
  title: input.title || '',
  elementCount: counters,
  totalInlineStyles: Object.values(elements).reduce((sum, e) => sum + e.fontSize.length, 0),
  elements: {},
  styleBlocks: input.totalStyles || 0,
  images: input.images || [],
  inlineAccents,
};

for (const [tag, vals] of Object.entries(elements)) {
  const profile = {};
  for (const [prop, arr] of Object.entries(vals)) {
    if (arr.length) {
      profile[prop] = {
        values: [...new Set(arr)].slice(0, 8),
        ...(prop === 'fontSize' ? { range: [arr[0], arr[arr.length - 1]].filter(Boolean).join(' ~ ') } : {}),
      };
    }
  }
  if (Object.keys(profile).length) {
    visualProfile.elements[tag] = profile;
  }
}

console.log(JSON.stringify(visualProfile, null, 2));
