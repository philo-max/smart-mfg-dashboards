import { AUDIT_RATE, INSPECTION_TRANSFER_S, SPOT_CHECK_ESCAPED, STATION_CYCLE_BASE } from './constants'
import { round } from './rng'
import { oeeOf, equipmentOf } from './selectors'
import type { Consumable, HourBucket, InspectionOps, PlantState } from './types'

/** 确定性噪声 [-1, 1]：不消耗随机数流，保证既有模拟结果可复现 */
export function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

const CONSUMABLES: Omit<Consumable, 'used' | 'lifePct'>[] = [
  { name: '激光窗口保护镜', unitCost: 0.012, lifeCount: 30000 },
  { name: '测针 / 治具探针', unitCost: 0.021, lifeCount: 15000 },
  { name: '视觉光源灯板', unitCost: 0.034, lifeCount: 24000 },
  { name: '擦拭纸与清洁剂', unitCost: 0.015, lifeCount: 5000 },
]
const USED_SEED = [0.58, 0.71, 0.49, 0.36]

function lifeOf(c: Pick<Consumable, 'used' | 'lifeCount'>): number {
  return round(Math.max(0, 100 - (c.used / c.lifeCount) * 100), 1)
}

export function initOps(hourly: HourBucket[]): InspectionOps {
  const n = hourly.length
  const total = hourly.reduce((a, h) => a + h.pass + h.fail, 0)
  const consumables = CONSUMABLES.map((c, i) => {
    const used = Math.round(c.lifeCount * USED_SEED[i])
    return { ...c, used, lifePct: lifeOf({ used, lifeCount: c.lifeCount }) }
  })
  const perPiece = consumables.reduce((a, c) => a + c.unitCost, 0)
  return {
    taktHourly: Array.from({ length: n }, (_, i) => round(13.2 + noise(i + 1) * 0.7 + (i === n - 6 || i === n - 5 ? 2.4 : 0), 1)),
    oeeHourly: Array.from({ length: n }, () => 0),
    consumableHourly: Array.from({ length: n }, (_, i) => round(perPiece * (1 + noise(i + 31) * 0.08), 3)),
    stationCycle: STATION_CYCLE_BASE.map((v, i) => round(v + noise(i + 7) * 0.15, 2)),
    audit: { sampled: Math.round(total * AUDIT_RATE), missed: SPOT_CHECK_ESCAPED, falseCall: 1 },
    repeat: [99.6, 99.4, 97.9, 98.2, 99.9],
    consumables,
    exceptions: { total: 16, closed: 14 },
  }
}

export function seedOee(state: PlantState): void {
  const base = oeeOf(equipmentOf(state, 'inspection'))
  const ops = state.inspection.ops
  ops.oeeHourly = ops.oeeHourly.map((_, i) => round(Math.min(99, base + noise(i + 53) * 2.2), 1))
}

/** 随检测推进：节拍受装配漂移影响，耗材随检测件数消耗，复核按比例抽检 */
export function stepOps(state: PlantState, units: number): void {
  const ops = state.inspection.ops
  const t = state.tick
  const drift = state.assembly.driftTicks > 0
  ops.stationCycle = ops.stationCycle.map((cur, i) => {
    const target = STATION_CYCLE_BASE[i] + (drift && (i === 1 || i === 2) ? 3.4 : 0) + noise(t * 5 + i) * 0.2
    return round(cur * 0.7 + target * 0.3, 2)
  })
  const takt = round(Math.max(...ops.stationCycle) + INSPECTION_TRANSFER_S, 1)
  const last = ops.taktHourly.length - 1
  ops.taktHourly[last] = round(ops.taktHourly[last] * 0.8 + takt * 0.2, 1)

  if (units > 0) {
    if (t % Math.round(1 / AUDIT_RATE) === 0) ops.audit.sampled += 1
    for (const c of ops.consumables) {
      c.used += units
      c.lifePct = lifeOf(c)
    }
  }
  if (drift && t % 9 === 0) ops.audit.falseCall += 1

  const perPiece = ops.consumables.reduce((a, c) => a + c.unitCost, 0)
  ops.consumableHourly[last] = round(perPiece * (1 + noise(t) * 0.05), 3)
  ops.oeeHourly[last] = round(Math.min(99, oeeOf(equipmentOf(state, 'inspection')) + noise(t + 3) * 0.8), 1)
  ops.repeat = ops.repeat.map((r, i) => round(Math.min(100, Math.max(96, r + noise(t * 3 + i) * 0.03)), 2))
}

/** 小时翻页：与检测小时桶同步滚动 */
export function rollOps(state: PlantState, window: number): void {
  const ops = state.inspection.ops
  ops.taktHourly.push(ops.taktHourly[ops.taktHourly.length - 1])
  ops.oeeHourly.push(ops.oeeHourly[ops.oeeHourly.length - 1])
  ops.consumableHourly.push(ops.consumableHourly[ops.consumableHourly.length - 1])
  for (const arr of [ops.taktHourly, ops.oeeHourly, ops.consumableHourly]) if (arr.length > window) arr.shift()
}
