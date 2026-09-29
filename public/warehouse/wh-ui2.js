(function () {
  var mk = U.mk, pos = U.pos, panel = U.panel, set = U.set, box = U.box, R = U.R;
  U.mod = 'center';
  var C = panel(432, 84, 706, 412, '仓储单元数字孪生');
  U.roots.shelf = C;
  mk(C, 'dim', '仓库 W-01 · 实时仿真', 'position:absolute;right:20px;top:15px;font-size:13px');
  var chips = [['在库数量', '#5EEBFF'], ['入库数', '#3DDC97'], ['出库数', '#FF5470'], ['自动存料累计', '#6FA8FF'], ['自动取料累计', '#FFB020']].map(function (c, i) {
    return box(C, 18 + i * 108, 44, 100, 60, c[0], 0, 22, c[1]);
  });
  var lg = mk(C, '', '', 'position:absolute;left:236px;top:15px;font-size:12px;color:#9CB4DA');
  lg.innerHTML = [['#5EF0F0', 'A 物料', 'A'], ['#6FA8FF', 'B 物料', 'B'], ['#C58BFF', 'C 物料', 'C'], ['#7B8AA5', '空库位', 'E']].map(function (x) {
    return '<span data-f="' + x[2] + '" style="margin-right:14px;cursor:pointer"><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + x[0] + ';margin-right:5px"></i>' + x[1] + '</span>';
  }).join('');

  var cells = {};
  WH.ROWS.forEach(function (row, r) {
    row.forEach(function (id, c) {
      var x = c < 3 ? 18 + c * 108 : 374 + (c - 3) * 108;
      var e = mk(C, 'slot E', '<div class="id">' + WH.pad(id) + '</div><div class="ty"></div><div class="st"></div>', pos(x, 116 + r * 114, 100, 104));
      e.onclick = function (ev) { U.popover(id, e, ev); };
      cells[id] = { e: e, ty: e.querySelector('.ty'), st: e.querySelector('.st'), k: '' };
    });
  });
  var rail = mk(C, '', '', pos(342, 112, 24, 236) + 'border:1px solid rgba(60,130,255,.3);border-radius:12px;background:rgba(14,34,74,.5)');
  mk(rail, '', '堆垛机轨道', 'position:absolute;left:5px;top:60px;width:14px;font-size:11px;color:#4F6F9F;line-height:14px;text-align:center;word-break:break-all');
  var stk = mk(rail, '', '', 'position:absolute;left:3px;width:16px;height:48px;border-radius:7px;background:linear-gradient(#5EEBFF,#3A8DFF);box-shadow:0 0 14px #38E8FF');
  var rowY = 0;

  var cv = [['入库输送', 356, '#3DDC97'], ['出库输送', 386, '#FFB020']].map(function (x) {
    mk(C, '', x[0], 'position:absolute;left:18px;top:' + x[1] + 'px;font-size:12px;color:#9CB4DA');
    mk(C, '', '', 'position:absolute;left:84px;width:556px;top:' + (x[1] + 6) + 'px;height:4px;border-radius:2px;background:rgba(60,130,255,.2)');
    var d = mk(C, '', '', 'position:absolute;top:' + (x[1] + 2) + 'px;width:12px;height:12px;border-radius:3px;background:' + x[2] + ';box-shadow:0 0 12px ' + x[2]);
    var t = mk(C, '', '待机', 'position:absolute;left:652px;top:' + x[1] + 'px;font-size:12px;color:' + x[2]);
    return { d: d, t: t };
  });

  var M = panel(450, 508, 668, 288, '货架平面图');
  U.roots.plan = M;
  mk(M, '', '货架区 A', 'position:absolute;left:0;right:0;top:6px;text-align:center;font-size:12px;color:#8FB3E8');
  mk(M, '', '货架区 B', 'position:absolute;left:0;right:0;bottom:6px;text-align:center;font-size:12px;color:#8FB3E8');
  mk(M, '', '', 'position:absolute;left:58px;width:552px;top:118px;height:52px;border:1px dashed rgba(120,180,255,.35);border-radius:6px');
  mk(M, '', '堆垛机通道', 'position:absolute;left:250px;top:172px;font-size:11px;color:#6F92C8;display:none');
  mk(M, '', '', 'position:absolute;left:58px;width:552px;top:143px;height:3px;background:linear-gradient(90deg,#3DDC97,#38E8FF,#FF5470);box-shadow:0 0 10px #38E8FF');
  mk(M, '', '入库区<br><small>INBOUND</small>', 'position:absolute;left:6px;top:104px;width:52px;height:80px;border:1.5px solid #3DDC97;border-radius:8px;background:rgba(61,220,151,.12);color:#3DDC97;font-size:12px;text-align:center;padding-top:22px');
  mk(M, '', '出库区<br><small>OUTBOUND</small>', 'position:absolute;right:6px;top:104px;width:52px;height:80px;border:1.5px solid #FF5470;border-radius:8px;background:rgba(255,84,112,.12);color:#FF5470;font-size:12px;text-align:center;padding-top:22px');
  var pc = {};
  WH.ROWS.forEach(function (row, r) {
    row.forEach(function (id, c) {
      var e = mk(M, 'slot E', '', pos(88 + c * 82, r ? 196 : 30, 74, 52));
      e.style.borderRadius = '6px'; e.style.cursor = 'pointer';
      e.onclick = function (ev) { U.popover(id, e, ev); };
      e.innerHTML = '<div class="ty" style="font-size:16px;margin-top:6px"></div><div class="id" style="position:static;font-size:10px"></div>';
      pc[id] = { e: e, ty: e.querySelector('.ty'), id: e.querySelector('.id'), k: '' };
      pc[id].id.textContent = WH.pad(id);
    });
  });
  var bot = mk(M, '', '', 'position:absolute;top:124px;width:30px;height:40px;border-radius:6px;background:linear-gradient(#5EEBFF,#3A8DFF);box-shadow:0 0 16px #38E8FF;z-index:3');
  var load = mk(bot, '', '', 'position:absolute;left:6px;top:-12px;width:18px;height:12px;border-radius:3px;display:none');
  var beam = mk(M, '', '', 'position:absolute;width:3px;background:#38E8FF;box-shadow:0 0 10px #38E8FF;display:none;z-index:2');

  var TC = { A: '#5EF0F0', B: '#6FA8FF', C: '#C58BFF' };
  var utilP = panel(1150, 84, 332, 156, '库位利用率'); U.roots.util = utilP; utilP.firstChild.style.fontSize = '14px';
  utilP.insertAdjacentHTML('beforeend', '<svg class="a" style="left:18px;top:40px" width="104" height="104" viewBox="0 0 104 104"><circle cx="52" cy="52" r="42" fill="none" stroke="rgba(60,130,255,.2)" stroke-width="10"/><circle id="ring" cx="52" cy="52" r="42" fill="none" stroke="#38E8FF" stroke-width="10" stroke-linecap="round" transform="rotate(-90 52 52)" stroke-dasharray="0 264" style="filter:drop-shadow(0 0 6px #38E8FF)"/></svg>');
  var ring = utilP.querySelector('#ring');
  var upct = mk(utilP, 'num', '', 'position:absolute;left:150px;top:56px;font-size:36px;color:#5EEBFF');
  var uocc = mk(utilP, 'dim', '', 'position:absolute;left:152px;top:104px;font-size:13px');

  var logP = panel(1150, 248, 332, 172, '最近作业日志'); U.roots.logs = logP; logP.firstChild.style.fontSize = '14px';
  var logRows = [0, 1, 2, 3].map(function (i) { return mk(logP, 'logrow', '', 'top:' + (40 + i * 28) + 'px'); });

  var stP = panel(1150, 428, 332, 168, '堆垛机 / 机器人状态'); U.roots.stacker = stP; stP.firstChild.style.fontSize = '14px';
  var trk = mk(stP, '', '', 'position:absolute;left:18px;right:18px;top:48px;height:12px;border-radius:6px;background:rgba(60,130,255,.18);border:1px solid rgba(60,130,255,.3)');
  var th = mk(trk, '', '', 'position:absolute;top:-4px;width:22px;height:18px;margin-left:-11px;border-radius:5px;background:#3A8DFF;box-shadow:0 0 12px #3A8DFF');
  var xyz = ['X', 'Y', 'Z'].map(function (k, i) {
    mk(stP, 'dim', k, 'position:absolute;left:' + (18 + i * 104) + 'px;top:76px;width:98px;text-align:center;font-size:12px');
    return mk(stP, 'num', '', 'position:absolute;left:' + (18 + i * 104) + 'px;top:92px;width:98px;text-align:center;font-size:22px;color:#DCEBFF');
  });
  var stTxt = mk(stP, '', '', 'position:absolute;left:18px;bottom:12px;font-size:13px');

  var tdP = panel(1150, 604, 332, 196, '入库 / 出库待办'); U.roots.todo = tdP; tdP.firstChild.style.fontSize = '14px';
  var tdRows = [0, 1, 2, 3].map(function (i) { return mk(tdP, 'logrow', '', 'top:' + (38 + i * 31) + 'px;height:26px;line-height:26px'); });

  R.push(function (s, now) {
    var tot = WH.total(), occ = WH.slots.filter(Boolean).length;
    [tot, WH.st.inN, WH.st.outN, WH.st.autoIn, WH.st.autoOut].forEach(function (v, i) { set(chips[i], v); });
    WH.ROWS.forEach(function (row) {
      row.forEach(function (id) {
        var ty = WH.slots[id - 1];
        var dim = WH.filter && WH.filter !== (ty || 'E'), q = WH.queued[id], k = (ty || 'E') + (s.id === id && s.phase >= 1 ? 'h' : '') + (dim ? 'd' : '') + (q ? 'q' : '');
        var cls = 'slot ' + (ty || 'E') + (s.id === id && s.phase >= 1 ? ' hit' : '') + (dim ? ' dim' : '') + (q ? ' q' : '');
        var c = cells[id], p = pc[id];
        if (c.k !== k) {
          c.k = k;
          c.e.className = cls;
          c.ty.textContent = ty || '空';
          c.st.innerHTML = ty ? '<span class="dot"></span>有料' : '<span class="dot" style="background:#5B6B86;color:#5B6B86"></span>空位';
          p.e.className = cls;
          p.ty.textContent = ty || '空';
        }
      });
    });
    var targetRow = s.kind ? s.row : 0.5;
    rowY += (targetRow - rowY) * 0.12;
    stk.style.top = (6 + rowY * 138) + 'px';
    var px2 = 88 + s.u * 492 - 15;
    bot.style.left = px2 + 'px';
    var carry = s.kind && ((s.kind === 'in' && s.phase <= 1) || (s.kind === 'out' && s.phase === 3));
    load.style.display = carry ? 'block' : 'none';
    if (carry) load.style.background = TC[s.type];
    if (s.kind && s.phase === 2) {
      var up = s.row === 0;
      beam.style.display = 'block'; beam.style.left = (px2 + 14) + 'px';
      beam.style.top = up ? '84px' : '164px'; beam.style.height = up ? '40px' : '32px';
    } else beam.style.display = 'none';
    var ins = s.kind === 'in', outs = s.kind === 'out';
    cv[0].d.style.left = (84 + (ins ? (s.phase === 0 ? 0.1 : s.phase === 1 ? 0.1 + s.prog * 0.5 : s.phase === 2 ? 0.6 + s.prog * 0.4 : 1) : 0) * 544) + 'px';
    cv[0].d.style.opacity = ins ? 1 : 0.25;
    cv[1].d.style.left = (84 + (outs ? (s.phase <= 1 ? 0.05 : s.phase === 2 ? 0.05 + s.prog * 0.3 : 0.35 + s.prog * 0.65) : 0) * 544) + 'px';
    cv[1].d.style.opacity = outs ? 1 : 0.25;
    set(cv[0].t, ins ? '运行' : '待机'); set(cv[1].t, outs ? '运行' : '待机');
    var pct = occ / 12 * 100;
    ring.setAttribute('stroke-dasharray', (264 * pct / 100).toFixed(1) + ' 264');
    set(upct, pct.toFixed(1) + '%'); set(uocc, occ + ' / 12 占用');
    logRows.forEach(function (r, i) {
      var l = WH.logs[i]; if (!l) return;
      var h = '<b style="color:#9CB4DA;font-weight:400">' + l.t + '</b>　' + l.text + '<span style="float:right;color:' + (l.res === '完成' ? '#3DDC97' : '#FFB020') + '">' + l.res + '</span>';
      if (r._h !== h) { r._h = h; r.innerHTML = h; }
    });
    th.style.left = (s.u * 100) + '%';
    set(xyz[0], (s.u * 600 + 40).toFixed(1)); set(xyz[1], (120 + s.row * 18 + Math.sin(now / 700) * 0.4).toFixed(1)); set(xyz[2], (86.2 + s.row * 8 + Math.sin(now / 500) * 0.3).toFixed(1));
    var stH = '<span class="dot"></span>' + (s.kind ? ['准备', '行进', '存取', '归位'][s.phase] + '中' : '待命');
    if (stTxt._h !== stH) { stTxt._h = stH; stTxt.innerHTML = stH; stTxt.style.color = s.kind ? '#3DDC97' : '#7FA2D8'; }
    tdRows.forEach(function (r, i) {
      var t = WH.todo[i]; if (!t) return;
      var h = '<span class="tag ' + (t[0] === '入库' ? 'g' : 'r') + '" style="padding:0 8px;font-size:11px;margin-right:10px">' + t[0] + '</span>' + t[1] + '<span class="dim" style="float:right">' + t[2] + '</span>';
      if (r._h !== h) { r._h = h; r.innerHTML = h; }
    });
  });
})();
