import { describe, expect, it } from 'vitest'
import { createRng } from '@/data/sim/rng'
import { createPlant } from '@/data/sim/init'
import { inspectionMetrics } from '@/data/sim/metrics'
import { buildReport } from './buildReport'
import { metricRows } from './metricText'

const NOW = new Date('2026-09-21T10:30:00')

function fresh() {
  return createPlant(createRng(1), NOW)
}

describe('检测日报 · 四类十项指标', () => {
  it('指标表固定为 4 类共 10 项，顺序与业务分类一致', () => {
    const rows = metricRows(inspectionMetrics(fresh(), []))
    expect(rows).toHaveLength(10)
    expect([...new Set(rows.map((r) => r.group))]).toEqual(['检测效率', '检测质量', '资源消耗', '异常处理'])
    expect(rows.map((r) => r.name)).toContain('检测设备 OEE')
  })

  it('日报第一节是核心指标，结论点名未达标的指标', () => {
    const state = fresh()
    const report = buildReport(state, [], NOW)
    expect(report.sections[0].title).toBe('核心指标（四类十项）')
    expect(report.sections[0].rows).toHaveLength(10)
    const bad = metricRows(inspectionMetrics(state, [])).filter((r) => r.level !== 'normal')
    for (const r of bad) expect(report.conclusion).toContain(r.name)
  })

  it('异常闭环记录带响应时间列', () => {
    const report = buildReport(fresh(), [], NOW)
    const sec = report.sections.find((s) => s.title === '异常闭环记录')!
    expect(sec.head).toContain('响应(分钟)')
    expect(sec.rows[0]).toHaveLength(sec.head.length)
  })
})
