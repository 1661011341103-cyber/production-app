// ===== app.js — Main Application Logic =====

// ── Navigation ────────────────────────────────────────────
function navigate(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (el) el.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    form:      'ใบสั่งผลิต',
    history:   'ประวัติออเดอร์',
    defects:   'ของเสียรายวัน',
    masters:   'ข้อมูลหลัก',
  };
  document.getElementById('topbarTitle').textContent = titles[page] || page;

  if (page === 'dashboard') renderDashboard();
  if (page === 'history')   renderHistory();
  if (page === 'defects')   renderDefectTable();
  if (page === 'masters')   renderMasters();

  // close sidebar on mobile
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDateWidgets();
  initSyncIndicator();
  setDefaultDates();
  fillDataLists();
  renderDashboard();

  document.getElementById('productionForm').addEventListener('submit', handleFormSubmit);
});

function setDefaultDates() {
  const t = today();
  setDateWidget('productionDate', t);
  setDateWidget('defectDate',     t);
}

// ── Datalists (autocomplete) ──────────────────────────────
function fillDataLists() {
  const m = DB.getMasters();
  setList('list-machines',  m.machines);
  setList('list-operators', m.operators);
  setList('list-customers', m.customers);
  setList('list-products',  m.products.map(p => p.name));
}

function setList(id, items) {
  const dl = document.getElementById(id);
  if (!dl) return;
  dl.innerHTML = items.map(v => `<option value="${esc(v)}"></option>`).join('');
}

function autoFillCode(name) {
  const m = DB.getMasters();
  const found = m.products.find(p => p.name === name);
  if (found) document.getElementById('productCode').value = found.code;
}

// ── Auto-number ───────────────────────────────────────────
function genNo(fieldId, type) {
  document.getElementById(fieldId).value = DB.nextCounter(type);
}

// ── Custom Date Inputs ────────────────────────────────────
// แปลง YYYY-MM-DD → set ค่าใน 3 ช่อง
function setDateWidget(targetId, isoDate) {
  const wrap = document.getElementById('wrap-' + targetId);
  if (!wrap) return;
  const hidden = document.getElementById(targetId);
  if (!isoDate) {
    wrap.querySelectorAll('input[type="number"]').forEach(el => el.value = '');
    if (hidden) hidden.value = '';
    return;
  }
  const [yyyy, mm, dd] = isoDate.split('-');
  const ddEl   = wrap.querySelector('.date-dd');
  const mmEl   = wrap.querySelector('.date-mm');
  const yyyyEl = wrap.querySelector('.date-yyyy');
  if (ddEl)   ddEl.value   = parseInt(dd,   10);
  if (mmEl)   mmEl.value   = parseInt(mm,   10);
  if (yyyyEl) yyyyEl.value = parseInt(yyyy, 10);
  if (hidden) hidden.value = isoDate;
}

// อ่านค่าจาก 3 ช่อง → YYYY-MM-DD
function getDateWidget(targetId) {
  return document.getElementById(targetId)?.value || '';
}

// เมื่อพิมพ์ในช่องใดช่องหนึ่ง → อัปเดต hidden field
function initDateWidgets() {
  document.querySelectorAll('[data-date-part]').forEach(el => {
    el.addEventListener('input', () => {
      const targetId = el.dataset.target;
      const wrap     = document.getElementById('wrap-' + targetId);
      const hidden   = document.getElementById(targetId);
      if (!wrap || !hidden) return;

      const dd   = wrap.querySelector('.date-dd')?.value   || '';
      const mm   = wrap.querySelector('.date-mm')?.value   || '';
      const yyyy = wrap.querySelector('.date-yyyy')?.value || '';

      if (dd && mm && yyyy && yyyy.length === 4) {
        const ddStr   = String(dd).padStart(2, '0');
        const mmStr   = String(mm).padStart(2, '0');
        hidden.value  = `${yyyy}-${mmStr}-${ddStr}`;
        // clear validation highlight
        hidden.style.borderColor = '';
      } else {
        hidden.value = '';
      }
    });

    // auto-advance: พิมพ์ครบ 2 หลัก (วว/ดด) → ข้ามไปช่องถัดไป
    el.addEventListener('keyup', () => {
      const part = el.dataset.part || el.className.replace('date-', '');
      const max  = el.classList.contains('date-yyyy') ? 4 : 2;
      if (String(el.value).length >= max) {
        const wrap   = document.getElementById('wrap-' + el.dataset.target);
        const inputs = Array.from(wrap.querySelectorAll('input[type="number"]'));
        const idx    = inputs.indexOf(el);
        if (idx < inputs.length - 1) inputs[idx + 1].focus();
      }
    });
  });
}


function convertThickness(from) {
  const mmEl     = document.getElementById('thicknessMm');
  const micronEl = document.getElementById('thicknessMicron');
  if (!mmEl || !micronEl) return;

  if (from === 'mm') {
    const mm = parseFloat(mmEl.value);
    micronEl.value = isNaN(mm) ? '' : parseFloat((mm * 1000).toFixed(4));
  } else {
    const micron = parseFloat(micronEl.value);
    mmEl.value = isNaN(micron) ? '' : parseFloat((micron / 1000).toFixed(6));
  }
}


function syncQty() {
  const v = document.getElementById('orderQty').value;
  document.getElementById('orderQtyRef').value = v;
  computeYield();
}

