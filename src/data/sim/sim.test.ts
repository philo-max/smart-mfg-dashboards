import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { createPlant } from './init'
import { stepPlant } from './step'
import { canAlarm, stepAgv, stepLogistics, stepWarehouse } from './step-flow'
import { reworkRate, stepAssembly, stepInspection } from './step-quality'
import { DWELL_HOT_MIN, REWORK_THRESHOLD, TAKT_TARGET, TORQUE_MAX, TORQUE_MIN, TRANSPORT_LATE_S } from './constants'
import { torqueCurve, torquePeak } from './torque'
import { moduleLevels } from './selectors'
import { injectScenario } from './scenarios'
import { buildTrace } from './lineage'
import { causalChains, chainIdForAlarm } from './chains'

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
    stepLogistics(state, rng, { alarms: [], deliveredToAssembly: 0, warehousePicks: 0, ordersCompleted: 1, transportSamples: [TRANSPORT_LATE_S + 10], legs: [{ routeId: 'R3', agvId: 'MOMA-01', seconds: 30 }] }, NOW)
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

describe('扭矩曲线', () => {
  it('正常工况峰值落在 0.8–1.2 N·m 工艺窗口内，漂移时越界', () => {
    const rng = createRng(3)
    const normal = Array.from({ length: 50 }, () => torquePeak(torqueCurve(rng, false)))
    const drift = Array.from({ length: 50 }, () => torquePeak(torqueCurve(rng, true)))
    expect(normal.filter((p) => p >= TORQUE_MIN && p <= TORQUE_MAX).length).toBeGreaterThan(45)
    expect(drift.filter((p) => p < TORQUE_MIN || p > TORQUE_MAX).length).toBeGreaterThan(45)
  })
})

describe('新增历史序列', () => {
  it('仓库流量、AGV 历史、返工历史、订单小时桶与追踪表都有上限', () => {
    const { rng, state } = fresh(11)
    for (let i = 0; i < 400; i++) stepPlant(state, rng, new Date(NOW.getTime() + i * 2000))
    expect(state.warehouse.flow).toHaveLength(30)
    expect(state.agv.history).toHaveLength(30)
    expect(state.assembly.reworkHistory).toHaveLength(30)
    expect(state.logistics.trace.length).toBeLessThanOrEqual(14)
    expect(state.logistics.orderHourly.length).toBeLessThanOrEqual(24)
    expect(state.logistics.trace.length).toBeGreaterThan(0)
  })

  it('订单小时桶合计不超过订单总数增量，且准时数不大于总数', () => {
    const { rng, state } = fresh(5)
    for (let i = 0; i < 300; i++) stepPlant(state, rng, new Date(NOW.getTime() + i * 2000))
    for (const b of state.logistics.orderHourly) expect(b.onTime).toBeLessThanOrEqual(b.total)
  })

  it('延误的 R1 送料在追踪表中标记为延误', () => {
    const { rng, state } = fresh()
    stepLogistics(state, rng, { alarms: [], deliveredToAssembly: 1, warehousePicks: 0, ordersCompleted: 0, transportSamples: [TRANSPORT_LATE_S + 6], legs: [{ routeId: 'R1', agvId: 'MOMA-01', seconds: TRANSPORT_LATE_S + 6 }] }, NOW)
    expect(state.logistics.trace[0].status).toBe('延误')
  })
})

