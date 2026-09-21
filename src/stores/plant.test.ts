import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlantStore } from './plant'
import { AUTO_RESOLVE_RISK_TICKS, AUTO_RESOLVE_WARN_TICKS } from '@/data/sim/constants'

describe('plant store · 告警自动恢复', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('预热期间的历史告警只保留最近几条为未处理', () => {
    const plant = usePlantStore()
    expect(plant.alarms.filter((a) => a.status === 'open').length).toBeLessThanOrEqual(4)
  })

  it('超过时限的未处理告警自动标为已解决，未超时的保持原状', () => {
    const plant = usePlantStore()
    for (let i = 0; i < 400; i++) plant.tick()
    const limit = (level: string) => (level === 'risk' ? AUTO_RESOLVE_RISK_TICKS : AUTO_RESOLVE_WARN_TICKS)
    for (const a of plant.alarms) {
      if (a.status !== 'resolved') expect(plant.state.tick - a.tick).toBeLessThanOrEqual(limit(a.level))
    }
    expect(plant.unresolved.total).toBeLessThan(plant.alarms.length)
  })

  it('人工点了「处理」的告警同样会在超时后收尾，已解决的不会被改回', () => {
    const plant = usePlantStore()
    for (let i = 0; i < 30; i++) plant.tick()
    const target = plant.alarms.find((a) => a.status === 'open')
    expect(target).toBeDefined()
    plant.setAlarmStatus(target!.id, 'handling')
    for (let i = 0; i < AUTO_RESOLVE_RISK_TICKS + 5; i++) plant.tick()
    const after = plant.alarms.find((a) => a.id === target!.id)
    if (after) expect(after.status).toBe('resolved')
  })
})
