(function () {
  var Q = new URLSearchParams(location.search);
  var MODE = Q.get('m');
  var ID = Math.random().toString(36).slice(2);
  var ROWS = [[1, 2, 3, 7, 8, 9], [4, 5, 6, 10, 11, 12]];
  var S = {
    slots: ['A', 'B', 'C', 'A', null, 'B', 'C', 'A', null, 'B', 'C', 'A'],
    cnt: { A: 30, B: 28, C: 28 },
    st: { inN: 12, outN: 9, done: 127, autoIn: 156, autoOut: 142, manual: 38, manualOut: 0, inRate: 92, outRate: 88 },
    flags: { red: 0, yellow: 1, wh: 0, tr: 0 },
    ctl: { auto: true, scale: 1, paused: false, estop: false },
    logs: [
      { t: '14:32', text: '入库 A-05', res: '完成' }, { t: '14:28', text: '出库 C-11', res: '完成' },
      { t: '14:25', text: '入库 B-02', res: '完成' }, { t: '14:19', text: '出库 A-08', res: '执行' }
    ],
    todo: [['入库', 'A-01 × 2', '14:40'], ['出库', 'C-03 × 1', '14:41'], ['入库', 'B-06 × 3', '14:43'], ['出库', 'A-12 × 1', '14:45']],
    trend: [78, 80, 82, 86, 83, 88, 86], wk: [[6, 5], [9, 4], [5, 3], [10, 6]],
    since: {}, queued: {}, filter: null, pend: { in: 0, out: 0 },
    history: [
      { t: '14:32', kind: 'in', label: 'A-05', src: 'auto', dur: '4.8s' }, { t: '14:28', kind: 'out', label: 'C-11', src: 'auto', dur: '4.9s' },
      { t: '14:25', kind: 'in', label: 'B-02', src: 'auto', dur: '4.7s' }, { t: '14:19', kind: 'out', label: 'A-08', src: 'auto', dur: '5.1s' },
      { t: '14:11', kind: 'in', label: 'C-07', src: 'manual', dur: '4.8s' }, { t: '14:04', kind: 'out', label: 'B-06', src: 'auto', dur: '4.8s' },
      { t: '13:58', kind: 'in', label: 'A-12', src: 'auto', dur: '4.9s' }, { t: '13:47', kind: 'in', label: 'B-10', src: 'auto', dur: '4.8s' }
    ]
  };
  var op = null, queue = [], lastU = 0.5, nextAuto = Date.now() + 4000, vclock = Date.now(), subs = [], toasts = [];
  var isLeader = !MODE, bc = null, lastS = null, lastH = '', lastBeat = 0;
  try { if (MODE) bc = new BroadcastChannel('wh'); } catch (e) {}

  function pos(id) { for (var r = 0; r < 2; r++) { var c = ROWS[r].indexOf(id); if (c >= 0) return { row: r, col: c }; } }
  function total() { return S.cnt.A + S.cnt.B + S.cnt.C; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function label(id, ty) { return ty + '-' + pad(id); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function emit() { subs.forEach(function (f) { f(); }); }
  function post(m) { if (bc) bc.postMessage(m); }
  function toast(msg, kind, to) {
    to = to || 'all';
    if (to === 'all' ? (!MODE || MODE === 'header') : to === ID) toasts.forEach(function (f) { f(msg, kind); });
    if (MODE && to !== ID) post({ t: 'toast', msg: msg, kind: kind, to: to });
  }
  function pend(k) { var n = queue.filter(function (q) { return q.kind === k; }).length; return n + (op && op.kind === k ? 1 : 0); }
  function rates() {
    S.pend = { in: pend('in'), out: pend('out') };
    S.st.inRate = Math.round(100 * S.st.inN / (S.st.inN + S.pend.in + 1));
    S.st.outRate = Math.round(100 * S.st.outN / (S.st.outN + S.pend.out + 1.25));
  }

  function doRequest(kind, id, type, src, from) {
    if (S.ctl.estop) { toast('急停中，请先复位', 'r', from); return false; }
    var cur = S.slots[id - 1];
    if (S.queued[id]) { toast('库位 ' + pad(id) + ' 已有作业在排队', 'o', from); return false; }
    if (kind === 'in' && cur) { toast('库位 ' + pad(id) + ' 已有物料，不能入库', 'o', from); return false; }
    if (kind === 'out' && !cur) { toast('库位 ' + pad(id) + ' 是空位，没有可出库的物料', 'o', from); return false; }
    if (queue.length > 3) { toast('作业队列已满，请稍后', 'o', from); return false; }
    var ty = kind === 'in' ? (type || pick(['A', 'B', 'C'])) : cur;
    queue.push({ kind: kind, id: id, type: ty, src: src || 'auto' });
    S.queued[id] = 1;
    S.todo.unshift([kind === 'in' ? '入库' : '出库', label(id, ty) + ' × 1', hm()]); S.todo.length = 4;
    toast('已下发：' + (kind === 'in' ? '入库 ' : '出库 ') + label(id, ty) + '（队列 ' + queue.length + '）', 'g', from);
    rates(); emit();
    return true;
  }
  function begin(now) { var q = queue.shift(); op = { kind: q.kind, id: q.id, type: q.type, src: q.src, t0: now, applied: false, from: lastU }; }
  function apply() {
    if (op.kind === 'in') {
      S.slots[op.id - 1] = op.type; S.cnt[op.type]++; S.st.inN++; if (op.src === 'manual') S.st.manual++; else S.st.autoIn++; S.since[op.id] = hm();
    } else {
      var ty = S.slots[op.id - 1]; S.slots[op.id - 1] = null; S.cnt[ty]--; S.st.outN++; if (op.src === 'manual') S.st.manualOut++; else S.st.autoOut++; delete S.since[op.id];
    }
    op.applied = true;
  }
  function finish() {
    S.st.done++;
    S.trend.push(total()); if (S.trend.length > 7) S.trend.shift();
    if (op.kind === 'in') S.wk[3][0]++; else S.wk[3][1]++;
    S.logs.unshift({ t: hm(), text: (op.kind === 'in' ? '入库 ' : '出库 ') + label(op.id, op.type), res: '完成' }); S.logs.length = 4;
    S.history.unshift({ t: hm(), kind: op.kind, label: label(op.id, op.type), src: op.src, dur: '4.8s' }); S.history.length = Math.min(S.history.length, 30);
    delete S.queued[op.id];
    toast((op.kind === 'in' ? '入库' : '出库') + '完成：' + label(op.id, op.type), 'b');
    op = null; rates(); emit();
  }
  function auto(now) {
    var empt = [], full = [];
    S.slots.forEach(function (t, i) { (t ? full : empt).push(i + 1); });
    var kind = (empt.length && (!full.length || Math.random() < 0.5)) ? 'in' : 'out';
    var list = (kind === 'in' ? empt : full).filter(function (i) { return !S.queued[i]; });
    if (list.length) doRequest(kind, pick(list), null, 'auto', 'all');
    nextAuto = now + 8000;
  }
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p); }
  function derive(now) {
    if (!op && queue.length) begin(now);
    if (!op && S.ctl.auto && now > nextAuto) auto(now);
    var s = { phase: -1, u: lastU, row: 0, kind: null, id: 0, type: null, prog: 0 };
    if (op) {
      var e = now - op.t0, p = pos(op.id), ut = (p.col + 0.5) / 6;
      s.kind = op.kind; s.id = op.id; s.type = op.type; s.row = p.row;
      if (e < 800) { s.phase = 0; s.u = op.from; }
      else if (e < 2600) { s.phase = 1; s.prog = (e - 800) / 1800; s.u = op.from + (ut - op.from) * ease(s.prog); }
      else if (e < 3600) { s.phase = 2; s.prog = (e - 2600) / 1000; s.u = ut; if (!op.applied) { apply(); emit(); } }
      else if (e < 4800) { s.phase = 3; s.prog = (e - 3600) / 1200; s.u = ut + (0.5 - ut) * ease(s.prog); }
      else { finish(); s.phase = -1; s.u = lastU; s.kind = null; }
    }
    return s;
  }

  function doEstop(v, from) {
    S.ctl.estop = v; S.flags.red = v ? 1 : 0;
    toast(v ? '急停已触发，所有作业冻结' : '已复位，作业继续', v ? 'r' : 'g', from);
    emit();
  }
  function cmd(c, from) {
    if (c.k === 'request') doRequest(c.kind, c.id, c.type, c.src, from);
    else if (c.k === 'estop') doEstop(c.v, from);
    else if (c.k === 'ctl') { S.ctl[c.key] = c.v; emit(); }
    else if (c.k === 'filter') { S.filter = c.v; emit(); }
    else if (c.k === 'toggle') { if (!(c.key === 'red' && S.ctl.estop)) S.flags[c.key] = S.flags[c.key] ? 0 : 1; emit(); }
  }
  function send(c) { if (isLeader) cmd(c, ID); else post({ t: 'cmd', c: c, from: ID }); }

  if (bc) bc.onmessage = function (e) {
    var d = e.data;
    if (d.t === 'snap' && !isLeader) {
      S = d.S; lastS = d.s;
      var h = JSON.stringify(S);
      if (h !== lastH) { lastH = h; emit(); }
    } else if (d.t === 'cmd' && isLeader) cmd(d.c, d.from);
    else if (d.t === 'toast' && (d.to === ID || (d.to === 'all' && MODE === 'header'))) toasts.forEach(function (f) { f(d.msg, d.kind); });
  };
  function lead(rt) {
    if (!MODE || rt - lastBeat < 300) return;
    lastBeat = rt;
    var l; try { l = JSON.parse(localStorage.getItem('wh.lead')); } catch (e) { l = null; }
    if (!l || rt - l.t > 1500 || l.id === ID) {
      if (!isLeader) { isLeader = true; vclock = rt; }
      try { localStorage.setItem('wh.lead', JSON.stringify({ id: ID, t: rt })); } catch (e) {}
    } else isLeader = false;
  }
  var idle = { phase: -1, u: 0.5, row: 0, kind: null, id: 0, type: null, prog: 0 };

  window.WH = {
    ROWS: ROWS, MODE: MODE, total: total, pos: pos, label: label, pad: pad, derive: derive,
    request: function (kind, id, type, src) { send({ k: 'request', kind: kind, id: id, type: type, src: src }); return true; },
    setEstop: function (v) { if (isLeader) doEstop(v, ID); else post({ t: 'cmd', c: { k: 'estop', v: v }, from: ID }); },
    setCtl: function (key, v) { send({ k: 'ctl', key: key, v: v }); },
    setFilter: function (v) { send({ k: 'filter', v: v }); },
    toggle: function (key) { send({ k: 'toggle', key: key }); },
    pend: function (k) { return S.pend[k]; },
    on: function (f) { subs.push(f); }, onToast: function (f) { toasts.push(f); },
    tick: function (cb) {
      var last = Date.now(), lastSend = 0;
      function loop() {
        var rt = Date.now(), dt = rt - last; last = rt;
        lead(rt);
        if (isLeader) {
          if (!S.ctl.paused && !S.ctl.estop) vclock += dt * S.ctl.scale;
          var s = derive(vclock);
          if (bc && rt - lastSend > 30) { lastSend = rt; post({ t: 'snap', S: S, s: s }); }
          cb(s, rt);
        } else cb(lastS || idle, rt);
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    }
  };
  ['slots', 'cnt', 'st', 'flags', 'ctl', 'logs', 'todo', 'trend', 'wk', 'since', 'queued', 'history', 'filter'].forEach(function (k) {
    Object.defineProperty(WH, k, { get: function () { return S[k]; } });
  });
})();
