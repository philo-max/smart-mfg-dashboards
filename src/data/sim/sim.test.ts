import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { createPlant } from './init'
import { stepPlant } from './step'
import { canAlarm, stepAgv, stepLogistics, stepWarehouse } from './step-flow'
import { reworkRate, stepAssembly, stepInspection } from './step-quality'
import { DWELL_HOT_MIN, REWORK_THRESHOLD, TAKT_TARGET, TRANSPORT_LATE_S } from './constants'
import { moduleLevels } from './selectors'

const NOW = new Date('2026-09-21T10:30:00')

function fresh(seed = 1) {
  const rng = createRng(seed)
  return { rng, state: createPlant(rng, NOW) }
}

describe('rng', () => {
  it('同一种子产生相同序列', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()])
  })
})

describe('createPlant', () => {
  it('按真实产线结构建模：12 个仓库工位、4 台 MOMA、5 个检测位', () => {
    const { state } = fresh()
    expect(state.warehouse.cells).toHaveLength(12)
    expect(state.agv.agvs).toHaveLength(4)
    expect(state.inspection.stations).toHaveLength(5)
    expect(state.inspection.hourly).toHaveLength(24)
  })
})

describe('canAlarm', () => {
  it('冷却期内同一告警只触发一次', () => {
    const { state } = fresh()
    expect(canAlarm(state, 'k', 5)).toBe(true)
    expect(canAlarm(state, 'k', 5)).toBe(false)
    state.tick += 5
    expect(canAlarm(state, 'k', 5)).toBe(true)
  })
})

describe('联动链 1：AGV 阻塞 → 装配缺料', () => {
  it('有 AGV 阻塞且无送料时，节拍持续拉长并触发超时告警', () => {
    const { rng, state } = fresh()
    state.assembly.taktElapsed = 0
    const alarms = []
    for (let i = 0; i < 20; i++) {
      state.tick += 1
      alarms.push(...stepAssembly(state, rng, 0, 1).alarms)
    }
    expect(state.assembly.taktElapsed).toBeGreaterThan(TAKT_TARGET)
    expect(alarms.some((a) => a.module === 'assembly' && a.category === '生产超差')).toBe(true)
  })

  it('无阻塞时节拍按周期复位', () => {
    const { rng, state } = fresh()
    for (let i = 0; i < 30; i++) stepAssembly(state, rng, 1, 0)
    expect(state.assembly.taktElapsed).toBeLessThanOrEqual(TAKT_TARGET)
  })

  it('运输耗时超过红线的订单不计入准时', () => {
    const { rng, state } = fresh()
    const onTime = state.logistics.ordersOnTime
    const total = state.logistics.ordersTotal
    stepLogistics(state, rng, { alarms: [], deliveredToAssembly: 0, warehousePicks: 0, ordersCompleted: 1, transportSamples: [TRANSPORT_LATE_S + 10] }, NOW)
    expect(state.logistics.ordersTotal).toBe(total + 1)
    expect(state.logistics.ordersOnTime).toBe(onTime)
  })
})

describe('联动链 2：质量漂移 → 检测 NG → 装配返工', () => {
  it('每件检测 NG 都计入装配返工，合格 + 返工 = 产出', () => {
    const { rng, state } = fresh()
    state.assembly.driftTicks = 50
    for (let i = 0; i < 60; i++) {
      state.tick += 1
      const { units } = stepAssembly(state, rng, 1, 0)
      stepInspection(state, rng, units, NOW)
    }
    const asm = state.assembly
    expect(asm.qualified + asm.rework).toBe(asm.produced)
    expect(reworkRate(state)).toBeGreaterThan(REWORK_THRESHOLD)
  })

  it('返工率超标时装配模块为 risk 并产生质量告警', () => {
    const { rng, state } = fresh()
    state.assembly.recent = state.assembly.recent.map((_, i) => (i < 10 ? 1 : 0))
    const { alarms } = stepInspection(state, rng, 1, NOW)
    expect(moduleLevels(state).assembly).toBe('risk')
    expect(alarms.some((a) => a.module === 'assembly' && a.level === 'risk')).toBe(true)
  })
})

describe('联动链 3：仓库', () => {
  it('停留时长跨过呆滞阈值时告警，并带上工位焦点', () => {
    const { rng, state } = fresh()
    const cell = state.warehouse.cells[0]
    cell.item = { rfid: 'RF1', name: '键盘模组', batch: 'B', inAt: '10:00:00' }
    cell.material = 'A'
    cell.dwellMin = DWELL_HOT_MIN - 0.1
    const alarms = stepWarehouse(state, rng, 0, NOW)
    expect(alarms.find((a) => a.focus === cell.id)).toBeDefined()
  })

  it('AGV 送料任务从仓库拉料出库', () => {
    const { rng, state } = fresh()
    const out = state.warehouse.outboundToday
    const filled = state.warehouse.cells.filter((c) => c.item).length
    stepWarehouse(state, rng, 1, NOW)
    expect(state.warehouse.outboundToday).toBe(out + 1)
    expect(state.warehouse.cells.filter((c) => c.item).length).toBeLessThanOrEqual(filled)
  })
})

describe('AGV', () => {
  it('完成 R1 送料时向装配交付并产生运输时间样本', () => {
    const { state } = fresh()
    const agv = state.agv.agvs[0]
    Object.assign(agv, { status: 'running', routeId: 'R1', progress: 0.999, speed: 0.1, legTicks: 11, battery: 80 })
    state.agv.agvs.slice(1).forEach((a) => { a.status = 'charging'; a.battery = 0 })
    const res = stepAgv(state, createRng(99))
    expect(res.deliveredToAssembly).toBe(1)
    expect(res.transportSamples).toEqual([24])
    expect(agv.routeId).toBe('R2')
  })
})

describe('stepPlant', () => {
  it('长时间运行保持不变量', () => {
    const { rng, state } = fresh(7)
    const drafts = []
    for (let i = 0; i < 600; i++) drafts.push(...stepPlant(state, rng, new Date(NOW.getTime() + i * 2000)))
    const asm = state.assembly
    expect(asm.qualified + asm.rework).toBe(asm.produced)
    expect(state.inspection.hourly.length).toBeLessThanOrEqual(24)
    expect(state.logistics.transport.length).toBeLessThanOrEqual(30)
    expect(state.inspection.records.length).toBeLessThanOrEqual(40)
    expect(state.agv.tasksDone).toBeLessThanOrEqual(state.agv.tasksTotal)
    expect(drafts.length).toBeGreaterThan(0)
    expect(drafts.every((d) => d.category && d.module)).toBe(true)
  })
})
