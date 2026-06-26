# Tech Design v040: preview 文件浏览器面板

**Status**: Draft
**Version**: v0.1
**Last Updated**: 2026-06-26
**Parent Issue**: [#56](https://github.com/lpreterite/wx-newspic/issues/56)
**Sub-issues**: [#58](https://github.com/lpreterite/wx-newspic/issues/58) CLI 参数, [#59](https://github.com/lpreterite/wx-newspic/issues/59) 后端 API, [#60](https://github.com/lpreterite/wx-newspic/issues/60) 前端侧栏, [#61](https://github.com/lpreterite/wx-newspic/issues/61) 单元测试, [#62](https://github.com/lpreterite/wx-newspic/issues/62) E2E 验收

---

## 1. Overview

### 1.1 目标

为 `wx-newspic preview` 添加左侧文件浏览器侧栏，用户可浏览目录树、点击 .md 文件加载到编辑器、即时刷新预览，无需手动复制粘贴。

### 1.2 范围

- CLI `--watch-dir` 参数（支持多目录）
- `GET /files` 目录树 API
- `GET /file` 文件内容 API
- 前端侧栏面板（可折叠、目录树、文件加载）
- 单元测试 + E2E 测试

### 1.3 Non-Goals

- 不做文件创建/删除/重命名
- 不做文件搜索/排序/过滤
- 不做文件监视/热重载（文件变更不自动刷新）

---

## 2. Architecture

### 2.1 数据流

```
CLI (preview.ts)
  │ 解析 --watch-dir → watchDirs[]
  │
  ▼
Server (server.ts) ← HTTP → Browser (template.ts)
  │                            │
  │  GET /?watchDirs=...       │ 渲染页面（侧栏初始化）
  │◄───────────────────────────│
  │                            │
  │  GET /files?dir=<path>     │ 获取目录树
  │◄───────────────────────────│
  │  └→ scanDirectory()        │
  │     └→ 返回 2 层 JSON      │
  │                            │
  │  GET /file?path=<path>     │ 用户点击文件
  │◄───────────────────────────│
  │  └→ fs.readFile()          │
  │     └→ 返回 {content, name}│
  │                            │
  │  POST /render (已有)       │ 自动触发渲染
  │◄───────────────────────────│
  │  └→ renderArticle()        │
  │     └→ 返回 styled HTML    │
  │                            │
  │  ← iframe.srcdoc = HTML    │ 预览刷新
```

### 2.2 模块划分

| 层 | 文件 | 职责 |
|----|------|------|
| CLI | `src/cli/preview.ts` | `--watch-dir` 参数解析、校验、传递 |
| 后端 | `src/preview/server.ts` | `GET /files`、`GET /file` 路由 + 安全校验 |
| 后端 | `src/preview/directory.ts` | （新增）目录扫描、文件树构建（独立函数方便测试） |
| 前端 | `src/preview/template.ts` | 侧栏 HTML/CSS/JS 全部 inline |
| 测试 | `test/unit/preview/server.test.ts` | `GET /files`、`GET /file` 单元测试 |
| 测试 | `test/e2e/preview/file-browser.test.ts` |（新增）Playwright E2E 测试 |

---

## 3. CLI 层 (#58)

### 3.1 参数定义

```typescript
program
  .command('preview')
  .option('-p, --port <number>', '监听端口', '3030')
  .option('-f, --theme-file <path>', '自定义主题 CSS 文件路径')
  .option('--hl-theme <string>', '默认代码高亮主题')
  .option('-w, --watch-dir <paths...>', '监视目录（支持多个，默认当前目录）');
```

### 3.2 参数解析（按优先级）

1. Commander 原生 `variadic` 支持：`-w ./a -w ./b` → `['./a', './b']`
2. 逗号分隔展开：`-w ./a,./b` → `['./a', './b']`
3. 最终合并为 flat string[]
4. 默认值：未传参时使用 `process.cwd()`

### 3.3 目录校验

```typescript
// 每个目录必须存在，否则报错退出
for (const dir of watchDirs) {
  if (!existsSync(dir)) {
    console.error(`错误：监视目录不存在: ${dir}`);
    process.exit(1);
  }
}
```

### 3.4 传递到 Server

```typescript
await createPreviewServer({
  port,
  watchDirs,  // string[]，新增
  themeFile: options.themeFile,
  hlTheme: options.hlTheme,
  onReady: (p) => { ... },
});
```

---

## 4. 后端 API (#59)

### 4.1 新增类型

```typescript
// server.ts - PreviewServerOptions 扩展
export interface PreviewServerOptions {
  port: number;
  host?: string;
  onReady?: (port: number) => void;
  themeFile?: string;
  hlTheme?: string;
  watchDirs?: string[];  // 新增
}

// 目录树节点
export interface FileTreeNode {
  name: string;
  path: string;      // 相对路径（相对于 watchDir），用于前端 fetch
  type: 'dir' | 'file';
  children?: FileTreeNode[];
  hasMore?: boolean;  // dir 专用：是否有更深层子目录
}
```

### 4.2 GET /files?dir=<path>

扫描指定目录，返回最大 2 层深度的目录树。

**请求**：
```
GET /files?dir=articles
# 或
GET /files?dir=articles/drafts
```

**响应**：
```json
[
  {
    "name": "articles",
    "path": "articles",
    "type": "dir",
    "hasMore": true,
    "children": [
      {
        "name": "drafts",
        "path": "articles/drafts",
        "type": "dir",
        "hasMore": false,
        "children": [
          { "name": "draft-1.md", "path": "articles/drafts/draft-1.md", "type": "file" }
        ]
      },
      { "name": "intro.md", "path": "articles/intro.md", "type": "file" },
      { "name": "guide.md", "path": "articles/guide.md", "type": "file" }
    ]
  }
]
```

**逻辑**（`src/preview/directory.ts` 新增）：

```typescript
function scanDirectory(dirPath: string, maxDepth: number = 2): FileTreeNode[] {
  // 1. 读取目录
  // 2. 过滤：只保留目录和 .md 文件
  // 3. 递归：对目录递归最多 maxDepth 层
  // 4. hasMore：如果递归到 maxDepth 层时该目录仍有子目录 → hasMore = true
  // 5. 排序：目录在前，文件在后，各按名称字母序
}
```

**安全校验**：

```typescript
function isPathSafe(requestedPath: string, allowedDirs: string[]): boolean {
  const resolved = resolve(requestedPath);
  return allowedDirs.some((dir) => {
    const allowed = resolve(dir);
    return resolved === allowed || resolved.startsWith(allowed + '/');
  });
}
```

- 校验 `dir` 参数和 `path` 参数都必须在 `watchDirs` 范围内
- 拒绝路径遍历攻击（`../`）
- 超出范围返回 403

**过滤规则**：

- 文件：仅保留 `.md` 后缀（不区分大小写）
- 目录：保留所有目录（目录名不参与过滤）
- 隐藏文件/目录（以 `.` 开头）：不显示

### 4.3 GET /file?path=<path>

读取指定 .md 文件内容。

**请求**：
```
GET /file?path=articles/intro.md
```

**响应**（200）：
```json
{
  "content": "# intro\n\ncontent here...",
  "name": "intro.md"
}
```

**错误响应**（404）：
```json
{ "error": "文件不存在" }
```

**安全校验**：同上 `isPathSafe()`，违规返回 403。

---

## 5. 前端侧栏 (#60)

### 5.1 HTML 结构

在 `.split` 容器中，editor 左侧插入侧栏：

```html
<div class="file-sidebar" id="fileSidebar">
  <div class="sidebar-header">
    <span class="sidebar-title">文件</span>
    <button id="sidebarToggle" class="sidebar-toggle" title="收起侧栏">
      <i class="fa fa-chevron-left"></i>
    </button>
  </div>
  <div class="file-tree" id="fileTree">
    <!-- 由 JS 动态渲染 -->
  </div>
</div>
```

收起态：sidebat 移除 `expanded` class，宽度塌缩为 0。

展开按钮迁移到 header 中：

```html
<button id="sidebarShowBtn" class="sidebar-show-btn" title="展开侧栏">
  <i class="fa fa-bars"></i>
</button>
```

### 5.2 CSS 规格

```
.file-sidebar           宽度: 260px; 默认 expanded; 过渡 .2s
.file-sidebar:not(.expanded)  宽度: 0; overflow: hidden
.file-tree-item         height: 36px; padding: 0 12px
.file-tree-item:hover   background: #f0f0f0
.file-tree-item.active  background: #e3f2fd
.file-tree-icon         width: 20px; text-align: center
.file-tree-indent       padding-left: 24px (每层 +24px)
.sidebar-header         height: 40px; border-bottom: 1px solid #ddd
```

**响应式**：≤768px 时 `.file-sidebar` 默认隐藏，保留展开按钮。

### 5.3 目录树渲染逻辑

```javascript
async function loadFileTree() {
  const watchDirs = JSON.parse(sidebar.dataset.dirs);  // 从 data-* 属性获取
  const tree = document.getElementById('fileTree');
  tree.innerHTML = '';

  for (const dir of watchDirs) {
    const data = await fetch(`/files?dir=${encodeURIComponent(dir)}`).then(r => r.json());
    const section = createDirSection(dir, data);
    tree.appendChild(section);
  }
}

function createDirSection(name, nodes, depth = 0) {
  const ul = document.createElement('ul');
  for (const node of nodes) {
    const li = document.createElement('li');
    li.className = 'file-tree-item';
    if (node.type === 'dir') {
      li.innerHTML = `
        <span class="file-tree-icon"><i class="fa fa-caret-right"></i></span>
        <span class="file-tree-icon"><i class="fa fa-folder"></i></span>
        <span>${escapeHtml(node.name)}</span>
      `;
      li.onclick = () => toggleDir(li, node);
      if (node.children) {
        const childUl = createDirSection('', node.children, depth + 1);
        childUl.style.display = 'none';
        li.appendChild(childUl);
      }
    } else {
      li.innerHTML = `
        <span class="file-tree-icon"></span>
        <span class="file-tree-icon"><i class="fa fa-file-text-o"></i></span>
        <span>${escapeHtml(node.name)}</span>
      `;
      li.onclick = () => loadFile(node.path);
    }
    ul.appendChild(li);
  }
  return ul;
}
```

### 5.4 文件加载交互

```javascript
async function loadFile(filePath) {
  try {
    const res = await fetch(`/file?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) {
      alert('文件加载失败');
      return;
    }
    const data = await res.json();

    // 1. 更新选中态
    document.querySelectorAll('.file-tree-item.active').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // 2. 填充编辑器
    editor.value(data.content);

    // 3. 重置编辑器滚动到顶部
    editor.codemirror.scrollTo(0, 0);

    // 4. 触发预览刷新
    clearTimeout(renderTimeout);
    render();
  } catch {
    alert('文件加载失败');
  }
}
```

### 5.5 侧栏展开/收起

```javascript
// 展开/收起
document.getElementById('sidebarToggle').onclick = () => {
  const sidebar = document.getElementById('fileSidebar');
  sidebar.classList.toggle('expanded');
  // 更新按钮图标
  const icon = sidebarToggle.querySelector('i');
  icon.className = sidebar.classList.contains('expanded') ? 'fa fa-chevron-left' : 'fa fa-chevron-right';
  // 保存状态
  localStorage.setItem('sidebarExpanded', sidebar.classList.contains('expanded'));
};

