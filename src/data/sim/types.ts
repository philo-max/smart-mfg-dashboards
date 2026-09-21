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

export interface PlantState {
  tick: number
  warehouse: WarehouseState
  agv: AgvState
  assembly: AssemblyState
  inspection: InspectionState
  logistics: LogisticsState
  cooldowns: Record<string, number>
}

export type AlarmDraft = Omit<PlantAlarm, 'id' | 'time' | 'status' | 'tick'>
