// ===== db.js — Data Layer (Google Sheets + localStorage fallback) =====

// ── CONFIG ────────────────────────────────────────────────
// วาง URL ของ Google Apps Script Web App ที่นี่หลัง Deploy
const GAS_URL = localStorage.getItem('gas_url') || '';

const DB_KEY_ORDERS  = 'production_orders';
const DB_KEY_DEFECTS = 'daily_defects';
const DB_KEY_MASTERS = 'master_data';
const DB_KEY_COUNTER = 'doc_counters';

// ── Mode ──────────────────────────────────────────────────
function isOnline() { return !!GAS_URL; }

// ── Sync status callbacks ─────────────────────────────────
let _onSyncStart = () => {};
let _onSyncEnd   = () => {};
function onSyncStart(fn) { _onSyncStart = fn; }
function onSyncEnd(fn)   { _onSyncEnd   = fn; }

// ── localStorage helpers ──────────────────────────────────
function lsLoad(key)          { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
function lsLoadObj(key, def)  { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } }
function lsSave(key, data)    { localStorage.setItem(key, JSON.stringify(data)); }

// ── HTTP helpers ──────────────────────────────────────────
async function gasGet(action) {
  const res = await fetch(`${GAS_URL}?action=${action}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function gasPost(body) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body:   JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Auto-number ───────────────────────────────────────────
function nextCounter(type) {
  const counters = lsLoadObj(DB_KEY_COUNTER, { PO: 0, DOC: 0 });
  counters[type] = (counters[type] || 0) + 1;
  lsSave(DB_KEY_COUNTER, counters);
  const year = new Date().getFullYear();
  return `${type}-${year}-${String(counters[type]).padStart(4, '0')}`;
}

// ── Orders ────────────────────────────────────────────────
async function getAllOrders() {
  if (isOnline()) {
    try {
      _onSyncStart();
      const data = await gasGet('getOrders');
      const arr = Array.isArray(data) ? data : [];
      lsSave(DB_KEY_ORDERS, arr);
      _onSyncEnd(true);
      return arr;
    } catch (e) {
      _onSyncEnd(false, e.message);
      return lsLoad(DB_KEY_ORDERS);
    }
  }
  return lsLoad(DB_KEY_ORDERS);
}

async function saveOrder(order) {
  const now = new Date().toISOString();
  if (!order.id) {
    order.id        = Date.now().toString();
    order.createdAt = now;
  }
  order.updatedAt = now;

  // update local cache immediately (optimistic)
  const local = lsLoad(DB_KEY_ORDERS);
  const arr   = Array.isArray(local) ? local : [];
  const idx   = arr.findIndex(o => o.id === order.id);
  if (idx >= 0) arr[idx] = order; else arr.unshift(order);
  lsSave(DB_KEY_ORDERS, arr);

  if (isOnline()) {
    try {
      _onSyncStart();
      await gasPost({ action: 'saveOrder', data: order });
      _onSyncEnd(true);
    } catch (e) {
      _onSyncEnd(false, e.message);
      addPendingSync({ action: 'saveOrder', data: order });
    }
  }
  return order;
}

async function deleteOrder(id) {
  const local = lsLoad(DB_KEY_ORDERS);
  const arr   = Array.isArray(local) ? local : [];
  lsSave(DB_KEY_ORDERS, arr.filter(o => o.id !== id));

  if (isOnline()) {
    try {
      _onSyncStart();
      await gasPost({ action: 'deleteOrder', id });
      _onSyncEnd(true);
    } catch (e) {
      _onSyncEnd(false, e.message);
      addPendingSync({ action: 'deleteOrder', id });
    }
  }
}

function getOrderById(id) {
  // อ่านจาก localStorage cache (ซึ่ง getAllOrders จะ sync มาไว้แล้ว)
  return lsLoad(DB_KEY_ORDERS).find(o => o.id === id) || null;
}

// ── Defects ───────────────────────────────────────────────
async function getAllDefects() {
  if (isOnline()) {
    try {
      _onSyncStart();
      const data = await gasGet('getDefects');
      const arr = Array.isArray(data) ? data : [];
      lsSave(DB_KEY_DEFECTS, arr);
      _onSyncEnd(true);
      return arr;
    } catch (e) {
      _onSyncEnd(false, e.message);
      return lsLoad(DB_KEY_DEFECTS);
    }
  }
  return lsLoad(DB_KEY_DEFECTS);
}

async function saveDefect(defect) {
  const now = new Date().toISOString();
  if (!defect.id) { defect.id = Date.now().toString(); defect.createdAt = now; }

  const local = lsLoad(DB_KEY_DEFECTS);
  const arr   = Array.isArray(local) ? local : [];
  const idx   = arr.findIndex(d => d.id === defect.id);
  if (idx >= 0) arr[idx] = defect; else arr.unshift(defect);
  lsSave(DB_KEY_DEFECTS, arr);

  if (isOnline()) {
    try {
      _onSyncStart();
      await gasPost({ action: 'saveDefect', data: defect });
      _onSyncEnd(true);
    } catch (e) {
      _onSyncEnd(false, e.message);
      addPendingSync({ action: 'saveDefect', data: defect });
    }
  }
  return defect;
}

async function deleteDefect(id) {
  const local = lsLoad(DB_KEY_DEFECTS);
  const arr   = Array.isArray(local) ? local : [];
  lsSave(DB_KEY_DEFECTS, arr.filter(d => d.id !== id));
  if (isOnline()) {
    try {
      _onSyncStart();
      await gasPost({ action: 'deleteDefect', id });
      _onSyncEnd(true);
    } catch (e) {
      _onSyncEnd(false, e.message);
      addPendingSync({ action: 'deleteDefect', id });
    }
  }
}

// ── Pending sync queue (offline → online) ─────────────────
const PENDING_KEY = 'pending_sync';

function addPendingSync(op) {
  const q = lsLoadObj(PENDING_KEY, []);
  q.push({ ...op, queuedAt: new Date().toISOString() });
  lsSave(PENDING_KEY, q);
  updateSyncBadge();
}

async function flushPendingSync() {
  if (!isOnline()) return;
  const q = lsLoadObj(PENDING_KEY, []);
  if (!q.length) return;

  const failed = [];
  for (const op of q) {
    try {
      await gasPost(op);
    } catch {
      failed.push(op);
    }
  }
  lsSave(PENDING_KEY, failed);
  updateSyncBadge();
  if (!failed.length) showToast('☁️ ซิงค์ข้อมูลที่ค้างไว้เรียบร้อยแล้ว');
}

function getPendingCount() {
  return lsLoadObj(PENDING_KEY, []).length;
}

function updateSyncBadge() {
  const badge = document.getElementById('syncBadge');
  if (!badge) return;
  const n = getPendingCount();
  badge.textContent = n > 0 ? n : '';
  badge.style.display = n > 0 ? 'inline-flex' : 'none';
}

// ── Master data ───────────────────────────────────────────
const DEFAULT_MASTERS = {
  customers: ['บริษัท A จำกัด', 'บริษัท B จำกัด'],
  products:  [
    { name: 'ถุงพลาสติก A', code: 'SKU-001' },
    { name: 'ถุงพลาสติก B', code: 'SKU-002' },
  ],
  machines:  ['เครื่องเป่า #1', 'เครื่องเป่า #2'],
  operators: ['สมชาย ใจดี', 'สมหญิง รักงาน'],
};

function getMasters() {
  const m = lsLoadObj(DB_KEY_MASTERS, null);
  if (!m) { lsSave(DB_KEY_MASTERS, DEFAULT_MASTERS); return DEFAULT_MASTERS; }
  return m;
}
function saveMasters(m) { lsSave(DB_KEY_MASTERS, m); }

// ── GAS URL config ────────────────────────────────────────
function setGasUrl(url) {
  localStorage.setItem('gas_url', url);
  location.reload();
}
function clearGasUrl() {
  localStorage.removeItem('gas_url');
  location.reload();
}

// ── Export ────────────────────────────────────────────────
window.DB = {
  isOnline, nextCounter,
  getAllOrders, saveOrder, deleteOrder, getOrderById,
  getAllDefects, saveDefect, deleteDefect,
  getMasters, saveMasters,
  setGasUrl, clearGasUrl, getPendingCount, flushPendingSync,
  onSyncStart, onSyncEnd, updateSyncBadge,
};