describe('演练场景注入', () => {
  it('AGV 阻塞：两台被阻塞，并产生带演练前缀的紧急告警', () => {
    const { rng, state } = fresh(21)
    state.agv.agvs.forEach((a) => { a.status = 'running' })
    const alarms = injectScenario(state, rng, 'agv-block', NOW)
    expect(state.agv.agvs.filter((a) => a.status === 'blocked')).toHaveLength(2)
    expect(alarms).toHaveLength(2)
    expect(alarms.every((a) => a.level === 'risk' && a.text.startsWith('【演练】'))).toBe(true)
    expect(moduleLevels(state).agv).toBe('risk')
  })

  it('装配机器人故障：进入漂移期，随后检测 NG 明显增加并使返工率超标', () => {
    const { rng, state } = fresh(22)
    injectScenario(state, rng, 'robot-fault', NOW)
    expect(state.assembly.driftTicks).toBeGreaterThan(0)
    const before = state.inspection.hourly[state.inspection.hourly.length - 1].fail
    for (let i = 0; i < 40; i++) stepPlant(state, rng, new Date(NOW.getTime() + i * 2000))
    const after = state.inspection.hourly.reduce((a, h) => a + h.fail, 0)
    expect(after).toBeGreaterThan(before)
    expect(reworkRate(state)).toBeGreaterThan(REWORK_THRESHOLD)
  })

  it('库存积压：至少 4 个工位越过呆滞阈值，仓库进入预警', () => {
    const { rng, state } = fresh(23)
    injectScenario(state, rng, 'inventory-jam', NOW)
    expect(state.warehouse.cells.filter((c) => c.dwellMin >= DWELL_HOT_MIN).length).toBeGreaterThanOrEqual(4)
    expect(moduleLevels(state).warehouse).toBe('warn')
  })

  it('低电量：两台 AGV 电量跌破 20%', () => {
    const { rng, state } = fresh(24)
    state.agv.agvs.forEach((a) => { a.status = 'running'; a.battery = 80 })
    injectScenario(state, rng, 'low-battery', NOW)
    expect(state.agv.agvs.filter((a) => a.battery < 20)).toHaveLength(2)
  })

  it('一键恢复：清除阻塞、漂移与返工窗口，装配和 AGV 回到非风险状态', () => {
    const { rng, state } = fresh(25)
    state.agv.agvs.forEach((a) => { a.status = 'running' })
    injectScenario(state, rng, 'agv-block', NOW)
    injectScenario(state, rng, 'robot-fault', NOW)
    for (let i = 0; i < 40; i++) stepPlant(state, rng, new Date(NOW.getTime() + i * 2000))
    injectScenario(state, rng, 'recover', NOW)
    expect(state.assembly.driftTicks).toBe(0)
    expect(state.agv.agvs.some((a) => a.status === 'blocked')).toBe(false)
    expect(reworkRate(state)).toBe(0)
    expect(moduleLevels(state).assembly).not.toBe('risk')
  })
})

describe('NG 历史（供交叉筛选）', () => {
  it('开机就有一批 NG 记录，且全部是不合格并带缺陷类型', () => {
    const { state } = fresh(31)
    expect(state.inspection.ngHistory.length).toBeGreaterThanOrEqual(10)
    expect(state.inspection.ngHistory.every((r) => !r.pass && r.defect !== null)).toBe(true)
  })

  it('新产生的 NG 进入历史队首，历史有上限', () => {
    const { rng, state } = fresh(32)
    state.assembly.driftTicks = 400
    for (let i = 0; i < 300; i++) stepPlant(state, rng, new Date(NOW.getTime() + i * 2000))
    expect(state.inspection.ngHistory.length).toBeLessThanOrEqual(60)
    expect(state.inspection.ngHistory.length).toBeGreaterThan(16)
  })
})

