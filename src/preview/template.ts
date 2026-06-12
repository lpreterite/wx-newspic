export function renderPreviewPage(markdown: string, themes: { id: string; name: string }[]): string {
  const themeOptions = themes.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Wenyan Preview</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
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
.header .status { font-size: 12px; color: #999; min-width: 60px; }

.split {
  display: flex; height: calc(100vh - 48px);
}

.EasyMDE {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid #ddd;
}
.EasyMDE .CodeMirror {
  flex: 1;
  min-height: 0;
}
.EasyMDE .editor-statusbar {
  flex-shrink: 0;
}

.split iframe {
  flex: 1; border: none; background: #fff;
}

@media (max-width: 768px) {
  .split { flex-direction: column; }
  .EasyMDE { height: 40vh; border-right: none; border-bottom: 1px solid #ddd; }
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

<script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
<script>
const textarea = document.getElementById('editor');
const preview = document.getElementById('preview');
const themeSelect = document.getElementById('themeSelect');
const status = document.getElementById('status');

const editor = new EasyMDE({
  element: textarea,
  autoDownloadFontAwesome: false,
  spellChecker: false,
  status: false,
  toolbar: ['bold', 'italic', 'heading', '|', 'code', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'guide'],
});

async function render() {
  status.textContent = '渲染中…';
  try {
    const res = await fetch('/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: editor.value(),
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
    status.textContent = '\u2713';
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
