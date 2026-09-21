import { type Rng, clockText, round } from './rng'
import {
  HISTORY_LEN, NG_HISTORY_MAX, NOMINAL, RECENT_WINDOW, REWORK_THRESHOLD, TAKE_TIME_S, TAKT_TARGET,
  TICK_SECONDS, TOLERANCE_SD, TORQUE_MAX, TORQUE_MIN,
} from './constants'
import { torqueCurve, torquePeak } from './torque'
import { makeInspectionRecord } from './record'
import { logEvent } from './lineage'
import { nextRfid } from './init'
import { canAlarm } from './step-flow'
import type { AlarmDraft, PlantState } from './types'

const BASE_FAIL_RATE = 0.006
const DRIFT_FAIL_RATE = 0.12
const TAKT_OVERRUN_ALARM_S = 8
const TAKT_HISTORY_LEN = 20
const MAX_RECORDS = 40
const STARVED_OUTPUT_CHANCE = 0.3
const INSPECTION_ALARM_WINDOW = 10
const INSPECTION_ALARM_FAILS = 2

const QUEUE_MAX = 60

function pushCapped(queue: string[], value: string): void {
  queue.push(value)
  if (queue.length > QUEUE_MAX) queue.shift()
}

export function reworkRate(state: PlantState): number {
  const recent = state.assembly.recent
  return round((recent.reduce((a, v) => a + v, 0) / recent.length) * 100, 2)
}

export interface AssemblyStepResult {
  alarms: AlarmDraft[]
  units: number
}

/** 装配：AGV 阻塞且本轮无送料 → 缺料，节拍拉长、产出下降（联动链 1） */
export function stepAssembly(state: PlantState, rng: Rng, delivered: number, blockedAgvs: number, now: Date = new Date()): AssemblyStepResult {
  const result: AssemblyStepResult = { alarms: [], units: 0 }
  const asm = state.assembly
  const starving = blockedAgvs > 0 && delivered === 0
  if (asm.driftTicks > 0) asm.driftTicks -= 1

  asm.taktElapsed += TICK_SECONDS
  if (!starving && asm.taktElapsed >= asm.nextCycle) {
    asm.lastTakt = asm.taktElapsed
    asm.taktHistory.push(asm.taktElapsed)
    if (asm.taktHistory.length > TAKT_HISTORY_LEN) asm.taktHistory.shift()
    asm.taktElapsed = 0
    asm.nextCycle = Math.max(TICK_SECONDS * 7, Math.round(rng.gaussian(TAKT_TARGET - 2, 1) / TICK_SECONDS) * TICK_SECONDS)
    const finishedRfid = asm.currentRfid
    asm.torque = torqueCurve(rng, asm.driftTicks > 0)
    const peak = torquePeak(asm.torque)
    const outOfWindow = peak > TORQUE_MAX || peak < TORQUE_MIN
    logEvent(state, finishedRfid, 2, 'assembly', `装配完成，节拍 ${asm.lastTakt}s，扭矩峰值 ${peak.toFixed(2)} N·m${outOfWindow ? '（超出工艺窗口）' : ''}`, outOfWindow ? 'warn' : 'ok', clockText(now))
    pushCapped(state.lineage.assembled, finishedRfid)
    asm.currentRfid = state.lineage.delivered.shift() ?? nextRfid()
    logEvent(state, asm.currentRfid, 2, 'assembly', '开始装配', 'info', clockText(now))
    if (outOfWindow && canAlarm(state, 'torque', 10)) {
      result.alarms.push({
        module: 'assembly', level: 'warn', category: '生产超差',
        text: `拧紧扭矩峰值 ${peak.toFixed(2)} N·m 超出 ${TORQUE_MIN}–${TORQUE_MAX} N·m 工艺窗口`,
      })
    }
  }
  if (asm.taktElapsed >= TAKT_TARGET + TAKT_OVERRUN_ALARM_S && canAlarm(state, 'takt', 20)) {
    result.alarms.push({ module: 'assembly', level: 'warn', category: '生产超差', text: `装配节拍 ${asm.taktElapsed}s 超出目标 ${TAKT_TARGET}s，工位缺料等待` })
  }

  result.units = starving ? (rng.chance(STARVED_OUTPUT_CHANCE) ? 1 : 0) : rng.int(1, 2)
  for (let i = 0; i < result.units; i++) rng.pick(asm.workers).output += 1
  asm.produced += result.units
  return result
}

