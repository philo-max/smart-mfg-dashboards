(function () {
  var q = new URLSearchParams(location.search), only = q.get('m'), stage = U.stage;
  var CENTER = ['shelf', 'plan', 'util', 'logs', 'stacker', 'todo'];
  U.rootEl = stage;
  U.frame = function () {
    var r = U.rootEl.getBoundingClientRect(), st = U.rootEl === stage;
    return { left: r.left, top: r.top, sc: st ? r.width / 1920 : 1, w: st ? 1920 : r.width, h: st ? 1080 : r.height };
  };
  if (only && q.get('bg')) document.body.style.background = 'url(bg_wh_navy.jpg) center/cover';
  function fit() { stage.style.transform = 'scale(' + Math.min(innerWidth / 1920, innerHeight / 1080) + ')'; }
  if (!only) { fit(); addEventListener('resize', fit); }
  else {
    document.documentElement.classList.add('w');
    document.body.classList.add('wmode');
    if (only === 'header') {
      Object.keys(U.roots).forEach(function (k) { U.roots[k].remove(); });
      stage.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
    } else {
      var root = U.roots[only];
      document.body.appendChild(root);
      root.style.cssText += ';left:0;top:0;right:auto;width:100%;height:100%';
      U.overlays.forEach(function (o) { root.appendChild(o); });
      U.rootEl = root;
      stage.remove();
    }
  }
  function runs(f) {
    if (!only) return true;
    var m = f._m;
    return m === 'all' || m === only || (m === 'charts' && /^chart\d$/.test(only)) || (m === 'center' && CENTER.indexOf(only) >= 0);
  }
  WH.tick(function (s, now) { U.R.forEach(function (f) { if (runs(f)) f(s, now); }); });

  if (q.get('open')) setTimeout(function () { U.openDetail(q.get('open')); }, 700);
  if (q.get('filter')) setTimeout(function () { WH.setFilter(q.get('filter')); }, 700);
  if (q.get('pop')) setTimeout(function () {
    var id = WH.pad(+q.get('pop'));
    var el = [].slice.call(document.querySelectorAll('.slot')).filter(function (e) { return e.querySelector('.id') && e.querySelector('.id').textContent === id && e.querySelector('.st'); })[0];
    if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, 700);
})();
