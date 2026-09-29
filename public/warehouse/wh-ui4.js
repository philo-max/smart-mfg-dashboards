(function () {
  var mk = U.mk, stage = U.stage;
  var TC = { A: '#5EF0F0', B: '#6FA8FF', C: '#C58BFF' };
  var back = mk(stage, '', '');
  back.id = 'mback';
  var mb = mk(back, '', '');
  mb.id = 'mbox';
  U.overlays.push(back);
  var cur = null;

  function tag(t) { return '<span class="tag ' + (t === 'in' ? 'g' : 'r') + '" style="padding:0 8px;font-size:12px">' + (t === 'in' ? '入库' : '出库') + '</span>'; }
  function ty(t) { return t ? '<b style="color:' + TC[t] + '">' + t + '</b>' : '<span class="dim">空</span>'; }
  function kpis(list) {
    return '<div class="mk">' + list.map(function (k) {
      return '<div><div class="l">' + k[0] + '</div><div class="v num" style="color:' + (k[2] || '#fff') + '">' + k[1] + '</div></div>';
    }).join('') + '</div>';
  }
  function table(head, rows) {
    return '<table class="mt"><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  }
  function bars(list) {
    var max = Math.max.apply(0, list.map(function (b) { return b[1]; })) || 1;
    return '<div style="margin-top:10px">' + list.map(function (b) {
      return '<div class="br"><span>' + b[0] + '</span><i><u style="width:' + (b[1] / max * 100) + '%;background:' + b[2] + '"></u></i><b class="num">' + b[1] + '</b></div>';
    }).join('') + '</div>';
  }
  function slotRows(only) {
    var rows = [];
    for (var id = 1; id <= 12; id++) {
      var t = WH.slots[id - 1];
      if (only && t !== only) continue;
      rows.push([WH.pad(id), ty(t), WH.queued[id] ? '<span class="tag b">作业排队</span>' : t ? '有料' : '<span class="dim">空闲</span>', t ? (WH.since[id] || '14:00') : '—']);
    }
    return rows;
  }
  function hist(kind, n) {
    return WH.history.filter(function (h) { return !kind || h.kind === kind || (kind === 'manual' && h.src === 'manual'); }).slice(0, n || 10).map(function (h) {
      return [h.t, tag(h.kind), h.label, h.src === 'manual' ? '<span style="color:#FFB020">手动</span>' : '自动', h.dur];
    });
  }
  var HH = ['时间', '类型', '库位 / 物料', '方式', '耗时'];
  function share(v, tot) { return tot ? (v / tot * 100).toFixed(1) + '%' : '0%'; }
  function typeDef(k) {
    return function () {
      var n = WH.cnt[k], tot = WH.total(), rows = slotRows(k);
      return {
        title: k + ' 物料明细', foot: k,
        html: kpis([[k + ' 物料库存', n, TC[k]], ['占在库比例', share(n, tot)], ['占用库位', rows.length + ' 个'], ['在库总数', tot]]) + table(['库位', '物料', '状态', '入库时间'], rows.length ? rows : [['—', '—', '当前没有 ' + k + ' 物料的库位', '—']])
      };
    };
  }
  function rateDef(kind) {
    return function () {
      var done = kind === 'in' ? WH.st.inN : WH.st.outN, pend = WH.pend(kind), rate = kind === 'in' ? WH.st.inRate : WH.st.outRate;
      var plan = kind === 'in' ? done + pend + 1 : done + pend + 1.25;
      return {
        title: (kind === 'in' ? '入库' : '出库') + '完成率明细',
        html: kpis([['完成率', rate + '%', kind === 'in' ? '#3DDC97' : '#38B6FF'], ['已完成', done], ['进行 / 排队中', pend], ['计划（含预约）', Math.round(plan)]]) +
          bars([['已完成', done, '#3DDC97'], ['进行 / 排队中', pend, '#FFB020'], ['预约未到', Math.round(plan) - done - pend, '#4F6F9F']]) +
          '<div class="dim" style="margin-top:10px;font-size:13px">完成率 = 已完成 ÷ 计划。点击库位下发作业后，排队数增加，完成率会短暂下降，作业完成后回升。</div>'
      };
    };
  }
  var DEF = {
    total: function () {
      var tot = WH.total();
      return {
        title: '在库数量明细',
        html: kpis([['在库总数', tot, '#5EEBFF'], ['A 物料', WH.cnt.A, TC.A], ['B 物料', WH.cnt.B, TC.B], ['C 物料', WH.cnt.C, TC.C], ['库位占用', WH.slots.filter(Boolean).length + ' / 12']]) + table(['库位', '物料', '状态', '入库时间'], slotRows())
      };
    },
    A: typeDef('A'), B: typeDef('B'), C: typeDef('C'),
    in: function () {
      return { title: '入库明细', html: kpis([['累计入库', WH.st.inN, '#3DDC97'], ['其中手动下发', WH.history.filter(function (h) { return h.kind === 'in' && h.src === 'manual'; }).length], ['排队 / 进行中', WH.pend('in')], ['完成率', WH.st.inRate + '%']]) + table(HH, hist('in')) };
    },
    out: function () {
      return { title: '出库明细', html: kpis([['累计出库', WH.st.outN, '#FF5470'], ['其中手动下发', WH.history.filter(function (h) { return h.kind === 'out' && h.src === 'manual'; }).length], ['排队 / 进行中', WH.pend('out')], ['完成率', WH.st.outRate + '%']]) + table(HH, hist('out')) };
    },
    done: function () {
      return { title: '完成数明细', html: kpis([['累计完成', WH.st.done, '#fff'], ['入库', WH.st.inN, '#3DDC97'], ['出库', WH.st.outN, '#FF5470'], ['平均耗时', '4.8s']]) + table(HH, hist(null, 12)) };
    },
    autoIn: function () {
      var a = WH.st.autoIn, m = WH.st.manual;
      return { title: '自动存料累计明细', html: kpis([['自动存料', a, '#6FA8FF'], ['手动存料', m, '#FFB020'], ['自动占比', share(a, a + m)]]) + bars([['自动存料', a, '#6FA8FF'], ['手动存料', m, '#FFB020']]) };
    },
    autoOut: function () {
      var a = WH.st.autoOut, m = WH.st.manualOut;
      return { title: '自动取料累计明细', html: kpis([['自动取料', a, '#FFB020'], ['手动取料（本次）', m, '#FF5470'], ['自动占比', share(a, a + m)]]) + bars([['自动取料', a, '#FFB020'], ['手动取料', m, '#FF5470']]) };
    },
    manual: function () {
      var a = WH.st.autoIn, m = WH.st.manual;
      return { title: '手动存料累计明细', html: kpis([['手动存料', m, '#FFB020'], ['自动存料', a, '#6FA8FF'], ['手动占比', share(m, a + m)]]) + bars([['手动存料', m, '#FFB020'], ['自动存料', a, '#6FA8FF']]) + '<div class="dim" style="margin:12px 0 4px;font-size:13px">最近的手动作业</div>' + table(HH, hist('manual', 5)) };
    },
    sum: function () {
      var tot = WH.total();
      return { title: '总数明细', html: kpis([['总数', tot, '#5EEBFF'], ['库位占用', WH.slots.filter(Boolean).length + ' / 12'], ['库位利用率', share(WH.slots.filter(Boolean).length, 12)]]) + bars([['A 物料', WH.cnt.A, TC.A], ['B 物料', WH.cnt.B, TC.B], ['C 物料', WH.cnt.C, TC.C]]) };
    },
    inRate: rateDef('in'), outRate: rateDef('out')
  };
  var MAP = { '在库数量': 'total', 'A 数量': 'A', 'B 数量': 'B', 'C 数量': 'C', '入库数': 'in', '出库数': 'out', '完成数': 'done', '自动存料累计': 'autoIn', '自动取料累计': 'autoOut', '手动存料累计': 'manual', '总数': 'sum' };

  function render() {
    if (!cur) return;
    var d = DEF[cur](), foot = '<span class="mbtn" data-a="x">关闭</span>';
    if (d.foot) foot = '<span class="mbtn on" data-a="f">' + (WH.filter === d.foot ? '取消筛选 ' : '在看板中只看 ') + d.foot + ' 物料</span>' + foot;
    mb.innerHTML = '<div class="mh"><span>' + d.title + '</span><i data-a="x">✕</i></div>' + d.html + '<div class="mf">' + foot + '</div>';
    mb.querySelectorAll('[data-a]').forEach(function (e) {
      e.onclick = function () {
        if (e.getAttribute('data-a') === 'f') WH.setFilter(WH.filter === d.foot ? null : d.foot);
        close();
      };
    });
  }
  U.openDetail = function (k) { open(k); };
  function open(k) { cur = k; back.style.display = 'block'; render(); }
  function close() { cur = null; back.style.display = 'none'; }
  back.onclick = function (e) { if (e.target === back) close(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  WH.on(function () { if (cur) render(); });

  function bind(el, k) { el.setAttribute('data-d', k); el.style.cursor = 'pointer'; el.addEventListener('click', function () { open(k); }); }
  document.querySelectorAll('.box').forEach(function (b) {
    var l = b.firstChild && b.firstChild.textContent;
    if (MAP[l]) bind(b, MAP[l]);
  });
  [['入库完成率', 'inRate'], ['出库完成率', 'outRate']].forEach(function (x) {
    var el = [].slice.call(document.querySelectorAll('#stage div')).filter(function (d) { return d.children.length === 0 && d.textContent === x[0]; })[0];
    if (!el) return;
    bind(el, x[1]); bind(el.nextSibling, x[1]); bind(el.nextSibling.nextSibling, x[1]);
  });
})();