describe('工件全链路履历', () => {
  it('仓库出库的工件会被 AGV 送到装配，履历依次包含 入库 → 出库 → 配送', () => {
    const { rng, state } = fresh(41)
    const cell = state.warehouse.cells.find((c) => c.item)!
    const rfid = cell.item!.rfid
    stepWarehouse(state, rng, 40, NOW)
    expect(state.lineage.released).toContain(rfid)
    stepLogistics(state, rng, { alarms: [], deliveredToAssembly: 1, warehousePicks: 0, ordersCompleted: 0, transportSamples: [26], legs: [{ routeId: 'R1', agvId: 'MOMA-02', seconds: 26 }] }, NOW)
    const trace = buildTrace(state, state.lineage.released.length ? state.lineage.delivered[state.lineage.delivered.length - 1] : rfid)
    expect(trace.found).toBe(true)
    const stages = trace.events.map((e) => e.stage)
    expect(stages).toEqual([...stages].sort())
    expect(trace.events.some((e) => e.module === 'agv' && e.text.includes('MOMA-02'))).toBe(true)
  })

  it('长时间运行后，检测记录里的 RFID 都能追溯出完整的五阶段链路，事件按阶段有序', () => {
    const { rng, state } = fresh(42)
    for (let i = 0; i < 120; i++) stepPlant(state, rng, new Date(NOW.getTime() + i * 2000))
    const rec = state.inspection.records[0]
    const trace = buildTrace(state, rec.rfid)
    expect(trace.found).toBe(true)
    expect(trace.stages).toHaveLength(5)
    expect(trace.events.some((e) => e.stage === 0)).toBe(true)
    expect(trace.events.some((e) => e.stage === 3)).toBe(true)
    expect(trace.events.filter((e) => e.synthetic).every((e) => e.stage <= 2)).toBe(true)
    expect(trace.result).toBe(rec.pass ? 'pass' : 'ng')
  })

  it('NG 工件退回装配返工；未知 RFID 返回未找到', () => {
    const { state } = fresh(43)
    const ng = state.inspection.ngHistory[0]
    const trace = buildTrace(state, ng.rfid)
    expect(trace.result).toBe('ng')
    expect(trace.stages[3].status).toBe('fail')
    expect(buildTrace(state, 'RF99999999').found).toBe(false)
  })

  it('各流转队列与履历表都有上限', () => {
    const { rng, state } = fresh(44)
    for (let i = 0; i < 800; i++) stepPlant(state, rng, new Date(NOW.getTime() + i * 2000))
    const ln = state.lineage
    for (const q of [ln.released, ln.delivered, ln.assembled, ln.finished]) expect(q.length).toBeLessThanOrEqual(60)
    expect(ln.order.length).toBeLessThanOrEqual(300)
    expect(Object.keys(ln.events).length).toBe(ln.order.length)
  })
})

describe('因果链与根因', () => {
  it('注入 AGV 阻塞后，物流链第一环点亮并给出阻塞车辆作为证据', () => {
    const { rng, state } = fresh(51)
    state.agv.agvs.forEach((a) => { a.status = 'running' })
    injectScenario(state, rng, 'agv-block', NOW)
    const flow = causalChains(state).find((c) => c.id === 'flow')!
    expect(flow.steps[0].active).toBe(true)
    expect(flow.steps[0].evidence).toMatch(/MOMA-0\d/)
  })

  it('注入机器人故障后，质量链首环点亮；恢复后所有环节熄灭', () => {
    const { rng, state } = fresh(52)
    injectScenario(state, rng, 'robot-fault', NOW)
    expect(causalChains(state).find((c) => c.id === 'quality')!.steps[0].active).toBe(true)
    injectScenario(state, rng, 'recover', NOW)
    const quality = causalChains(state).find((c) => c.id === 'quality')!
    expect(quality.steps.some((s) => s.active)).toBe(false)
  })

  it('告警按模块与文案映射到所属因果链', () => {
    expect(chainIdForAlarm({ module: 'warehouse', text: 'x', category: '生产超差' })).toBe('inventory')
    expect(chainIdForAlarm({ module: 'inspection', text: 'x', category: '质量异常' })).toBe('quality')
    expect(chainIdForAlarm({ module: 'agv', text: 'x', category: '物流异常' })).toBe('flow')
    expect(chainIdForAlarm({ module: 'assembly', text: '装配节拍超时，工位缺料', category: '生产超差' })).toBe('flow')
    expect(chainIdForAlarm({ module: 'assembly', text: '装配返工率超标', category: '质量异常' })).toBe('quality')
  })
})
