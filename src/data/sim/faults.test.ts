import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { createPlant } from './init'
import { injectScenario } from './scenarios'
import { FAULT_BASELINE, FAULT_DAY_LABELS, FAULT_TYPES, faultDistribution, faultWeekly, tallyFault, typeOfCode } from './faults'

const NOW = new Date('2026-09-21T10:30:00')

function fresh() {
  const rng = createRng(1)
  return { rng, state: createPlant(rng, NOW) }
}

describe('故障分布', () => {
  it('初始只有《数据准备》基线，8 类合计 36 次且无「其他」', () => {
    const { state } = fresh()
    const rows = faultDistribution(state)
    expect(rows.map((r) => r.name)).toEqual(FAULT_TYPES.map((t) => t.name))
    expect(rows.map((r) => r.total)).toEqual(FAULT_TYPES.map((t) => FAULT_BASELINE[t.key]))
    expect(rows.reduce((s, r) => s + r.total, 0)).toBe(36)
    expect(rows.reduce((s, r) => s + r.percent, 0)).toBeCloseTo(100, 0)
  })

  it('故障码按类型累计到基线之上', () => {
    const { state } = fresh()
    tallyFault(state, 'Alarm_Servo')
    tallyFault(state, 'Alarm_Servo')
    const servo = faultDistribution(state).find((r) => r.key === 'servo')!
    expect(servo.live).toBe(2)
    expect(servo.total).toBe(FAULT_BASELINE.servo + 2)
  })

  it('不在 8 类里的故障码归入「其他故障」', () => {
    const { state } = fresh()
    expect(typeOfCode('Alarm_Robot').key).toBe('other')
    injectScenario(state, createRng(2), 'robot-fault', NOW)
    const other = faultDistribution(state).find((r) => r.key === 'other')
    expect(other?.live).toBe(1)
  })

  it('近 5 日趋势最后一天等于当日实时合计，历史值非负', () => {
    const { state } = fresh()
    tallyFault(state, 'Alarm_Transport')
    const weekly = faultWeekly(state)
    const transport = weekly.find((w) => w.key === 'transport')!
    expect(transport.values).toHaveLength(FAULT_DAY_LABELS.length)
    expect(transport.values.at(-1)).toBe(FAULT_BASELINE.transport + 1)
    expect(weekly.every((w) => w.values.every((v) => v >= 0))).toBe(true)
  })
})
