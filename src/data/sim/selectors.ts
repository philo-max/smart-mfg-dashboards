import type { ModuleId } from '../modules'
import { round } from './rng'
import {
  DWELL_HOT_MIN, FPY_THRESHOLD, OEE_WARN, REWORK_THRESHOLD, SPOT_CHECK_ESCAPED,
  TAKT_TARGET, TRANSPORT_LATE_S,
} from './constants'
import { reworkRate } from './step-quality'
import type { Equipment, Level, Light, PlantState } from './types'

const ON_TIME_TARGET = 95
const LOW_BATTERY = 20

export function oeeOf(eq: Equipment): number {
  return round(eq.availability * eq.performance * eq.quality * 100, 1)
}

export function equipmentOf(state: PlantState, unit: ModuleId): Equipment {
  return state.logistics.equipment.find((e) => e.unit === unit) ?? state.logistics.equipment[0]
}

export function lightOf(level: Level): Light {
  return level === 'risk' ? 'red' : level === 'warn' ? 'yellow' : 'green'
}

export function worst(levels: Level[]): Level {
  if (levels.includes('risk')) return 'risk'
  return levels.includes('warn') ? 'warn' : 'normal'
}

export function inspectionTotals(state: PlantState) {
  const pass = state.inspection.hourly.reduce((a, h) => a + h.pass, 0)
  const fail = state.inspection.hourly.reduce((a, h) => a + h.fail, 0)
  const total = pass + fail
  const last = state.inspection.hourly[state.inspection.hourly.length - 1]
  const lastTotal = last.pass + last.fail
  return {
    pass, fail, total,
    fpy: total ? round((pass / total) * 100, 2) : 100,
    lastHourFpy: lastTotal ? round((last.pass / lastTotal) * 100, 2) : 100,
    detect: round((fail / (fail + SPOT_CHECK_ESCAPED)) * 100, 2),
  }
}

export function plantKpis(state: PlantState) {
  const asm = state.assembly
  const lg = state.logistics
  const ins = inspectionTotals(state)
  const oees = lg.equipment.map(oeeOf)
  return {
    produced: asm.produced,
    plan: asm.planToday,
    achievement: round((asm.produced / asm.planToday) * 100, 1),
    lineOee: round(oees.reduce((a, v) => a + v, 0) / oees.length, 1),
    fpy: ins.fpy,
    onTime: round((lg.ordersOnTime / lg.ordersTotal) * 100, 1),
    agvCompletion: round((state.agv.tasksDone / state.agv.tasksTotal) * 100, 1),
    rework: reworkRate(state),
    takt: asm.lastTakt,
    inventory: state.warehouse.cells.filter((c) => c.item).length,
  }
}

export function moduleLevels(state: PlantState): Record<ModuleId, Level> {
  const ins = inspectionTotals(state)
  const lg = state.logistics
  const oeeLow = (unit: ModuleId) => oeeOf(equipmentOf(state, unit)) < OEE_WARN
  const lastTransport = lg.transport[lg.transport.length - 1]
  return {
    warehouse: worst([
      state.warehouse.cells.some((c) => c.dwellMin >= DWELL_HOT_MIN) ? 'warn' : 'normal',
      oeeLow('warehouse') ? 'warn' : 'normal',
    ]),
    agv: worst([
      state.agv.agvs.some((a) => a.status === 'blocked') ? 'risk' : 'normal',
      state.agv.agvs.some((a) => a.battery < LOW_BATTERY && a.status !== 'charging') ? 'warn' : 'normal',
      oeeLow('agv') ? 'warn' : 'normal',
    ]),
    assembly: worst([
      reworkRate(state) > REWORK_THRESHOLD ? 'risk' : 'normal',
      state.assembly.taktElapsed > TAKT_TARGET + 4 ? 'warn' : 'normal',
      oeeLow('assembly') ? 'warn' : 'normal',
    ]),
    inspection: worst([
      ins.lastHourFpy < FPY_THRESHOLD ? 'warn' : 'normal',
      oeeLow('inspection') ? 'warn' : 'normal',
    ]),
    logistics: worst([
      (lg.ordersOnTime / lg.ordersTotal) * 100 < ON_TIME_TARGET ? 'warn' : 'normal',
      lastTransport.seconds > TRANSPORT_LATE_S ? 'warn' : 'normal',
      oeeLow('logistics') ? 'warn' : 'normal',
    ]),
  }
}

