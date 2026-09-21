import { type Rng, clockText, round } from './rng'
import {
  DEFECT_TYPES, INSPECTION_STATIONS, NOMINAL, RECENT_WINDOW, REWORK_THRESHOLD,
  HISTORY_LEN, TAKE_TIME_S, TAKT_TARGET, TICK_SECONDS, TOLERANCE, TOLERANCE_SD, TORQUE_MAX, TORQUE_MIN,
} from './constants'
import { torqueCurve, torquePeak } from './torque'
import { nextRfid } from './init'
import { canAlarm } from './step-flow'
import type { AlarmDraft, InspectionRecord, PlantState } from './types'

const BASE_FAIL_RATE = 0.006
const DRIFT_FAIL_RATE = 0.12
const TAKT_OVERRUN_ALARM_S = 8
const TAKT_HISTORY_LEN = 20
const MAX_RECORDS = 40
const STARVED_OUTPUT_CHANCE = 0.3
const INSPECTION_ALARM_WINDOW = 10
const INSPECTION_ALARM_FAILS = 2
/** 检测位 → 该位置判 NG 时对应的缺陷类型 */
const POSITION_DEFECT = ['孔位偏移', '孔径超差', '外观划痕', '贴合间隙超标', 'RFID异常'] as const

export function reworkRate(state: PlantState): number {
  const recent = state.assembly.recent
  return round((recent.reduce((a, v) => a + v, 0) / recent.length) * 100, 2)
}

export interface AssemblyStepResult {
  alarms: AlarmDraft[]
  units: number
}

/** 装配：AGV 阻塞且本轮无送料 → 缺料，节拍拉长、产出下降（联动链 1） */
export function stepAssembly(state: PlantState, rng: Rng, delivered: number, blockedAgvs: number): AssemblyStepResult {
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
    asm.currentRfid = nextRfid()
    asm.torque = torqueCurve(rng, asm.driftTicks > 0)
    const peak = torquePeak(asm.torque)
    if ((peak > TORQUE_MAX || peak < TORQUE_MIN) && canAlarm(state, 'torque', 10)) {
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

function makeRecord(rng: Rng, now: Date, failRate: number, serial: number): InspectionRecord {
  const failed = rng.chance(failRate)
  const ngIndex = failed ? rng.int(0, INSPECTION_STATIONS.length - 1) : -1
  const positions = INSPECTION_STATIONS.map((_, i) => i !== ngIndex)
  const diameter = ngIndex === 1
    ? NOMINAL + (rng.chance(0.5) ? 1 : -1) * (TOLERANCE + rng.next() * 0.01)
    : rng.gaussian(NOMINAL + 0.002, TOLERANCE_SD)
  const defect = failed ? (rng.chance(0.1) ? DEFECT_TYPES[5] : POSITION_DEFECT[ngIndex]) : null
  return {
    time: clockText(now),
    id: `WP${now.getFullYear()}${String(serial).padStart(6, '0')}`,
    rfid: nextRfid(),
    positions,
    result: defect ?? `孔径 Φ${diameter.toFixed(3)} mm`,
    pass: !failed,
    defect,
  }
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
    const rec = makeRecord(rng, now, failRate, asm.produced - units + i + 1)
    rec.positions.forEach((ok, idx) => {
      ins.stations[idx].total += 1
      if (!ok) ins.stations[idx].fail += 1
    })
    ins.tolerance.shift()
    ins.tolerance.push(round(rng.gaussian(NOMINAL + 0.002, TOLERANCE_SD), 4))
    if (rec.pass) {
      hour.pass += 1
      asm.qualified += 1
    } else {
      hour.fail += 1
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
