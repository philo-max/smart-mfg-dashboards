(function () {
  var stage = document.getElementById('stage');
  var R = [], roots = {};
  var _push = R.push;
  R.push = function (f) { f._m = U.mod; return _push.call(R, f); };
  function mk(p, cls, html, css) {
    var e = document.createElement('div');
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (css) e.style.cssText = css;
    p.appendChild(e);
    return e;
  }
  function pos(x, y, w, h) { return 'position:absolute;left:' + x + 'px;top:' + y + 'px;' + (w ? 'width:' + w + 'px;' : '') + (h ? 'height:' + h + 'px;' : ''); }
  function panel(x, y, w, h, title, parent) {
    var e = mk(parent || stage, 'p', '', pos(x, y, w, h));
    if (title) mk(e, 't', title);
    return e;
  }
  function set(e, t) { if (e._t !== t) { e._t = t; e.textContent = t; } }
  function box(p, x, y, w, h, label, val, vsize, color) {
    var b = mk(p, 'box', '<div class="l">' + label + '</div><div class="v num"></div>', pos(x, y, w, h));
    var v = b.querySelector('.v');
    v.style.fontSize = (vsize || 30) + 'px';
    if (color) v.style.color = color;
    v.textContent = val;
    return v;
  }
  function sig(p, x, y, w, h, label) {
    var b = mk(p, 'box', '<div class="l" style="margin-top:6px">' + label + '</div><div class="s" style="margin-top:4px;font-size:14px"></div>', pos(x, y, w, h));
    return b.querySelector('.s');
  }
  function setSig(e, on, onT, offT, cls) {
    var t = on ? onT : offT, k = on ? cls : 'x';
    if (e._k === t) return;
    e._k = t;
    e.innerHTML = '<span class="dot" style="color:' + (on ? (cls === 'o' ? '#FFB020' : '#3DDC97') : '#5B6B86') + ';background:currentColor"></span><span style="color:' + (on ? (cls === 'o' ? '#FFB020' : '#3DDC97') : '#7FA2D8') + '">' + t + '</span>';
  }
  window.U = { mod: 'header', roots: roots, overlays: [], mk: mk, pos: pos, panel: panel, set: set, box: box, sig: sig, setSig: setSig, R: R, stage: stage };

  var hd = mk(stage, '', '', pos(560, 8, 800, 70));
  mk(hd, '', '智能仓储单元监控看板', 'text-align:center;font-size:32px;font-weight:700;letter-spacing:6px;color:#5EEBFF;text-shadow:0 0 18px rgba(56,232,255,.6);margin-top:12px');
  mk(hd, '', '', 'position:absolute;left:120px;right:120px;bottom:2px;height:2px;background:linear-gradient(90deg,transparent,#38E8FF,transparent)');
  var ck = mk(stage, 'p', '', pos(1690, 20, 214, 46));
  var clk = mk(ck, 'num', '', 'text-align:center;line-height:44px;font-size:24px;color:#5EEBFF;letter-spacing:2px');
  R.push(function (s, now) { var d = new Date(now), P = WH.pad; set(clk, P(d.getHours()) + ':' + P(d.getMinutes()) + ':' + P(d.getSeconds())); });

  U.mod = 'kpi';
  var p1 = panel(16, 84, 400, 450, '重点数据指标');
  roots.kpi = p1;
  mk(p1, 'dim', '当前设备状态', 'position:absolute;left:18px;top:52px;font-size:15px');
  var run = mk(p1, 'tag g', '<span class="dot"></span>运行中', 'position:absolute;right:18px;top:48px;padding:3px 16px');
  var vTot = box(p1, 18, 88, 364, 92, '在库数量', 86, 46, '#fff');
  var vA = box(p1, 18, 192, 114, 78, 'A 数量', 30, 30), vB = box(p1, 143, 192, 114, 78, 'B 数量', 28, 30), vC = box(p1, 268, 192, 114, 78, 'C 数量', 28, 30);
  var vIn = box(p1, 18, 282, 176, 78, '入库数', 12, 30), vOut = box(p1, 206, 282, 176, 78, '出库数', 9, 30);
  var vDone = box(p1, 18, 366, 364, 74, '完成数', 127, 40, '#fff');
  R.push(function () {
    set(vTot, WH.total()); set(vA, WH.cnt.A); set(vB, WH.cnt.B); set(vC, WH.cnt.C);
    set(vIn, WH.st.inN); set(vOut, WH.st.outN); set(vDone, WH.st.done);
  });

  U.mod = 'stats';
  var p2 = panel(16, 546, 400, 254, '仓储作业统计');
  roots.stats = p2;
  var vAI = box(p2, 18, 46, 176, 60, '自动存料累计', 156, 26), vAO = box(p2, 206, 46, 176, 60, '自动取料累计', 142, 26);
  var vMI = box(p2, 18, 114, 176, 60, '手动存料累计', 38, 26), vTT = box(p2, 206, 114, 176, 60, '总数', 86, 26);
  function rate(y, label, color) {
    mk(p2, '', label, 'position:absolute;left:18px;top:' + y + 'px;font-size:13px');
    var v = mk(p2, 'num', '', 'position:absolute;right:18px;top:' + y + 'px;font-size:13px;color:' + color);
    var b = mk(p2, 'bar', '<i style="background:' + color + '"></i>', 'left:18px;right:18px;top:' + (y + 22) + 'px');
    return { v: v, i: b.firstChild };
  }
  var r1 = rate(186, '入库完成率', '#3DDC97'), r2 = rate(218, '出库完成率', '#38B6FF');
  R.push(function () {
    set(vAI, WH.st.autoIn); set(vAO, WH.st.autoOut); set(vMI, WH.st.manual); set(vTT, WH.total());
    set(r1.v, WH.st.inRate + '%'); r1.i.style.width = WH.st.inRate + '%';
    set(r2.v, WH.st.outRate + '%'); r2.i.style.width = WH.st.outRate + '%';
  });

  U.mod = 'online';
  var q1 = panel(1504, 84, 400, 340, '线上仓库单元');
  roots.online = q1;
  var sOs = sig(q1, 18, 46, 178, 60, '出库开始'), sOd = sig(q1, 204, 46, 178, 60, '出库完成');
  var sIs = sig(q1, 18, 114, 178, 60, '入库开始'), sId = sig(q1, 204, 114, 178, 60, '入库完成');
  function lamp(y, label, key, kind) {
    var b = mk(q1, 'box click', '<span style="position:absolute;left:14px;top:9px;font-size:14px">' + label + '</span><span class="g" style="position:absolute;right:14px;top:6px"></span>', pos(18, y, 364, 38));
    b.style.cursor = 'pointer'; b.onclick = function () { WH.toggle(key); };
    return b.querySelector('.g');
  }
  var lRed = lamp(186, '红灯报警', 'red'), lYel = lamp(232, '黄灯预警', 'yellow');
  var vOut2 = box(q1, 18, 282, 178, 48, '出库数', 9, 22, '#fff'), vIn2 = box(q1, 204, 282, 178, 48, '入库数', 12, 22, '#fff');
  R.push(function (s) {
    var o = s.kind === 'out', i = s.kind === 'in';
    setSig(sOs, o, '触发', '等待', 'g'); setSig(sOd, o && s.phase === 3, '完成', '等待', 'g');
    setSig(sIs, i, '触发', '等待', 'g'); setSig(sId, i && s.phase === 3, '完成', '等待', 'g');
    var rs = WH.flags.red ? '<span class="tag r">异常</span>' : '<span class="tag g">正常</span>';
    var ys = WH.flags.yellow ? '<span class="tag o">预警</span>' : '<span class="tag g">正常</span>';
    if (lRed._h !== rs) { lRed._h = rs; lRed.innerHTML = rs; }
    if (lYel._h !== ys) { lYel._h = ys; lYel.innerHTML = ys; }
    set(vOut2, WH.st.outN); set(vIn2, WH.st.inN);
  });

  U.mod = 'conv';
  var q2 = panel(1504, 436, 400, 364, '输送线状态');
  roots.conv = q2;
  var sW = sig(q2, 18, 46, 178, 66, '输送线工件检测'), sT = sig(q2, 204, 46, 178, 66, '输送线托盘检测');
  function line(y, label, color) {
    mk(q2, '', label, 'position:absolute;left:18px;top:' + y + 'px;font-size:13px');
    var v = mk(q2, '', '', 'position:absolute;right:18px;top:' + y + 'px;font-size:13px');
    var b = mk(q2, 'bar', '<i style="background:' + color + '"></i>', 'left:18px;right:18px;top:' + (y + 24) + 'px;height:8px');
    return { v: v, i: b.firstChild };
  }
  var lu = line(132, '上输送线运行', '#3A8DFF'), ld = line(176, '下输送线运行', '#FF5470');
  function fault(y, label, key) {
    var b = mk(q2, 'box', '<span style="position:absolute;left:14px;top:12px;font-size:14px">' + label + '</span><span class="g" style="position:absolute;right:14px;top:9px"></span>', pos(18, y, 364, 44));
    b.style.cursor = 'pointer'; b.onclick = function () { WH.toggle(key); };
    return b.querySelector('.g');
  }
  var fW = fault(238, '仓储故障', 'wh'), fT = fault(292, '传输故障', 'tr');
  R.push(function (s) {
    var run = s.kind && s.phase >= 1 && s.phase <= 2, out = s.kind === 'out' && s.phase >= 1;
    setSig(sW, s.kind === 'in' && s.phase <= 2, '有工件', '无工件', 'g'); setSig(sT, !!s.kind && s.phase <= 2, '有托盘', '无托盘', 'g');
    set(lu.v, s.kind === 'in' && s.phase >= 0 ? '运行' : '待机'); lu.v.style.color = s.kind === 'in' ? '#3A8DFF' : '#7FA2D8';
    lu.i.style.width = s.kind === 'in' ? Math.min(100, (s.phase * 25 + s.prog * 25 + 25)) + '%' : '12%';
    set(ld.v, out ? '运行' : '停止'); ld.v.style.color = out ? '#FF5470' : '#FF5470';
    ld.i.style.width = out ? Math.min(100, (s.phase * 25 + s.prog * 25)) + '%' : '8%';
    var a = WH.flags.wh ? '<span class="tag r">故障</span>' : '<span class="tag g">无</span>';
    var b = WH.flags.tr ? '<span class="tag r">故障</span>' : '<span class="tag g">无</span>';
    if (fW._h !== a) { fW._h = a; fW.innerHTML = a; } if (fT._h !== b) { fT._h = b; fT.innerHTML = b; }
  });
})();
