export function renderPreviewPage(markdown: string): string {
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
.header h1 { font-size: 15px; font-weight: 600; margin-right: auto; white-space: nowrap; }
.header select {
  padding: 4px 8px; font-size: 13px;
  border: 1px solid #ccc; border-radius: 4px;
  background: #fff;
}
.header button {
  padding: 4px 16px; font-size: 13px;
  border: 1px solid #07c; border-radius: 4px;
  background: #07c; color: #fff; cursor: pointer;
  transition: opacity .15s;
}
.header button:hover { background: #069; }
.header button:disabled { opacity: .5; cursor: not-allowed; }

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
.EasyMDE .editor-statusbar { flex-shrink: 0; }

.split iframe {
  flex: 1; border: none; background: #fff;
  transition: opacity .2s;
}

.spinner {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid #ccc;
  border-top-color: #07c;
  border-radius: 50%;
  animation: spin .6s linear infinite;
  vertical-align: middle;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .split { flex-direction: column; }
  .EasyMDE { height: 40vh; border-right: none; border-bottom: 1px solid #ddd; }
}
</style>
</head>
<body>

<div class="header">
  <h1>Wenyan Preview</h1>
  <select id="themeSelect"></select>
  <select id="hlThemeSelect"></select>
  <button id="renderBtn" onclick="render()">Render</button>
  <span id="statusIndicator"></span>
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
const renderBtn = document.getElementById('renderBtn');
const statusIndicator = document.getElementById('statusIndicator');

const editor = new EasyMDE({
  element: textarea,
  autoDownloadFontAwesome: false,
  spellChecker: false,
  status: false,
  toolbar: ['bold', 'italic', 'heading', '|', 'code', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'guide'],
});

let lastHtml = '';
let renderTimeout;

editor.codemirror.on('changes', () => {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(render, 500);
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    clearTimeout(renderTimeout);
    render();
  }
});

var allThemes = [];

fetch('/themes')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    allThemes = data.builtin.concat(data.custom);
    themeSelect.innerHTML = '';
    allThemes.forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      themeSelect.appendChild(opt);
    });
    render();
  })
  .catch(function() {
    themeSelect.innerHTML = '<option value="default">Default</option>';
    render();
  });

var hlThemeSelect = document.getElementById('hlThemeSelect');
fetch('/hl-themes')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    hlThemeSelect.innerHTML = '';
    data.forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      hlThemeSelect.appendChild(opt);
    });
  })
  .catch(function() {
    hlThemeSelect.innerHTML = '';
  });

function setLoading(on) {
  if (on) {
    statusIndicator.innerHTML = '<span class="spinner"></span>';
    renderBtn.disabled = true;
    preview.style.opacity = '.5';
  } else {
    statusIndicator.innerHTML = '';
    renderBtn.disabled = false;
    preview.style.opacity = '1';
  }
}

async function render() {
  setLoading(true);
  try {
    const res = await fetch('/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: editor.value(),
        theme: themeSelect.value,
        hlTheme: document.getElementById('hlThemeSelect').value,
      }),
    });
    if (!res.ok) {
      var err = await res.text();
      setLoading(false);
      if (lastHtml) preview.srcdoc = lastHtml;
      return;
    }
    var data = await res.json();
    var html = data.content || '';
    lastHtml = html;
    preview.srcdoc = html;
    setLoading(false);
  } catch (e) {
    setLoading(false);
    if (lastHtml) preview.srcdoc = lastHtml;
  }
}
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
