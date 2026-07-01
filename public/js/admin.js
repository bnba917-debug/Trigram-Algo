'use strict';

const TOKEN_KEY = 'trigram_admin_token';

const loginPanel = document.getElementById('login-panel');
const adminPanel = document.getElementById('admin-panel');
const loginError = document.getElementById('login-error');
const windowStatus = document.getElementById('window-status');
const todayPreview = document.getElementById('today-preview');
const historyList = document.getElementById('history-list');
const actionMessage = document.getElementById('action-message');
const saveBtn = document.getElementById('save-btn');
const regenBtn = document.getElementById('regen-btn');

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Token': getToken() || '',
  };
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function renderToday(data) {
  const { prediction, adminWriteWindowHint } = data;
  windowStatus.textContent = adminWriteWindowHint || '可随时录入或更新今日卦象。';
  saveBtn.disabled = false;
  regenBtn.disabled = false;

  if (!prediction) {
    todayPreview.className = 'preview empty';
    todayPreview.textContent = '今日尚无卦象';
    return;
  }

  todayPreview.className = 'preview';
  todayPreview.innerHTML = `
    <div><span class="code">${prediction.stock_code}</span><span class="name">${prediction.stock_name}</span></div>
    <p>${prediction.ai_reason || '批注尚未生成'}</p>
  `;
}

function renderHistory(items) {
  historyList.innerHTML = '';
  if (!items.length) {
    historyList.innerHTML = '<li>暂无历史记录</li>';
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${item.date}</strong> · ${item.stock_code} ${item.stock_name}`;
    historyList.appendChild(li);
  }
}

async function loadAdminData() {
  const today = await api('/api/admin/today');
  renderToday(today);
  const history = await api('/api/admin/predictions');
  renderHistory(history);
}

async function login() {
  loginError.classList.add('hidden');
  const password = document.getElementById('password').value;
  try {
    const result = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then((r) => r.json());

    if (!result.ok) throw new Error(result.error || '登录失败');
    setToken(result.token);
    loginPanel.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    await loadAdminData();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  }
}

async function savePrediction() {
  actionMessage.textContent = '正在推演天机，请稍候…';
  const stockCode = document.getElementById('stock-code').value.trim();
  const stockName = document.getElementById('stock-name').value.trim();

  try {
    await api('/api/admin/predictions', {
      method: 'POST',
      body: JSON.stringify({ stockCode, stockName, generateAi: true }),
    });
    actionMessage.textContent = '今日天机已封存。';
    await loadAdminData();
  } catch (err) {
    actionMessage.textContent = err.message;
  }
}

async function regenerateReason() {
  actionMessage.textContent = '正在重新推演批注…';
  try {
    await api('/api/admin/predictions/regenerate', { method: 'POST', body: '{}' });
    actionMessage.textContent = '批注已更新。';
    await loadAdminData();
  } catch (err) {
    actionMessage.textContent = err.message;
  }
}

document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
saveBtn.addEventListener('click', savePrediction);
regenBtn.addEventListener('click', regenerateReason);

if (getToken()) {
  loginPanel.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  loadAdminData().catch(() => {
    localStorage.removeItem(TOKEN_KEY);
    loginPanel.classList.remove('hidden');
    adminPanel.classList.add('hidden');
  });
}

setInterval(() => {
  if (!adminPanel.classList.contains('hidden') && getToken()) {
    loadAdminData().catch(() => {});
  }
}, 30000);
