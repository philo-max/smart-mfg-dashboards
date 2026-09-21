import type { ModuleId } from '../modules'

export type Level = 'normal' | 'warn' | 'risk'
export type Light = 'green' | 'yellow' | 'red'
export type Material = 'A' | 'B' | 'C'

export interface Point {
  x: number
  y: number
}

export interface WorkpieceRef {
  rfid: string
  name: string
  batch: string
  inAt: string
}

/** 线上仓库工位：Storage_Status_n（物料类型）+ Sensor_Workpiece_n（有无工件） */
export interface WarehouseCell {
  id: string
  index: number
  row: number
  col: number
  material: Material | null
  item: WorkpieceRef | null
  dwellMin: number
}

export interface WarehouseState {
  cells: WarehouseCell[]
  accuracy: number
  inboundToday: number
  outboundToday: number
  autoStore: number
  autoPick: number
  manualStore: number
  robot: { x: number; y: number; z: number }
  upperBelt: boolean
  lowerBelt: boolean
  /** 最近 30 个 tick 的入库/出库件数 */
  flow: { in: number; out: number }[]
}

export type AgvStatus = 'running' | 'idle' | 'charging' | 'blocked'

export interface AgvRoute {
  id: string
  name: string
  from: string
  to: string
  points: Point[]
}

/** MOMA 复合机器人：AGV 底盘 + Y/Z 轴机械臂 */
export interface Agv {
  id: string
  status: AgvStatus
  routeId: string
  progress: number
  speed: number
  battery: number
  yAxis: number
  task: string
  blockedTicks: number
  /** 当前路段已耗时（tick），用于计算物料运输时间 */
  legTicks: number
}

export interface AgvLeg {
  routeId: string
  agvId: string
  seconds: number
}

export interface AgvState {
  agvs: Agv[]
  tasksDone: number
  tasksTotal: number
  /** 最近 30 个 tick 的完成任务数与阻塞台数 */
  history: { done: number; blocked: number }[]
}

export interface AssemblyWorker {
  name: string
  output: number
}

export interface AssemblyState {
  produced: number
  qualified: number
  rework: number
  planToday: number
  taktElapsed: number
  taktTarget: number
  lastTakt: number
  taktHistory: number[]
  workers: AssemblyWorker[]
  driftTicks: number
  nextCycle: number
  /** 最近若干件的返工标记（1=返工），用于滚动返工率 */
  recent: number[]
  currentRfid: string
  /** 最近一次拧紧的扭矩-时间曲线（N·m） */
  torque: number[]
  /** 最近 30 个 tick 的滚动返工率（%） */
  reworkHistory: number[]
}

export interface HourBucket {
  label: string
  pass: number
  fail: number
  power: number
}

export interface InspectionRecord {
  time: string
  id: string
  rfid: string
  /** 5 个检测位结果，true = OK */
  positions: boolean[]
  result: string
  pass: boolean
  defect: string | null
}

export interface InspectionStation {
  name: string
  total: number
  fail: number
}

export interface MttrAlarm {
  time: string
  station: string
  desc: string
  minutes: number
}

export interface InspectionState {
  hourly: HourBucket[]
  daily: HourBucket[]
  tolerance: number[]
  defects: { name: string; value: number }[]
  stations: InspectionStation[]
  records: InspectionRecord[]
  /** 最近的 NG 记录（跨越更长时间），供「仅 NG」与交叉筛选使用 */
  ngHistory: InspectionRecord[]
  mttr: MttrAlarm[]
  /** 单件检测耗时（s） */
  takeTime: number
}

export interface FaultRecord {
  time: string
  code: string
  desc: string
  minutes: number
}

export interface Equipment {
  id: string
  name: string
  unit: ModuleId
  availability: number
  performance: number
  quality: number
  faults: FaultRecord[]
}

export interface TraceRecord {
  time: string
  rfid: string
  name: string
  from: string
  to: string
  status: '完成' | '延误'
}

export interface OrderBucket {
  label: string
  total: number
  onTime: number
}

export interface LogisticsState {
  ordersTotal: number
  ordersOnTime: number
  rfidWrites: number
  transport: { label: string; seconds: number }[]
  equipment: Equipment[]
  trace: TraceRecord[]
  orderHourly: OrderBucket[]
}

export type AlarmCategory = '设备故障' | '质量异常' | '生产超差' | '物流异常'
export type AlarmStatus = 'open' | 'handling' | 'resolved'

export interface PlantAlarm {
  id: number
  module: ModuleId
  level: Exclude<Level, 'normal'>
  category: AlarmCategory
  status: AlarmStatus
  text: string
  time: string
  /** 产生时的 tick，用于自动恢复 */
  tick: number
  focus?: string
}

/** 工件履历阶段：0 仓库 · 1 AGV 配送 · 2 装配（含送检、返工）· 3 检测 · 4 合格回库 */
export type LineageStage = 0 | 1 | 2 | 3 | 4

export interface LineageEvent {
  time: string
  stage: LineageStage
  module: ModuleId
  text: string
  level: 'info' | 'ok' | 'warn' | 'risk'
  /** 上游历史由 RFID 派生合成（历史归档），不是本次会话中真实发生的 */
  synthetic?: boolean
}

/** 工件在各单元间流转的队列 + 每个 RFID 的事件履历 */
export interface LineageState {
  released: string[]
  delivered: string[]
  assembled: string[]
  finished: string[]
  events: Record<string, LineageEvent[]>
  order: string[]
  meta: Record<string, { name: string; batch: string }>
}

export interface TraceStageView {
  key: 'warehouse' | 'agv' | 'assembly' | 'inspection' | 'return'
  label: string
  module: ModuleId
  status: 'done' | 'current' | 'pending' | 'fail'
}

export interface TraceView {
  rfid: string
  found: boolean
  name: string
  batch: string
  events: LineageEvent[]
  stages: TraceStageView[]
  location: string
  result: 'pass' | 'ng' | 'wip'
  focus: { module: ModuleId; focus: string | null } | null
}

export interface PlantState {
  tick: number
  warehouse: WarehouseState
  agv: AgvState
  assembly: AssemblyState
  inspection: InspectionState
  logistics: LogisticsState
  lineage: LineageState
  cooldowns: Record<string, number>
}

export type AlarmDraft = Omit<PlantAlarm, 'id' | 'time' | 'status' | 'tick'>
