import type { InspectionMetrics, Metric } from '@/data/sim/metrics'
import type { Level } from '@/data/sim/types'

export function targetText(m: Metric): string {
  return `目标 ${m.goal === 'max' ? '≥' : '≤'} ${m.target}${m.unit === '%' ? '%' : ` ${m.unit}`}`
}

export function statusText(m: Metric): string {
  return m.level === 'normal' ? '达标' : m.level === 'warn' ? '预警' : '超标'
}

export interface MetricRow {
  group: string
  name: string
  value: string
  target: string
  status: string
  level: Level
}

const LAYOUT: { group: string; key: Exclude<keyof InspectionMetrics, 'basis'>; name: string }[] = [
  { group: '检测效率', key: 'takt', name: '检测线节拍时间' },
  { group: '检测效率', key: 'completion', name: '检测完成率' },
  { group: '检测效率', key: 'perCapita', name: '人均检测量' },
  { group: '检测质量', key: 'accuracy', name: '检测准确率' },
  { group: '检测质量', key: 'detect', name: '不良品检出率' },
  { group: '检测质量', key: 'repeat', name: '检测重复性' },
  { group: '资源消耗', key: 'oee', name: '检测设备 OEE' },
  { group: '资源消耗', key: 'consumable', name: '检测耗材单耗' },
  { group: '异常处理', key: 'response', name: '检测异常响应时间' },
  { group: '异常处理', key: 'closure', name: '检测异常闭环率' },
]

/** 四类十项指标的表格行，日报与明细共用 */
export function metricRows(m: InspectionMetrics): MetricRow[] {
  return LAYOUT.map(({ group, key, name }) => ({
    group,
    name,
    value: `${m[key].value}${m[key].unit === '%' ? '%' : ` ${m[key].unit}`}`,
    target: targetText(m[key]),
    status: statusText(m[key]),
    level: m[key].level,
  }))
}
