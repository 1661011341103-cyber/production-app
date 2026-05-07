// ===== export.js — CSV / Excel export =====

function ordersToCSV(orders) {
  const headers = [
    'เลขใบสั่งผลิต','หมายเลขเอกสาร','วันที่ผลิต','เลข Lot','กำหนดส่ง',
    'เครื่องจักร','พนักงาน','ลูกค้า','ชื่อสินค้า','Code สินค้า',
    'จำนวนที่สั่ง','จำนวนผลิตได้','% Yield','ชนิดเม็ดพลาสติก','ขนาดถุง','ความหนา (mm)','ความหนา (µm)','รายละเอียด',
    'อุณหภูมิต้น','อุณหภูมิกลาง','อุณหภูมิท้าย','หน้าแปลน','หัวดาย','ระเบิดผิว',
  ];

  const rows = orders.map(o => {
    const p = o.parameters || {};
    return [
      o.productionOrderNo, o.documentNo, o.productionDate, o.lotNo, o.deliveryDate,
      o.machine, o.operatorName, o.customerName, o.productName, o.productCode,
      o.orderQty, o.actualQty, o.yieldPct, o.plasticType, o.bagSize, o.thicknessMm, o.thicknessMicron, o.productDetail,
      p.temp_front?.set,  p.temp_mid?.set, p.temp_rear?.set,
      p.temp_flange?.set, p.temp_die?.set, p.surfaceBurst?.set,
    ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`);
  });

  return [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

function defectsToCSV(defects) {
  const headers = ['วันที่','จำนวนของเสีย','ประเภทของเสีย','หมายเหตุ'];
  const rows = defects.map(d => [
    d.defectDate, d.defectQty, d.defectType, d.defectRemark,
  ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`));
  return [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

function downloadCSV(content, filename) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel Thai
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

window.ExportUtil = { ordersToCSV, defectsToCSV, downloadCSV };
