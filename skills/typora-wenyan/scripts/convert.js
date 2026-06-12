#!/usr/bin/env node
/**
 * Typora → Wenyan 主题转换脚本
 *
 * 用法:
 *   node convert.js <input.css> [output.css]
 *   node convert.js <input.css> --validate    # 仅执行代码审查
 *   node convert.js <input.css> -o <output>   # 指定输出文件
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, extname, basename } from 'node:path';
import { parse, generate, walk, clone } from 'css-tree';

// ─── 禁止选择器（黑名单） ───────────────────────────────────────
// 这些是 Typora 编辑器 UI 样式，必须从输出中移除
const FORBIDDEN_PATTERNS = [
  // 侧栏
  '.sidebar-tabs', '.sidebar-tab',
  // 文件树
  '.file-node-content', '.file-node-title', '.file-node-icon',
  '.file-tree-node', '.file-tree',
  // 菜单
  '.megamenu-menu', '.megamenu-menu-header', '.megamenu-menu-list',
  '.megamenu-content', '.megamenu-opened',
  // 大纲
  '.outline-item', '.outline-expander', '.outline-label',
  '.outline-content', '.outline',
  // 偏好设置
  '.ty-preferences',
  // 快速打开
  '#typora-quick-open',
  // 专注模式
  '.on-focus-mode',
  // 编辑器交互
  '.md-focus', '.md-expand', '.mac-selected',
  // CodeMirror（Typora 内嵌代码编辑器）
  '.CodeMirror', '.CodeMirror-gutters', '.CodeMirror-linenumber',
  '.cm-s-inner', '.sourceLine',
  // 编辑区特有节点
  '.md-toc', '.md-toc-item', '.md-toc-content',
  '.md-tag', '.md-lang',
  '.md-mathjax-midline', '.md-mathjax-preview',
  '.md-rawblock', '.md-rawblock-control',
  '.md-image', '.md-meta', '.md-end-block-tag',
  '.md-diagram-panel', '.md-diagram', '.md-clipboard',
  // 导出
  '.typora-export',
  // Typora 特有 ID 选择器
  '#typora-table-row-tracker',
  '#typora-table-col-tracker',
  '#typora-sidebar',
  '#typora-quick-open',
  '#typora-quick-open-item',
  '#md-searchpanel',
  '#md-notification',
  '#toggle-sourceview-btn',
  '#md-outline',
  '#md-file-tree',
  // CodeMirror 代码编辑器残留
  '.CodeMirror-lines',
  '.code-tooltip',
  // 编辑区 meta 块
  '.md-meta-block',
  '.mathjax-block',
  // 菜单/工具栏/对话框 UI
  '.context-menu',
  '.dropdown-menu',
  '.menu-item-container',
  '.menu-style-btn',
  // 内容块编辑
  '.md-pair-',
];

// ─── 必须选择器（白名单检查用） ──────────────────────────────────
const REQUIRED_SELECTORS = [
  '#wenyan',
  '#wenyan p',
  '#wenyan h1', '#wenyan h2', '#wenyan h3',
  '#wenyan h4', '#wenyan h5', '#wenyan h6',
  '#wenyan img',
  '#wenyan table',
  '#wenyan table th', '#wenyan table td',
  '#wenyan blockquote',
  '#wenyan pre',
  '#wenyan pre code',
  '#wenyan p code',
  '#wenyan a',
  '#wenyan strong', '#wenyan em',
  '#wenyan hr',
  '#wenyan ul', '#wenyan ol', '#wenyan li',
];

// ─── 选择器映射表（精确匹配） ──────────────────────────────────
const SELECTOR_MAP = [
  // 根元素映射（只在精确匹配 #write 时替换，不匹配 #write h1 等复合选择器）
  { from: '#write', to: '#wenyan' },
  // 代码围栏 → pre
  { from: '.md-fences', to: 'pre' },
  // 代码块内部
  { from: '.cm-s-inner', to: 'pre code' },
  // 行内代码
  { from: 'tt', to: 'code' },
];

// at-rule 删除列表
const FORBIDDEN_ATRULES = ['@import', '@include-when-export'];

// ─── 辅助函数 ──────────────────────────────────────────────────

function selectorText(node) {
  return generate(node);
}

/**
 * 检查选择器文本是否包含禁止模式。
 * 使用正则处理 CSS 选择器边界（类/id 选择器独立出现，而非作为前缀/后缀）。
 */
