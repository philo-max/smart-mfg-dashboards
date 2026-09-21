import { type Rng, clockText, round } from './rng'
import {
  AGV_ROUTES, DRIFT_EQUIPMENT, DWELL_HOT_MIN, FAULT_CATALOG, MATERIAL_TYPES,
  TICK_SECONDS, TRANSPORT_LATE_S, WORK_ROUTES,
} from './constants'
import { makeWorkpiece, taskName } from './init'
import type { AlarmDraft, Agv, PlantState } from './types'

const AGV_BLOCK_CHANCE = 0.01
const AGV_BATTERY_DRAIN = 0.5
const AGV_CHARGE_RATE = 5
const AGV_LOW_BATTERY = 25
const AGV_FULL_BATTERY = 90
const INBOUND_CHANCE = 0.35
/** 演示时间压缩：每 tick 库存停留 +0.5 分钟 */
const DWELL_MIN_PER_TICK = 0.5
const FAULT_CHANCE = 0.008
const FAULT_AVAILABILITY_DROP = 0.08
const AVAILABILITY_RECOVERY = 0.003
const AVAILABILITY_CEIL = 0.95
const TRANSPORT_WINDOW = 30

export function canAlarm(state: PlantState, key: string, cooldownTicks: number): boolean {
  const until = state.cooldowns[key] ?? -1
  if (state.tick < until) return false
  state.cooldowns[key] = state.tick + cooldownTicks
  return true
}

export interface AgvStepResult {
  alarms: AlarmDraft[]
  deliveredToAssembly: number
  warehousePicks: number
  ordersCompleted: number
  transportSamples: number[]
}

function routeName(id: string): string {
  return AGV_ROUTES.find((r) => r.id === id)?.name ?? id
}

function assign(agv: Agv, routeId: string, rng: Rng, state: PlantState, result: AgvStepResult) {
  agv.routeId = routeId
  agv.progress = 0
  agv.legTicks = 0
  agv.task = taskName(routeId, rng)
  if ((WORK_ROUTES as readonly string[]).includes(routeId)) state.agv.tasksTotal += 1
  if (routeId === 'R1') result.warehousePicks += 1
}

function completeLeg(agv: Agv, rng: Rng, state: PlantState, result: AgvStepResult) {
  if ((WORK_ROUTES as readonly string[]).includes(agv.routeId)) state.agv.tasksDone += 1
  switch (agv.routeId) {
    case 'R1':
      result.deliveredToAssembly += 1
      result.transportSamples.push(agv.legTicks * TICK_SECONDS)
      assign(agv, 'R2', rng, state, result)
      break
    case 'R2':
      assign(agv, 'R3', rng, state, result)
      break
    case 'R3':
      result.ordersCompleted += 1
      assign(agv, agv.battery < AGV_LOW_BATTERY ? 'R4' : 'R1', rng, state, result)
      break
    case 'R4':
      agv.status = 'charging'
      agv.progress = 1
      agv.task = '充电中'
      break
    default:
      assign(agv, 'R1', rng, state, result)
  }
}

export function stepAgv(state: PlantState, rng: Rng): AgvStepResult {
  const result: AgvStepResult = { alarms: [], deliveredToAssembly: 0, warehousePicks: 0, ordersCompleted: 0, transportSamples: [] }
  for (const agv of state.agv.agvs) {
    if (agv.status === 'charging') {
      agv.battery = Math.min(100, agv.battery + AGV_CHARGE_RATE)
      if (agv.battery >= AGV_FULL_BATTERY) {
        agv.status = 'running'
        assign(agv, 'R5', rng, state, result)
      }
      continue
    }
    agv.legTicks += 1
    if (agv.status === 'blocked') {
      agv.blockedTicks -= 1
      if (agv.blockedTicks <= 0) agv.status = 'running'
      continue
    }
    agv.battery = Math.max(0, round(agv.battery - AGV_BATTERY_DRAIN, 1))
    agv.yAxis = round(Math.max(0, Math.min(300, agv.yAxis + rng.gaussian(0, 25))), 1)
    if (rng.chance(AGV_BLOCK_CHANCE)) {
      agv.status = 'blocked'
      agv.blockedTicks = rng.int(5, 10)
      result.alarms.push({
        module: 'agv', level: 'risk', category: '物流异常', focus: agv.id,
        text: `${agv.id} 在「${routeName(agv.routeId)}」路径阻塞，下游装配可能缺料`,
      })
      continue
    }
    if (agv.battery < AGV_LOW_BATTERY && canAlarm(state, `battery:${agv.id}`, 40)) {
      result.alarms.push({ module: 'agv', level: 'warn', category: '设备故障', focus: agv.id, text: `${agv.id} Alarm_Lowbattery 电量 ${Math.round(agv.battery)}%，本趟结束后返回充电` })
    }
    agv.progress += agv.speed
    if (agv.progress >= 1) completeLeg(agv, rng, state, result)
  }
  return result
}