function computeYield() {
  const ordered = parseFloat(document.getElementById('orderQty').value)  || 0;
  const actual  = parseFloat(document.getElementById('actualQty').value) || 0;
  document.getElementById('yieldPct').value =
    ordered > 0 ? ((actual / ordered) * 100).toFixed(2) + ' %' : '—';
}

// ── Form submit ───────────────────────────────────────────
async function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const order  = collectFormData();
  const editId = document.getElementById('editId').value;
  if (editId) order.id = editId;

  const defect = {
    defectDate:   v('defectDate'),
    defectQty:    v('dailyDefectQty'),
    defectType:   v('defectType'),
    defectRemark: v('defectRemark'),
  };
  if (defect.defectQty) await DB.saveDefect(defect);

  await DB.saveOrder(order);
  showToast('💾 บันทึกใบสั่งผลิตเรียบร้อยแล้ว');
  clearForm();
  navigate('history', document.querySelector('[data-page="history"]'));
}

function collectFormData() {
  return {
    productionOrderNo: v('productionOrderNo'),
    documentNo:        v('documentNo'),
    productionDate:    v('productionDate'),
    lotNo:             v('lotNo'),
    deliveryDate:      v('deliveryDate'),
    machine:           v('machine'),
    operatorName:      v('operatorName'),
    customerName:      v('customerName'),
    productName:       v('productName'),
    productCode:       v('productCode'),
    orderQty:          v('orderQty'),
    productDetail:     v('productDetail'),
    plasticType:       v('plasticType'),
    bagSize:           v('bagSize'),
    thicknessMm:       v('thicknessMm'),
    thicknessMicron:   v('thicknessMicron'),
    actualQty:         v('actualQty'),
    yieldPct:          v('yieldPct'),
    parameters: {
      temp_front:  { set: v('temp_front_set')   },
      temp_mid:    { set: v('temp_mid_set')     },
      temp_rear:   { set: v('temp_rear_set')    },
      temp_flange: { set: v('temp_flange_set')  },
      temp_die:    { set: v('temp_die_set')     },
      surfaceBurst:{ set: v('surfaceBurst_set') },
    },
  };
}

function validateForm() {
  const required = document.querySelectorAll('#productionForm [required]');
  let valid = true;
  required.forEach(el => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
    if (!el.value.trim()) {
      el.style.borderColor = '#e53e3e';
      el.style.boxShadow   = '0 0 0 3px rgba(229,62,62,0.15)';
      valid = false;
    }
  });
  if (!valid) showToast('⚠️ กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', '#c05621');
  return valid;
}

function clearForm() {
  document.getElementById('productionForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('formTitle').textContent    = '➕ สร้างใบสั่งผลิตใหม่';
  document.getElementById('formSubtitle').textContent = 'กรอกข้อมูลให้ครบถ้วนแล้วกดบันทึก';
  setDefaultDates();
  document.getElementById('orderQtyRef').value = '';
  document.getElementById('yieldPct').value    = '';
  setDateWidget('deliveryDate', '');
  document.querySelectorAll('#productionForm [required]').forEach(el => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
  });
}

function cancelEdit() {
  clearForm();
  navigate('history', document.querySelector('[data-page="history"]'));
}

// ── Edit order ────────────────────────────────────────────
function editOrder(id) {
  const o = DB.getOrderById(id);
  if (!o) return;

  navigate('form', document.querySelector('[data-page="form"]'));
  document.getElementById('editId').value = o.id;
  document.getElementById('formTitle').textContent    = '✏️ แก้ไขใบสั่งผลิต';
  document.getElementById('formSubtitle').textContent = `กำลังแก้ไข: ${o.productionOrderNo}`;

  const fields = [
    'productionOrderNo','documentNo','lotNo',
    'machine','operatorName','customerName','productName','productCode',
    'orderQty','plasticType','bagSize','thicknessMm','thicknessMicron','productDetail','actualQty',
  ];
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = o[f] || '';
  });

  // date widgets
  setDateWidget('productionDate', o.productionDate || '');
  setDateWidget('deliveryDate',   o.deliveryDate   || '');

  // parameters
  const p = o.parameters || {};
  const paramMap = {
    temp_front_set:      p.temp_front?.set,
    temp_mid_set:        p.temp_mid?.set,
    temp_rear_set:       p.temp_rear?.set,
    temp_flange_set:     p.temp_flange?.set,
    temp_die_set:        p.temp_die?.set,
    surfaceBurst_set:    p.surfaceBurst?.set,
  };
  Object.entries(paramMap).forEach(([k, val]) => {
    const el = document.getElementById(k);
    if (el && val !== undefined) el.value = val;
  });

  syncQty();
}

async function deleteOrder(id) {
  if (!confirm('ต้องการลบใบสั่งผลิตนี้หรือไม่?')) return;
  await DB.deleteOrder(id);
  renderHistory();
  showToast('🗑️ ลบเรียบร้อยแล้ว', '#c05621');
}

