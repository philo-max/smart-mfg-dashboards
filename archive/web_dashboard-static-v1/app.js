/**
 * LENOVO IIoT HUB - SMART MANUFACTURING & TWIN DASHBOARD
 * Core Engine: Scenario-driven order state machine, digital twin, decision zone
 * Scope note: manufacturing page (tab-line) drives every visible text/state.
 */

(function () {
  'use strict';

  // =========================================================
  // SCENARIO STATE MACHINE
  // Each scenario returns the full manufacturing page view-model.
  // =========================================================

  // Station key order along the material path
  const PATH = ['storage', 'assembly', 'testing', 'outbound'];

  const STATION_META = {
    storage:  { name: '入库 · 立体库',   code: 'ST-01', batch: '01218', point: 'ST-01 [DB1.DBD10 X轴 / DB1.DBX0.0 货叉到位]' },
    assembly: { name: '装配 · 精密单元', code: 'ST-02', batch: '01218', point: 'ST-02 [DB10.DBW4 实际扭矩 / DB10.DBD12 节拍]' },
    testing:  { name: '质检 · 激光视觉', code: 'ST-03', batch: '01218', point: 'ST-03 [AI_CH01 激光位移差 / DI_PASS 合格判定]' },
    outbound: { name: '出库 · AGV 调度', code: 'ST-04', batch: '01218', point: 'ST-04 [MQTT topic/agv/01/telemetry]' }
  };

  const DEFECT_SETS = {
    normal: [
      { name: '螺丝滑牙 / 偏位', count: 34, pct: 42, cum: 42 },
      { name: '测厚超差',       count: 23, pct: 28, cum: 70 },
      { name: '点胶气孔',       count: 14, pct: 18, cum: 88 },
      { name: '外观划痕',       count: 10, pct: 12, cum: 100 }
    ],
    defect_spike: [
      { name: '螺丝扭矩过冲',   count: 118, pct: 54, cum: 54 },
      { name: '测厚超差',       count: 47,  pct: 22, cum: 76 },
      { name: '点胶气孔',       count: 30,  pct: 14, cum: 90 },
      { name: '外观划痕',       count: 22,  pct: 10, cum: 100 }
    ]
  };

  const SCENARIOS = {
    // 正常：装配高亮，物料向质检流动
    normal: {
      desc: '当前状态：全线平稳加工中（正常模式）',
      answer: '订单 01218 位于装配工位，物料正流向质检，无延误风险。',
      currentNode: 'assembly',
      flowTo: 'testing',
      doneNodes: ['storage', 'assembly'],
      states: { storage: 'ok', assembly: 'ok', testing: 'ok', outbound: 'ok' },
      led: { storage: 'green', assembly: 'cyan', testing: 'green', outbound: 'green' },
      nodeState: { storage: '已完成', assembly: '运行中', testing: '待检', outbound: '待出库' },
      station: {
        storage:  { state: '正常', value: '库容 82%', exc: '无', act: '维持节拍' },
        assembly: { state: '运行中', value: '节拍 18.5s', exc: '无', act: '维持节拍' },
        testing:  { state: '待检', value: '良率 98.4%', exc: '无', act: '正常送检' },
        outbound: { state: '正常', value: 'AGV 搬运中', exc: '无', act: '待出库' }
      },
      risk: { level: '低', tone: 'green', station: '无', impact: '无延误', eta: '今天 14:20', owner: '产线班组 A' },
      cause: '无异常，产线按标准节拍运行',
      defects: DEFECT_SETS.normal,
      actions: [{ label: '维持当前节拍', primary: false }],
      metrics: { oee: 88.2, fpy: 98.4, kwh: 0.38, variance: 0.32, kw: 42.8 },
      log: { type: 'INFO', msg: '产线各项指标恢复基准参数，运行正常' }
    },

    // AGV 阻塞：出库节点红色，AGV 停止，显示受影响订单与预计延误
    agv_jam: {
      desc: '当前状态：AGV-01 导航受阻，物流搬运中断',
      answer: '订单 01218 已过质检、卡在出库工位，AGV 停机，预计延误约 12 分钟。',
      currentNode: 'outbound',
      flowTo: null,
      doneNodes: ['storage', 'assembly', 'testing'],
      states: { storage: 'ok', assembly: 'ok', testing: 'ok', outbound: 'alarm' },
      led: { storage: 'green', assembly: 'green', testing: 'green', outbound: 'red' },
      nodeState: { storage: '已完成', assembly: '已完成', testing: '已完成', outbound: '阻塞' },
      station: {
        storage:  { state: '正常', value: '库容 82%', exc: '无', act: '维持节拍' },
        assembly: { state: '正常', value: '节拍 18.5s', exc: '无', act: '维持节拍' },
        testing:  { state: '正常', value: '良率 98.4%', exc: '无', act: '正常送检' },
        outbound: { state: '阻塞', value: 'AGV 停机 0.0 m/s', exc: '导航受阻', act: '切换 AGV-02' }
      },
      risk: { level: '高', tone: 'red', station: '出库（ST-04）', impact: '预计延误 12 分钟', eta: '今天 14:32', owner: '物流调度台' },
      cause: 'AGV-01 激光防撞雷达触发，路径被锁死在 [X:450, Y:120]',
      defects: DEFECT_SETS.normal,
      affected: ['01218', '01225', '01231'],
      actions: [
        { label: '切换 AGV-02 执行出库', primary: true },
        { label: '人工转运至出库口', primary: false }
      ],
      metrics: { oee: 82.6, fpy: 98.2, kwh: 0.41, variance: 0.55, kw: 40.1 },
      log: { type: 'WARN', msg: 'AGV-01 激光防撞触发，路径锁定在 [X:450, Y:120]，影响订单 3 单' }
    },

    // 不良突增：质检节点红色，缺陷类型和隔离数量提升
    defect_spike: {
      desc: '当前状态：装配螺栓扭矩超标，引发不良品突增',
      answer: '订单 01218 位于质检工位，检出不良被扣留，预计延误约 8 分钟。',
      currentNode: 'testing',
      flowTo: null,
      doneNodes: ['storage', 'assembly'],
      states: { storage: 'ok', assembly: 'warn', testing: 'alarm', outbound: 'ok' },
      led: { storage: 'green', assembly: 'yellow', testing: 'red', outbound: 'green' },
      nodeState: { storage: '已完成', assembly: '已完成', testing: '不良扣留', outbound: '待出库' },
      station: {
        storage:  { state: '正常', value: '库容 82%', exc: '无', act: '维持节拍' },
        assembly: { state: '关注', value: '扭矩 6.4 N·m', exc: '扭矩过冲', act: '检修电批标定' },
        testing:  { state: '异常', value: '隔离 37 件', exc: '批量不良', act: '复检批次' },
        outbound: { state: '正常', value: 'AGV 搬运中', exc: '无', act: '待出库' }
      },
      risk: { level: '高', tone: 'red', station: '质检（ST-03）', impact: '预计延误 8 分钟 · 隔离 37 件', eta: '今天 14:28', owner: '质量工程师' },
      cause: '装配电批扭矩过冲 6.4 N·m（上限 4.5），导致质检批量不合格',
      defects: DEFECT_SETS.defect_spike,
      quarantine: 37,
      actions: [
        { label: '复检批次 01218', primary: true },
        { label: '隔离质检区 37 件', primary: false },
        { label: '检修电批扭矩标定', primary: false }
      ],
      metrics: { oee: 85.4, fpy: 89.2, kwh: 0.44, variance: 0.61, kw: 45.6 },
      log: { type: 'CRITICAL', msg: 'ST-02 电批扭矩过冲 6.4 N·m（上限 4.5），质检隔离 37 件' }
    },

    // 节拍超时：装配/质检黄色，显示超时秒数和瓶颈工位
    takt_timeout: {
      desc: '当前状态：质检节拍严重滞后，装配—质检间积压',
      answer: '订单 01218 在质检工位排队，瓶颈在装配 ST-02，超时 8.3 秒。',
      currentNode: 'testing',
      flowTo: null,
      doneNodes: ['storage', 'assembly'],
      states: { storage: 'ok', assembly: 'warn', testing: 'warn', outbound: 'ok' },
      led: { storage: 'green', assembly: 'yellow', testing: 'yellow', outbound: 'green' },
      nodeState: { storage: '已完成', assembly: '节拍超时', testing: '排队等待', outbound: '待出库' },
      station: {
        storage:  { state: '正常', value: '库容 82%', exc: '无', act: '维持节拍' },
        assembly: { state: '关注', value: '节拍 26.8s', exc: '瓶颈工位', act: '下调装配节拍' },
        testing:  { state: '关注', value: '超时 8.3s', exc: '排队积压', act: '增派复检人力' },
        outbound: { state: '正常', value: 'AGV 搬运中', exc: '无', act: '待出库' }
      },
      risk: { level: '中', tone: 'yellow', station: '装配（ST-02）', impact: '整线节拍 +8.3 秒', eta: '今天 14:24', owner: '工艺工程师' },
      cause: '装配 ST-02 为瓶颈工位，节拍 26.8s 超过目标 18.0s，质检段排队',
      defects: DEFECT_SETS.normal,
      bottleneck: '装配 ST-02',
      timeoutSec: 8.3,
      actions: [
        { label: '下调装配节拍', primary: true },
        { label: '增派 ST-02 工位人力', primary: false }
      ],
      metrics: { oee: 79.8, fpy: 98.0, kwh: 0.39, variance: 1.42, kw: 43.9 },
      log: { type: 'WARN', msg: 'ST-03 排队积压，装配 ST-02 节拍 26.8s 超目标 8.8s' }
    }
  };

  // --- STATE ---
  const state = {
    activeTab: 'tab-line',
    scenario: 'normal',
    isPaused: false,
    selectedStation: 'assembly',
    packetCount: 14290,
    alarmCount: 0,
    lastLogged: null,
    dispatched: {},
    taktBuffer: [18.2, 18.5, 18.3, 18.6, 18.4, 18.8, 18.5, 18.3, 18.7, 18.4, 18.6, 18.5],
    tcSelected: 'performance',
    tcView: 'overall',
    tcRange: '30',
    tcActionStatus: {},
    pharmaSelected: 'all',
    pharmaView: 'overall',
    pharmaActionStatus: {}
  };

  // --- DOM ---
  const $ = (id) => document.getElementById(id);
  const el = {
    clockTime: $('hud-clock-time'),
    clockDate: $('hud-clock-date'),
    simDesc: $('sim-scenario-desc'),
    packetCounter: $('packet-counter'),
    alarmCountBadge: $('live-alarm-count'),
    logList: $('mf-log-list'),

    // L1 order
    riskLevel: $('mf-risk-level'),
    riskEta: $('mf-risk-eta'),
    riskOwner: $('mf-risk-owner'),
    flow: $('mf-flow'),

    // L2 twin
    twinTitle: $('mf-twin-title'),
    sdName: $('mf-sd-name'),
    sdBatch: $('mf-sd-batch'),
    sdExc: $('mf-sd-exc'),
    sdAct: $('mf-sd-act'),

    // decision
    riskBadge: $('mf-risk-badge'),
    riskStation: $('mf-risk-station'),
    riskImpact: $('mf-risk-impact'),
    cause: $('mf-cause'),
    causeTitle: $('mf-cause-title'),
    defectBars: $('mf-defect-bars'),
    actions: $('mf-actions'),
    trace: $('mf-trace'),

    // metrics
    mOee: $('mf-m-oee'),
    mFpy: $('mf-m-fpy'),
    mKwh: $('mf-m-kwh'),
    mVar: $('mf-m-var'),
    mKw: $('mf-m-kw')
  };

  const nodeEls = {
    storage: $('mf-node-storage'),
    assembly: $('mf-node-assembly'),
    testing: $('mf-node-testing'),
    outbound: $('mf-node-outbound')
  };
  const nstateEls = {
    storage: $('mf-nstate-storage'),
    assembly: $('mf-nstate-assembly'),
    testing: $('mf-nstate-testing'),
    outbound: $('mf-nstate-outbound')
  };
  const linkEls = {
    storage: $('mf-link-storage'),
    assembly: $('mf-link-assembly'),
    testing: $('mf-link-testing')
  };
  const stationEls = {
    storage: $('mf-st-storage'),
    assembly: $('mf-st-assembly'),
    testing: $('mf-st-testing'),
    outbound: $('mf-st-outbound')
  };

  // =========================================================
  // CLOCK
  // =========================================================
  function updateClock() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    el.clockTime.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    el.clockDate.textContent = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${days[now.getDay()]}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // =========================================================
  // TAB SWITCHING
  // =========================================================
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panes.forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      document.getElementById(targetId).classList.add('active');
      state.activeTab = targetId;
      document.body.setAttribute('data-tab', targetId);
      setTimeout(renderCurrentTabCharts, 50);
    });
  });

  // =========================================================
  // FULLSCREEN
  // =========================================================
  $('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // =========================================================
  // SCENARIO RENDERING (drives EVERY manufacturing region)
  // =========================================================
  function currentCfg() { return SCENARIOS[state.scenario]; }

  function renderOrder(cfg) {
    el.riskLevel.textContent = cfg.risk.level;
    el.riskEta.textContent = cfg.risk.eta;
    el.riskOwner.textContent = cfg.risk.owner;
    el.riskLevel.className = 'mf-risk-val tone-' + cfg.risk.tone;

    // flow nodes: current highlight + state text
    PATH.forEach((key, i) => {
      const node = nodeEls[key];
      node.classList.remove('is-current', 'is-done', 'is-alarm', 'is-warn');
      const st = cfg.states[key];
      if (key === cfg.currentNode) node.classList.add('is-current');
      else if (cfg.doneNodes.indexOf(key) !== -1) node.classList.add('is-done');
      if (st === 'alarm') node.classList.add('is-alarm');
      if (st === 'warn') node.classList.add('is-warn');
      nstateEls[key].textContent = cfg.nodeState[key];
    });

    // links: lit up to the current node
    const curIdx = PATH.indexOf(cfg.currentNode);
    linkEls.storage.classList.toggle('is-done', curIdx > 0);
    linkEls.assembly.classList.toggle('is-done', curIdx > 1);
    linkEls.testing.classList.toggle('is-done', curIdx > 2);
    // flowing segment (active) toward next node when not blocked
    linkEls.storage.classList.toggle('is-flow', cfg.flowTo && cfg.currentNode === 'storage');
    linkEls.assembly.classList.toggle('is-flow', cfg.flowTo && cfg.currentNode === 'assembly');
    linkEls.testing.classList.toggle('is-flow', cfg.flowTo && cfg.currentNode === 'testing');
  }

  function renderTwin(cfg) {
    el.twinTitle.textContent = cfg.flowTo
      ? '实时流向：' + cfg.nodeState[cfg.currentNode] + ' · 物料流向 ' + STATION_META[cfg.flowTo].name.split(' · ')[0]
      : '实时流向：' + STATION_META[cfg.currentNode].name.split(' · ')[0] + '工位处理中';

    PATH.forEach((key) => {
      const node = stationEls[key];
      const st = cfg.station[key];
      const ledTone = cfg.led[key];
      node.classList.remove('is-ok', 'is-warn', 'is-alarm', 'is-flow', 'selected');
      node.classList.add('is-' + (st.state === '异常' || st.state === '阻塞' ? 'alarm' : st.state === '关注' ? 'warn' : 'ok'));
      if (cfg.flowTo === key) node.classList.add('is-flow');
      if (key === state.selectedStation) node.classList.add('selected');
      const led = node.querySelector('[data-led]');
      if (led) led.dataset.tone = ledTone;
      const stateEl = node.querySelector('[data-state]');
      if (stateEl) stateEl.textContent = st.state;
      const valEl = node.querySelector('[data-value]');
      if (valEl) valEl.textContent = st.value;
    });

    renderStationDetail();
  }

  function renderStationDetail() {
    const cfg = currentCfg();
    const key = state.selectedStation;
    const meta = STATION_META[key];
    const st = cfg.station[key];
    el.sdName.textContent = meta.name + '（' + meta.code + '）';
    el.sdBatch.textContent = meta.batch;
    el.sdExc.textContent = st.exc;
    el.sdAct.textContent = st.act;
    el.trace.textContent = 'PLC 点位：' + meta.point;
  }

  function renderDecision(cfg) {
    el.riskBadge.textContent = cfg.risk.level;
    el.riskBadge.className = 'v tone-' + cfg.risk.tone;
    el.riskStation.textContent = cfg.risk.station;
    el.riskImpact.textContent = cfg.risk.impact;
    // block 02 title follows scenario: normal = 近期缺陷构成, abnormal = 本次异常根因
    el.causeTitle.textContent = state.scenario === 'normal' ? '近期缺陷构成' : '本次异常根因';
    el.cause.textContent = cfg.cause;

    // defect horizontal sorted bars (name + count + share + cumulative)
    const maxPct = Math.max.apply(null, cfg.defects.map((d) => d.pct));
    el.defectBars.innerHTML = cfg.defects.map((d) => {
      const w = Math.round((d.pct / maxPct) * 100);
      const tone = d.pct >= 50 ? 'bar-red' : d.pct >= 25 ? 'bar-yellow' : 'bar-cyan';
      return '<div class="mf-bar-row">'
        +   '<span class="mf-bar-name">' + d.name + '</span>'
        +   '<span class="mf-bar-track"><span class="mf-bar-fill ' + tone + '" style="width:' + w + '%"></span></span>'
        +   '<span class="mf-bar-val">' + d.count + '件 · ' + d.pct + '%<em>累计 ' + d.cum + '%</em></span>'
        + '</div>';
    }).join('');

    const dispatched = state.dispatched[state.scenario] || {};
    el.actions.innerHTML = cfg.actions.map((a, i) =>
      '<button class="mf-action' + (a.primary ? ' primary' : '') + (dispatched[i] ? ' dispatched' : '')
      + '" type="button"' + (dispatched[i] ? ' disabled' : '') + '>'
      + a.label
      + (dispatched[i] ? '<span class="mf-action-done">已下发 · 处理中</span>' : '')
      + '</button>'
    ).join('');
    el.actions.querySelectorAll('.mf-action').forEach((btn, i) => {
      btn.addEventListener('click', () => dispatchAction(i));
    });
  }

  // dispatch a suggested action -> visible state change + log (no dead button)
  function dispatchAction(i) {
    const cfg = currentCfg();
    const a = cfg.actions[i];
    if (!a) return;
    state.dispatched[state.scenario] = state.dispatched[state.scenario] || {};
    if (state.dispatched[state.scenario][i]) return;
    state.dispatched[state.scenario][i] = true;
    const btn = el.actions.querySelectorAll('.mf-action')[i];
    if (btn) {
      btn.classList.add('dispatched');
      btn.disabled = true;
      btn.insertAdjacentHTML('beforeend', '<span class="mf-action-done">已下发 · 处理中</span>');
    }
    pushLog('INFO', '处置指令已下发：' + a.label + '（订单 01218）');
  }

  function renderMetrics(cfg) {
    el.mOee.innerHTML = cfg.metrics.oee.toFixed(1) + '<small>%</small>';
    el.mFpy.innerHTML = cfg.metrics.fpy.toFixed(1) + '<small>%</small>';
    el.mKwh.innerHTML = cfg.metrics.kwh.toFixed(2) + '<small>kWh</small>';
    el.mVar.innerHTML = '±' + cfg.metrics.variance.toFixed(2) + '<small>s</small>';
    el.mKw.innerHTML = cfg.metrics.kw.toFixed(1) + '<small>kW</small>';
  }

  function renderAll() {
    const cfg = currentCfg();
    el.simDesc.textContent = cfg.desc;
    renderOrder(cfg);
    renderTwin(cfg);
    renderDecision(cfg);
    renderMetrics(cfg);
    syncScenarioLog(cfg);
  }

  // =========================================================
  // SIMULATION CONTROLS
  // =========================================================
  const simButtons = document.querySelectorAll('.sim-btn');
  simButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'toggle') {
        state.isPaused = !state.isPaused;
        btn.textContent = state.isPaused ? '恢复推流' : '暂停推流';
        btn.classList.toggle('active', state.isPaused);
        return;
      }
      simButtons.forEach((b) => {
        if (b.dataset.action !== 'toggle') b.classList.remove('active');
      });
      btn.classList.add('active');
      state.scenario = action;
      // reset selection to the scenario's current node for a coherent read
      state.selectedStation = SCENARIOS[action].currentNode;
      renderAll();
    });
  });

  // =========================================================
  // STATION FOCUS (click -> right side detail + decision context)
  // =========================================================
  PATH.forEach((key) => {
    stationEls[key].addEventListener('click', () => {
      state.selectedStation = key;
      PATH.forEach((k) => stationEls[k].classList.toggle('selected', k === key));
      renderStationDetail();
    });
  });

  // =========================================================
  // LOG PIPELINE
  // =========================================================
  // low-level logger: never touches the alarm badge (badge is scenario-derived)
  function pushLog(type, msg) {
    const t = (type || 'INFO').toLowerCase();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const item = document.createElement('div');
    item.className = 'log-item ' + t;
    item.innerHTML = '<span class="time">' + timeStr + '</span>'
      + '<span class="badge ' + t + '">' + type + '</span>'
      + '<span class="msg">' + msg + '</span>';
    el.logList.insertBefore(item, el.logList.firstChild);
    while (el.logList.children.length > 12) el.logList.removeChild(el.logList.lastChild);
  }

  // alarm badge + scenario log: derived from the CURRENT scenario, de-duplicated per scenario
  function syncScenarioLog(cfg) {
    const t = (cfg.log.type || 'INFO').toLowerCase();
    const isAlarm = t === 'warn' || t === 'critical';
    state.alarmCount = isAlarm ? 1 : 0;
    el.alarmCountBadge.textContent = state.alarmCount + ' 报警';
    el.alarmCountBadge.classList.toggle('alarm-active', isAlarm);

    if (state.lastLogged === state.scenario) return; // repeated clicks do not accumulate

    if (state.scenario === 'normal' && state.lastLogged && state.lastLogged !== 'normal') {
      pushLog('OK', '风险解除，订单 01218 恢复标准节拍运行');
    } else {
      pushLog(cfg.log.type, cfg.log.msg);
    }
    state.lastLogged = state.scenario;
  }

  // =========================================================
  // LIVE JITTER LOOP (1000ms) — keeps aux metrics alive
  // =========================================================
  setInterval(() => {
    if (state.isPaused) return;
    state.packetCount += Math.floor(Math.random() * 4) + 2;
    el.packetCounter.textContent = state.packetCount.toLocaleString() + ' Pkts';

    const cfg = currentCfg();
    // rolling takt sample (aux buffer, not surfaced on the manufacturing page)
    let takt;
    if (state.scenario === 'normal') takt = +(18.0 + Math.random() * 0.9).toFixed(1);
    else if (state.scenario === 'takt_timeout') takt = +(25.5 + Math.random() * 2.5).toFixed(1);
    else takt = +(18.4 + Math.random() * 0.6).toFixed(1);
    state.taktBuffer.push(takt);
    if (state.taktBuffer.length > 20) state.taktBuffer.shift();

    // gentle drift on L3 metrics so page feels live
    el.mOee.innerHTML = (cfg.metrics.oee + (Math.random() * 0.4 - 0.2)).toFixed(1) + '<small>%</small>';
    el.mKw.innerHTML = (cfg.metrics.kw + (Math.random() * 1.2 - 0.6)).toFixed(1) + '<small>kW</small>';
  }, 1000);

  // =========================================================
  // CANVAS CHARTS (3C + PHARMA keep original engines)
  // =========================================================
  function renderCurrentTabCharts() {
    if (state.activeTab === 'tab-3c') {
      render3C();
    } else if (state.activeTab === 'tab-pharma') {
      renderPharma();
    }
  }

  function initCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(rect.width, 1) * dpr;
    canvas.height = Math.max(rect.height, 1) * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width, height: rect.height };
  }

  // =========================================================
  // 3C — 产品体验诊断台（single source of truth）
  // 页面命题：口碑被哪个体验要素驱动 · 影响了谁 · 下一步做什么
  // TC_PARTS 为体验要素数据；TC_VIEWS 为预置视角；所有视图均读取同一 state
  // =========================================================
  const TC_PARTS = {
    screen: {
      name: '屏幕与显示', tone: 'positive', pos: [50, 27],
      heat: '话题热度 12,480 · 近 30 天 +8%',
      score: 92, neg: 8,
      headline: '屏幕素质是本机型口碑最稳的加分项，创作用户好评率高于办公用户 18%',
      quotes: ['色彩准，100% sRGB 修图够用', '2.8K 高刷看着顺滑，长时间看不累', '护眼比上一代做得更好'],
      audience: { '学生': 88, '办公': 78, '创作': 96, '游戏': 90 },
      audienceNote: '创作用户（96）对屏幕好评率明显高于办公用户（78），相差 +18%',
      compare: [{ n: '本机型', v: 94 }, { n: '竞品 R 系列', v: 86 }, { n: '竞品 P 系列', v: 79 }],
      compareNote: '同一维度「屏幕满意度」好评率对比',
      trend7: [86, 88, 89, 90, 91, 92, 92],
      trend30: [80, 81, 83, 82, 85, 87, 86, 88, 87, 89, 90, 91, 92],
      inflection: { x: '第 10 天', t: '屏幕固件更新后好评抬升 +5%' },
      keywords: ['色彩准', '2.8K 高刷', '100% sRGB', '护眼', '窄边框'],
      actions: [{ label: '把「屏幕色彩」写入门店主推卖点', tone: '' }, { label: '补拍创作场景色准实测素材', tone: '' }]
    },
    performance: {
      name: '性能与响应', tone: 'positive', pos: [38, 48],
      heat: '话题热度 9,760 · 近 30 天 +5%',
      score: 88, neg: 12,
      headline: '性能获得认可，日常与中度负载响应快；长时高负载下口碑会向散热问题转移',
      quotes: ['日常办公和影音完全不卡', '编译、剪辑比预期快', '开一堆网页也顺畅'],
      audience: { '学生': 90, '办公': 84, '创作': 88, '游戏': 92 },
      audienceNote: '游戏用户（92）对性能最满意，办公用户（84）感知相对弱',
      compare: [{ n: '本机型', v: 90 }, { n: '竞品 R 系列', v: 83 }, { n: '竞品 P 系列', v: 85 }],
      compareNote: '同一维度「性能满意度」好评率对比',
      trend7: [85, 86, 87, 88, 88, 89, 88],
      trend30: [82, 83, 85, 84, 86, 87, 86, 88, 87, 88, 88, 88, 88],
      inflection: { x: '第 8 天', t: '性能模式固件更新后评分开高 +3%' },
      keywords: ['够快', '多开不卡', '剪辑流畅', '编译快'],
      actions: [{ label: '保持性能卖点，补充长时负载实测', tone: '' }, { label: '为办公轻度场景给出能效说明', tone: '' }]
    },
    keyboard: {
      name: '键盘与触控', tone: 'positive', pos: [52, 67],
      heat: '话题热度 5,120 · 近 30 天 +2%',
      score: 80, neg: 20,
      headline: '键盘手感与触控板获得中等好评，部分用户反馈键程偏短',
      quotes: ['键位回弹舒服，打字不累', '触控板面积大，手势很顺', '长时间打字手腕有点累'],
      audience: { '学生': 78, '办公': 84, '创作': 80, '游戏': 74 },
      audienceNote: '办公用户（84）对键盘最满意，游戏用户（74）更在意手感一致性',
      compare: [{ n: '本机型', v: 82 }, { n: '竞品 R 系列', v: 80 }, { n: '竞品 P 系列', v: 88 }],
      compareNote: '同一维度「键盘手感」好评率对比',
      trend7: [79, 80, 80, 81, 80, 80, 80],
      trend30: [78, 79, 80, 79, 80, 81, 80, 80, 80, 80, 80, 80, 80],
      inflection: { x: '第 6 天', t: '手感相关讨论趋于平稳' },
      keywords: ['键程', '回弹', '触控板大', '打字舒服'],
      actions: [{ label: '收集键程反馈，评估下代表面处理', tone: '' }, { label: '详情页补充键程参数说明', tone: '' }]
    },
    battery: {
      name: '续航与便携', tone: 'watch', pos: [14, 78],
      heat: '话题热度 6,240 · 近 30 天 -3%',
      score: 66, neg: 34,
      headline: '续航评价中性偏弱，移动办公用户希望更长续航与更轻机身',
      quotes: ['出差一天基本要带充电器', '比同尺寸轻一些', '重载下掉电偏快'],
      audience: { '学生': 70, '办公': 62, '创作': 60, '游戏': 58 },
      audienceNote: '学生对续航最宽容（70），游戏与创作用户对续航不满更集中',
      compare: [{ n: '本机型', v: 68 }, { n: '竞品 R 系列', v: 74 }, { n: '竞品 P 系列', v: 71 }],
      compareNote: '同一维度「续航满意度」好评率对比',
      trend7: [68, 67, 67, 66, 66, 66, 66],
      trend30: [70, 69, 69, 68, 68, 67, 67, 67, 66, 66, 66, 66, 66],
      inflection: { x: '第 9 天', t: '重载续航评测发布后讨论转负' },
      keywords: ['续航', '便携', '充电器', '移动办公'],
      actions: [{ label: '详情页补齐续航实测数据', tone: 'watch' }, { label: '评估固件功耗策略优化', tone: 'watch' }]
    },
    thermal: {
      name: '散热与噪声', tone: 'problem', pos: [84, 55],
      heat: '话题热度 8,920 · 近 30 天 +14%',
      score: 41, neg: 59,
      headline: '长时高负载下噪声与发热是本机型当前最需处理的扣分项，创作用户受影响最多',
      quotes: ['渲染时风扇声盖过音乐', '键盘左上方明显发烫', '性能是够，就是有点吵'],
      audience: { '学生': 48, '办公': 52, '创作': 34, '游戏': 38 },
      audienceNote: '创作用户（34）对散热噪声不满最集中，明显低于办公用户（52）',
      compare: [{ n: '本机型', v: 41 }, { n: '竞品 R 系列', v: 58 }, { n: '竞品 P 系列', v: 63 }],
      compareNote: '同一维度「散热噪声满意度」好评率对比，本机型明显落后',
      trend7: [50, 48, 46, 44, 43, 42, 41],
      trend30: [52, 51, 50, 49, 48, 47, 45, 44, 43, 42, 42, 41, 41],
      inflection: { x: '第 7 天', t: '高负载实测视频传播后差评抬升' },
      keywords: ['风扇声', '发热', '高负载', '渲染'],
      actions: [{ label: '优化性能模式风扇曲线', tone: 'problem' }, { label: '为创作用户提供静音档实测', tone: 'problem' }]
    }
  };

  const TC_VIEWS = {
    overall: { part: 'performance', range: '30' },
    thermal: { part: 'thermal', range: '7' },
    screen: { part: 'screen', range: '30' }
  };

  const TC_FEED = [
    { tag: '创作', text: '剪 4K 很顺，但导出时风扇声音确实大' },
    { tag: '办公', text: '屏幕看着很舒服，一天下来眼睛不累' },
    { tag: '学生', text: '上课带一天，续航大概到下午就没底了' },
    { tag: '游戏', text: '帧数稳，键盘左上角会有点热' },
    { tag: '创作', text: '色准比我上一台好太多，修图放心' }
  ];

  const TC_META = {
    source: '来源：电商评论、数码评测、垂直论坛，原始文本 10,482 条',
    note: '采集周期：近 30 天（含近 7 天重点样本 2,140 条）· 去重规则：同用户同产品 24h 内合并，剔除纯表情、重复刷评与疑似营销文本'
  };

  const TC_ACTION_LABELS = ['已纳入', '处理中', '已验证'];

  function tcNode(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function tcEl(id) { return document.getElementById(id); }

  function render3C() {
    const part = TC_PARTS[state.tcSelected] || TC_PARTS.performance;

    const headline = tcEl('tc-headline');
    if (headline) headline.textContent = part.headline;

    // preset active state
    document.querySelectorAll('#tc-presets .tc-preset').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === state.tcView);
    });
    // range active state
    document.querySelectorAll('#tc-range .tc-range-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.range === state.tcRange);
    });

    renderTCHotspots();
    renderTCDetail(part);
    renderTCSegments(part);
    renderTCCompare(part);
    renderTCFeed();
    renderTCMeta(part);
    drawTCTrend(part);

    const note = tcEl('tc-trend-note');
    if (note) note.textContent = part.inflection
      ? ('关键拐点：' + part.inflection.x + ' · ' + part.inflection.t + '（好评率当前 ' + part.score + '%）')
      : '';
  }

  // hotspots rebuilt from TC_PARTS every render -> no stale/duplicate nodes
  function renderTCHotspots() {
    const model = tcEl('tc-model');
    if (!model) return;
    model.querySelectorAll('.tc-hotspot').forEach((n) => n.remove());
    Object.keys(TC_PARTS).forEach((key) => {
      const p = TC_PARTS[key];
      const btn = tcNode('button', 'tc-hotspot is-' + p.tone);
      btn.type = 'button';
      const selected = key === state.tcSelected;
      btn.setAttribute('aria-pressed', String(selected));
      btn.setAttribute('aria-label', p.name + '，好评率 ' + p.score + '%');
      btn.style.left = p.pos[0] + '%';
      btn.style.top = p.pos[1] + '%';
      if (selected) btn.classList.add('selected');
      btn.appendChild(tcNode('span', 'tc-hot-dot'));
      btn.appendChild(tcNode('span', 'tc-hot-tag', p.name));
      btn.addEventListener('click', () => {
        state.tcSelected = key;
        state.tcView = null; // custom focus, no preset active
        render3C();
      });
      model.appendChild(btn);
    });
  }

  function renderTCDetail(part) {
    tcEl('tc-detail-part').textContent = part.name;
    tcEl('tc-detail-heat').textContent = part.heat;
    tcEl('tc-pn-pos').style.width = part.score + '%';
    tcEl('tc-pn-pos-v').textContent = part.score + '%';
    tcEl('tc-pn-neg-v').textContent = part.neg + '%';

    const q = tcEl('tc-quotes');
    q.textContent = '';
    part.quotes.forEach((t) => q.appendChild(tcNode('li', 'tc-quote', t)));

    const aud = tcEl('tc-audience');
    aud.textContent = '';
    const maxA = Math.max.apply(null, Object.keys(part.audience).map((k) => part.audience[k]));
    Object.keys(part.audience).forEach((k) => {
      const v = part.audience[k];
      const row = tcNode('div', 'tc-aud-row');
      row.appendChild(tcNode('span', 'tc-aud-name', k));
      const track = tcNode('span', 'tc-aud-track');
      const fill = tcNode('span', 'tc-aud-fill');
      fill.style.width = Math.round((v / maxA) * 100) + '%';
      fill.style.background = (part.tone === 'problem')
        ? 'var(--tc-neg)'
        : (part.tone === 'watch' ? 'var(--tc-watch)' : 'var(--tc-pos)');
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(tcNode('span', 'tc-aud-val', v + ''));
      aud.appendChild(row);
    });
    tcEl('tc-aud-diff').textContent = part.audienceNote;

    // actions with real, persisted feedback (已纳入 -> 处理中 -> 已验证)
    const act = tcEl('tc-actions');
    act.textContent = '';
    part.actions.forEach((a, i) => {
      const key = part.name + '#' + i;
      const st = state.tcActionStatus[key] || 0;
      const btn = tcNode('button', 'tc-action');
      btn.type = 'button';
      btn.appendChild(tcNode('span', '', a.label));
      btn.appendChild(tcNode('span', 'tc-action-status s' + st, TC_ACTION_LABELS[st]));
      btn.addEventListener('click', () => {
        const cur = state.tcActionStatus[key] || 0;
        state.tcActionStatus[key] = Math.min(cur + 1, TC_ACTION_LABELS.length - 1);
        render3C();
      });
      act.appendChild(btn);
    });
  }

  function renderTCSegments(part) {
    const box = tcEl('tc-segments');
    box.textContent = '';
    const maxV = Math.max.apply(null, Object.keys(part.audience).map((k) => part.audience[k]));
    Object.keys(part.audience).forEach((k) => {
      const v = part.audience[k];
      const row = tcNode('div', 'tc-seg-row');
      row.appendChild(tcNode('span', 'tc-seg-name', k));
      const track = tcNode('span', 'tc-seg-track');
      const fill = tcNode('span', 'tc-seg-fill');
      fill.style.width = Math.round((v / maxV) * 100) + '%';
      fill.style.background = (v < 50) ? 'var(--tc-neg)' : (v < 75 ? 'var(--tc-watch)' : 'var(--tc-pos)');
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(tcNode('span', 'tc-seg-val', v + '%'));
      box.appendChild(row);
    });
  }

  function renderTCCompare(part) {
    const box = tcEl('tc-compare');
    box.textContent = '';
    const maxC = Math.max.apply(null, part.compare.map((c) => c.v));
    part.compare.forEach((c) => {
      const self = c.n === '本机型';
      const row = tcNode('div', 'tc-bar-row' + (self ? ' self' : ''));
      row.appendChild(tcNode('span', 'tc-bar-name', c.n));
      const track = tcNode('span', 'tc-bar-track');
      const fill = tcNode('span', 'tc-bar-fill');
      fill.style.width = Math.round((c.v / maxC) * 100) + '%';
      fill.style.background = self
        ? (part.tone === 'problem' ? 'var(--tc-neg)' : (part.tone === 'watch' ? 'var(--tc-watch)' : 'var(--tc-cyan)'))
        : '#3a424e';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(tcNode('span', 'tc-bar-val', c.v + '%'));
      box.appendChild(row);
    });
    tcEl('tc-compare-note').textContent = part.compareNote;
  }

  function renderTCFeed() {
    const list = tcEl('tc-feed-list');
    list.textContent = '';
    TC_FEED.forEach((f) => {
      const item = tcNode('div', 'tc-feed-item');
      item.appendChild(tcNode('span', 'tc-feed-tag', f.tag));
      item.appendChild(tcNode('span', 'tc-feed-text', f.text));
      list.appendChild(item);
    });
  }

  function renderTCMeta(part) {
    tcEl('tc-meta-source').textContent = TC_META.source;
    tcEl('tc-meta-note').textContent = TC_META.note;
    const body = tcEl('tc-kw-body');
    body.textContent = '';
    part.keywords.forEach((k) => body.appendChild(tcNode('span', 'tc-kw-chip', k)));
  }

  // 情感趋势：线 + 拐点标注（7 / 30 天）
  function drawTCTrend(part) {
    const c = initCanvas('tc-trend');
    if (!c || c.width <= 2 || c.height <= 2) return;
    const ctx = c.ctx, w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    const series = state.tcRange === '7' ? part.trend7 : part.trend30;
    const padL = 26, padR = 12, padT = 12, padB = 18;
    const min = 30, max = 100;
    const stepX = (w - padL - padR) / (series.length - 1);
    const toX = (i) => padL + i * stepX;
    const toY = (v) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);

    // baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    [50, 75, 100].forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(padL, toY(v));
      ctx.lineTo(w - padR, toY(v));
      ctx.stroke();
      ctx.fillStyle = 'rgba(183,192,204,0.5)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(v + '%', 2, toY(v) + 3);
    });

    // area + line
    ctx.beginPath();
    series.forEach((v, i) => { if (i === 0) ctx.moveTo(toX(i), toY(v)); else ctx.lineTo(toX(i), toY(v)); });
    ctx.strokeStyle = part.tone === 'problem' ? '#e0643f' : (part.tone === 'watch' ? '#e2a53a' : '#34d3d3');
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineTo(toX(series.length - 1), h - padB);
    ctx.lineTo(toX(0), h - padB);
    ctx.closePath();
    ctx.fillStyle = part.tone === 'problem' ? 'rgba(224,100,63,0.12)' : 'rgba(52,211,211,0.12)';
    ctx.fill();

    // inflection marker at the last point
    const li = series.length - 1;
    ctx.beginPath();
    ctx.arc(toX(li), toY(series[li]), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#eef2f6';
    ctx.fill();
    ctx.strokeStyle = part.tone === 'problem' ? '#e0643f' : '#34d3d3';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // presets / range / summary handlers (attached once; elements are static)
  function init3CStaticHandlers() {
    document.querySelectorAll('#tc-presets .tc-preset').forEach((b) => {
      b.addEventListener('click', () => {
        const view = TC_VIEWS[b.dataset.view];
        if (!view) return;
        state.tcView = b.dataset.view;
        state.tcSelected = view.part;
        state.tcRange = view.range;
        render3C();
      });
    });
    document.querySelectorAll('#tc-range .tc-range-btn').forEach((b) => {
      b.addEventListener('click', () => {
        state.tcRange = b.dataset.range;
        render3C();
      });
    });
    const pos = tcEl('tc-sum-pos');
    if (pos) pos.addEventListener('click', () => { state.tcSelected = 'screen'; state.tcView = 'screen'; state.tcRange = '30'; render3C(); });
    const neg = tcEl('tc-sum-neg');
    if (neg) neg.addEventListener('click', () => { state.tcSelected = 'thermal'; state.tcView = 'thermal'; state.tcRange = '7'; render3C(); });
  }

  // =========================================================
  // PHARMA — 健康市场与用药路径洞察台（single source of truth）
  // 命题：哪类疾病和用药需求正在变化 · 影响哪些人群/区域 · 下一步关注什么
  // PHARMA_NODES 为 疾病/治疗领域 数据；PHARMA_VIEWS 为预置视角；均读取同一 state
  // 说明：仅呈现市场信号与用药需求，不包含可识别患者信息，不做诊断/疗效判断
  // =========================================================
  const PHARMA_NODES = {
    all: {
      name: '全疾病谱', sub: '5 大治疗领域 · 8 类人群',
      therapy: '心脑 / 呼吸 / 代谢 / 消化 / 骨关节',
      pop: { '中老年': 52, '老年': 24, '青壮年': 24 }, corePop: '中老年为主',
      reorder: 31, share: 100, growth: 6.8, salesLabel: '¥2,845,600',
      headline: '呼吸慢病用药需求加速（+12.4%），慢病复购周期整体拉长，是当前最需关注的市场信号',
      trend: [180, 210, 240, 220, 260, 290, 275, 310, 340, 330, 380, 420],
      inflection: { i: 8, t: '呼吸类用药需求自 9 月起加速' },
      risk: { level: '需关注', tone: 'watch', text: '慢病复购周期整体拉长，呼吸与骨关节品类供给偏紧，需关注续方渠道库存。' },
      region: [{ n: '华东', v: 88 }, { n: '华北', v: 74 }, { n: '华南', v: 66 }, { n: '西部', v: 52 }],
      actions: [
        { label: '优先补货呼吸与骨关节品类', tone: 'risk' },
        { label: '跟进华东慢病续方渠道', tone: '' }
      ]
    },
    cardio: {
      name: '心脑血管', sub: '降压 / 调脂 / 抗凝',
      therapy: '降压 / 调脂 / 抗凝',
      pop: { '中老年': 68, '老年': 22, '青壮年': 10 }, corePop: '中老年人群',
      reorder: 28, share: 27.4, growth: 7.2, salesLabel: '¥780k',
      headline: '心脑血管用药需求平稳抬升（+7.2%），是销售额最大盘，复购周期略拉长',
      trend: [60, 62, 63, 64, 66, 67, 68, 70, 71, 72, 74, 76],
      inflection: { i: 8, t: '续方政策调整后需求平稳抬升' },
      risk: { level: '需关注', tone: 'watch', text: '复购周期由 26 天延至 28 天，需关注慢病用药依从性与续方渠道。' },
      region: [{ n: '华东', v: 90 }, { n: '华北', v: 76 }, { n: '华南', v: 68 }, { n: '西部', v: 58 }],
      actions: [
        { label: '跟进华东复购下滑渠道', tone: 'risk' },
        { label: '补充慢病续方提醒物料', tone: '' }
      ]
    },
    resp: {
      name: '呼吸慢病', sub: '吸入 / 抗炎',
      therapy: '吸入 / 抗炎 / 平喘',
      pop: { '中老年': 46, '老年': 30, '青壮年': 24 }, corePop: '中老年与老年为主',
      reorder: 35, share: 19.2, growth: 12.4, salesLabel: '¥540k',
      headline: '呼吸慢病是增长最快的领域（+12.4%），需求自 9 月起加速，供给偏紧需优先保障',
      trend: [26, 28, 30, 31, 33, 34, 36, 38, 42, 45, 49, 54],
      inflection: { i: 8, t: '需求自 9 月起加速 +12.4%' },
      risk: { level: '高', tone: 'risk', text: '需求加速而供给偏紧，复购周期拉长至 35 天，存在缺货与延迟续方风险。' },
      region: [{ n: '华东', v: 86 }, { n: '华北', v: 72 }, { n: '华南', v: 78 }, { n: '西部', v: 60 }],
      actions: [
        { label: '优先补货吸入与抗炎品类', tone: 'risk' },
        { label: '锁定区域仓安全库存', tone: 'risk' }
      ]
    },
    diabetes: {
      name: '2 型糖尿病', sub: '口服降糖 / 胰岛素',
      therapy: '口服降糖 / 胰岛素',
      pop: { '中老年': 58, '老年': 26, '青壮年': 16 }, corePop: '中老年人群',
      reorder: 30, share: 16.2, growth: 5.1, salesLabel: '¥460k',
      headline: '糖尿病用药需求稳步增长（+5.1%），复购周期稳定，是基本盘品类',
      trend: [34, 35, 36, 37, 37, 38, 38, 39, 40, 40, 41, 42],
      inflection: { i: 9, t: '医保目录调整后小幅抬升' },
      risk: { level: '平稳', tone: '', text: '供需与复购均平稳，仅需常规补货节奏监控。' },
      region: [{ n: '华东', v: 80 }, { n: '华北', v: 70 }, { n: '华南', v: 64 }, { n: '西部', v: 54 }],
      actions: [{ label: '维持常规补货节奏', tone: '' }]
    },
    gi: {
      name: '胃肠道疾病', sub: '抑酸 / 护胃',
      therapy: '抑酸 / 护胃 / 促动力',
      pop: { '中老年': 34, '老年': 18, '青壮年': 48 }, corePop: '青壮年人群',
      reorder: 21, share: 11.2, growth: 2.3, salesLabel: '¥320k',
      headline: '胃肠道用药需求增速放缓（+2.3%），青壮年为主，复购周期较短',
      trend: [26, 27, 26, 27, 28, 27, 27, 28, 27, 27, 27, 27],
      inflection: { i: 4, t: '季节性需求见顶后回落' },
      risk: { level: '平稳', tone: '', text: '增速放缓，需关注青壮年端的渠道转化效率。' },
      region: [{ n: '华东', v: 74 }, { n: '华北', v: 66 }, { n: '华南', v: 60 }, { n: '西部', v: 50 }],
      actions: [{ label: '关注线上渠道转化效率', tone: '' }]
    },
    joint: {
      name: '骨关节疾病', sub: '镇痛 / 抗骨质疏松',
      therapy: '镇痛 / 抗骨质疏松',
      pop: { '中老年': 40, '老年': 50, '青壮年': 10 }, corePop: '老年人群',
      reorder: 42, share: 9.6, growth: 8.9, salesLabel: '¥270k',
      headline: '骨关节用药需求较快增长（+8.9%），老年为主，复购周期最长需关注供给',
      trend: [16, 17, 18, 18, 19, 20, 21, 22, 23, 24, 25, 27],
      inflection: { i: 7, t: '老龄化需求持续抬升' },
      risk: { level: '需关注', tone: 'watch', text: '复购周期长达 42 天，老年人群用药延续性强，需保障长周期供给。' },
      region: [{ n: '华东', v: 78 }, { n: '华北', v: 70 }, { n: '华南', v: 62 }, { n: '西部', v: 56 }],
      actions: [
        { label: '保障老年长周期供给', tone: 'watch' },
        { label: '评估抗骨质疏松品类备货', tone: '' }
      ]
    }
  };

  // 治疗领域销售额排名（L3）
  const PHARMA_RANK = [
    { n: '降压调脂', v: 780 }, { n: '呼吸抗炎', v: 540 }, { n: '口服降糖', v: 460 },
    { n: '抑酸护胃', v: 320 }, { n: '抗骨质疏松', v: 270 }
  ];

  // 预置视角：均指向同一 state
  const PHARMA_VIEWS = { overall: 'all', cardio: 'cardio', resp: 'resp' };

  const PH_META = {
    source: '覆盖：全国 6 大区、线上与线下渠道，聚合销售流水与处方用量（覆盖近 12 个月）',
    note: '更新时间：2026-09-14 · 去重规则：按「渠道 + 品类 + 月度」聚合，剔除退款单、测试单与重复上传批次；仅含品类级汇总，不含任何可识别患者信息'
  };

  const PH_SIGNALS = [
    { tag: '渠道', text: '线上呼吸类品类近 4 周订单量周环比 +9%', risk: false },
    { tag: '供给', text: '骨关节品类华东仓可用天数降至 12 天', risk: true },
    { tag: '异常', text: '华北 2 笔大额团单疑似重复上报，已转人工复核', risk: true }
  ];

  const PH_ACTION_LABELS = ['已纳入', '处理中', '已验证'];

  function phEl(id) { return document.getElementById(id); }
  function phNode(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function renderPharma() {
    const node = PHARMA_NODES[state.pharmaSelected] || PHARMA_NODES.all;

    const head = phEl('ph-headline');
    if (head) head.textContent = node.headline;

    document.querySelectorAll('#ph-presets .ph-preset').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === state.pharmaView);
    });

    renderPhGraph(node);
    renderPhSpectrum();
    renderPhDetail(node);
    renderPhEvidence(node);
    renderPhRaw();
  }

  function renderPhGraph(node) {
    phEl('ph-hub-disease').textContent = node.name;
    phEl('ph-hub-sub').textContent = node.sub;

    phEl('ph-v-trend').textContent = '+' + node.growth + '%';
    phEl('ph-v-therapy').textContent = node.therapy.split(' / ')[0];
    phEl('ph-v-pop').textContent = node.corePop;
    phEl('ph-v-reorder').textContent = node.reorder + ' 天';

    // tone of satellites: risk when the node is a risk node
    phEl('ph-sat-trend').className = 'ph-sat ' + (node.growth >= 10 ? 'watch' : '');
    phEl('ph-sat-reorder').className = 'ph-sat ' + (node.reorder > 34 ? 'risk' : '');
    // link highlight
    phEl('ph-l-trend').classList.toggle('active', node.growth >= 10);
    phEl('ph-l-reorder').classList.toggle('active', node.reorder > 34);
  }

  function renderPhSpectrum() {
    const box = phEl('ph-spectrum');
    box.textContent = '';
    Object.keys(PHARMA_NODES).forEach((key) => {
      if (key === 'all') return; // spectrum lists the 5 real treatment areas
      const p = PHARMA_NODES[key];
      const chip = phNode('button', 'ph-chip' + (key === state.pharmaSelected ? ' active' : ''));
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(key === state.pharmaSelected));
      chip.appendChild(phNode('span', '', p.name));
      chip.appendChild(phNode('span', 'ph-chip-g', '+' + p.growth + '%'));
      chip.addEventListener('click', () => {
        state.pharmaSelected = key;
        state.pharmaView = null;
        renderPharma();
      });
      box.appendChild(chip);
    });
  }

  function renderPhDetail(node) {
    phEl('ph-detail-disease').textContent = node.name;
    phEl('ph-detail-tag').textContent = node.therapy;
    phEl('ph-detail-reorder').textContent = node.reorder + ' 天';
    phEl('ph-detail-share').textContent = node.share + '%';

    drawPhMini('ph-detail-trend', node.trend, node.inflection, node);
    const miniNote = phEl('ph-detail-trend-note');
    if (miniNote) miniNote.textContent = node.inflection
      ? ('拐点：' + node.inflection.t + '（当前增速 +' + node.growth + '%）')
      : '';

    const pop = phEl('ph-pop');
    pop.textContent = '';
    const keys = Object.keys(node.pop);
    const maxV = Math.max.apply(null, keys.map((k) => node.pop[k]));
    keys.forEach((k) => {
      const v = node.pop[k];
      const row = phNode('div', 'ph-pop-row');
      row.appendChild(phNode('span', 'ph-pop-name', k));
      const track = phNode('span', 'ph-pop-track');
      const fill = phNode('span', 'ph-pop-fill');
      fill.style.width = Math.round((v / maxV) * 100) + '%';
      fill.style.background = v >= 50 ? 'var(--ph-amber)' : 'var(--ph-green)';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(phNode('span', 'ph-pop-val', v + '%'));
      pop.appendChild(row);
    });

    const riskEl = phEl('ph-detail-risk');
    riskEl.textContent = node.risk.text;
    riskEl.className = 'ph-risk' + (node.risk.tone === 'risk' ? ' high' : '');

    const act = phEl('ph-actions');
    act.textContent = '';
    node.actions.forEach((a, i) => {
      const key = node.name + '#' + i;
      const st = state.pharmaActionStatus[key] || 0;
      const btn = phNode('button', 'ph-action' + (a.tone === 'risk' ? ' risk' : ''));
      btn.type = 'button';
      btn.appendChild(phNode('span', '', a.label));
      btn.appendChild(phNode('span', 'ph-action-status s' + st, PH_ACTION_LABELS[st]));
      btn.addEventListener('click', () => {
        const cur = state.pharmaActionStatus[key] || 0;
        state.pharmaActionStatus[key] = Math.min(cur + 1, PH_ACTION_LABELS.length - 1);
        renderPharma();
      });
      act.appendChild(btn);
    });
  }

  function renderPhEvidence(node) {
    drawPhMini('ph-trend', node.trend, node.inflection, node);
    const note = phEl('ph-trend-note');
    if (note) note.textContent = node.inflection
      ? ('关键拐点：' + node.inflection.t + '；当前销售额 ' + node.salesLabel)
      : ('当前销售额 ' + node.salesLabel);

    const rank = phEl('ph-rank');
    rank.textContent = '';
    const maxR = Math.max.apply(null, PHARMA_RANK.map((r) => r.v));
    PHARMA_RANK.forEach((r, i) => {
      const row = phNode('div', 'ph-rank-row' + (i === 0 ? ' top' : ''));
      row.appendChild(phNode('span', 'ph-rank-name', r.n));
      const track = phNode('span', 'ph-rank-track');
      const fill = phNode('span', 'ph-rank-fill');
      fill.style.width = Math.round((r.v / maxR) * 100) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(phNode('span', 'ph-rank-val', r.v + 'k'));
      rank.appendChild(row);
    });

    const reg = phEl('ph-region');
    reg.textContent = '';
    const maxG = Math.max.apply(null, node.region.map((x) => x.v));
    node.region.forEach((x) => {
      const row = phNode('div', 'ph-region-row');
      row.appendChild(phNode('span', 'ph-region-name', x.n));
      const track = phNode('span', 'ph-region-track');
      const fill = phNode('span', 'ph-region-fill');
      fill.style.width = Math.round((x.v / maxG) * 100) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(phNode('span', 'ph-region-val', x.v + ''));
      reg.appendChild(row);
    });
  }

  function renderPhRaw() {
    phEl('ph-meta-source').textContent = PH_META.source;
    phEl('ph-meta-note').textContent = PH_META.note;
    const box = phEl('ph-signals');
    box.textContent = '';
    PH_SIGNALS.forEach((s) => {
      const item = phNode('div', 'ph-signal');
      item.appendChild(phNode('span', 'ph-signal-tag' + (s.risk ? ' risk' : ''), s.tag));
      item.appendChild(phNode('span', 'ph-signal-text', s.text));
      box.appendChild(item);
    });
  }

  // generic 12 点趋势绘制（迷你 + 完整）
  function drawPhMini(canvasId, series, inflection, node) {
    const c = initCanvas(canvasId);
    if (!c || c.width <= 2 || c.height <= 2) return;
    const ctx = c.ctx, w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    const padL = 4, padR = 4, padT = 8, padB = 8;
    const min = Math.min.apply(null, series) * 0.9;
    const max = Math.max.apply(null, series) * 1.05;
    const stepX = (w - padL - padR) / (series.length - 1);
    const toX = (i) => padL + i * stepX;
    const toY = (v) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
    const color = node && node.risk && node.risk.tone === 'risk' ? '#c85a4a'
      : (node && node.growth >= 10 ? '#d9a441' : '#8aa77e');

    ctx.beginPath();
    series.forEach((v, i) => { if (i === 0) ctx.moveTo(toX(i), toY(v)); else ctx.lineTo(toX(i), toY(v)); });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineTo(toX(series.length - 1), h - padB);
    ctx.lineTo(toX(0), h - padB);
    ctx.closePath();
    ctx.fillStyle = color === '#c85a4a' ? 'rgba(200,90,74,0.12)' : (color === '#d9a441' ? 'rgba(217,164,65,0.12)' : 'rgba(138,167,126,0.12)');
    ctx.fill();

    if (inflection && typeof inflection.i === 'number') {
      const ix = Math.min(inflection.i, series.length - 1);
      const iy = toY(series[ix]);
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(toX(ix), padT - 2);
      ctx.lineTo(toX(ix), h - padB);
      ctx.strokeStyle = 'rgba(241,236,224,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(toX(ix), iy, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#f1ece0';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function initPharmaStaticHandlers() {
    document.querySelectorAll('#ph-presets .ph-preset').forEach((b) => {
      b.addEventListener('click', () => {
        const key = PHARMA_VIEWS[b.dataset.view];
        if (!key) return;
        state.pharmaView = b.dataset.view;
        state.pharmaSelected = key;
        renderPharma();
      });
    });
    const growth = phEl('ph-sum-growth');
    if (growth) growth.addEventListener('click', () => { state.pharmaView = 'resp'; state.pharmaSelected = 'resp'; renderPharma(); });
    const risk = phEl('ph-sum-risk');
    if (risk) risk.addEventListener('click', () => { state.pharmaView = 'overall'; state.pharmaSelected = 'all'; renderPharma(); });
  }

  // =========================================================
  //   // BOOT
  // =========================================================
  window.addEventListener('load', () => {
    // clear the initial seed log count so first render governs
    state.selectedStation = SCENARIOS.normal.currentNode;
    document.body.setAttribute('data-tab', state.activeTab);
    init3CStaticHandlers();
    initPharmaStaticHandlers();
    renderAll();
    renderCurrentTabCharts();
  });

  window.addEventListener('resize', () => {
    renderCurrentTabCharts();
  });

})();
