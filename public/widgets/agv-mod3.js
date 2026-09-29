(function () {
  var el = AGVU.el, frame = AGVU.frame, ST = AGV.ST;

  AGVM.rfid = function (c) {
    var b = frame(c, 'RFID 与当前任务', 'RFID · DB15.0');
    el('div', 'tg', 'CURRENT RFID', b).style.cssText += ';margin-top:2px';
    var n = el('div', 'num', '452756398547', b);
    n.style.cssText = 'font-size:44px;letter-spacing:3px;margin-top:2px';
    var t = el('div', 'pill run', '', b);
    t.style.cssText += ';margin-top:14px;font-size:16px;padding:6px 18px';
    var bar = el('div', '', '', b);
    bar.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:6px;border-radius:3px;background:rgba(90,160,255,.16)';
    var f = el('div', '', '', bar);
    f.style.cssText = 'height:100%;border-radius:3px;background:linear-gradient(90deg,#3A8DFF,#38E8FF);box-shadow:0 0 10px #38E8FF';
    return {
      render: function (s) {
        t.textContent = '当前任务 · ' + s.task;
        f.style.width = (s.moving ? s.prog * 100 : 100) + '%';
      }
    };
  };

  AGVM.starts = function (c) {
    var b = frame(c, '工位启动信号', 'START SIGNALS · 点击开关调度 AGV');
    var list = el('div', '', '', b);
    list.style.cssText = 'display:flex;flex-direction:column;justify-content:space-between;height:100%';
    var order = [1, 2, 0, 3];
    var rows = order.map(function (i) {
      var s = ST[i];
      var r = el('div', 'click', '<div style="display:flex;align-items:baseline;gap:14px"><b style="font-size:19px;font-weight:600">' + s.n + '工位</b><span class="tg" style="font-size:12px">' + s.k + '_startsignal · ' + s.q + '</span></div><div class="sw"><i></i></div>', list);
      r.style.cssText = 'display:flex;justify-content:space-between;align-items:center;flex:1;border-bottom:1px solid rgba(90,160,255,.12)';
      var sw = r.querySelector('.sw');
      sw.style.cssText = 'position:relative;width:52px;height:28px;border-radius:14px;background:rgba(90,160,255,.2);transition:all .3s';
      sw.firstChild.style.cssText = 'position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .3s cubic-bezier(.3,1.4,.5,1)';
      r.onclick = function () { AGV.go(i); };
      return [i, sw];
    });
    return {
      render: function (s) {
        rows.forEach(function (x) {
          var on = s.start[x[0]], sw = x[1];
          sw.style.background = on ? '#2BE39A' : 'rgba(90,160,255,.2)';
          sw.style.boxShadow = on ? '0 0 14px rgba(43,227,154,.6)' : 'none';
          sw.firstChild.style.transform = on ? 'translateX(24px)' : 'none';
        });
      }
    };
  };

  AGVM.summary = function (c) {
    var b = frame(c, '运行摘要', 'SUMMARY');
    var g = el('div', '', '', b);
    g.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px';
    function cell(lab) {
      var d = el('div', '', '<div class="tg" style="font-size:13px">' + lab + '</div><div class="num v" style="font-size:36px;margin-top:6px">0</div>', g);
      return d.querySelector('.v');
    }
    var a = cell('报警数'), w = cell('当前工位'), r = cell('运行状态');
    w.style.fontSize = r.style.fontSize = '30px';
    var f = el('div', 'tg', '', b);
    f.style.cssText += ';position:absolute;left:0;bottom:0;font-size:12px';
    return {
      render: function (s) {
        a.textContent = s.alarmCount; a.style.color = s.alarmCount ? '#FFB020' : '#2BE39A'; a.style.textShadow = '0 0 14px currentColor';
        w.textContent = ST[s.cur].n + '工位';
        r.textContent = s.status; r.style.color = s.status === '故障' ? '#FF4D6A' : s.status === '运行中' ? '#2BE39A' : '#38E8FF';
        f.textContent = 'Reach I2.0–I2.3　·　Start Q2.0–Q2.3　·　巡航 ' + (s.auto ? 'ON' : 'OFF');
      }
    };
  };
})();
