import { describe, expect, it } from 'vitest'
import { CYCLE_TICKS, PROCESS_STEPS, processSnapshot } from './processSim'

const OK_RECORD = { time: '', id: '', rfid: '', positions: [true, true, true, true, true], result: 'OK', pass: true, defect: null }
const NG_RECORD = { ...OK_RECORD, pass: false, positions: [true, true, false, true, true], defect: '外观划痕' }

describe('processSnapshot · 检测流程链', () => {
  it('一个周期内依次走完五个环节', () => {
    const seen = new Set<number>()
    for (let t = 0; t < CYCLE_TICKS; t++) seen.add(processSnapshot(t, OK_RECORD, 0, 0).stepIndex)
    expect([...seen].sort()).toEqual(PROCESS_STEPS.map((_, i) => i))
  })

  it('核对 NG 时分拣去向为 B 区，核对环节标记失败', () => {
    const snap = processSnapshot(CYCLE_TICKS - 1, NG_RECORD, 10, 2)
    expect(snap.sort.target).toBe('B 区')
    expect(snap.steps[3].state).toBe('fail')
  })

  it('定位失败时流程暂停且到位灯为超时', () => {
    const failCycleTick = 16 * CYCLE_TICKS + 4
    const snap = processSnapshot(failCycleTick, OK_RECORD, 0, 0)
    expect(snap.halted).toBe(true)
    expect(snap.ready).toBe('timeout')
    expect(snap.steps[0].state).toBe('fail')
    expect(snap.verdict).toBeNull()
  })

  it('同一 tick 输出稳定', () => {
    expect(processSnapshot(37, OK_RECORD, 5, 1)).toEqual(processSnapshot(37, OK_RECORD, 5, 1))
  })
})
