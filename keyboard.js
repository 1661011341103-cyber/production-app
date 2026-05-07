// ===== keyboard.js — Keyboard Navigation for Production Form =====
//
// Enter / Tab  → ไปฟิลด์ถัดไป
// Shift+Enter  → ย้อนกลับฟิลด์ก่อนหน้า
// ↑ / ↓        → เลื่อนขึ้น/ลงในตารางพารามิเตอร์
// ⚡ shortcut  → Alt+P = สร้างเลข PO, Alt+D = สร้างเลข DOC

// ── ลำดับ field ทั้งหมดในฟอร์ม ──────────────────────────
const FORM_FIELD_ORDER = [
  'productionOrderNo',
  'documentNo',
  // date widgets ใช้ data-target แทน id โดยตรง
  '__date_productionDate_dd',
  '__date_productionDate_mm',
  '__date_productionDate_yyyy',
  'lotNo',
  '__date_deliveryDate_dd',
  '__date_deliveryDate_mm',
  '__date_deliveryDate_yyyy',
  'machine',
  'operatorName',
  'customerName',
  'productName',
  'productCode',
  'orderQty',
  'plasticType',
  'bagSize',
  'thicknessMm',
  'thicknessMicron',
  'productDetail',
  'actualQty',
  // param table
  'temp_front_set',
  'temp_mid_set',
  'temp_rear_set',
  'temp_flange_set',
  'temp_die_set',
  'surfaceBurst_set',
  // defect section
  '__date_defectDate_dd',
  '__date_defectDate_mm',
  '__date_defectDate_yyyy',
  'dailyDefectQty',
  'defectType',
  'defectRemark',
];

// ── ตาราง param (สำหรับลูกศรขึ้น/ลง) ────────────────────
const PARAM_FIELDS = [
  'temp_front_set',
  'temp_mid_set',
  'temp_rear_set',
  'temp_flange_set',
  'temp_die_set',
  'surfaceBurst_set',
];

document.addEventListener('DOMContentLoaded', () => {
  // ตั้ง tabindex ตามลำดับ — ข้าม __date_ entries (จัดการโดย date widget เอง)
  let tabIdx = 1;
  FORM_FIELD_ORDER.forEach(id => {
    if (id.startsWith('__date_')) return;
    const el = document.getElementById(id);
    if (el) el.setAttribute('tabindex', tabIdx++);
  });

  // date widget inputs ตั้ง tabindex ตามลำดับด้วย
  ['productionDate','deliveryDate','defectDate'].forEach(targetId => {
    const wrap = document.getElementById('wrap-' + targetId);
    if (!wrap) return;
    wrap.querySelectorAll('input[type="number"]').forEach(el => {
      el.setAttribute('tabindex', tabIdx++);
    });
  });

  // ── Enter key navigation ──────────────────────────────
  document.getElementById('productionForm').addEventListener('keydown', (e) => {
    const tag = e.target.tagName.toLowerCase();

    // textarea: Enter พิมพ์ปกติ, Shift+Enter ย้อนกลับ
    if (tag === 'textarea') {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        moveFocus(e.target, -1);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        moveFocus(e.target, -1);
      } else {
        moveFocus(e.target, 1);
      }
      return;
    }

    // ลูกศรขึ้น/ลงในตาราง param
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const id = e.target.id;
      if (PARAM_FIELDS.includes(id)) {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const idx = PARAM_FIELDS.indexOf(id);
        const next = PARAM_FIELDS[idx + dir];
        if (next) {
          const el = document.getElementById(next);
          if (el) { el.focus(); el.select && el.select(); }
        }
      }
    }
  });

  // ── Alt shortcuts ─────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      if (typeof genNo === 'function') genNo('productionOrderNo', 'PO');
    }
    if (e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (typeof genNo === 'function') genNo('documentNo', 'DOC');
    }
  });

  // ── แสดง hint shortcut ───────────────────────────────
  addShortcutHints();
});

// ── เลื่อน focus ─────────────────────────────────────────
function moveFocus(currentEl, direction) {
  const id  = currentEl.id;
  const idx = FORM_FIELD_ORDER.indexOf(id);
  if (idx === -1) return;

  let nextIdx = idx + direction;
  while (nextIdx >= 0 && nextIdx < FORM_FIELD_ORDER.length) {
    const nextEl = document.getElementById(FORM_FIELD_ORDER[nextIdx]);
    if (nextEl && !nextEl.disabled && !nextEl.readOnly) {
      nextEl.focus();
      if (nextEl.select && nextEl.type !== 'date') nextEl.select();
      // scroll into view อย่างนุ่มนวล
      nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    nextIdx += direction;
  }
}

// ── Shortcut hints ────────────────────────────────────────
function addShortcutHints() {
  const poWrap  = document.getElementById('productionOrderNo')?.closest('.input-with-btn');
  const docWrap = document.getElementById('documentNo')?.closest('.input-with-btn');

  if (poWrap) {
    const btn = poWrap.querySelector('.gen-btn');
    if (btn) btn.title = 'สร้างเลขอัตโนมัติ (Alt+P)';
  }
  if (docWrap) {
    const btn = docWrap.querySelector('.gen-btn');
    if (btn) btn.title = 'สร้างเลขอัตโนมัติ (Alt+D)';
  }

  // เพิ่ม hint bar ใต้ฟอร์ม
  const form = document.getElementById('productionForm');
  if (!form) return;
  const hint = document.createElement('div');
  hint.className = 'kb-hint-bar';
  hint.innerHTML = `
    <span>⌨️ <strong>Enter</strong> ไปฟิลด์ถัดไป</span>
    <span><strong>Shift+Enter</strong> ย้อนกลับ</span>
    <span><strong>↑ ↓</strong> เลื่อนในตารางอุณหภูมิ</span>
    <span><strong>Alt+P</strong> สร้างเลข PO</span>
    <span><strong>Alt+D</strong> สร้างเลข DOC</span>
  `;
  form.appendChild(hint);
}
