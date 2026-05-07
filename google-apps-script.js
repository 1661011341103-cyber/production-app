// ===================================================
// Google Apps Script — Production Order API
// วางโค้ดนี้ใน Google Apps Script แล้ว Deploy as Web App
// Execute as: Me | Who has access: Anyone
// ===================================================

const SHEET_ORDERS  = 'orders';
const SHEET_DEFECTS = 'defects';

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getOrders')  return jsonResponse(getSheet(SHEET_ORDERS).map(rowToOrder));
    if (action === 'getDefects') return jsonResponse(getSheet(SHEET_DEFECTS).map(rowToDefect));
    return jsonResponse({ error: 'unknown action' }, 400);
  } catch(err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function doPost(e) {
  const body   = JSON.parse(e.postData.contents);
  const action = body.action;
  try {
    if (action === 'saveOrder')    return jsonResponse(saveOrder(body.data));
    if (action === 'deleteOrder')  return jsonResponse(deleteRow(SHEET_ORDERS,  body.id));
    if (action === 'saveDefect')   return jsonResponse(saveDefect(body.data));
    if (action === 'deleteDefect') return jsonResponse(deleteRow(SHEET_DEFECTS, body.id));
    return jsonResponse({ error: 'unknown action' }, 400);
  } catch(err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ── Orders ────────────────────────────────────────────────
const ORDER_COLS = [
  'id','createdAt','updatedAt',
  'productionOrderNo','documentNo','productionDate','lotNo','deliveryDate',
  'machine','operatorName','customerName','productName','productCode',
  'orderQty','plasticType','bagSize','thicknessMm','thicknessMicron',
  'productDetail','actualQty','yieldPct',
  'temp_front','temp_mid','temp_rear','temp_flange','temp_die','surfaceBurst'
];

function saveOrder(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ORDERS);
    sheet.appendRow(ORDER_COLS);
  }

  const now = new Date().toISOString();
  const p   = data.parameters || {};

  const row = [
    data.id || Utilities.getUuid(),
    data.createdAt || now,
    now,
    data.productionOrderNo, data.documentNo, data.productionDate,
    data.lotNo, data.deliveryDate, data.machine, data.operatorName,
    data.customerName, data.productName, data.productCode,
    data.orderQty, data.plasticType, data.bagSize,
    data.thicknessMm, data.thicknessMicron, data.productDetail,
    data.actualQty, data.yieldPct,
    p.temp_front?.set,  p.temp_mid?.set,   p.temp_rear?.set,
    p.temp_flange?.set, p.temp_die?.set,   p.surfaceBurst?.set
  ];

  // update existing row
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === row[0]) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { ok: true, id: row[0] };
    }
  }
  // insert new
  sheet.appendRow(row);
  return { ok: true, id: row[0] };
}

function rowToOrder(row) {
  const o = {};
  ORDER_COLS.forEach((col, i) => o[col] = row[i] ?? '');
  // rebuild parameters object
  o.parameters = {
    temp_front:  { set: o.temp_front  }, temp_mid:    { set: o.temp_mid    },
    temp_rear:   { set: o.temp_rear   }, temp_flange: { set: o.temp_flange },
    temp_die:    { set: o.temp_die    }, surfaceBurst:{ set: o.surfaceBurst }
  };
  ['temp_front','temp_mid','temp_rear','temp_flange','temp_die','surfaceBurst']
    .forEach(k => delete o[k]);
  return o;
}

// ── Defects ───────────────────────────────────────────────
const DEFECT_COLS = ['id','createdAt','defectDate','defectQty','defectType','defectRemark'];

function saveDefect(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_DEFECTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DEFECTS);
    sheet.appendRow(DEFECT_COLS);
  }

  const now = new Date().toISOString();
  const row = [
    data.id || Utilities.getUuid(),
    data.createdAt || now,
    data.defectDate, data.defectQty, data.defectType, data.defectRemark
  ];

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === row[0]) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { ok: true, id: row[0] };
    }
  }
  sheet.appendRow(row);
  return { ok: true, id: row[0] };
}

function rowToDefect(row) {
  const d = {};
  DEFECT_COLS.forEach((col, i) => d[col] = row[i] ?? '');
  return d;
}

// ── Helpers ───────────────────────────────────────────────
function deleteRow(sheetName, id) {
  const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { ok: false };
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'not found' };
}

function getSheet(name) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  return values.slice(1).filter(r => r[0]); // skip header, skip empty
}

function jsonResponse(data, code) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
