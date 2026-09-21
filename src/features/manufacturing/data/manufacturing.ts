/* =========================================================
   制造页 · 场景配置（唯一数据源）
   4 个场景各由一份 ScenarioConfig 同时驱动：
   订单节点/物流方向、工位状态与设备值、瓶颈原因与影响订单数、
   右侧建议动作、底部指标、ECharts 趋势、GSAP 物料流动状态。
   组件只读配置，不各自改 DOM。
   ========================================================= */

export type Scenario = 'normal' | 'agv-jam' | 'defect-spike' | 'takt-timeout'
export type StationId = 'inbound' | 'assembly' | 'inspection' | 'outbound'
export type StationState = 'running' | 'warn' | 'risk'
export type RiskLevel = 'low' | 'medium' | 'high'
export type Tone = 'pos' | 'warn' | 'neg' | 'risk'

export interface StationDef {
  id: StationId
  name: string
}

/** 主线工位顺序：入库 → 装配 → 质检 → 出库 */
export const STATIONS: StationDef[] = [
  { id: 'inbound', name: '入库' },
  { id: 'assembly', name: '装配' },
  { id: 'inspection', name: '质检' },
  { id: 'outbound', name: '出库' },
]

/** 工位在轨道上的锚点（占轨道宽度比例），供定位与物料停靠共用。 */
export const STATION_FRACTION: Record<StationId, number> = {
  inbound: 0.06,
  assembly: 0.37,
  inspection: 0.68,
  outbound: 0.94,
}

export interface MetricDef {
  key: string
  label: string
  value: number
  unit: string
  deltaText: string
  tone: Tone
}

/** GSAP 物料流状态：loop=连续流动；hold=停在指定比例处 */
export interface FlowDef {
  mode: 'loop' | 'hold'
  holdFraction?: number
}

export interface ScenarioConfig {
  id: Scenario
  label: string
  order: {
    code: string
    currentStation: StationId
    eta: string
    risk: RiskLevel
    owner: string
  }
  /** 物流方向描述 */
  direction: string
  stationStates: Record<StationId, StationState>
  stationReadouts: Record<StationId, string>
  bottleneck: {
    node: StationId
    reason: string
    affectedOrders: number
  }
  decision: {
    risk: RiskLevel
    headline: string
    rootCause: string
    actions: string[]
  }
  metrics: MetricDef[]
  trend: {
    axis: string[]
    deviation: number[]
    threshold: number
  }
  flow: FlowDef
}

const CYCLE_AXIS = ['入库', '', '', '装配', '', '', '质检', '', '', '出库']

export const SCENARIO_LIST: { id: Scenario; label: string }[] = [
  { id: 'normal', label: '正常运行' },
  { id: 'agv-jam', label: 'AGV 阻塞' },
  { id: 'defect-spike', label: '不良突增' },
  { id: 'takt-timeout', label: '节拍超时' },
]