// 初始化时恢复状态
const saved = localStorage.getItem('sidebarExpanded');
if (saved === 'false') {
  document.getElementById('fileSidebar').classList.remove('expanded');
}
```

### 5.6 首次加载

- 页面初始化时，侧栏加载后自动点击第一个 .md 文件
- 如果没有 .md 文件，显示空状态提示

### 5.7 页面模板集成

在 `renderPreviewPage()` 中：

1. 新增参数：`watchDirs: string[]`
2. 将 `watchDirs` 序列化为 JSON 放入侧栏的 `data-dirs` 属性
3. 页面加载后调用 `loadFileTree()`

```typescript
export function renderPreviewPage(markdown: string, watchDirs: string[]): string {
  // ...
  // data-dirs 注入
  `<div class="file-sidebar" id="fileSidebar" data-dirs='${JSON.stringify(watchDirs)}'>`
  // ...
  // 初始化调用
  `<script>loadFileTree();</script>`
}
```

---

## 6. 测试策略

### 6.1 单元测试 — #61（文件：`test/unit/preview/server.test.ts`）

| # | 用例 | 预期 |
|---|------|------|
| 1 | `GET /files` 返回正确目录树结构 | 状态 200，JSON 数组含 FileTreeNode |
| 2 | `GET /files` 过滤非 .md 文件 | 非 .md 文件不在结果中 |
| 3 | `GET /files` 限制最大 2 层深度 | 第三层目录不展开，hasMore = true |
| 4 | `GET /files` 路径越权被拒绝 | 状态 403 |
| 5 | `GET /file` 返回正确文件内容 | 状态 200，含 content + name |
| 6 | `GET /file` 文件不存在返回 404 | 状态 404 |
| 7 | `GET /file` 路径越权被拒绝 | 状态 403 |

### 6.2 E2E 测试 — #62（文件：`test/e2e/preview/file-browser.test.ts`）

| # | 场景 | 断言 |
|---|------|------|
| 1 | 默认无参数 → 侧栏可见 + 显示当前目录树 | 侧栏 DOM 存在、文件列表含 .md |
| 2 | 单目录 `--watch-dir` → 仅显示该目录 | 文件树只含 fixtures/articles 下内容 |
| 3 | 多目录 → 两个顶级区块 | 两个目录根节点 |
| 4 | 点击 .md 文件 → 加载 Editor + 触发 Preview | Editor value() 变化、iframe srcdoc 更新 |
| 5 | 侧栏收起/展开 | 点击按钮后侧栏宽度变化 |
| 6 | 非 .md 文件过滤 | logo.png 不显示在树中 |

### 6.3 测试 fixture 结构

```
test/e2e/preview/fixtures/
  articles/
    intro.md       → "# intro\n\ncontent"
    getting-started.md → "# getting-started\n\ncontent"
    drafts/
      draft-1.md   → "# draft-1\n\ncontent"
  docs/
    readme.md      → "# readme\n\ncontent"
    setup-guide.md → "# setup\n\ncontent"
  assets/
    logo.png       ← 应被过滤
