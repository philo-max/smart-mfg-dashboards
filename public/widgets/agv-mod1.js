(function () {
  var ST = AGV.ST;
  function el(tag, cls, html, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function frame(c, title, tag) {
    ['a', 'b', 'c', 'd'].forEach(function (k) { el('i', 'cn ' + k, '', c); });
    var h = el('div', 'hd', '<div class="ttl">' + title + '</div><div class="tg">' + (tag || '') + '</div>', c);
    return el('div', 'body', '', c);
  }
  function cv(parent) {
    var c = el('canvas', '', '', parent);
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
    var g = c.getContext('2d');
    function fit() {
      var r = parent.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      c.width = Math.max(1, r.width * d); c.height = Math.max(1, r.height * d);
      g.setTransform(d, 0, 0, d, 0, 0);
      c.w = r.width; c.h = r.height;
    }
    fit(); window.addEventListener('resize', fit);
    c.g = g;
    return c;
  }
  window.AGVU = { el: el, frame: frame, cv: cv };

  AGVM.header = function (c) {
    ['a', 'b', 'c', 'd'].forEach(function (k) { el('i', 'cn ' + k, '', c); });
    c.style.borderRadius = '14px';
    var t = el('div', '', '<div style="font-size:34px;font-weight:700;letter-spacing:2px;background:linear-gradient(90deg,#fff,#7CC4FF);-webkit-background-clip:text;color:transparent">MOMA · AGV 智能运输单元</div><div class="tg" style="margin-top:2px">MOBILE MANIPULATOR · REAL-TIME MONITORING</div>', c);
    t.style.cssText = 'position:absolute;left:34px;top:10px';
    var r = el('div', '', '', c);
    r.style.cssText = 'position:absolute;right:30px;top:0;bottom:0;display:flex;align-items:center;gap:18px';
    var st = el('span', 'pill on', '运行中', r); st.style.cssText += ';font-size:16px;padding:6px 18px';
    var tm = el('span', 'num', '', r); tm.style.cssText = 'font-size:26px;letter-spacing:1px';
    return {
      render: function (s, now) {
        var cls = { '运行中': 'on', '停靠中': 'run', '故障': 'bad' }[s.status];
        st.className = 'pill ' + cls; st.textContent = '● ' + s.status;
        var d = new Date(now), p = function (n) { return (n < 10 ? '0' : '') + n; };
        tm.textContent = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '  ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
      }
    };
  };

  AGVM.speed = function (c) {
    var b = frame(c, '运行速度', 'moma_Speed · DB22.8'), k = cv(b), val = 0;
    return {
      render: function (s) {
        val += (s.speed - val) * 0.18;
        var g = k.g, w = k.w, h = k.h, cx = w / 2, cy = h * 0.62, R = Math.min(w / 2 - 14, h * 0.62 - 6);
        g.clearRect(0, 0, w, h);
        var a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, max = 1.5;
        g.lineCap = 'round'; g.lineWidth = 12;
        g.strokeStyle = 'rgba(90,160,255,.16)'; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
        var e = a0 + (a1 - a0) * Math.min(1, val / max);
        var gr = g.createLinearGradient(cx - R, cy, cx + R, cy); gr.addColorStop(0, '#3A8DFF'); gr.addColorStop(1, '#38E8FF');
        g.strokeStyle = gr; g.shadowColor = '#38E8FF'; g.shadowBlur = 16;
        g.beginPath(); g.arc(cx, cy, R, a0, e); g.stroke(); g.shadowBlur = 0;
        g.lineWidth = 2; g.font = '12px Consolas'; g.fillStyle = '#5C86C9'; g.strokeStyle = 'rgba(127,162,216,.5)'; g.textAlign = 'center';
        for (var i = 0; i <= 6; i++) {
          var a = a0 + (a1 - a0) * i / 6, ca = Math.cos(a), sa = Math.sin(a);
          g.beginPath(); g.moveTo(cx + ca * (R - 20), cy + sa * (R - 20)); g.lineTo(cx + ca * (R - 10), cy + sa * (R - 10)); g.stroke();
          g.fillText((max * i / 6).toFixed(2).replace(/0$/, ''), cx + ca * (R - 34), cy + sa * (R - 34) + 4);
        }
        g.fillStyle = '#38E8FF'; g.shadowColor = '#38E8FF'; g.shadowBlur = 14; g.font = 'bold 44px Consolas';
        g.fillText(val.toFixed(2), cx, cy + 6); g.shadowBlur = 0;
        g.fillStyle = '#7FA2D8'; g.font = '14px "Microsoft YaHei"'; g.fillText('m/s', cx, cy + 30);
      }
    };
  };

  AGVM.track = function (c) {
    var b = frame(c, '工位轨道', 'STATIONS · Q2.0–Q2.3 / I2.0–I2.3');
    var sw = el('div', 'pill click', '', c);
    sw.style.cssText += ';position:absolute;right:190px;top:14px';
    sw.onclick = function () { AGV.setAuto(!AGV.derive(Date.now()).auto); };
    var rail = el('div', '', '', b);
    rail.style.cssText = 'position:absolute;left:8%;right:8%;top:38%;height:8px;border-radius:4px;background:rgba(90,160,255,.18)';
    var fill = el('div', '', '', rail);
    fill.style.cssText = 'height:100%;border-radius:4px;background:linear-gradient(90deg,#3A8DFF,#38E8FF);box-shadow:0 0 16px #38E8FF';
    var nodes = ST.map(function (s, i) {
      var n = el('div', 'click', '<div class="dot"></div><div class="nm">' + s.n + '</div><div class="pl"><span class="pill">启动</span> <span class="pill">到达</span></div>', b);
      n.style.cssText = 'position:absolute;top:38%;width:0;left:' + (8 + i * 28) + '%';
      n.querySelector('.dot').style.cssText = 'position:absolute;left:-15px;top:-11px;width:30px;height:30px;border-radius:50%;background:#0A1A48;border:3px solid #3A5C99;transition:all .4s';
      n.querySelector('.nm').style.cssText = 'position:absolute;left:-60px;width:120px;top:34px;text-align:center;font-size:22px;font-weight:600';
      n.querySelector('.pl').style.cssText = 'position:absolute;left:-70px;width:140px;top:74px;text-align:center;white-space:nowrap';
      n.onclick = function () { AGV.go(i); };
      return n;
    });
    var mo = el('div', '', '<i></i>', b);
    mo.style.cssText = 'position:absolute;top:calc(38% + 4px);width:0;height:0;z-index:3;pointer-events:none';
    mo.firstChild.style.cssText = 'position:absolute;left:-30px;top:-26px;width:60px;height:52px;border-radius:14px;background:linear-gradient(145deg,#3A8DFF,#6D5BFF);box-shadow:0 0 24px rgba(58,141,255,.8),inset 0 1px 0 rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;font:800 14px Consolas;color:#fff';
    mo.firstChild.textContent = 'MOMA';
    var info = el('div', 'tg', '', b);
    info.style.cssText += ';position:absolute;left:0;right:0;bottom:2px;text-align:center;font-size:15px;color:#9CC4FF;letter-spacing:1px';
    return {
      render: function (s) {
        var pct = 8 + s.pos * 28;
        mo.style.left = pct + '%';
        fill.style.width = (s.pos / 3 * 100) + '%';
        nodes.forEach(function (n, i) {
          var d = n.querySelector('.dot'), p = n.querySelectorAll('.pill');
          var on = s.reach[i], near = Math.abs(s.pos - i) < 0.5;
          d.style.borderColor = near ? '#38E8FF' : '#3A5C99';
          d.style.boxShadow = on ? '0 0 0 7px rgba(56,232,255,.18),0 0 18px #38E8FF' : 'none';
          p[0].className = 'pill' + (s.start[i] ? ' run' : '');
          p[1].className = 'pill' + (s.reach[i] ? ' on' : '');
        });
        sw.className = 'pill click ' + (s.auto ? 'run' : '');
        sw.textContent = s.auto ? '● 自动巡航' : '○ 手动模式';
        info.textContent = (s.moving ? '▶ ' : '■ ') + s.task + '　·　点击工位可调度 AGV';
      }
    };
  };

  AGVM.ypos = function (c) {
    var b = frame(c, 'Y 轴位置', 'Ydata_Position · DB22.10');
    var big = el('div', 'num', '128.4', b);
    big.style.cssText = 'font-size:66px;text-align:center;letter-spacing:6px;margin-top:8px';
    el('div', '', 'mm', b).style.cssText = 'position:absolute;right:6px;top:10px;color:#7FA2D8;font-size:14px';
    var tr = el('div', '', '', b);
    tr.style.cssText = 'position:absolute;left:0;right:0;top:118px;height:8px;border-radius:4px;background:rgba(90,160,255,.18)';
    var f = el('div', '', '', tr);
    f.style.cssText = 'height:100%;border-radius:4px;background:linear-gradient(90deg,#3A8DFF,#38E8FF);box-shadow:0 0 14px #38E8FF';
    var th = el('div', '', '', tr);
    th.style.cssText = 'position:absolute;top:-9px;width:26px;height:26px;margin-left:-13px;border-radius:50%;background:#fff;box-shadow:0 0 18px #38E8FF';
    var sc = el('div', 'tg', '<span style="float:left">0</span><span style="float:right">300</span><span>150</span>', b);
    sc.style.cssText += ';position:absolute;left:0;right:0;top:142px;text-align:center;font-size:13px';
    var ph = el('div', '', '', b);
    ph.style.cssText = 'position:absolute;left:0;right:0;bottom:0;text-align:center;color:#9CC4FF;font-size:15px';
    return {
      render: function (s) {
        big.textContent = s.y.toFixed(1);
        var p = Math.max(0, Math.min(100, s.y / 3));
        f.style.width = p + '%'; th.style.left = p + '%';
        ph.textContent = s.moving ? 'MOMA 行进中 · Y 轴保持基准位' : (s.y > 150 ? 'Y 轴上升 · 送料' : s.y < 100 ? 'Y 轴下降 · 取料' : 'MOMA 沿 Y 轴的实时位置');
      }
    };
  };
})();