function isForbidden(sel) {
  const text = selectorText(sel);
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (text === pattern) return true;

    // 类选择器：检查 .xxx 是否作为独立选择器出现
    if (pattern.startsWith('.')) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 匹配 .xxx 后面跟着 CSS 边界（空格、>、+、~、:、#、[、. 或字符串结尾）
const re = new RegExp(`${escaped}(?=[\\s>+~:#\\[.]|$)`);
      if (re.test(text)) return true;
    }

    // ID 选择器
    if (pattern.startsWith('#')) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`${escaped}(?=[\\s>+~:#\\[.]|$)`);
      if (re.test(text)) return true;
    }
  }
  return false;
}

function findMapping(sel) {
  const text = selectorText(sel);
  for (const { from, to } of SELECTOR_MAP) {
    if (text === from) {
      return to;
    }
  }
  return undefined;
}

function isForbiddenAtrule(text) {
  for (const pattern of FORBIDDEN_ATRULES) {
    if (text.startsWith(pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * 判断选择器是否需要 #wenyan 前缀。
 * 已经以 #wenyan 开头、:root、伪类/伪元素开头的选择器不需要。
 */
function needsWenyanPrefix(sel) {
  const text = selectorText(sel);
  if (text.startsWith('#wenyan') || text === ':root' || text.startsWith(':')) {
    return false;
  }
  // 如果以 @ 开头（at-rule 内的选择器），跳过 — at-rule 整体处理
  if (text.startsWith('@')) return false;
  return true;
}

function prependWenyan(sel) {
  const text = selectorText(sel);
  const newSel = parse(`#wenyan ${text}`, { context: 'selector' });
  return newSel;
}

function replaceWrite(sel) {
  // 遍历选择器所有子节点，将所有 #write 替换为 #wenyan
  // 处理位置不限（可出现在复合选择器中任意位置）
  sel.children?.forEach((child) => {
    if (child.type === 'IdSelector' && child.name === 'write') {
      child.name = 'wenyan';
    }
  });
  return sel;
}

/**
 * 处理一条选择器（可能是复合的，如 '#write h1 span'）。
 * 返回处理后的选择器，或 null（需删除）。
 */
function processSelector(sel) {
  // 检查黑名单
  if (isForbidden(sel)) {
    return null;
  }

  // 检查映射表
  const mapping = findMapping(sel);
  if (mapping === null) {
    return null;
  }
  if (mapping !== undefined) {
    // 转换为新选择器
    return parse(mapping, { context: 'selector' });
  }

  // 替换 #write → #wenyan
  replaceWrite(sel);

  // 检查是否需要 #wenyan 前缀
  if (needsWenyanPrefix(sel)) {
    return prependWenyan(sel);
  }

  return sel;
}

// ─── 核心转换 ──────────────────────────────────────────────────

// 类选择器 → 元素选择器的后处理映射（字符串级，用于复合选择器内部）
const CLASS_TO_ELEMENT_MAP = [
  { from: '.md-fences', to: 'pre' },
  { from: '.cm-s-inner', to: 'pre code' },
];

function postProcessCss(css) {
  for (const { from, to } of CLASS_TO_ELEMENT_MAP) {
    css = css.replaceAll(from, to);
  }
  return css;
}

function convert(css) {
  const ast = parse(css);

  walk(ast, function (node, item, list) {
    if (node.type === 'Rule') {
      const prelude = node.prelude;
      if (prelude.type !== 'SelectorList') return;

      const newSelectors = [];
      let changed = false;

      prelude.children.forEach((sel) => {
        const processed = processSelector(sel);
        if (processed === null) {
          changed = true;
          return;
        }
        const origText = selectorText(sel);
        const newText = selectorText(processed);
        if (origText !== newText) {
          changed = true;
        }
        newSelectors.push(processed);
      });

      if (newSelectors.length === 0) {
        list.remove(item);
        return;
      }

      if (changed) {
        const newPrelude = parse(
          newSelectors.map((s) => selectorText(s)).join(', '),
          { context: 'selectorList' },
        );
        node.prelude = newPrelude;
      }
    }

    if (node.type === 'Atrule') {
      const text = `@${node.name}`;
      if (isForbiddenAtrule(text)) {
        list.remove(item);
        return;
      }
    }
  });

  return postProcessCss(generate(ast));
}

// ─── 代码审查（门1） ───────────────────────────────────────────

function containsForbidden(text) {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (text === pattern) return pattern;
    if (pattern.startsWith('.') || pattern.startsWith('#')) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`${escaped}(?=[\\s>+~:#\\[.]|$)`);
      if (re.test(text)) return pattern;
    }
  }
  return null;
}

function validate(css) {
  const issues = [];

  // 1. 语法校验
  try {
    parse(css);
  } catch (e) {
    issues.push({ type: 'FAIL', category: '语法', message: `CSS 语法错误: ${e.message}` });
    return issues;
  }

  const ast = parse(css);

  // 2. 禁止选择器扫描
  walk(ast, (node) => {
    if (node.type === 'Rule') {
      const text = selectorText(node.prelude);
      const found = containsForbidden(text);
      if (found) {
        issues.push({ type: 'FAIL', category: '禁止选择器泄漏', message: `发现黑名单选择器: ${found}（在 "${text}" 中）` });
      }
    }
  });

  // 3. #write 残留检测（在选择器中）
  walk(ast, (node) => {
    if (node.type === 'Rule') {
      const text = selectorText(node.prelude);
      if (text.includes('#write')) {
        issues.push({ type: 'FAIL', category: '#write 残留', message: `选择器中仍有 #write: "${text}"` });
      }
    }
  });

  // 4. 必须选择器检查
  for (const required of REQUIRED_SELECTORS) {
    if (!css.includes(required)) {
      issues.push({ type: 'WARN', category: '必须选择器缺失', message: `缺少必需选择器: ${required}` });
    }
  }

  if (issues.length === 0) {
    issues.push({ type: 'PASS', category: '审查通过', message: '所有检查项通过' });
  }

  return issues;
}

// ─── CLI ├─ 入口 ──────────────────────────────────────────────

function printUsage() {
  console.error('用法: node convert.js <input.css> [output.css]');
  console.error('       node convert.js <input.css> --validate');
  console.error('       node convert.js <input.css> -o <output.css>');
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
  }

  const inputPath = resolve(args[0]);
  const isValidate = args.includes('--validate');
  const outputIndex = args.indexOf('-o');
  const outputPath = outputIndex !== -1 ? resolve(args[outputIndex + 1]) : undefined;

  if (!existsSync(inputPath)) {
    console.error(`错误: 输入文件不存在: ${inputPath}`);
    process.exit(1);
  }

  const ext = extname(inputPath).toLowerCase();
  if (ext !== '.css') {
    console.error(`错误: 输入文件必须是 .css 格式，当前: ${ext}`);
    process.exit(1);
  }

  const inputCss = readFileSync(inputPath, 'utf-8');

  if (isValidate) {
    // ── 仅执行代码审查 ──
    const results = validate(inputCss);
    for (const r of results) {
      const icon = r.type === 'PASS' ? '✅' : r.type === 'WARN' ? '⚠️' : '❌';
      console.log(`${icon} [${r.category}] ${r.message}`);
    }
    const failCount = results.filter((r) => r.type === 'FAIL').length;
    process.exit(failCount > 0 ? 1 : 0);
  }

  // ── 执行转换 ──
  try {
    const outputCss = convert(inputCss);

    if (outputPath) {
      writeFileSync(outputPath, outputCss, 'utf-8');
      console.log(`转换完成: ${outputPath}`);
      console.log(`输入大小: ${Buffer.byteLength(inputCss, 'utf-8')} bytes`);
      console.log(`输出大小: ${Buffer.byteLength(outputCss, 'utf-8')} bytes`);
    } else {
      process.stdout.write(outputCss);
    }
  } catch (e) {
    console.error(`转换失败: ${e.message}`);
    process.exit(1);
  }
}

main();
