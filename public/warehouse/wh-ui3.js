(function () {
  var mk = U.mk, R = U.R, set = U.set, stage = U.stage;
  U.mod = 'header';
  var bAuto = mk(stage, 'btn', '', 'left:16px;top:16px;width:104px;text-align:center');
  var bPause = mk(stage, 'btn', '', 'left:128px;top:16px;width:92px;text-align:center');
  var bSpd = mk(stage, 'btn', '', 'left:228px;top:16px;width:64px;text-align:center');
  var bStop = mk(stage, 'btn red', '', 'left:300px;top:16px;width:78px;text-align:center');
  mk(stage, 'dim', '点击库位下发作业 · 点 A/B/C 筛选 · 悬停图表看数值', 'position:absolute;left:16px;top:54px;font-size:12px');
  bAuto.onclick = function () { WH.setCtl('auto', !WH.ctl.auto); };
  bPause.onclick = function () { WH.setCtl('paused', !WH.ctl.paused); };
  bSpd.onclick = function () { WH.setCtl('scale', WH.ctl.scale >= 4 ? 1 : WH.ctl.scale * 2); };
  bStop.onclick = function () { WH.setEstop(!WH.ctl.estop); };
  R.push(function () {
    var c = WH.ctl;
    set(bAuto, c.auto ? '● 自动派单' : '○ 手动模式'); bAuto.className = 'btn' + (c.auto ? ' on' : '');
    set(bPause, c.paused ? '▶ 继续' : '❚❚ 暂停'); bPause.className = 'btn' + (c.paused ? ' on' : '');
    set(bSpd, '× ' + c.scale); bSpd.className = 'btn' + (c.scale > 1 ? ' on' : '');
    set(bStop, c.estop ? '复位' : '急停'); bStop.className = 'btn red' + (c.estop ? ' on' : '');
  });

  var toast = mk(stage, '', '');
  toast.id = 'toast';
  var tt = 0, COL = { g: '#3DDC97', o: '#FFB020', r: '#FF5470', b: '#6FA8FF' };
  WH.onToast(function (msg, kind) {
    toast.textContent = msg; toast.style.borderColor = COL[kind] || COL.g; toast.style.color = COL[kind] || COL.g;
    toast.className = 'show'; toast.id = 'toast';
    clearTimeout(tt); tt = setTimeout(function () { toast.className = ''; }, 2400);
  });

  var pop = mk(stage, '', '');
  pop.id = 'pop';
  U.overlays.push(toast, pop);
  function hide() { pop.style.display = 'none'; }
  document.addEventListener('click', function (e) { if (!pop.contains(e.target)) hide(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  U.popover = function (id, el, ev) {
    ev.stopPropagation();
    var ty = WH.slots[id - 1], q = WH.queued[id];
    var h = '<div class="h" style="color:' + (ty ? '#5EEBFF' : '#9CB4DA') + '">库位 ' + WH.pad(id) + ' · ' + (ty ? '物料 ' + ty : '空位') + '</div>';
    h += '<div class="r">状态：' + (q ? '作业排队中' : ty ? '有料' : '空闲') + '</div>';
    h += '<div class="r">入库时间：' + (ty ? (WH.since[id] || '14:00') : '—') + '</div>';
    if (!q) {
      if (ty) h += '<span class="b" data-k="out" style="color:#FF5470;border-color:#FF5470">出库</span>';
      else ['A', 'B', 'C'].forEach(function (t) { h += '<span class="b" data-k="in" data-t="' + t + '" style="color:#3DDC97;border-color:#3DDC97">入库 ' + t + '</span>'; });
    }
    h += '<span class="b" data-k="x" style="color:#7FA2D8;border-color:#4F6F9F">关闭</span>';
    pop.innerHTML = h;
    pop.querySelectorAll('.b').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var k = b.getAttribute('data-k');
        if (k !== 'x') WH.request(k, id, b.getAttribute('data-t'), 'manual');
        hide();
      };
    });
    var f = U.frame(), r = el.getBoundingClientRect();
    var x = (r.right - f.left) / f.sc + 8, y = (r.top - f.top) / f.sc;
    if (x > f.w - 240) x = (r.left - f.left) / f.sc - 224;
    pop.style.left = Math.max(4, x) + 'px'; pop.style.top = Math.max(4, Math.min(y, f.h - 190)) + 'px'; pop.style.display = 'block';
  };

  stage.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-f]') : null;
    if (!t) return;
    var f = t.getAttribute('data-f');
    WH.setFilter(WH.filter === f ? null : f);
  });
  U.mod = 'all';
  R.push(function () {
    document.querySelectorAll('[data-f]').forEach(function (e) { e.classList.toggle('act', e.getAttribute('data-f') === WH.filter); });
  });
})();
