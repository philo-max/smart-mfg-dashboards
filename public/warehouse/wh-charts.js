(function () {
  var mk = U.mk, panel = U.panel, R = U.R;
  var W = 364.8, H = 212, GAP = 16;
  var SEL = /^chart(\d)$/.exec(WH.MODE || '');
  function on(n) { return !SEL || SEL[1] === String(n); }
  U.mod = 'charts';
  var titles = ['在库数量趋势', '入库/出库数量对比', 'A/B/C 物料分布', '机器人 Z 轴位置趋势', '工位 occupancy 统计'];
  var cvs = titles.map(function (t, i) {
    var p = panel(16 + i * (W + GAP), 852, W, H, t);
    U.roots['chart' + (i + 1)] = p;
    p.firstChild.style.fontSize = '14px';
    var c = document.createElement('canvas');
    c.width = (W - 24) * 2; c.height = (H - 48) * 2;
    c.style.cssText = 'position:absolute;left:12px;top:40px;width:' + (W - 24) + 'px;height:' + (H - 48) + 'px';
    p.appendChild(c);
    var g = c.getContext('2d'); g.scale(2, 2);
    return { g: g, w: W - 24, h: H - 48 };
  });
  U.cvs = cvs;
  var zs = [86, 86.4, 85.9, 86.6, 86.2, 86.8, 86.3, 86.5];

  function axes(o, lo, hi, n, labels) {
    var g = o.g, L = 34, B = 22, T = 8, R2 = 8, pw = o.w - L - R2, ph = o.h - T - B;
    g.clearRect(0, 0, o.w, o.h); o.hits = [];
    g.font = '11px Consolas'; g.fillStyle = '#5F80B5'; g.strokeStyle = 'rgba(80,140,255,.15)'; g.lineWidth = 1; g.textAlign = 'right';
    for (var i = 0; i <= 2; i++) {
      var y = T + ph * i / 2; g.beginPath(); g.moveTo(L, y); g.lineTo(o.w - R2, y); g.stroke();
      g.fillText(String(Math.round(hi - (hi - lo) * i / 2)), L - 6, y + 4);
    }
    g.textAlign = 'center';
    labels.forEach(function (t, k) { g.fillText(t, L + pw * (n > 1 ? k / (n - 1) : 0.5), o.h - 6); });
    return { L: L, T: T, pw: pw, ph: ph, B: B };
  }
  function line(o, data, col, labels, unit) {
    var lo = Math.min.apply(0, data), hi = Math.max.apply(0, data), pad = Math.max(2, (hi - lo) * 0.3);
    lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad);
    var a = axes(o, lo, hi, data.length, labels), g = o.g;
    var pts = data.map(function (v, i) { return [a.L + a.pw * i / (data.length - 1), a.T + a.ph * (1 - (v - lo) / (hi - lo))]; });
    pts.forEach(function (p, i) { o.hits.push({ x: p[0], y: p[1], r: 16, t: (labels[i] || ('第 ' + (i + 1) + ' 点')) + '　' + (Math.round(data[i] * 10) / 10) + (unit || '') }); });
    var gr = g.createLinearGradient(0, a.T, 0, a.T + a.ph); gr.addColorStop(0, col + '66'); gr.addColorStop(1, col + '00');
    g.beginPath(); g.moveTo(pts[0][0], a.T + a.ph); pts.forEach(function (p) { g.lineTo(p[0], p[1]); }); g.lineTo(pts[pts.length - 1][0], a.T + a.ph); g.fillStyle = gr; g.fill();
    g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); });
    g.strokeStyle = col; g.lineWidth = 2; g.shadowColor = col; g.shadowBlur = 8; g.stroke(); g.shadowBlur = 0;
    pts.forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 3, 0, 7); g.fillStyle = col; g.fill(); });
  }
  var DAYS = ['周一', '周二', '周三', '周四'];
  var D = [
    function () { line(cvs[0], WH.trend, '#38E8FF', ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'], ' 件'); },
    function () {
      var o = cvs[1], a = axes(o, 0, 16, 4, DAYS), g = o.g;
      g.fillStyle = '#3DDC97'; g.fillRect(o.w - 90, 4, 8, 8); g.fillStyle = '#FF5470'; g.fillRect(o.w - 46, 4, 8, 8);
      g.fillStyle = '#9CB4DA'; g.textAlign = 'left'; g.fillText('入库', o.w - 78, 12); g.fillText('出库', o.w - 34, 12);
      WH.wk.forEach(function (d, i) {
        var cx = a.L + a.pw * (i + 0.5) / 4;
        [[d[0], '#3DDC97', -13], [d[1], '#FF5470', 2]].forEach(function (b) {
          var h = a.ph * Math.min(1, b[0] / 16); g.fillStyle = b[1]; g.fillRect(cx + b[2], a.T + a.ph - h, 11, h);
          o.hits.push({ rx: cx + b[2], ry: a.T + a.ph - h, rw: 11, rh: h + 4, t: DAYS[i] + (b[1] === '#3DDC97' ? ' 入库 ' : ' 出库 ') + b[0] });
        });
      });
    },
    function () {
      var o = cvs[2], g = o.g; g.clearRect(0, 0, o.w, o.h);
      var cx = 84, cy = o.h / 2, r = 50, tot = WH.total(), st = -Math.PI / 2, cols = { A: '#5EF0F0', B: '#4B7BEC', C: '#A855F7' };
      ['A', 'B', 'C'].forEach(function (k) {
        var e = st + Math.PI * 2 * WH.cnt[k] / tot; g.beginPath(); g.arc(cx, cy, r, st + 0.03, e - 0.03); g.lineWidth = 16; g.strokeStyle = cols[k]; g.stroke(); st = e;
      });
      g.fillStyle = '#fff'; g.font = 'bold 24px Consolas'; g.textAlign = 'center'; g.fillText(tot, cx, cy + 6);
      g.fillStyle = '#7FA2D8'; g.font = '11px "Microsoft YaHei"'; g.fillText('件', cx, cy + 22);
      ['A', 'B', 'C'].forEach(function (k, i) {
        g.fillStyle = cols[k]; g.fillRect(170, 40 + i * 30, 10, 10); g.fillStyle = '#DCEBFF'; g.font = '13px "Microsoft YaHei"'; g.textAlign = 'left'; g.fillText(k + ' 物料  ' + WH.cnt[k], 188, 50 + i * 30);
      });
    },
    function () { line(cvs[3], zs, '#FFB020', ['-7s', '-6s', '-5s', '-4s', '-3s', '-2s', '-1s', '当前'], ' mm'); },
    function () {
      var o = cvs[4], g = o.g; g.clearRect(0, 0, o.w, o.h);
      for (var c = 0; c < 6; c++) {
        var f = (WH.slots[WH.ROWS[0][c] - 1] ? 1 : 0) + (WH.slots[WH.ROWS[1][c] - 1] ? 1 : 0), y = 8 + c * 20;
        g.fillStyle = '#7FA2D8'; g.font = '11px Consolas'; g.textAlign = 'left'; g.fillText(WH.pad(c + 1), 4, y + 10);
        g.fillStyle = 'rgba(60,130,255,.15)'; g.fillRect(30, y + 2, o.w - 40, 10);
        g.fillStyle = '#3DDC97'; g.shadowColor = '#3DDC97'; g.shadowBlur = 6; g.fillRect(30, y + 2, (o.w - 40) * f / 2, 10); g.shadowBlur = 0;
      }
      g.fillStyle = '#5F80B5'; g.textAlign = 'center'; g.fillText('有料 / 空位', o.w / 2 + 14, o.h - 4);
    }
  ];
  var last = 0, lastZ = 0;
  R.push(function (s, now) {
    if (now - lastZ > 1500) { lastZ = now; zs.push(86.2 + s.row * 8 + Math.sin(now / 900) * 0.6 + (Math.random() - 0.5) * 0.4); zs.shift(); }
    if (now - last > 300) { last = now; D.forEach(function (d, i) { if (on(i + 1)) d(); }); }
  });

  U.mod = 'ticker';
  var tk = mk(U.stage, '', '<div class="lb">实时作业流</div><div class="rl"></div>');
  tk.id = 'tick'; U.roots.ticker = tk;
  var rl = tk.querySelector('.rl'), tkH = '', wdt = 0;
  R.push(function (s, now) {
    var items = WH.logs.map(function (l) { return '<span style="color:' + (l.res === '完成' ? '#3DDC97' : '#FFB020') + '">● ' + l.t + ' ' + l.text + ' ' + l.res + '</span>'; });
    items.push('<span style="color:#6FA8FF">● 堆垛机 ' + (s.kind ? '作业中' : '待命') + '</span>', '<span style="color:' + (WH.flags.yellow ? '#FFB020' : '#3DDC97') + '">● 黄灯预警 ' + (WH.flags.yellow ? '触发' : '正常') + '</span>', '<span style="color:' + (WH.flags.red ? '#FF5470' : '#3DDC97') + '">● 红灯报警 ' + (WH.flags.red ? '触发' : '正常') + '</span>');
    var h = items.join('') + items.join('');
    if (h !== tkH) { tkH = h; rl.innerHTML = h; wdt = rl.scrollWidth / 2; }
    rl.style.transform = 'translateX(' + (-(now / 30) % (wdt || 1)) + 'px)';
  });

  var tip = mk(U.stage, '', '');
  tip.id = 'tip'; U.overlays.push(tip);
  cvs.forEach(function (o) {
    var c = o.g.canvas;
    c.addEventListener('mousemove', function (ev) {
      var r = c.getBoundingClientRect(), mx = (ev.clientX - r.left) / r.width * o.w, my = (ev.clientY - r.top) / r.height * o.h, best = null, bd = 1e9;
      (o.hits || []).forEach(function (h) {
        var d = h.rx !== undefined ? ((mx >= h.rx - 2 && mx <= h.rx + h.rw + 2 && my >= h.ry - 2 && my <= h.ry + h.rh) ? 0 : 1e9) : Math.hypot(mx - h.x, my - h.y);
        if (d < bd && d <= (h.r || 0)) { bd = d; best = h; }
      });
      if (!best) { tip.style.display = 'none'; return; }
      var f = U.frame();
      tip.textContent = best.t; tip.style.display = 'block';
      tip.style.left = Math.max(2, (ev.clientX - f.left) / f.sc - 40) + 'px'; tip.style.top = Math.max(2, (ev.clientY - f.top) / f.sc - 34) + 'px';
      c.style.cursor = 'crosshair';
    });
    c.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
  });
})();
