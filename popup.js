// Popup script – manages extension settings and browsing history
// Uses safe DOM methods (createElement / textContent) throughout.

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  claude: 'claude-sonnet-4-20250514',
  kimi: 'moonshot-v1-8k',
};

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupTabs();
  document.getElementById('provider').addEventListener('change', (e) => updateModelHint(e.target.value));
  document.getElementById('toggleKey').addEventListener('click', toggleKeyVisibility);
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
});

// ── Tab switching ─────────────────────────────────────────────────────────────

function setupTabs() {
  var tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-tab');

      // Deactivate all tabs and panels
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });

      // Activate selected
      btn.classList.add('active');
      document.getElementById('tab-' + target).classList.add('active');

      // Load history when switching to history tab
      if (target === 'history') {
        loadHistory();
      }
    });
  });
}

// ── Settings functions ────────────────────────────────────────────────────────

function updateModelHint(provider) {
  document.getElementById('modelHint').textContent =
    '\u9ED8\u8BA4: ' + (DEFAULT_MODELS[provider] || '');
}

function toggleKeyVisibility() {
  const input = document.getElementById('apiKey');
  input.type = input.type === 'password' ? 'text' : 'password';
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    provider: 'openai',
    apiKey: '',
    language: 'zh-CN',
    model: '',
  });

  document.getElementById('provider').value = settings.provider;
  document.getElementById('apiKey').value = settings.apiKey;
  document.getElementById('language').value = settings.language;
  document.getElementById('model').value = settings.model;
  updateModelHint(settings.provider);
}

async function saveSettings() {
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    showStatus('\u8BF7\u586B\u5199 API Key', 'error');
    return;
  }

  await chrome.storage.sync.set({
    provider: document.getElementById('provider').value,
    apiKey,
    language: document.getElementById('language').value,
    model: document.getElementById('model').value.trim(),
  });

  showStatus('\u8BBE\u7F6E\u5DF2\u4FDD\u5B58', 'success');
}

function showStatus(message, type) {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = 'status ' + type;
  setTimeout(() => {
    el.textContent = '';
    el.className = 'status';
  }, 2000);
}

// ── History functions ─────────────────────────────────────────────────────────

async function loadHistory() {
  var result = await chrome.storage.local.get({ history: [] });
  var history = result.history;

  var listEl = document.getElementById('historyList');
  var emptyEl = document.getElementById('historyEmpty');
  var clearBtn = document.getElementById('clearHistoryBtn');

  // Clear previous entries
  listEl.textContent = '';

  if (history.length === 0) {
    emptyEl.style.display = 'block';
    clearBtn.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  clearBtn.style.display = 'block';

  history.forEach(function (entry) {
    var item = document.createElement('div');
    item.className = 'history-item';

    // Header row: author + time
    var header = document.createElement('div');
    header.className = 'history-item-header';

    var authorSpan = document.createElement('span');
    authorSpan.className = 'history-author';
    authorSpan.textContent = entry.author || 'Unknown';

    var timeSpan = document.createElement('span');
    timeSpan.className = 'history-time';
    timeSpan.textContent = formatRelativeTime(entry.timestamp);

    header.appendChild(authorSpan);
    header.appendChild(timeSpan);

    // Preview text (always visible)
    var preview = document.createElement('div');
    preview.className = 'history-preview';
    preview.textContent = entry.tweetPreview || '';

    // TLDR content (collapsed by default)
    var tldrWrap = document.createElement('div');
    tldrWrap.className = 'history-tldr collapsed';

    var tldrContent = document.createElement('div');
    tldrContent.className = 'history-tldr-text';
    tldrContent.textContent = entry.tldr || '';
    tldrWrap.appendChild(tldrContent);

    // Toggle button
    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'history-toggle';
    toggleBtn.textContent = '展开摘要';
    toggleBtn.addEventListener('click', function () {
      var isCollapsed = tldrWrap.classList.contains('collapsed');
      if (isCollapsed) {
        tldrWrap.classList.remove('collapsed');
        toggleBtn.textContent = '收起摘要';
      } else {
        tldrWrap.classList.add('collapsed');
        toggleBtn.textContent = '展开摘要';
      }
    });

    // Original tweet link
    var actions = document.createElement('div');
    actions.className = 'history-actions';

    if (entry.tweetUrl) {
      var link = document.createElement('a');
      link.href = entry.tweetUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'history-link';
      link.textContent = '查看原帖 \u2197';
      actions.appendChild(link);
    }

    actions.appendChild(toggleBtn);

    item.appendChild(header);
    item.appendChild(preview);
    item.appendChild(tldrWrap);
    item.appendChild(actions);
    listEl.appendChild(item);
  });
}

async function clearHistory() {
  if (!confirm('确定要清空所有历史记录吗？')) return;

  await chrome.storage.local.set({ history: [] });
  loadHistory();
}

// ── Relative time formatting ─────────────────────────────────────────────────

function formatRelativeTime(timestamp) {
  var now = Date.now();
  var diff = now - timestamp;
  var seconds = Math.floor(diff / 1000);
  var minutes = Math.floor(seconds / 60);
  var hours = Math.floor(minutes / 60);
  var days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return minutes + ' 分钟前';
  if (hours < 24) return hours + ' 小时前';
  if (days < 30) return days + ' 天前';

  // Fall back to date string for older entries
  var d = new Date(timestamp);
  return (d.getMonth() + 1) + '/' + d.getDate();
}
