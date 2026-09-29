(function () {
  var ST = [
    { k: 'WuLiu', n: '物流', q: 'Q2.2', i: 'I2.2' },
    { k: 'ZhuangPei', n: '装配', q: 'Q2.0', i: 'I2.1' },
    { k: 'JianCe', n: '检测', q: 'Q2.1', i: 'I2.0' },
    { k: 'ChongDian', n: '充电', q: 'Q2.3', i: 'I2.3' }
  ];
  var CYC = 9000;
  var KEY = 'agv.cmd', FKEY = 'agv.flags';
  var bc = null;
  try { bc = new BroadcastChannel('agv'); } catch (e) {}
  function ls(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var cmd = ls(KEY, null) || { from: 0, to: 0, t0: 0, auto: true };
  var flags = ls(FKEY, null) || { agv: 0, y: 0, z: 0, low: 1, rfid: 0, code: 0 };
  var subs = [];

  function reload() { cmd = ls(KEY, cmd); flags = ls(FKEY, flags); subs.forEach(function (f) { f(); }); }
  if (bc) bc.onmessage = reload;
  window.addEventListener('storage', reload);

  function legAt(now) {
    var el = Math.max(0, now - cmd.t0), k = 0, u = el;
    if (cmd.auto) { k = Math.floor(el / CYC); u = el - k * CYC; }
    var a, b;
    if (k === 0) { a = cmd.from; b = cmd.to; } else { a = (cmd.to + k - 1) % 4; b = (cmd.to + k) % 4; }
    return { a: a, b: b, u: u, k: k };
  }
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p); }
  var YKF = [[0, 128], [600, 128], [1800, 240], [2600, 240], [3800, 60], [4600, 128]];
  function yAt(w) {
    if (w <= 0) return 128;
    for (var i = 1; i < YKF.length; i++) {
      if (w <= YKF[i][0]) {
        var p = (w - YKF[i - 1][0]) / (YKF[i][0] - YKF[i - 1][0]);
        return YKF[i - 1][1] + (YKF[i][1] - YKF[i - 1][1]) * ease(p);
      }
    }
    return 128;
  }

  function derive(now) {
    var L = legAt(now), a = L.a, b = L.b;
    var dist = Math.abs(b - a);
    var D = dist ? Math.max(900, Math.min(3900, dist * 1300)) : 0;
    var prog = D ? Math.min(1, L.u / D) : 1;
    var moving = D > 0 && L.u < D;
    var pos = a + (b - a) * ease(prog);
    var w = Math.max(0, L.u - D);
    var speed = moving ? 1.25 * Math.pow(Math.sin(Math.PI * prog), 0.7) + 0.04 + Math.sin(now / 260) * 0.02 : 0;
    var atFeed = !moving && (b === 1 || b === 2);
    var y = atFeed ? yAt(w) : 128.4 + Math.sin(now / 900) * (moving ? 0.6 : 0.2);
    var f = { fs: atFeed && w >= 600, fc: atFeed && w >= 1800, rs: atFeed && w >= 2600, rc: atFeed && w >= 3800 };
    var feed = { 1: b === 1 ? f : { fs: 0, fc: 0, rs: 0, rc: 0 }, 2: b === 2 ? f : { fs: 0, fc: 0, rs: 0, rc: 0 } };
    var reach = [0, 1, 2, 3].map(function (i) { return !moving && i === b; });
    var start = [0, 1, 2, 3].map(function (i) { return i === b && (moving || w < 3000); });
    var task;
    if (moving) task = '前往' + ST[b].n + '工位';
    else if (atFeed) task = ST[b].n + '工位 · ' + (w < 600 ? '已到达，等待启动' : w < 1800 ? '送料中' : w < 2600 ? '送料完成' : w < 3800 ? '取料中' : '取料完成');
    else task = b === 0 ? '物流工位 · 物料交接' : '充电工位 · 充电中';
    var cnt = 0; for (var k in flags) cnt += flags[k] ? 1 : 0;
    var fault = flags.agv || flags.y || flags.z;
    return {
      now: now, pos: pos, moving: moving, speed: speed, y: y, cur: moving ? Math.round(pos) : b, target: b,
      reach: reach, start: start, feed: feed, task: task, w: w, prog: prog, auto: cmd.auto, flags: flags,
      alarmCount: cnt, status: fault ? '故障' : moving ? '运行中' : '停靠中'
    };
  }
  function save() { ss(KEY, cmd); ss(FKEY, flags); if (bc) bc.postMessage(1); subs.forEach(function (f) { f(); }); }
  function go(to) {
    var now = Date.now(), s = derive(now);
    cmd = { from: s.pos, to: to, t0: now, auto: cmd.auto };
    save();
  }
  function setAuto(v) {
    var now = Date.now(), L = legAt(now), s = derive(now);
    if (v) cmd = { from: s.pos, to: L.b, t0: now, auto: true };
    else cmd = { from: L.a, to: L.b, t0: now - L.u, auto: false };
    save();
  }
  function toggleFlag(k) { flags[k] = flags[k] ? 0 : 1; save(); }
  function tick(cb) {
    var last = 0;
    function loop(t) {
      if (t - last > 33) { last = t; cb(derive(Date.now()), Date.now()); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  window.AGV = { ST: ST, derive: derive, go: go, setAuto: setAuto, toggleFlag: toggleFlag, tick: tick, on: function (f) { subs.push(f); } };
  window.AGVM = {};
})();
