import { INSPECTION_OPERATORS, INSPECTION_PLAN_PER_HOUR, INSPECTION_TRANSFER_S, OEE_WARN, TAKT_TARGET, TICK_SECONDS } from './constants'
import { round } from './rng'
import { equipmentOf, inspectionTotals, oeeOf } from './selectors'
import type { Level, PlantAlarm, PlantState } from './types'

export interface Metric {
  value: number
  unit: string
  /** 目标值；goal 表示越大越好（max）还是越小越好（min） */
  target: number
  goal: 'max' | 'min'
  level: Level
}

export interface OeeMetric extends Metric {
  availability: number
  performance: number
  quality: number
  /** 三类损失（百分点），与 OEE 之和为 100 */
  loss: { downtime: number; speed: number; quality: number }
}

function metric(value: number, unit: string, target: number, goal: 'max' | 'min', warnAt: number = target, riskAt?: number): Metric {
  const bad = (limit: number) => (goal === 'max' ? value < limit : value > limit)
  const level: Level = riskAt !== undefined && bad(riskAt) ? 'risk' : bad(warnAt) ? 'warn' : 'normal'
  return { value, unit, target, goal, level }
}

function mean(list: number[]): number {
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0
}

/** 检测单元「四类十项」指标：检测效率 / 检测质量 / 资源消耗 / 异常处理 */
export function inspectionMetrics(state: PlantState, alarms: PlantAlarm[]) {
  const ins = state.inspection
  const ops = ins.ops
  const totals = inspectionTotals(state)
  /** 当前小时仍在累计，不与整点计划比较：只统计已完成的整点小时 */
  const done = ins.hourly.slice(0, -1)
  const hours = done.length
  const doneTotal = done.reduce((a, h) => a + h.pass + h.fail, 0)
  const mine = alarms.filter((a) => a.module === 'inspection')

  const takt = round(Math.max(...ops.stationCycle) + INSPECTION_TRANSFER_S, 1)
  const completion = round((doneTotal / (INSPECTION_PLAN_PER_HOUR * hours)) * 100, 1)
  const perCapita = round(doneTotal / hours / INSPECTION_OPERATORS, 1)

  const a = ops.audit
  const accuracy = round((1 - (a.missed + a.falseCall) / a.sampled) * 100, 2)
  const repeat = round(mean(ops.repeat), 2)

  const eq = equipmentOf(state, 'inspection')
  const oeeValue = oeeOf(eq)
  const oee: OeeMetric = {
    ...metric(oeeValue, '%', 85, 'max', OEE_WARN),
    availability: round(eq.availability * 100, 1),
    performance: round(eq.performance * 100, 1),
    quality: round(eq.quality * 100, 1),
    loss: {
      downtime: round((1 - eq.availability) * 100, 1),
      speed: round(eq.availability * (1 - eq.performance) * 100, 1),
      quality: round(eq.availability * eq.performance * (1 - eq.quality) * 100, 1),
    },
  }
  const consumable = round(ops.consumables.reduce((s, c) => s + c.unitCost, 0), 3)

  const acked = mine.filter((x) => x.ackTick !== undefined).map((x) => ((x.ackTick as number) - x.tick) * TICK_SECONDS / 60)
  const response = round(mean([...ins.mttr.map((r) => r.respondMin), ...acked]), 1)
  const total = ops.exceptions.total + mine.length
  const closed = ops.exceptions.closed + mine.filter((x) => x.status === 'resolved').length
  const closure = round((closed / total) * 100, 1)

  return {
    basis: { hours, total: doneTotal, plan: INSPECTION_PLAN_PER_HOUR * hours },
    takt: metric(takt, 's', TAKT_TARGET, 'min', TAKT_TARGET * 0.9, TAKT_TARGET),
    completion: metric(completion, '%', 95, 'max'),
    perCapita: metric(perCapita, '件/人·h', 45, 'max'),
    accuracy: metric(accuracy, '%', 98, 'max'),
    detect: metric(totals.detect, '%', 95, 'max'),
    repeat: metric(repeat, '%', 98, 'max'),
    oee,
    consumable: metric(consumable, '元/件', 0.09, 'min'),
    response: metric(response, 'min', 5, 'min'),
    closure: metric(closure, '%', 90, 'max'),
  }
}

export type InspectionMetrics = ReturnType<typeof inspectionMetrics>
