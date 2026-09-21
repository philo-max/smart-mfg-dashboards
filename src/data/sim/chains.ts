import type { ModuleId } from '../modules'
import {
  DWELL_HOT_MIN, FPY_THRESHOLD, REWORK_THRESHOLD, TAKT_TARGET, TRANSPORT_LATE_S,
} from './constants'
import { equipmentOf, inspectionTotals, plantKpis } from './selectors'
import { reworkRate } from './step-quality'
import type { PlantAlarm, PlantState } from './types'

export type ChainId = 'flow' | 'quality' | 'inventory'

export interface ChainStep {
  id: string
  label: string
  module: ModuleId
  active: boolean
  /** 当前状态下支撑该环节的证据数据 */
  evidence: string
}

export interface Chain {
  id: ChainId
  name: string
  summary: string
  steps: ChainStep[]
  advice: string[]
}

const ON_TIME_TARGET = 95
const ROBOT_AVAILABILITY_WARN = 0.85
const INVENTORY_FULL = 11

/** 三条跨模块因果链在当前状态下的每个环节是否已发生，以及证据 */
export function causalChains(state: PlantState): Chain[] {
  const k = plantKpis(state)
  const blocked = state.agv.agvs.filter((a) => a.status === 'blocked')
  const lastTransport = state.logistics.transport[state.logistics.transport.length - 1]
  const asm = state.assembly
  const eq = equipmentOf(state, 'assembly')
  const ins = inspectionTotals(state)
  const rework = reworkRate(state)
  const hot = state.warehouse.cells.filter((c) => c.dwellMin >= DWELL_HOT_MIN)

  return [
    {
      id: 'flow',
      name: '物流链',
      summary: 'AGV 阻塞 → 装配缺料 → 运输超时 → 订单准时率下降',
      steps: [
        { id: 'flow-1', label: 'AGV 阻塞', module: 'agv', active: blocked.length > 0, evidence: blocked.length ? `${blocked.map((a) => a.id).join('、')} 阻塞` : '车队全部畅通' },
        { id: 'flow-2', label: '装配缺料', module: 'assembly', active: asm.taktElapsed > TAKT_TARGET, evidence: `当前节拍 ${asm.taktElapsed}s / 目标 ${TAKT_TARGET}s` },
        { id: 'flow-3', label: '运输超时', module: 'logistics', active: lastTransport.seconds > TRANSPORT_LATE_S, evidence: `最近一次运输 ${lastTransport.seconds}s（红线 ${TRANSPORT_LATE_S}s）` },
        { id: 'flow-4', label: '准时率下降', module: 'logistics', active: k.onTime < ON_TIME_TARGET, evidence: `订单准时交付率 ${k.onTime}%（目标 ${ON_TIME_TARGET}%）` },
      ],
      advice: ['清除 AGV 路径障碍，必要时人工引导绕行', '临时调度空闲 MOMA 为装配工位补料', '检查 R1 路径上的传感器遮挡与输送线状态'],
    },
    {
      id: 'quality',
      name: '质量链',
      summary: '装配机器人故障 → 质量漂移 → 检测 NG 增加 → 返工率超标',
      steps: [
        {
          id: 'quality-1', label: '机器人故障 / 漂移', module: 'assembly',
          active: eq.availability < ROBOT_AVAILABILITY_WARN || asm.driftTicks > 0,
          evidence: `装配机器人可用率 ${(eq.availability * 100).toFixed(1)}%${asm.driftTicks > 0 ? `，质量漂移中（约剩 ${asm.driftTicks} tick）` : ''}`,
        },
        { id: 'quality-2', label: '检测 NG 增加', module: 'inspection', active: ins.lastHourFpy < FPY_THRESHOLD, evidence: `本小时一次合格率 ${ins.lastHourFpy}%（阈值 ${FPY_THRESHOLD}%）` },
        { id: 'quality-3', label: '返工率超标', module: 'assembly', active: rework > REWORK_THRESHOLD, evidence: `滚动返工率 ${rework}%（标准 ${REWORK_THRESHOLD}%）` },
      ],
      advice: ['检查装配机器人 Alarm_Robot 与拧紧扭矩曲线是否越出 0.8–1.2 N·m', '对返工件抽检确认漂移是否已消除', '必要时暂停装配，待设备复位后再恢复生产'],
    },
    {
      id: 'inventory',
      name: '库存链',
      summary: '入库堆积 → 工位停留超阈值 → 呆滞告警',
      steps: [
        { id: 'inventory-1', label: '入库堆积', module: 'warehouse', active: k.inventory >= INVENTORY_FULL, evidence: `在库 ${k.inventory} / 12 个工位` },
        { id: 'inventory-2', label: '工位呆滞', module: 'warehouse', active: hot.length > 0, evidence: hot.length ? `${hot.map((c) => c.id).join('、')} 停留 ≥ ${DWELL_HOT_MIN} 分钟` : `暂无停留 ≥ ${DWELL_HOT_MIN} 分钟的工位` },
      ],
      advice: ['优先出库呆滞工位的物料', '核对订单拉料计划是否与入库节奏匹配'],
    },
  ]
}

/** 告警 → 所属因果链（按模块与文案判断，没有明确特征时按模块兜底） */
export function chainIdForAlarm(alarm: Pick<PlantAlarm, 'module' | 'text' | 'category'>): ChainId {
  if (alarm.module === 'warehouse') return 'inventory'
  if (alarm.module === 'inspection') return 'quality'
  if (alarm.module === 'agv' || alarm.module === 'logistics') return 'flow'
  return /节拍|缺料|阻塞/.test(alarm.text) ? 'flow' : 'quality'
}