export const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  normal: {
    id: 'normal',
    label: '正常运行',
    order: {
      code: '01218',
      currentStation: 'assembly',
      eta: '今日 18:40',
      risk: 'low',
      owner: '产线 A · 当班班组',
    },
    direction: '入库 → 装配 → 质检 → 出库（畅通）',
    stationStates: {
      inbound: 'running',
      assembly: 'running',
      inspection: 'running',
      outbound: 'running',
    },
    stationReadouts: {
      inbound: '节拍 42s',
      assembly: '节拍 45s',
      inspection: '节拍 41s',
      outbound: '节拍 39s',
    },
    bottleneck: {
      node: 'assembly',
      reason: '装配节拍最接近上限（45s / 45s），当前无明显积压',
      affectedOrders: 0,
    },
    decision: {
      risk: 'low',
      headline: '运行平稳',
      rootCause: '各工位节拍均衡，无积压，出库通道畅通',
      actions: ['保持当前节拍', '监控装配工位负荷'],
    },
    metrics: [
      { key: 'oee', label: 'OEE', value: 87.5, unit: '%', deltaText: '+0.6', tone: 'pos' },
      { key: 'yield', label: '良率', value: 99.2, unit: '%', deltaText: '+0.1', tone: 'pos' },
      { key: 'energy', label: '能耗', value: 1.82, unit: 'kWh/件', deltaText: '-0.03', tone: 'pos' },
      { key: 'takt', label: '节拍波动', value: 3.1, unit: '%', deltaText: '-0.4', tone: 'pos' },
      { key: 'wip', label: '在制品', value: 46, unit: '件', deltaText: '+2', tone: 'warn' },
    ],
    trend: {
      axis: CYCLE_AXIS,
      deviation: [4, 4, 5, 4, 5, 4, 5, 4, 4, 4],
      threshold: 10,
    },
    flow: { mode: 'loop' },
  },

  'agv-jam': {
    id: 'agv-jam',
    label: 'AGV 阻塞',
    order: {
      code: '01218',
      currentStation: 'inspection',
      eta: '今日 19:25（预计 +45min）',
      risk: 'high',
      owner: '物流 AGV 调度',
    },
    direction: '入库 → 装配 → 质检 →（出库前阻塞）',
    stationStates: {
      inbound: 'running',
      assembly: 'running',
      inspection: 'warn',
      outbound: 'risk',
    },
    stationReadouts: {
      inbound: '正常',
      assembly: '正常',
      inspection: '待转运',
      outbound: 'AGV 阻塞',
    },
    bottleneck: {
      node: 'outbound',
      reason: 'AGV 转运阻塞：出库口通道占用，物料滞留于出库前',
      affectedOrders: 12,
    },
    decision: {
      risk: 'high',
      headline: '出库被 AGV 阻塞',
      rootCause: 'AGV 调度通道被占用，出库前物料滞留，订单无法交付',
      actions: ['调度备用 AGV 疏通通道', '暂停入库投放 10min', '通知物流班组现场处置'],
    },
    metrics: [
      { key: 'oee', label: 'OEE', value: 79.4, unit: '%', deltaText: '-2.1', tone: 'neg' },
      { key: 'yield', label: '良率', value: 98.9, unit: '%', deltaText: '-0.2', tone: 'warn' },
      { key: 'energy', label: '能耗', value: 2.05, unit: 'kWh/件', deltaText: '+0.12', tone: 'neg' },
      { key: 'takt', label: '节拍波动', value: 7.8, unit: '%', deltaText: '+2.6', tone: 'neg' },
      { key: 'wip', label: '在制品', value: 73, unit: '件', deltaText: '+27', tone: 'neg' },
    ],
    trend: {
      axis: CYCLE_AXIS,
      deviation: [4, 5, 5, 5, 4, 5, 5, 7, 11, 15],
      threshold: 10,
    },
    flow: { mode: 'hold', holdFraction: 0.8 },
  },

  'defect-spike': {
    id: 'defect-spike',
    label: '不良突增',
    order: {
      code: '01218',
      currentStation: 'inspection',
      eta: '今日 20:10（预计 +90min）',
      risk: 'high',
      owner: '质量工程',
    },
    direction: '入库 → 装配 →（质检滞留）→ 出库',
    stationStates: {
      inbound: 'running',
      assembly: 'warn',
      inspection: 'risk',
      outbound: 'warn',
    },
    stationReadouts: {
      inbound: '正常',
      assembly: '返修上升',
      inspection: '不良率 6.8%',
      outbound: '待检',
    },
    bottleneck: {
      node: 'inspection',
      reason: '质检点不良突增：装配来料波动导致质检返修积压',
      affectedOrders: 9,
    },
    decision: {
      risk: 'high',
      headline: '质检不良突增',
      rootCause: '质检点不良率骤升，物料滞留于质检节点，后续出库受阻',
      actions: ['隔离当前批次并复检', '回溯装配来料参数', '质量工程介入分析缺陷模式'],
    },
    metrics: [
      { key: 'oee', label: 'OEE', value: 76.2, unit: '%', deltaText: '-3.4', tone: 'neg' },
      { key: 'yield', label: '良率', value: 93.2, unit: '%', deltaText: '-5.6', tone: 'neg' },
      { key: 'energy', label: '能耗', value: 1.98, unit: 'kWh/件', deltaText: '+0.08', tone: 'warn' },
      { key: 'takt', label: '节拍波动', value: 9.4, unit: '%', deltaText: '+3.9', tone: 'neg' },
      { key: 'wip', label: '在制品', value: 68, unit: '件', deltaText: '+22', tone: 'neg' },
    ],
    trend: {
      axis: CYCLE_AXIS,
      deviation: [4, 5, 4, 5, 4, 5, 16, 7, 5, 4],
      threshold: 10,
    },
    flow: { mode: 'hold', holdFraction: 0.68 },
  },

  'takt-timeout': {
    id: 'takt-timeout',
    label: '节拍超时',
    order: {
      code: '01218',
      currentStation: 'assembly',
      eta: '今日 19:50（预计 +70min）',
      risk: 'medium',
      owner: '工艺 / 设备',
    },
    direction: '入库 →（装配超时）→ 质检排队 → 出库',
    stationStates: {
      inbound: 'running',
      assembly: 'risk',
      inspection: 'warn',
      outbound: 'running',
    },
    stationReadouts: {
      inbound: '正常',
      assembly: '节拍 58s 超上限',
      inspection: '节拍 52s',
      outbound: '正常',
    },
    bottleneck: {
      node: 'assembly',
      reason: '装配节拍连续超阈值，向质检传导排队累积',
      affectedOrders: 7,
    },
    decision: {
      risk: 'medium',
      headline: '装配节拍超时',
      rootCause: '装配节拍连续超阈值，下游质检排队累积，交付时间后移',
      actions: ['调整装配工位节拍分配', '增派人手至装配工位', '观察 15min 是否缓解'],
    },
    metrics: [
      { key: 'oee', label: 'OEE', value: 81.6, unit: '%', deltaText: '-1.8', tone: 'warn' },
      { key: 'yield', label: '良率', value: 98.5, unit: '%', deltaText: '-0.4', tone: 'warn' },
      { key: 'energy', label: '能耗', value: 1.94, unit: 'kWh/件', deltaText: '+0.05', tone: 'warn' },
      { key: 'takt', label: '节拍波动', value: 6.2, unit: '%', deltaText: '+1.9', tone: 'neg' },
      { key: 'wip', label: '在制品', value: 58, unit: '件', deltaText: '+12', tone: 'warn' },
    ],
    trend: {
      axis: CYCLE_AXIS,
      deviation: [4, 5, 6, 12, 13, 14, 13, 9, 6, 5],
      threshold: 10,
    },
    flow: { mode: 'hold', holdFraction: 0.37 },
  },
}

export function stationName(id: StationId): string {
  return STATIONS.find((s) => s.id === id)?.name ?? id
}

export function stateMeta(state: StationState): { label: string; tone: Tone } {
  if (state === 'risk') return { label: '异常', tone: 'risk' }
  if (state === 'warn') return { label: '预警', tone: 'warn' }
  return { label: '运行', tone: 'pos' }
}

export function riskMeta(risk: RiskLevel): { label: string; tone: Tone } {
  if (risk === 'high') return { label: '高风险', tone: 'risk' }
  if (risk === 'medium') return { label: '中风险', tone: 'warn' }
  return { label: '低风险', tone: 'pos' }
}