export interface RoomSlot {
  id: string
  label: string
  level: Level
}

export interface RoomSpark {
  label: string
  kind: 'line' | 'bar'
  values: number[]
  threshold: number
  /** 超过阈值为异常（true）还是低于阈值为异常（false） */
  highIsBad: boolean
}

export interface RoomSummary {
  headline: { label: string; value: string; unit: string }
  secondary: { label: string; value: string }[]
  efficiency: number
  slots: RoomSlot[]
  spark: RoomSpark
}

export function roomSummaries(state: PlantState): Record<ModuleId, RoomSummary> {
  const k = plantKpis(state)
  const ins = inspectionTotals(state)
  const wh = state.warehouse
  const asm = state.assembly
  const lg = state.logistics
  const eff = (unit: ModuleId) => oeeOf(equipmentOf(state, unit))
  const last = lg.transport[lg.transport.length - 1]
  return {
    warehouse: {
      headline: { label: '库存准确率', value: wh.accuracy.toFixed(2), unit: '%' },
      secondary: [{ label: '在库', value: `${k.inventory}/12` }, { label: '呆滞', value: String(wh.cells.filter((c) => c.dwellMin >= DWELL_HOT_MIN).length) }],
      efficiency: eff('warehouse'),
      slots: wh.cells.slice(0, 4).map((c) => ({ id: c.id, label: c.material ?? '空', level: c.dwellMin >= DWELL_HOT_MIN ? 'warn' : 'normal' })),
      spark: { label: '12 工位停留时长 (min)', kind: 'bar', values: wh.cells.map((c) => c.dwellMin), threshold: DWELL_HOT_MIN, highIsBad: true },
    },
    agv: {
      headline: { label: '任务完成率', value: k.agvCompletion.toFixed(1), unit: '%' },
      secondary: [{ label: '运行', value: String(state.agv.agvs.filter((a) => a.status === 'running').length) }, { label: '阻塞', value: String(state.agv.agvs.filter((a) => a.status === 'blocked').length) }],
      efficiency: eff('agv'),
      slots: state.agv.agvs.map((a) => ({ id: a.id, label: a.id.slice(-2), level: a.status === 'blocked' ? 'risk' : a.status === 'charging' ? 'warn' : 'normal' })),
      spark: { label: 'MOMA 电量 (%)', kind: 'bar', values: state.agv.agvs.map((a) => a.battery), threshold: LOW_BATTERY, highIsBad: false },
    },
    assembly: {
      headline: { label: '装配合格率', value: ((asm.qualified / asm.produced) * 100).toFixed(2), unit: '%' },
      secondary: [{ label: '节拍', value: `${asm.lastTakt}s` }, { label: '返工率', value: `${k.rework}%` }],
      efficiency: eff('assembly'),
      slots: asm.workers.slice(0, 4).map((w) => ({ id: w.name, label: w.name.slice(0, 1), level: k.rework > REWORK_THRESHOLD ? 'risk' : 'normal' })),
      spark: { label: '近 20 个节拍 (s)', kind: 'line', values: asm.taktHistory, threshold: TAKT_TARGET, highIsBad: true },
    },
    inspection: {
      headline: { label: '一次合格率', value: ins.fpy.toFixed(2), unit: '%' },
      secondary: [{ label: '合格', value: String(ins.pass) }, { label: '不合格', value: String(ins.fail) }],
      efficiency: eff('inspection'),
      slots: state.inspection.stations.slice(0, 5).map((s, i) => ({
        id: s.name, label: String(i + 1),
        level: state.inspection.records.slice(0, 5).some((r) => !r.positions[i]) ? 'warn' : 'normal',
      })),
      spark: {
        label: '24h 每小时 FPY (%)', kind: 'line', threshold: FPY_THRESHOLD, highIsBad: false,
        values: state.inspection.hourly.map((h) => (h.pass + h.fail ? round((h.pass / (h.pass + h.fail)) * 100, 2) : 100)),
      },
    },
    logistics: {
      headline: { label: '订单准时交付率', value: k.onTime.toFixed(1), unit: '%' },
      secondary: [{ label: '运输', value: `${last.seconds}s` }, { label: '订单', value: String(lg.ordersTotal) }],
      efficiency: eff('logistics'),
      slots: lg.equipment.map((e) => ({ id: e.id, label: e.id.slice(-2), level: oeeOf(e) < OEE_WARN ? 'warn' : 'normal' })),
      spark: { label: '物料运输耗时 (s)', kind: 'line', values: lg.transport.map((t) => t.seconds), threshold: TRANSPORT_LATE_S, highIsBad: true },
    },
  }
}

