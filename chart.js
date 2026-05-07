// ===== chart.js — Simple SVG charts (no external lib) =====

function buildDefectChart(canvasId, defects) {
  const el = document.getElementById(canvasId);
  if (!el) return;

  // last 14 days
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const map = {};
  defects.forEach(d => { map[d.defectDate] = (map[d.defectDate] || 0) + Number(d.defectQty || 0); });
  const values = days.map(d => map[d] || 0);
  const maxVal = Math.max(...values, 1);

  const W = el.clientWidth || 600;
  const H = 200;
  const padL = 40, padR = 10, padT = 16, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW   = Math.max(4, (chartW / days.length) - 4);

  let svg = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  // grid lines
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH / 4) * i;
    const val = Math.round(maxVal - (maxVal / 4) * i);
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    svg += `<text x="${padL - 4}" y="${y + 4}" text-anchor="end" font-size="10" fill="#718096">${val}</text>`;
  }

  // bars
  values.forEach((v, i) => {
    const x    = padL + (chartW / days.length) * i + (chartW / days.length - barW) / 2;
    const barH = (v / maxVal) * chartH;
    const y    = padT + chartH - barH;
    const color = v === 0 ? '#c6f6d5' : v > maxVal * 0.7 ? '#fc8181' : '#63b3ed';
    svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${Math.max(barH, 1).toFixed(1)}" fill="${color}" rx="3"/>`;
    if (v > 0) {
      svg += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#2d3748">${v}</text>`;
    }
    // x label (dd/mm)
    const label = days[i].slice(5).replace('-', '/');
    svg += `<text x="${(x + barW / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#718096">${label}</text>`;
  });

  svg += `</svg>`;
  el.innerHTML = svg;
}

function buildYieldChart(canvasId, orders) {
  const el = document.getElementById(canvasId);
  if (!el) return;

  const recent = orders.slice(0, 10).reverse();
  if (recent.length === 0) { el.innerHTML = '<p style="color:#a0aec0;text-align:center;padding:40px 0;">ยังไม่มีข้อมูล</p>'; return; }

  const values = recent.map(o => {
    const pct = parseFloat((o.yieldPct || '0').replace('%', '').trim());
    return isNaN(pct) ? 0 : pct;
  });
  const labels = recent.map(o => (o.productionOrderNo || '').slice(-6));
  const maxVal = 100;

  const W = el.clientWidth || 600;
  const H = 200;
  const padL = 44, padR = 10, padT = 16, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW   = Math.max(4, (chartW / recent.length) - 6);

  let svg = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  // grid
  [0, 25, 50, 75, 100].forEach(pct => {
    const y = padT + chartH - (pct / maxVal) * chartH;
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    svg += `<text x="${padL - 4}" y="${y + 4}" text-anchor="end" font-size="10" fill="#718096">${pct}%</text>`;
  });

  values.forEach((v, i) => {
    const x    = padL + (chartW / recent.length) * i + (chartW / recent.length - barW) / 2;
    const barH = (v / maxVal) * chartH;
    const y    = padT + chartH - barH;
    const color = v >= 95 ? '#68d391' : v >= 80 ? '#f6ad55' : '#fc8181';
    svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${Math.max(barH, 1).toFixed(1)}" fill="${color}" rx="3"/>`;
    svg += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="#2d3748">${v.toFixed(0)}%</text>`;
    svg += `<text x="${(x + barW / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="8" fill="#718096">${labels[i]}</text>`;
  });

  svg += `</svg>`;
  el.innerHTML = svg;
}

window.ChartUtil = { buildDefectChart, buildYieldChart, buildDefectChartForMonth };

// ── Build defect chart for a specific month ───────────────
function buildDefectChartForMonth(canvasId, defects, yyyy, mm) {
  const el = document.getElementById(canvasId);
  if (!el) return;

  // build all days in the month
  const daysInMonth = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${yyyy}-${mm}-${String(d).padStart(2, '0')}`);
  }

  const map = {};
  defects.forEach(d => { map[d.defectDate] = (map[d.defectDate] || 0) + Number(d.defectQty || 0); });
  const values = days.map(d => map[d] || 0);
  const maxVal = Math.max(...values, 1);

  const W = el.clientWidth || 600;
  const H = 200;
  const padL = 40, padR = 10, padT = 16, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW   = Math.max(2, (chartW / days.length) - 2);

  let svg = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  for (let i = 0; i <= 4; i++) {
    const y   = padT + (chartH / 4) * i;
    const val = Math.round(maxVal - (maxVal / 4) * i);
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    svg += `<text x="${padL - 4}" y="${y + 4}" text-anchor="end" font-size="10" fill="#718096">${val}</text>`;
  }

  values.forEach((v, i) => {
    const x    = padL + (chartW / days.length) * i + (chartW / days.length - barW) / 2;
    const barH = (v / maxVal) * chartH;
    const y    = padT + chartH - barH;
    const color = v === 0 ? '#c6f6d5' : v > maxVal * 0.7 ? '#fc8181' : '#63b3ed';
    svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${Math.max(barH, 1).toFixed(1)}" fill="${color}" rx="2"/>`;
    if (v > 0) {
      svg += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="#2d3748">${v}</text>`;
    }
    // show label every 5 days
    if ((i + 1) % 5 === 0 || i === 0) {
      svg += `<text x="${(x + barW / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#718096">${i + 1}</text>`;
    }
  });

  svg += `</svg>`;
  el.innerHTML = svg;
}