export interface InspectionStepResult {
  alarms: AlarmDraft[]
  fails: number
}

/** 检测：不合格件回流装配返工（联动链 2 末端），滚动返工率超标触发装配告警 */
export function stepInspection(state: PlantState, rng: Rng, units: number, now: Date): InspectionStepResult {
  const result: InspectionStepResult = { alarms: [], fails: 0 }
  const ins = state.inspection
  const asm = state.assembly
  const failRate = asm.driftTicks > 0 ? DRIFT_FAIL_RATE : BASE_FAIL_RATE
  const hour = ins.hourly[ins.hourly.length - 1]
  for (let i = 0; i < units; i++) {
    const rfid = state.lineage.assembled.shift() ?? nextRfid()
    const rec = makeInspectionRecord(rng, { now, failRate, serial: asm.produced - units + i + 1, rfid })
    const time = clockText(now)
    rec.positions.forEach((ok, idx) => {
      ins.stations[idx].total += 1
      if (!ok) ins.stations[idx].fail += 1
    })
    ins.tolerance.shift()
    ins.tolerance.push(round(rng.gaussian(NOMINAL + 0.002, TOLERANCE_SD), 4))
    if (rec.pass) {
      hour.pass += 1
      asm.qualified += 1
      logEvent(state, rfid, 3, 'inspection', '检测合格（5 个检测位全部 OK）', 'ok', time)
      pushCapped(state.lineage.finished, rfid)
    } else {
      logEvent(state, rfid, 3, 'inspection', `检测不合格：${rec.defect}（检测位 ${rec.positions.indexOf(false) + 1} NG）`, 'risk', time)
      logEvent(state, rfid, 2, 'assembly', '退回装配返工', 'warn', time)
      pushCapped(state.lineage.assembled, rfid)
      hour.fail += 1
      ins.ngHistory.unshift(rec)
      result.fails += 1
      asm.rework += 1
      const defect = ins.defects.find((d) => d.name === rec.defect)
      if (defect) defect.value += 1
    }
    asm.recent.push(rec.pass ? 0 : 1)
    if (asm.recent.length > RECENT_WINDOW) asm.recent.shift()
    ins.records.unshift(rec)
  }
  if (ins.records.length > MAX_RECORDS) ins.records.length = MAX_RECORDS
  if (ins.ngHistory.length > NG_HISTORY_MAX) ins.ngHistory.length = NG_HISTORY_MAX
  if (units > 0) ins.takeTime = round(rng.gaussian(TAKE_TIME_S, 0.5), 1)

  const recentFails = ins.records.slice(0, INSPECTION_ALARM_WINDOW).filter((r) => !r.pass).length
  if (result.fails > 0 && recentFails >= INSPECTION_ALARM_FAILS && canAlarm(state, 'inspection', 15)) {
    result.alarms.push({ module: 'inspection', level: 'warn', category: '质量异常', text: `连续不合格：近 ${INSPECTION_ALARM_WINDOW} 件中 ${recentFails} 件 NG` })
  }
  const rate = reworkRate(state)
  asm.reworkHistory.push(rate)
  if (asm.reworkHistory.length > HISTORY_LEN) asm.reworkHistory.shift()
  if (rate > REWORK_THRESHOLD && canAlarm(state, 'rework', 60)) {
    result.alarms.push({ module: 'assembly', level: 'risk', category: '质量异常', text: `装配返工率 ${rate}% 超过 ${REWORK_THRESHOLD}% 标准，请排查装配机器人` })
  }
  return result
}
