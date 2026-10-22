import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { createPlant } from './init'
import { stepPlant } from './step'
import { injectScenario } from './scenarios'
import { inspectionMetrics } from './metrics'
import { inspectionTotals, oeeOf, equipmentOf } from './selectors'
import { INSPECTION_PLAN_PER_HOUR, INSPECTION_TRANSFER_S, INSPECTION_OPERATORS, TAKT_TARGET } from './constants'
import type { PlantAlarm } from './types'

const NOW = new Date('2026-09-21T10:30:00')

function fresh(seed = 1) {
  const rng = createRng(seed)
  return { rng, state: createPlant(rng, NOW) }
}

function alarm(id: number, status: PlantAlarm['status'], extra: Partial<PlantAlarm> = {}): PlantAlarm {
  return { id, module: 'inspection', level: 'warn', category: '质量异常', status, text: 't', time: '10:00:00', tick: 10, ...extra }
}

describe('检测单元指标体系（四类十项）', () => {
  it('初始节拍 = 瓶颈检测位耗时 + 转运，且不拖产线节拍', () => {
    const { state } = fresh()
    const m = inspectionMetrics(state, [])
    expect(m.takt.value).toBeCloseTo(Math.max(...state.inspection.ops.stationCycle) + INSPECTION_TRANSFER_S, 1)
    expect(m.takt.value).toBeLessThan(TAKT_TARGET)
    expect(m.takt.level).toBe('normal')
  })

  it('完成率 = 已完成整点小时的检测数 ÷ 计划数，不含仍在累计的当前小时', () => {
    const { state } = fresh()
    const done = state.inspection.hourly.slice(0, -1)
    const total = done.reduce((a, h) => a + h.pass + h.fail, 0)
    const m = inspectionMetrics(state, [])
    expect(m.completion.value).toBeCloseTo((total / (INSPECTION_PLAN_PER_HOUR * done.length)) * 100, 1)
  })

  it('人均检测量 = 已完成整点小时的检测数 ÷ 小时数 ÷ 在岗人数', () => {
    const { state } = fresh()
    const done = state.inspection.hourly.slice(0, -1)
    const total = done.reduce((a, h) => a + h.pass + h.fail, 0)
    const m = inspectionMetrics(state, [])
    expect(m.perCapita.value).toBeCloseTo(total / done.length / INSPECTION_OPERATORS, 1)
  })

  it('检测准确率 = 1 − (漏检 + 误判) ÷ 抽检数；检出率沿用既有口径', () => {
    const { state } = fresh()
    const a = state.inspection.ops.audit
    const m = inspectionMetrics(state, [])
    expect(m.accuracy.value).toBeCloseTo((1 - (a.missed + a.falseCall) / a.sampled) * 100, 2)
    expect(m.detect.value).toBe(inspectionTotals(state).detect)
  })

  it('重复性取五个检测位判定一致率的均值', () => {
    const { state } = fresh()
    const r = state.inspection.ops.repeat
    expect(r).toHaveLength(5)
    expect(inspectionMetrics(state, []).repeat.value).toBeCloseTo(r.reduce((x, y) => x + y, 0) / 5, 2)
  })

  it('设备 OEE 与既有 OEE 口径一致，并拆出三类损失', () => {
    const { state } = fresh()
    const m = inspectionMetrics(state, [])
    const eq = equipmentOf(state, 'inspection')
    expect(m.oee.value).toBe(oeeOf(eq))
    expect(m.oee.loss.downtime + m.oee.loss.speed + m.oee.loss.quality).toBeCloseTo(100 - m.oee.value, 0)
  })

  it('耗材单耗 = 各耗材单件成本之和', () => {
    const { state } = fresh()
    const sum = state.inspection.ops.consumables.reduce((a, c) => a + c.unitCost, 0)
    expect(inspectionMetrics(state, []).consumable.value).toBeCloseTo(sum, 3)
  })

  it('闭环率把历史基数与本次告警合并计算', () => {
    const { state } = fresh()
    const base = state.inspection.ops.exceptions
    const m0 = inspectionMetrics(state, [])
    expect(m0.closure.value).toBeCloseTo((base.closed / base.total) * 100, 1)
    const m1 = inspectionMetrics(state, [alarm(1, 'resolved'), alarm(2, 'open')])
    expect(m1.closure.value).toBeCloseTo(((base.closed + 1) / (base.total + 2)) * 100, 1)
  })

  it('响应时间取已确认告警的发现到处理耗时，与历史记录合并', () => {
    const { state } = fresh()
    const hist = state.inspection.mttr.map((r) => r.respondMin)
    const m0 = inspectionMetrics(state, [])
    expect(m0.response.value).toBeCloseTo(hist.reduce((x, y) => x + y, 0) / hist.length, 1)
    const m1 = inspectionMetrics(state, [alarm(1, 'handling', { tick: 10, ackTick: 40 })])
    expect(m1.response.value).not.toBe(m0.response.value)
  })

  it('其他模块的告警不计入检测单元', () => {
    const { state } = fresh()
    const m0 = inspectionMetrics(state, [])
    const m1 = inspectionMetrics(state, [alarm(1, 'resolved', { module: 'agv' })])
    expect(m1.closure.value).toBe(m0.closure.value)
  })
})

describe('检测指标随产线联动', () => {
  it('装配机器人故障使检测位耗时上升，节拍随之变长', () => {
    const { rng, state } = fresh()
    const before = inspectionMetrics(state, []).takt.value
    injectScenario(state, rng, 'robot-fault', NOW)
    for (let i = 0; i < 40; i++) stepPlant(state, rng, new Date(NOW.getTime() + i * 2000))
    expect(inspectionMetrics(state, []).takt.value).toBeGreaterThan(before)
  })

  it('每小时序列与小时桶保持等长', () => {
    const { rng, state } = fresh()
    for (let i = 0; i < 30; i++) stepPlant(state, rng, new Date(NOW.getTime() + i * 2000))
    const n = state.inspection.hourly.length
    expect(state.inspection.ops.taktHourly).toHaveLength(n)
    expect(state.inspection.ops.oeeHourly).toHaveLength(n)
    expect(state.inspection.ops.consumableHourly).toHaveLength(n)
  })

  it('推进后耗材使用量增加、剩余寿命下降', () => {
    const { rng, state } = fresh()
    const life0 = state.inspection.ops.consumables[0].lifePct
    for (let i = 0; i < 60; i++) stepPlant(state, rng, new Date(NOW.getTime() + i * 2000))
    expect(state.inspection.ops.consumables[0].lifePct).toBeLessThan(life0)
  })
})
