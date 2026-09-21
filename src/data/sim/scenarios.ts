import type { ModuleId } from '../modules'
import { type Rng, clockText } from './rng'
import { DWELL_HOT_MIN, MATERIAL_TYPES } from './constants'
import { makeWorkpiece } from './init'
import { equipmentOf } from './selectors'
import type { AlarmDraft, PlantState } from './types'

export type ScenarioId = 'agv-block' | 'robot-fault' | 'inventory-jam' | 'low-battery' | 'energy-spike' | 'recover'

export interface ScenarioDef {
  id: ScenarioId
  label: string
  /** 演示时的一句话说明：会引发什么连锁反应 */
  effect: string
  /** 直接受影响的模块，用于面板上的标签 */
  modules: ModuleId[]
}

export const SCENARIOS: readonly ScenarioDef[] = [
  { id: 'agv-block', label: 'AGV 路径阻塞', effect: '装配缺料 → 节拍超时 → 运输超时 → 订单准时率下降', modules: ['agv', 'assembly', 'logistics'] },
  { id: 'robot-fault', label: '装配机器人故障', effect: '扭矩漂移 → 检测 NG 增加 → 返工率超标 → 弹出告警', modules: ['assembly', 'inspection'] },
  { id: 'inventory-jam', label: '库存积压呆滞', effect: '多个工位停留超阈值 → 仓库预警 → 建议优先出库', modules: ['warehouse'] },
  { id: 'low-battery', label: 'AGV 电量告急', effect: '两台 MOMA 电量跌破红线 → 本趟结束后返回充电', modules: ['agv'] },
  { id: 'energy-spike', label: '检测能耗尖峰', effect: '设备功率尖峰 → 质量漂移 → 缺陷率上升', modules: ['inspection', 'assembly'] },
  { id: 'recover', label: '一键恢复', effect: '解除阻塞与漂移，恢复设备，清空未处理告警', modules: [] },
] as const

const DEMO = '【演练】'
const BLOCK_TICKS = 12
const DRIFT_TICKS = 40
const SPIKE_KW = 52
const LOW_BATTERY_PCT = 18
const ROBOT_AVAILABILITY_DROP = 0.25
const JAM_CELLS = 4

/** 注入演练场景，返回需要推送的告警；实际状态变化直接作用于 state，之后由常规 tick 传导 */
export function injectScenario(state: PlantState, rng: Rng, id: ScenarioId, now: Date): AlarmDraft[] {
  switch (id) {
    case 'agv-block': {
      const running = state.agv.agvs.filter((a) => a.status === 'running')
      const victims = running.slice(0, 2)
      victims.forEach((a) => {
        a.status = 'blocked'
        a.blockedTicks = BLOCK_TICKS
      })
      return victims.map((a) => ({
        module: 'agv', level: 'risk', category: '物流异常', focus: a.id,
        text: `${DEMO}${a.id} 路径阻塞，下游装配可能缺料`,
      }))
    }
    case 'robot-fault': {
      const eq = equipmentOf(state, 'assembly')
      eq.availability = Math.max(0.4, Math.round((eq.availability - ROBOT_AVAILABILITY_DROP) * 1000) / 1000)
      eq.faults.unshift({ time: clockText(now), code: 'Alarm_Robot', desc: '机器人故障', minutes: 12 })
      state.assembly.driftTicks = DRIFT_TICKS
      return [{ module: 'assembly', level: 'risk', category: '设备故障', focus: eq.id, text: `${DEMO}${eq.name} Alarm_Robot 机器人故障，装配质量可能受影响` }]
    }
    case 'inventory-jam': {
      const wh = state.warehouse
      const empties = wh.cells.filter((c) => !c.item).slice(0, 3)
      empties.forEach((c) => {
        c.material = rng.pick(MATERIAL_TYPES)
        c.item = makeWorkpiece(rng, now)
      })
      const targets = wh.cells.filter((c) => c.item).slice(0, JAM_CELLS)
      targets.forEach((c) => { c.dwellMin = DWELL_HOT_MIN + rng.int(5, 60) })
      return [{ module: 'warehouse', level: 'warn', category: '生产超差', focus: targets[0]?.id, text: `${DEMO}${targets.length} 个工位停留超过 ${DWELL_HOT_MIN} 分钟，形成呆滞` }]
    }
    case 'low-battery': {
      const targets = state.agv.agvs.filter((a) => a.status === 'running').slice(0, 2)
      targets.forEach((a) => { a.battery = LOW_BATTERY_PCT })
      return targets.map((a) => ({
        module: 'agv', level: 'warn', category: '设备故障', focus: a.id,
        text: `${DEMO}${a.id} Alarm_Lowbattery 电量 ${LOW_BATTERY_PCT}%，本趟结束后返回充电`,
      }))
    }
    case 'energy-spike': {
      const hour = state.inspection.hourly[state.inspection.hourly.length - 1]
      hour.power = SPIKE_KW
      state.assembly.driftTicks = Math.max(state.assembly.driftTicks, DRIFT_TICKS / 2)
      return [{ module: 'inspection', level: 'warn', category: '质量异常', text: `${DEMO}检测设备功率尖峰 ${SPIKE_KW} kW，缺陷率可能上升` }]
    }
    case 'recover': {
      state.agv.agvs.forEach((a) => {
        if (a.status === 'blocked') {
          a.status = 'running'
          a.blockedTicks = 0
        }
        if (a.battery < 40 && a.status !== 'charging') a.battery = 80
      })
      state.assembly.driftTicks = 0
      state.assembly.recent = state.assembly.recent.map(() => 0)
      state.logistics.equipment.forEach((e) => { e.availability = Math.max(e.availability, 0.93) })
      state.warehouse.cells.forEach((c) => { if (c.dwellMin >= DWELL_HOT_MIN) c.dwellMin = 30 })
      state.inspection.hourly.forEach((h) => { if (h.power > 45) h.power = 38 })
      return []
    }
  }
}