export function stepWarehouse(state: PlantState, rng: Rng, picks: number, now: Date): AlarmDraft[] {
  const alarms: AlarmDraft[] = []
  const wh = state.warehouse
  for (const cell of wh.cells) {
    if (!cell.item) continue
    const before = cell.dwellMin
    cell.dwellMin = round(cell.dwellMin + DWELL_MIN_PER_TICK, 1)
    if (before < DWELL_HOT_MIN && cell.dwellMin >= DWELL_HOT_MIN) {
      alarms.push({ module: 'warehouse', level: 'warn', category: '生产超差', focus: cell.id, text: `${cell.id}工位 ${cell.material} 料停留 ${DWELL_HOT_MIN} 分钟，形成呆滞` })
    }
  }
  const empties = wh.cells.filter((c) => !c.item)
  if (empties.length > 0 && rng.chance(INBOUND_CHANCE)) {
    const cell = rng.pick(empties)
    cell.material = rng.pick(MATERIAL_TYPES)
    cell.item = makeWorkpiece(rng, now)
    cell.dwellMin = 0
    wh.inboundToday += 1
    wh.autoStore += 1
    wh.robot = { x: 60 + cell.col * 80, y: 40 + cell.row * 60, z: rng.int(10, 60) }
  }
  for (let i = 0; i < picks; i++) {
    const filled = wh.cells.filter((c) => c.item)
    if (filled.length === 0) break
    const cell = rng.pick(filled)
    cell.item = null
    cell.material = null
    cell.dwellMin = 0
    wh.outboundToday += 1
    wh.autoPick += 1
    wh.robot = { x: 60 + cell.col * 80, y: 40 + cell.row * 60, z: rng.int(10, 60) }
  }
  wh.accuracy = round(Math.min(99.95, Math.max(98.6, wh.accuracy + rng.gaussian(0, 0.04))), 2)
  return alarms
}

export interface LogisticsStepResult {
  alarms: AlarmDraft[]
  driftTriggered: boolean
}

export function stepLogistics(state: PlantState, rng: Rng, agv: AgvStepResult, now: Date): LogisticsStepResult {
  const result: LogisticsStepResult = { alarms: [], driftTriggered: false }
  const lg = state.logistics
  lg.rfidWrites += agv.warehousePicks
  for (const seconds of agv.transportSamples) {
    lg.transport.push({ label: clockText(now).slice(0, 5), seconds })
    if (lg.transport.length > TRANSPORT_WINDOW) lg.transport.shift()
    if (seconds > TRANSPORT_LATE_S && canAlarm(state, 'transport', 10)) {
      result.alarms.push({ module: 'logistics', level: 'warn', category: '物流异常', text: `物料运输耗时 ${seconds}s，超过 ${TRANSPORT_LATE_S}s 交付红线` })
    }
  }
  for (let i = 0; i < agv.ordersCompleted; i++) {
    lg.ordersTotal += 1
    const last = lg.transport[lg.transport.length - 1]
    if (last.seconds <= TRANSPORT_LATE_S) lg.ordersOnTime += 1
  }
  for (const eq of lg.equipment) {
    eq.availability = round(Math.min(AVAILABILITY_CEIL, eq.availability + AVAILABILITY_RECOVERY), 3)
    eq.performance = round(Math.min(0.98, Math.max(0.75, eq.performance + rng.gaussian(0, 0.004))), 3)
  }
  if (rng.chance(FAULT_CHANCE)) {
    const eq = rng.pick(lg.equipment)
    const fault = rng.pick(FAULT_CATALOG[eq.id])
    eq.availability = round(Math.max(0.4, eq.availability - FAULT_AVAILABILITY_DROP), 3)
    eq.faults.unshift({ time: clockText(now), code: fault.code, desc: fault.desc, minutes: rng.int(5, 30) })
    result.driftTriggered = DRIFT_EQUIPMENT.includes(eq.id)
    if (eq.id === 'EQ-MM') {
      const running = state.agv.agvs.filter((a) => a.status === 'running')
      if (running.length > 0) {
        const victim = rng.pick(running)
        victim.status = 'blocked'
        victim.blockedTicks = rng.int(4, 8)
      }
    }
    result.alarms.push({
      module: eq.unit, level: 'risk', category: '设备故障', focus: eq.id,
      text: `${eq.name} ${fault.code} ${fault.desc}${result.driftTriggered ? '，装配质量可能受影响' : ''}`,
    })
  }
  return result
}