// ── HISTORY PAGE ──────────────────────────────────────────
async function renderHistory() {
  const q    = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const from = document.getElementById('filterFrom')?.value;
  const to   = document.getElementById('filterTo')?.value;

  const wrap = document.getElementById('historyTable');
  wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">🔄</div>กำลังโหลด...</div>`;

  let orders = (await DB.getAllOrders()).filter(o => {
    const text = [o.productionOrderNo, o.documentNo, o.customerName,
                  o.productName, o.productCode, o.lotNo, o.operatorName]
                  .join(' ').toLowerCase();
    if (q && !text.includes(q)) return false;
    if (from && o.productionDate < from) return false;
    if (to   && o.productionDate > to)   return false;
    return true;
  });

  if (!orders.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div>ยังไม่มีข้อมูลออเดอร์</div>`;
    return;
  }

  const rows = orders.map(o => {
    const yieldNum = parseFloat((o.yieldPct || '0').replace('%','').trim());
    const yieldBadge = yieldNum >= 95 ? 'badge-green' : yieldNum >= 80 ? 'badge-orange' : 'badge-red';
    const daysLeft = daysUntil(o.deliveryDate);
    const delivBadge = daysLeft < 0 ? 'badge-red' : daysLeft <= 3 ? 'badge-orange' : 'badge-green';
    const delivText  = daysLeft < 0 ? `เกิน ${Math.abs(daysLeft)} วัน` : daysLeft === 0 ? 'วันนี้' : `${daysLeft} วัน`;

    return `<tr>
      <td><strong>${esc(o.productionOrderNo)}</strong><br><small style="color:#a0aec0;">${esc(o.documentNo)}</small></td>
      <td>${esc(o.productionDate)}</td>
      <td>${esc(o.customerName)}</td>
      <td>${esc(o.productName)}<br><small style="color:#a0aec0;">${esc(o.productCode)}</small></td>
      <td>${esc(o.machine)}</td>
      <td style="text-align:right;">${num(o.orderQty)}</td>
      <td style="text-align:right;">${num(o.actualQty)}</td>
      <td><span class="badge ${yieldBadge}">${esc(o.yieldPct) || '—'}</span></td>
      <td><span class="badge ${delivBadge}">${delivText}</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-outline btn-icon" onclick="editOrder('${o.id}')" title="แก้ไข">✏️</button>
          <button class="btn btn-danger btn-icon" onclick="deleteOrder('${o.id}')" title="ลบ">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>เลขออเดอร์ / เอกสาร</th>
            <th>วันที่ผลิต</th>
            <th>ลูกค้า</th>
            <th>สินค้า / Code</th>
            <th>เครื่องจักร</th>
            <th>สั่ง</th>
            <th>ผลิตได้</th>
            <th>% Yield</th>
            <th>กำหนดส่ง</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterFrom').value  = '';
  document.getElementById('filterTo').value    = '';
  renderHistory();
}

async function exportOrders() {
  const orders = await DB.getAllOrders();
  if (!orders.length) { showToast('⚠️ ไม่มีข้อมูลให้ Export', '#c05621'); return; }
  ExportUtil.downloadCSV(ExportUtil.ordersToCSV(orders), `production_orders_${today()}.csv`);
  showToast('⬇️ Export CSV เรียบร้อยแล้ว');
}

// ── DEFECT PAGE ───────────────────────────────────────────
async function renderDefectTable() {
  const defects = await DB.getAllDefects();
  const wrap    = document.getElementById('defectTable');

  if (!defects.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div>ยังไม่มีข้อมูลของเสีย</div>`;
    return;
  }

  const rows = defects.map(d => `<tr>
    <td>${esc(d.defectDate)}</td>
    <td style="text-align:right;"><strong>${num(d.defectQty)}</strong></td>
    <td>${esc(d.defectType) || '—'}</td>
    <td>${esc(d.defectRemark) || '—'}</td>
    <td>
      <div class="actions">
        <button class="btn btn-outline btn-icon" onclick="openDefectModal('${d.id}')" title="แก้ไข">✏️</button>
        <button class="btn btn-danger btn-icon" onclick="deleteDefectRow('${d.id}')" title="ลบ">🗑️</button>
      </div>
    </td>
  </tr>`).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>วันที่</th>
            <th>จำนวนของเสีย</th>
            <th>ประเภท</th>
            <th>หมายเหตุ</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function openDefectModal(id) {
  const modal = document.getElementById('defectModal');
  document.getElementById('defectEditId').value  = '';
  setDateWidget('m_defectDate', today());
  document.getElementById('m_defectQty').value   = '';
  document.getElementById('m_defectType').value  = '';
  document.getElementById('m_defectRemark').value= '';
  document.getElementById('defectModalTitle').textContent = '➕ เพิ่มของเสียรายวัน';

  if (id) {
    const allD = await DB.getAllDefects();
    const d = allD.find(x => x.id === id);
    if (d) {
      document.getElementById('defectEditId').value  = d.id;
      setDateWidget('m_defectDate', d.defectDate || '');
      document.getElementById('m_defectQty').value   = d.defectQty;
      document.getElementById('m_defectType').value  = d.defectType || '';
      document.getElementById('m_defectRemark').value= d.defectRemark || '';
      document.getElementById('defectModalTitle').textContent = '✏️ แก้ไขของเสีย';
    }
  }
  modal.classList.add('open');
}

function closeDefectModal(e) {
  if (e && e.target !== document.getElementById('defectModal')) return;
  document.getElementById('defectModal').classList.remove('open');
}

async function saveDefectModal() {
  const date = getDateWidget('m_defectDate');
  const qty  = document.getElementById('m_defectQty').value;
  if (!date || !qty) { showToast('⚠️ กรุณากรอกวันที่และจำนวน', '#c05621'); return; }

  const defect = {
    id:           document.getElementById('defectEditId').value || null,
    defectDate:   date,
    defectQty:    qty,
    defectType:   document.getElementById('m_defectType').value,
    defectRemark: document.getElementById('m_defectRemark').value,
  };
  await DB.saveDefect(defect);
  document.getElementById('defectModal').classList.remove('open');
  renderDefectTable();
  showToast('💾 บันทึกของเสียเรียบร้อยแล้ว');
}

async function deleteDefectRow(id) {
  if (!confirm('ต้องการลบรายการนี้หรือไม่?')) return;
  await DB.deleteDefect(id);
  renderDefectTable();
  showToast('🗑️ ลบเรียบร้อยแล้ว', '#c05621');
}

async function exportDefects() {
  const defects = await DB.getAllDefects();
  if (!defects.length) { showToast('⚠️ ไม่มีข้อมูลให้ Export', '#c05621'); return; }
  ExportUtil.downloadCSV(ExportUtil.defectsToCSV(defects), `daily_defects_${today()}.csv`);
  showToast('⬇️ Export CSV เรียบร้อยแล้ว');
}

// ── MASTERS PAGE ──────────────────────────────────────────
function renderMasters() {
  const m = DB.getMasters();

  renderMasterList('masterCustomers', m.customers, 'customers');
  renderMasterList('masterMachines',  m.machines,  'machines');
  renderMasterList('masterOperators', m.operators, 'operators');

  // products (name + code)
  const el = document.getElementById('masterProducts');
  el.innerHTML = `<ul class="master-list">${
    m.products.map((p, i) => `<li>
      <span>${esc(p.name)} <small style="color:#a0aec0;">(${esc(p.code)})</small></span>
      <button class="del-btn" onclick="deleteProduct(${i})">✕</button>
    </li>`).join('')
  }</ul>`;
}

function renderMasterList(elId, items, key) {
  const el = document.getElementById(elId);
  el.innerHTML = `<ul class="master-list">${
    items.map((item, i) => `<li>
      <span>${esc(item)}</span>
      <button class="del-btn" onclick="deleteMaster('${key}',${i})">✕</button>
    </li>`).join('')
  }</ul>`;
}

function addMaster(key, inputId) {
  const val = document.getElementById(inputId).value.trim();
  if (!val) return;
  const m = DB.getMasters();
  if (!m[key].includes(val)) { m[key].push(val); DB.saveMasters(m); }
  document.getElementById(inputId).value = '';
  renderMasters();
  fillDataLists();
}

function deleteMaster(key, idx) {
  const m = DB.getMasters();
  m[key].splice(idx, 1);
  DB.saveMasters(m);
  renderMasters();
  fillDataLists();
}

function addProduct() {
  const name = document.getElementById('newProductName').value.trim();
  const code = document.getElementById('newProductCode').value.trim();
  if (!name || !code) { showToast('⚠️ กรุณากรอกชื่อและ Code', '#c05621'); return; }
  const m = DB.getMasters();
  m.products.push({ name, code });
  DB.saveMasters(m);
  document.getElementById('newProductName').value = '';
  document.getElementById('newProductCode').value = '';
  renderMasters();
  fillDataLists();
}

function deleteProduct(idx) {
  const m = DB.getMasters();
  m.products.splice(idx, 1);
  DB.saveMasters(m);
  renderMasters();
  fillDataLists();
}

// ── DASHBOARD ─────────────────────────────────────────────

// state
let _dashPeriod = 'current';

function switchPeriod(mode, el) {
  _dashPeriod = mode;
  document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('dash-current').style.display   = mode === 'current' ? 'block' : 'none';
  document.getElementById('dash-monthly').style.display   = mode === 'monthly' ? 'block' : 'none';
  document.getElementById('dash-order').style.display     = mode === 'order'   ? 'block' : 'none';
  document.getElementById('monthPickerWrap').style.display = mode === 'monthly' ? 'flex'  : 'none';
  document.getElementById('orderSearchWrap').style.display = mode === 'order'   ? 'flex'  : 'none';
  if (mode === 'monthly') initMonthPicker();
  renderDashboard();
}

function initMonthPicker() {
  const mp = document.getElementById('monthPicker');
  const yp = document.getElementById('yearPicker');
  if (mp.options.length) return;
  const thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  thMonths.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = String(i + 1).padStart(2, '0');
    o.textContent = m;
    mp.appendChild(o);
  });
  const now = new Date();
  mp.value = String(now.getMonth() + 1).padStart(2, '0');
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y + 543;
    yp.appendChild(o);
  }
  yp.value = now.getFullYear();
}

function shiftMonth(delta) {
  const mp = document.getElementById('monthPicker');
  const yp = document.getElementById('yearPicker');
  let m = parseInt(mp.value);
  let y = parseInt(yp.value);
  m += delta;
  if (m > 12) { m = 1;  y++; }
  if (m < 1)  { m = 12; y--; }
  mp.value = String(m).padStart(2, '0');
  let found = false;
  for (const o of yp.options) { if (parseInt(o.value) === y) { found = true; break; } }
  if (!found) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y + 543;
    yp.appendChild(o);
  }
  yp.value = y;
  renderDashboard();
}

function renderDashboard() {
  if (_dashPeriod === 'current') renderCurrentDashboard();
  if (_dashPeriod === 'monthly') renderMonthlyDashboard();
  if (_dashPeriod === 'order')   renderOrderDashboard();
}

async function renderCurrentDashboard() {
  const orders  = await DB.getAllOrders();
  const defects = await DB.getAllDefects();

  // KPI
  const totalOrders   = orders.length;
  const totalDefects  = defects.reduce((s, d) => s + Number(d.defectQty || 0), 0);
  const yields        = orders.map(o => parseFloat((o.yieldPct || '0').replace('%','').trim())).filter(n => !isNaN(n));
  const avgYield      = yields.length ? (yields.reduce((a, b) => a + b, 0) / yields.length).toFixed(1) : '—';
  const upcoming      = orders.filter(o => { const d = daysUntil(o.deliveryDate); return d >= 0 && d <= 7; }).length;

  document.getElementById('kpiRow').innerHTML = `
    <div class="kpi-card blue">
      <div class="kpi-label">ออเดอร์ทั้งหมด</div>
      <div class="kpi-value">${totalOrders}</div>
      <div class="kpi-sub">รายการในระบบ</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-label">% Yield เฉลี่ย</div>
      <div class="kpi-value">${avgYield}${avgYield !== '—' ? '%' : ''}</div>
      <div class="kpi-sub">จากทุกออเดอร์</div>
    </div>
    <div class="kpi-card orange">
      <div class="kpi-label">ใกล้กำหนดส่ง</div>
      <div class="kpi-value">${upcoming}</div>
      <div class="kpi-sub">ภายใน 7 วัน</div>
    </div>
    <div class="kpi-card red">
      <div class="kpi-label">ของเสียสะสม</div>
      <div class="kpi-value">${totalDefects.toLocaleString()}</div>
      <div class="kpi-sub">ชิ้น / หน่วย</div>
    </div>`;

  // charts
  setTimeout(() => {
    ChartUtil.buildDefectChart('defectChart', defects);
    ChartUtil.buildYieldChart('yieldChart', orders);
  }, 50);

  // recent orders
  const recent = orders.slice(0, 5);
  document.getElementById('recentOrders').innerHTML = recent.length
    ? miniOrderTable(recent)
    : `<div class="empty-state"><div class="empty-icon">📋</div>ยังไม่มีออเดอร์</div>`;

  // upcoming deliveries
  const upcomingOrders = orders
    .filter(o => { const d = daysUntil(o.deliveryDate); return d >= 0 && d <= 7; })
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

  document.getElementById('upcomingDeliveries').innerHTML = upcomingOrders.length
    ? `<table class="mini-table">
        <thead><tr><th>เลขออเดอร์</th><th>ลูกค้า</th><th>สินค้า</th><th>กำหนดส่ง</th><th>เหลือ</th></tr></thead>
        <tbody>${upcomingOrders.map(o => {
          const d   = daysUntil(o.deliveryDate);
          const cls = d === 0 ? 'badge-red' : d <= 2 ? 'badge-orange' : 'badge-green';
          const txt = d === 0 ? 'วันนี้!' : `${d} วัน`;
          return `<tr>
            <td><strong>${esc(o.productionOrderNo)}</strong></td>
            <td>${esc(o.customerName)}</td>
            <td>${esc(o.productName)}</td>
            <td>${esc(o.deliveryDate)}</td>
            <td><span class="badge ${cls}">${txt}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`
    : `<div class="empty-state" style="padding:20px 0;">✅ ไม่มีออเดอร์ที่ใกล้กำหนดส่ง</div>`;
}

// ── Monthly dashboard ─────────────────────────────────────
async function renderMonthlyDashboard() {
  initMonthPicker();
  const mm   = document.getElementById('monthPicker').value;
  const yyyy = document.getElementById('yearPicker').value;
  const prefix = `${yyyy}-${mm}`;

  const allOrders  = await DB.getAllOrders();
  const allDefects = await DB.getAllDefects();

  const orders  = allOrders.filter(o  => (o.productionDate || '').startsWith(prefix));
  const defects = allDefects.filter(d => (d.defectDate     || '').startsWith(prefix));

  const thMonths = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                    'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const monthLabel = `${thMonths[parseInt(mm)]} ${parseInt(yyyy) + 543}`;

  const totalOrders  = orders.length;
  const totalDefects = defects.reduce((s, d) => s + Number(d.defectQty || 0), 0);
  const yields       = orders.map(o => parseFloat((o.yieldPct || '0').replace('%','').trim())).filter(n => !isNaN(n));
  const avgYield     = yields.length ? (yields.reduce((a, b) => a + b, 0) / yields.length).toFixed(1) : '—';
  const totalOrdered = orders.reduce((s, o) => s + Number(o.orderQty  || 0), 0);
  const totalActual  = orders.reduce((s, o) => s + Number(o.actualQty || 0), 0);

  document.getElementById('kpiRowMonthly').innerHTML = `
    <div class="kpi-card blue">
      <div class="kpi-label">ออเดอร์ ${monthLabel}</div>
      <div class="kpi-value">${totalOrders}</div>
      <div class="kpi-sub">รายการ</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-label">% Yield เฉลี่ย</div>
      <div class="kpi-value">${avgYield !== '—' ? avgYield + '%' : '—'}</div>
      <div class="kpi-sub">เดือนนี้</div>
    </div>
    <div class="kpi-card red">
      <div class="kpi-label">ของเสียรวม</div>
      <div class="kpi-value">${totalDefects.toLocaleString()}</div>
      <div class="kpi-sub">ชิ้น / หน่วย</div>
    </div>
    <div class="kpi-card orange">
      <div class="kpi-label">ผลิตได้ / สั่ง</div>
      <div class="kpi-value" style="font-size:1.2rem;">${totalActual.toLocaleString()} / ${totalOrdered.toLocaleString()}</div>
      <div class="kpi-sub">หน่วย</div>
    </div>`;

  document.getElementById('defectChartMonthlyTitle').textContent = `📉 ของเสียรายวัน — ${monthLabel}`;

  setTimeout(() => {
    ChartUtil.buildDefectChartForMonth('defectChartMonthly', defects, yyyy, mm);
    ChartUtil.buildYieldChart('yieldChartMonthly', orders);
  }, 50);

  document.getElementById('monthlyOrderTable').innerHTML = orders.length
    ? miniOrderTable(orders, true)
    : `<div class="empty-state" style="padding:20px 0;">ไม่มีออเดอร์ในเดือนนี้</div>`;

  document.getElementById('monthlyDefectTable').innerHTML = defects.length
    ? `<table class="mini-table">
        <thead><tr><th>วันที่</th><th>จำนวนของเสีย</th><th>ประเภท</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${defects.sort((a,b) => a.defectDate.localeCompare(b.defectDate)).map(d => `<tr>
          <td>${esc(d.defectDate)}</td>
          <td style="text-align:right;"><strong>${num(d.defectQty)}</strong></td>
          <td>${esc(d.defectType) || '—'}</td>
          <td>${esc(d.defectRemark) || '—'}</td>
        </tr>`).join('')}</tbody>
      </table>`
    : `<div class="empty-state" style="padding:20px 0;">ไม่มีข้อมูลของเสียในเดือนนี้</div>`;
}

// ── Per-order dashboard ───────────────────────────────────
async function renderOrderDashboard() {
  const q = (document.getElementById('orderSearchInput')?.value || '').toLowerCase();
  let orders = await DB.getAllOrders();
  if (q) {
    orders = orders.filter(o =>
      [o.productionOrderNo, o.documentNo, o.customerName,
       o.productName, o.productCode, o.lotNo, o.operatorName]
      .join(' ').toLowerCase().includes(q));
  }

  const wrap = document.getElementById('orderDashList');
  if (!orders.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div>${q ? 'ไม่พบออเดอร์ที่ค้นหา' : 'ยังไม่มีออเดอร์'}</div>`;
    return;
  }

  wrap.innerHTML = orders.map(o => {
    const yNum = parseFloat((o.yieldPct || '0').replace('%','').trim());
    const yCls = yNum >= 95 ? 'badge-green' : yNum >= 80 ? 'badge-orange' : 'badge-red';
    const p    = o.parameters || {};
    return `<div class="order-dash-card" id="odc-${o.id}">
      <div class="order-dash-header" onclick="toggleOrderCard('${o.id}')">
        <div>
          <div class="order-dash-no">${esc(o.productionOrderNo)}</div>
          <div class="order-dash-meta">${esc(o.productionDate)} · ${esc(o.customerName)} · ${esc(o.productName)} (${esc(o.productCode)})</div>
        </div>
        <div class="order-dash-badges">
          <span class="badge ${yCls}">${esc(o.yieldPct) || '—'}</span>
          <span class="badge badge-blue">${esc(o.machine)}</span>
          <span class="badge badge-blue">Lot: ${esc(o.lotNo)}</span>
          <span class="order-dash-chevron" id="chev-${o.id}">▼</span>
        </div>
      </div>
      <div class="order-dash-body" id="odb-${o.id}">
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">เลขเอกสาร</div><div class="detail-value">${esc(o.documentNo)}</div></div>
          <div class="detail-item"><div class="detail-label">พนักงาน</div><div class="detail-value">${esc(o.operatorName)}</div></div>
          <div class="detail-item"><div class="detail-label">กำหนดส่ง</div><div class="detail-value">${esc(o.deliveryDate)}</div></div>
          <div class="detail-item"><div class="detail-label">จำนวนที่สั่ง</div><div class="detail-value">${num(o.orderQty)} หน่วย</div></div>
          <div class="detail-item"><div class="detail-label">ผลิตได้จริง</div><div class="detail-value">${num(o.actualQty)} หน่วย</div></div>
          <div class="detail-item"><div class="detail-label">% Yield</div><div class="detail-value"><span class="badge ${yCls}">${esc(o.yieldPct) || '—'}</span></div></div>
          <div class="detail-item"><div class="detail-label">ชนิดเม็ดพลาสติก</div><div class="detail-value">${esc(o.plasticType) || '—'}</div></div>
          <div class="detail-item"><div class="detail-label">ขนาดถุง</div><div class="detail-value">${esc(o.bagSize) || '—'}</div></div>
          <div class="detail-item"><div class="detail-label">ความหนา</div><div class="detail-value">${o.thicknessMm ? `${esc(o.thicknessMm)} mm / ${esc(o.thicknessMicron)} µm` : '—'}</div></div>
        </div>
        ${o.productDetail ? `<div style="margin-bottom:14px;font-size:0.85rem;color:#4a5568;background:#f7fafc;padding:10px 14px;border-radius:8px;border-left:3px solid #bee3f8;">📝 ${esc(o.productDetail)}</div>` : ''}
        <div style="font-size:0.78rem;font-weight:700;color:#2b6cb0;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🌡️ พารามิเตอร์การเป่ามีด</div>
        <table class="param-mini-table">
          <thead><tr><th>โซน</th><th>อุณหภูมิ</th><th>หน่วย</th></tr></thead>
          <tbody>
            ${paramRow('กระบอกส่วนต้น',  p.temp_front,   '°C')}
            ${paramRow('กระบอกส่วนกลาง', p.temp_mid,     '°C')}
            ${paramRow('กระบอกส่วนท้าย', p.temp_rear,    '°C')}
            ${paramRow('หน้าแปลน',        p.temp_flange,  '°C')}
            ${paramRow('หัวดาย',           p.temp_die,     '°C')}
            ${paramRow('ระเบิดผิว',        p.surfaceBurst, '—')}
          </tbody>
        </table>
        <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;">
          <button class="btn btn-outline btn-sm" onclick="openOrderDetail('${o.id}')">🔍 ดูเต็ม</button>
          <button class="btn btn-primary btn-sm" onclick="editOrder('${o.id}')">✏️ แก้ไข</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleOrderCard(id) {
  const body = document.getElementById('odb-' + id);
  const chev = document.getElementById('chev-' + id);
  body.classList.toggle('open');
  chev.classList.toggle('open');
}

// ── Order Detail Modal ────────────────────────────────────
function openOrderDetail(id) {
  const o = DB.getOrderById(id);
  if (!o) return;
  const p    = o.parameters || {};
  const yNum = parseFloat((o.yieldPct || '0').replace('%','').trim());
  const yCls = yNum >= 95 ? 'badge-green' : yNum >= 80 ? 'badge-orange' : 'badge-red';

  document.getElementById('orderDetailTitle').textContent = `📋 ${o.productionOrderNo}`;
  document.getElementById('orderDetailEditBtn').onclick = () => { closeOrderDetail(); editOrder(id); };

  document.getElementById('orderDetailBody').innerHTML = `
    <div class="od-section">
      <div class="od-section-title">📄 ข้อมูลเอกสาร</div>
      <div class="od-grid">
        <div class="od-item"><div class="od-label">เลขใบสั่งผลิต</div><div class="od-value"><strong>${esc(o.productionOrderNo)}</strong></div></div>
        <div class="od-item"><div class="od-label">หมายเลขเอกสาร</div><div class="od-value">${esc(o.documentNo)}</div></div>
        <div class="od-item"><div class="od-label">วันที่ผลิต</div><div class="od-value">${esc(o.productionDate)}</div></div>
        <div class="od-item"><div class="od-label">เลข Lot</div><div class="od-value">${esc(o.lotNo)}</div></div>
        <div class="od-item"><div class="od-label">กำหนดส่ง</div><div class="od-value">${esc(o.deliveryDate)}</div></div>
      </div>
    </div>
    <div class="od-section">
      <div class="od-section-title">⚙️ ข้อมูลการผลิต</div>
      <div class="od-grid">
        <div class="od-item"><div class="od-label">เครื่องจักร</div><div class="od-value">${esc(o.machine)}</div></div>
        <div class="od-item"><div class="od-label">พนักงาน</div><div class="od-value">${esc(o.operatorName)}</div></div>
        <div class="od-item"><div class="od-label">ลูกค้า</div><div class="od-value">${esc(o.customerName)}</div></div>
        <div class="od-item"><div class="od-label">ชื่อสินค้า</div><div class="od-value">${esc(o.productName)}</div></div>
        <div class="od-item"><div class="od-label">Code สินค้า</div><div class="od-value">${esc(o.productCode)}</div></div>
        <div class="od-item"><div class="od-label">ชนิดเม็ดพลาสติก</div><div class="od-value">${esc(o.plasticType) || '—'}</div></div>
        <div class="od-item"><div class="od-label">ขนาดถุง</div><div class="od-value">${esc(o.bagSize) || '—'}</div></div>
        <div class="od-item"><div class="od-label">ความหนา</div><div class="od-value">${o.thicknessMm ? `${esc(o.thicknessMm)} mm &nbsp;/&nbsp; ${esc(o.thicknessMicron)} µm` : '—'}</div></div>
        <div class="od-item"><div class="od-label">รายละเอียด</div><div class="od-value">${esc(o.productDetail) || '—'}</div></div>
      </div>
    </div>
    <div class="od-section">
      <div class="od-section-title">📦 จำนวนการผลิต</div>
      <div class="od-grid">
        <div class="od-item"><div class="od-label">จำนวนที่สั่ง</div><div class="od-value">${num(o.orderQty)} หน่วย</div></div>
        <div class="od-item"><div class="od-label">ผลิตได้จริง</div><div class="od-value">${num(o.actualQty)} หน่วย</div></div>
        <div class="od-item"><div class="od-label">% Yield</div><div class="od-value"><span class="badge ${yCls}">${esc(o.yieldPct) || '—'}</span></div></div>
      </div>
    </div>
    <div class="od-section">
      <div class="od-section-title">🌡️ พารามิเตอร์การเป่ามีด</div>
      <table class="param-mini-table">
        <thead><tr><th>โซน / ตำแหน่ง</th><th>อุณหภูมิ</th><th>หน่วย</th></tr></thead>
        <tbody>
          ${paramRow('กระบอกส่วนต้น',  p.temp_front,   '°C')}
          ${paramRow('กระบอกส่วนกลาง', p.temp_mid,     '°C')}
          ${paramRow('กระบอกส่วนท้าย', p.temp_rear,    '°C')}
          ${paramRow('หน้าแปลน',        p.temp_flange,  '°C')}
          ${paramRow('หัวดาย',           p.temp_die,     '°C')}
          ${paramRow('ระเบิดผิว',        p.surfaceBurst, '—')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('orderDetailModal').classList.add('open');
}

function closeOrderDetail(e) {
  if (e && e.target !== document.getElementById('orderDetailModal')) return;
  document.getElementById('orderDetailModal').classList.remove('open');
}

// ── Shared helpers ────────────────────────────────────────
function miniOrderTable(orders, showDetail = false) {
  return `<table class="mini-table">
    <thead><tr><th>เลขออเดอร์</th><th>ลูกค้า</th><th>สินค้า</th><th>วันที่ผลิต</th><th>% Yield</th>${showDetail ? '<th></th>' : ''}</tr></thead>
    <tbody>${orders.map(o => {
      const yNum = parseFloat((o.yieldPct||'0').replace('%','').trim());
      const cls  = yNum >= 95 ? 'badge-green' : yNum >= 80 ? 'badge-orange' : 'badge-red';
      return `<tr>
        <td><strong style="cursor:pointer;color:#2b6cb0;" onclick="openOrderDetail('${o.id}')">${esc(o.productionOrderNo)}</strong></td>
        <td>${esc(o.customerName)}</td>
        <td>${esc(o.productName)}</td>
        <td>${esc(o.productionDate)}</td>
        <td><span class="badge ${cls}">${esc(o.yieldPct)||'—'}</span></td>
        ${showDetail ? `<td><button class="btn btn-outline btn-sm" onclick="openOrderDetail('${o.id}')">🔍</button></td>` : ''}
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function paramRow(label, param, unit) {
  const s = param?.set || '—';
  return `<tr><td>${esc(label)}</td><td>${esc(s)}</td><td>${unit}</td></tr>`;
}

// ── PWA Install Prompt ────────────────────────────────────
let _deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstall = e;
  document.getElementById('installBanner')?.style.setProperty('display', 'flex');
});
window.addEventListener('appinstalled', () => {
  document.getElementById('installBanner')?.style.setProperty('display', 'none');
});
function installApp() {
  if (!_deferredInstall) return;
  _deferredInstall.prompt();
  _deferredInstall.userChoice.then(() => {
    _deferredInstall = null;
    document.getElementById('installBanner')?.style.setProperty('display', 'none');
  });
}

// ── Settings & Sync UI ────────────────────────────────────
function openSettingsModal() {
  const url = localStorage.getItem('gas_url') || '';
  document.getElementById('gasUrlInput').value = url;
  document.getElementById('syncTestResult').innerHTML = '';
  document.getElementById('settingsModal').classList.add('open');
}
function closeSettingsModal(e) {
  if (e && e.target !== document.getElementById('settingsModal')) return;
  document.getElementById('settingsModal').classList.remove('open');
}
function saveGasUrl() {
  const url = document.getElementById('gasUrlInput').value.trim();
  if (!url) { showToast('⚠️ กรุณากรอก URL', '#c05621'); return; }
  DB.setGasUrl(url); // reloads page
}
function disconnectGAS() {
  if (!confirm('ยกเลิกการเชื่อมต่อ Google Sheets?\nข้อมูลใน localStorage ยังคงอยู่')) return;
  DB.clearGasUrl();
}
async function testConnection() {
  const url = document.getElementById('gasUrlInput').value.trim();
  const res = document.getElementById('syncTestResult');
  if (!url) { res.innerHTML = '<span style="color:#c05621;">⚠️ กรุณากรอก URL ก่อน</span>'; return; }
  res.innerHTML = '<span style="color:#3182ce;">🔄 กำลังทดสอบ...</span>';
  try {
    const r = await fetch(`${url}?action=getOrders`);
    if (r.ok) {
      res.innerHTML = '<span style="color:#276749;">✅ เชื่อมต่อสำเร็จ! พร้อมใช้งาน</span>';
    } else {
      res.innerHTML = `<span style="color:#c53030;">❌ HTTP ${r.status} — ตรวจสอบ URL และสิทธิ์ Deploy</span>`;
    }
  } catch {
    res.innerHTML = '<span style="color:#c53030;">❌ เชื่อมต่อไม่ได้ — ตรวจสอบ URL หรือ CORS</span>';
  }
}

// ── Sync indicator ────────────────────────────────────────
function initSyncIndicator() {
  const dot   = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');

  if (DB.isOnline()) {
    dot.className   = 'sync-dot online';
    label.textContent = 'Online';
  } else {
    dot.className   = 'sync-dot offline';
    label.textContent = 'Offline';
  }

  DB.onSyncStart(() => {
    dot.className   = 'sync-dot syncing';
    label.textContent = 'กำลังซิงค์...';
  });
  DB.onSyncEnd((ok, errMsg) => {
    if (ok) {
      dot.className   = 'sync-dot online';
      label.textContent = 'Online';
    } else {
      dot.className   = 'sync-dot error';
      label.textContent = 'Sync Error';
      console.warn('Sync error:', errMsg);
    }
    DB.updateSyncBadge();
  });

  DB.updateSyncBadge();

  // flush pending เมื่อกลับมา online
  window.addEventListener('online', () => DB.flushPendingSync());
}

// ── Helpers ───────────────────────────────────────────────
function v(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function num(n) {
  const x = parseFloat(n);
  return isNaN(x) ? '—' : x.toLocaleString();
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function daysUntil(dateStr) {
  if (!dateStr) return 9999;
  const diff = new Date(dateStr) - new Date(today());
  return Math.round(diff / 86400000);
}

let _toastTimer;
function showToast(msg, bg = '#276749') {
  const t = document.getElementById('toast');
  t.textContent  = msg;
  t.style.background = bg;
  t.style.display    = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3000);
}
