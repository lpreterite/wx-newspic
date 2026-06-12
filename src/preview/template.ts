export function renderPreviewPage(markdown: string, themes: { id: string; name: string }[]): string {
  const themeOptions = themes.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Wenyan 预览</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; }

.header {
  display: flex; align-items: center; gap: 12px;
  height: 48px; padding: 0 16px;
  background: #fff; border-bottom: 1px solid #ddd;
  position: sticky; top: 0; z-index: 10;
}
.header h1 { font-size: 15px; font-weight: 600; margin-right: auto; }
.header select {
  padding: 4px 8px; font-size: 13px;
  border: 1px solid #ccc; border-radius: 4px;
  background: #fff;
}
.header button {
  padding: 4px 16px; font-size: 13px;
  border: 1px solid #07c; border-radius: 4px;
  background: #07c; color: #fff; cursor: pointer;
}
.header button:hover { background: #069; }
.header .status {
  font-size: 12px; color: #999; min-width: 60px;
}

.split {
  display: flex; height: calc(100vh - 48px);
}
.split textarea {
  flex: 1; resize: none; border: none;
  padding: 16px; font-size: 14px; line-height: 1.6;
  font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
  outline: none; background: #fafafa;
  border-right: 1px solid #ddd;
}
.split iframe {
  flex: 1; border: none; background: #fff;
}

@media (max-width: 768px) {
  .split { flex-direction: column; }
  .split textarea { height: 40vh; border-right: none; border-bottom: 1px solid #ddd; }
}
</style>
</head>
<body>

<div class="header">
  <h1>Wenyan Preview</h1>
  <select id="themeSelect">${themeOptions}</select>
  <button onclick="render()">Render</button>
  <span class="status" id="status"></span>
</div>

<div class="split">
  <textarea id="editor" spellcheck="false">${escapeHtml(markdown)}</textarea>
  <iframe id="preview" srcdoc=""></iframe>
</div>

<script>
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const themeSelect = document.getElementById('themeSelect');
const status = document.getElementById('status');

async function render() {
  status.textContent = '渲染中…';
  try {
    const res = await fetch('/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: editor.value,
        theme: themeSelect.value,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      status.textContent = '错误';
      preview.srcdoc = '<p style="color:red;padding:16px">渲染失败: ' + escapeHtml(err) + '</p>';
      return;
    }
    const html = await res.text();
    preview.srcdoc = html;
    status.textContent = '✓';
  } catch (e) {
    status.textContent = '错误';
    preview.srcdoc = '<p style="color:red;padding:16px">请求失败: ' + escapeHtml(String(e)) + '</p>';
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

render();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