export interface LinkNode {
  module: ModuleId
  label: string
  value: string
  level: Level
}

export interface Linkage {
  up: LinkNode
  down: LinkNode
}

/** 每个模块在物料流中的上下游：仓库 ← 物流订单，→ AGV；AGV → 装配 → 检测 → 物流出库 */
export function moduleLinkage(state: PlantState, module: ModuleId): Linkage {
  const levels = moduleLevels(state)
  const k = plantKpis(state)
  const blocked = state.agv.agvs.filter((a) => a.status === 'blocked').length
  const lastTransport = state.logistics.transport[state.logistics.transport.length - 1]
  const ins = inspectionTotals(state)
  const node = (m: ModuleId, label: string, value: string): LinkNode => ({ module: m, label, value, level: levels[m] })
  switch (module) {
    case 'warehouse':
      return {
        up: node('logistics', '订单拉料', `${state.logistics.ordersTotal} 单`),
        down: node('agv', '出库取料', `${state.warehouse.outboundToday} 件`),
      }
    case 'logistics':
      return {
        up: node('warehouse', '出库物料', `在库 ${k.inventory}/12`),
        down: node('agv', '配送运输', `${lastTransport.seconds}s`),
      }
    case 'agv':
      return {
        up: node('logistics', '待配送', `${state.logistics.ordersTotal} 单`),
        down: node('assembly', '送料状态', blocked > 0 ? `${blocked} 台阻塞 · 缺料风险` : '供料正常'),
      }
    case 'assembly':
      return {
        up: node('agv', '物料送达', blocked > 0 ? `${blocked} 台阻塞` : '供料正常'),
        down: node('inspection', '送检 / 回流返工', `返工率 ${k.rework}%`),
      }
    case 'inspection':
      return {
        up: node('assembly', '装配来料', state.assembly.driftTicks > 0 ? '质量漂移中' : '工艺稳定'),
        down: node('logistics', '合格品出库', `${ins.pass} 件`),
      }
  }
}

export function faultCounts(equipment: Equipment, catalog: readonly { code: string; desc: string }[]) {
  return catalog.map((c) => ({ ...c, count: equipment.faults.filter((f) => f.code === c.code).length }))
}

/** 设备 24h 状态时长分布（小时）：运行 / 待机 / 故障 */
export function statusHours(eq: Equipment) {
  const total = 24
  const fault = round(total * (1 - eq.availability), 1)
  const running = round(total * eq.availability * eq.performance, 1)
  return { running, idle: round(total - fault - running, 1), fault }
}

const RECENT_TRANSPORT = 10

/** AGV 任务响应率：近 30 tick 内车队未被阻塞的占比 */
export function agvResponseRate(state: PlantState): number {
  const h = state.agv.history
  const blocked = h.reduce((a, x) => a + x.blocked, 0)
  return round((1 - blocked / (h.length * state.agv.agvs.length)) * 100, 1)
}

export function avgTransportSeconds(state: PlantState): number {
  const t = state.logistics.transport.slice(-RECENT_TRANSPORT)
  return Math.round(t.reduce((a, x) => a + x.seconds, 0) / t.length)
}

/** 库内平均仓储时间（分钟） */
export function avgStorageMinutes(state: PlantState): number {
  const stored = state.warehouse.cells.filter((c) => c.item)
  return stored.length ? round(stored.reduce((a, c) => a + c.dwellMin, 0) / stored.length, 1) : 0
}