```

---

## 7. Security

### 7.1 路径遍历防护

所有通过 URL 参数传入的路径（`dir`、`path`）必须通过以下校验：

```typescript
function isPathSafe(requestedPath: string, allowedDirs: string[]): boolean {
  const resolved = resolve(stripLeadingSlash(requestedPath));
  return allowedDirs.some((allowed) => {
    const base = resolve(allowed);
    return resolved === base || resolved.startsWith(base + '/');
  });
}
```

### 7.2 编码处理

- URL 参数中的路径使用 `encodeURIComponent`/`decodeURIComponent` 处理
- 中文文件名不受影响

---

## 8. Key Design Decisions

| # | 决策 | 选项 | 选择理由 |
|---|------|------|----------|
| 1 | 目录树深度 | 全量返回 vs 2 层 + 按需加载 | 2 层 + 按需。避免大目录全量返回性能问题，按需展开对用户几乎无感知 |
| 2 | 前端架构 | inline template.ts vs React/Vue | inline。保持零外部 JS 依赖，与现有架构一致 |
| 3 | 侧栏默认状态 | 展开 vs 收起 | 展开。首次用户立即感知新功能 |
| 4 | 图标库 | Font Awesome vs CSS 符号 | Font Awesome 4.7。已在页面中加载，零额外开销 |
| 5 | 错误提示 | alert vs UI 内嵌 | alert。简单可靠，符合最小改动原则 |
| 6 | 加载滚动位置 | 重置顶部 vs 保持 | 重置顶部。新文件从头开始阅读是自然预期 |
| 7 | 多目录展示 | 目录名 header vs 展开根节点 | 目录名 header。更清晰区分项目归属 |

---

## 9. Appendix

### 9.1 配置文件变更

```diff
// package.json
  "devDependencies": {
+   "playwright": "^1.x",
  }
```

### 9.2 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/cli/preview.ts` | 修改 | 新增 --watch-dir 参数 |
| `src/preview/server.ts` | 修改 | 新增 watchDirs、/files、/file 路由 |
| `src/preview/directory.ts` | **新增** | scanDirectory() 独立模块 |
| `src/preview/template.ts` | 修改 | 侧栏 HTML/CSS/JS |
| `src/preview/index.ts` | 修改 | 导出新类型（如需要） |
| `test/unit/preview/server.test.ts` | 修改 | 新增 7 个测试 |
| `test/e2e/preview/file-browser.test.ts` | **新增** | Playwright E2E 测试 |
| `test/e2e/preview/fixtures/` | **新增** | 测试 fixture 目录结构 |
| `package.json` | 修改 | 新增 playwright devDep |

### 9.3 引用文档

- [PRD-v040: preview 文件浏览器面板](../product/PRD-v040-preview-file-browser.md)
- [PRD-001: wx-newspic 主 PRD](../product/PRD-001-wx-newspic.md)
- [Stage Gate Checklists](../ai-engineering/checklists.md)

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.1 | 2026-06-26 | 初始版本 |
