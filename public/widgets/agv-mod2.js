(function () {
  var el = AGVU.el, frame = AGVU.frame, cv = AGVU.cv;

  AGVM.feed = function (c) {
    var b = frame(c, '送料 / 取料信号', 'DB22.16.0 – 22.16.7');
    var cols = [['fs', '送料启动'], ['fc', '送料完成'], ['rs', '取料启动'], ['rc', '取料完成']];
    var rows = [[1, '装配工位', 'ZhuangPei'], [2, '检测工位', 'JianCe']];
    var t = el('div', '', '', b);
    t.style.cssText = 'display:grid;grid-template-columns:120px repeat(4,1fr);gap:12px 10px;align-items:center;height:100%;align-content:space-around;padding-bottom:26px';
    el('div', '', '', t);
    cols.forEach(function (x) { el('div', 'tg', x[1], t).style.cssText += ';text-align:center;font-size:15px;color:#7FA2D8'; });
    var cells = [];
    rows.forEach(function (r) {
      var n = el('div', 'click', r[1] + '<div class="tg" style="margin-top:2px;font-size:11px">' + r[2] + '</div>', t);
      n.style.cssText = 'font-size:19px;font-weight:600';
      n.onclick = function () { AGV.go(r[0]); };
      cols.forEach(function (x) {
        var d = el('div', '', '待机', t);
        d.style.cssText = 'height:64px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;background:rgba(90,160,255,.1);border:1px solid rgba(90,160,255,.18);color:#5C86C9;transition:all .35s';
        cells.push([r[0], x[0], d]);
      });
    });
    var ft = el('div', 'tg', '点击工位名调度 AGV · 到站后自动走完 送料→取料', b);
    ft.style.cssText += ';position:absolute;left:0;bottom:0';
    return {
      render: function (s) {
        cells.forEach(function (x) {
          var on = s.feed[x[0]][x[1]], d = x[2];
          var running = (x[1] === 'fs' && on && !s.feed[x[0]].fc) || (x[1] === 'rs' && on && !s.feed[x[0]].rc);
          d.textContent = on ? (running ? '◐ 进行中' : '● 已触发') : '○ 待机';
          d.style.background = on ? (running ? 'rgba(58,141,255,.28)' : 'rgba(43,227,154,.2)') : 'rgba(90,160,255,.1)';
          d.style.color = on ? (running ? '#8BC0FF' : '#2BE39A') : '#5C86C9';
          d.style.borderColor = on ? (running ? 'rgba(58,141,255,.7)' : 'rgba(43,227,154,.55)') : 'rgba(90,160,255,.18)';
          d.style.boxShadow = on ? '0 0 16px ' + (running ? 'rgba(58,141,255,.4)' : 'rgba(43,227,154,.3)') : 'none';
        });
      }
    };
  };

  AGVM.trend = function (c) {
    var b = frame(c, '速度趋势', 'SPEED TREND · 近 60 秒'), k = cv(b);
    return {
      render: function (s, now) {
        var g = k.g, w = k.w, h = k.h, L = 44, B = 26, T = 8, R = 10, pw = w - L - R, ph = h - T - B, N = 60;
        g.clearRect(0, 0, w, h);
        g.font = '12px Consolas'; g.textAlign = 'right'; g.fillStyle = '#5C86C9'; g.strokeStyle = 'rgba(90,160,255,.16)'; g.lineWidth = 1;
        for (var i = 0; i <= 3; i++) {
          var y = T + ph * i / 3, v = 1.5 * (1 - i / 3);
          g.beginPath(); g.moveTo(L, y); g.lineTo(w - R, y); g.stroke(); g.fillText(v.toFixed(1), L - 8, y + 4);
        }
        g.textAlign = 'center';
        for (i = 0; i <= 6; i++) { g.fillText('-' + (60 - i * 10) + 's', L + pw * i / 6, h - 6); }
        var pts = [];
        for (i = 0; i <= N; i++) {
          var sp = AGV.derive(now - (N - i) * 1000).speed;
          pts.push([L + pw * i / N, T + ph * (1 - Math.min(1.5, sp) / 1.5)]);
        }
        var gr = g.createLinearGradient(0, T, 0, T + ph); gr.addColorStop(0, 'rgba(56,232,255,.4)'); gr.addColorStop(1, 'rgba(56,232,255,0)');
        g.beginPath(); g.moveTo(pts[0][0], T + ph);
        pts.forEach(function (p) { g.lineTo(p[0], p[1]); });
        g.lineTo(pts[N][0], T + ph); g.closePath(); g.fillStyle = gr; g.fill();
        g.beginPath(); pts.forEach(function (p, j) { j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); });
        g.strokeStyle = '#38E8FF'; g.lineWidth = 2.5; g.shadowColor = '#38E8FF'; g.shadowBlur = 12; g.stroke(); g.shadowBlur = 0;
        var e = pts[N];
        g.beginPath(); g.arc(e[0], e[1], 5, 0, 7); g.fillStyle = '#fff'; g.shadowColor = '#38E8FF'; g.shadowBlur = 16; g.fill(); g.shadowBlur = 0;
      }
    };
  };

  AGVM.alarms = function (c) {
    var b = frame(c, '告警状态', 'ALARMS · 点击可模拟故障');
    var defs = [
      ['agv', 'AGV 故障', 'Alarm_AGV · DB22.0', 1], ['y', 'Y 轴故障', 'Alarm_Yaxis · DB22.2', 1],
      ['z', 'Z 轴故障', 'Alarm_Zaxis · DB22.4', 1], ['low', '电量低', 'Alarm_Lowbattery · DB22.6', 0],
      ['rfid', 'RFID 故障', 'Alarm_RFID · DB15.256', 0], ['code', '二维码故障', 'Alarm_code · DB15.258', 0]
    ];
    var list = el('div', '', '', b);
    list.style.cssText = 'display:flex;flex-direction:column;justify-content:space-between;height:100%';
    var rows = defs.map(function (d) {
      var r = el('div', 'click', '<div><div class="a" style="font-size:17px;font-weight:600">' + d[1] + '</div><div class="tg" style="font-size:11px">' + d[2] + '</div></div><span class="pill on">正常</span>', list);
      r.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0 4px;border-bottom:1px solid rgba(90,160,255,.12);flex:1;transition:background .3s';
      r.onclick = function () { AGV.toggleFlag(d[0]); };
      return [d, r];
    });
    return {
      render: function (s) {
        rows.forEach(function (x) {
          var on = s.flags[x[0][0]], p = x[1].querySelector('.pill');
          p.className = 'pill ' + (on ? (x[0][3] ? 'bad' : 'warn') : 'on');
          p.textContent = on ? (x[0][3] ? '故障' : '报警') : '正常';
          x[1].style.background = on ? (x[0][3] ? 'rgba(255,77,106,.08)' : 'rgba(255,176,32,.07)') : 'transparent';
        });
      }
    };
  };
})();
