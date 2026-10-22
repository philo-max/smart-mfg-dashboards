import type { EChartsOption } from 'echarts'
import { C, areaFade, catAxis, fade, legend, tooltip, valAxis } from '@/components/charts/theme'
import { INSPECTION_PLAN_PER_HOUR, INSPECTION_STATIONS, INSPECTION_TRANSFER_S, OEE_WARN } from '@/data/sim/constants'
import type { HourBucket, MttrAlarm } from '@/data/sim/types'

const labels = (list: HourBucket[]) => list.map((h) => h.label)
const markLine = (value: number, text: string, color: string) => ({
  symbol: 'none', silent: true, lineStyle: { color, type: 'dashed' as const }, label: { color, formatter: text, position: 'insideEndTop' as const }, data: [{ yAxis: value }],
})

/** 检测线节拍趋势：与产线节拍目标对照，超线即拖慢产线 */
export function taktTrendOption(hourly: HourBucket[], takt: number[], target: number): EChartsOption {
  const max = Math.max(target + 4, ...takt) + 1
  return {
    tooltip: { ...tooltip, valueFormatter: (v) => `${v} s` }, legend,
    grid: { left: 48, right: 24, top: 40, bottom: 26 },
    xAxis: catAxis(labels(hourly)),
    yAxis: valAxis({ name: '节拍 s', min: 8, max }),
    series: [{
      name: '检测线节拍', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
      data: takt.map((v) => (v > target * 0.9 ? { value: v, itemStyle: { color: C.warn }, symbolSize: 9 } : v)),
      lineStyle: { color: C.room.inspection, width: 2.5 }, itemStyle: { color: C.room.inspection }, areaStyle: { color: areaFade(C.room.inspection) },
      markLine: markLine(target, `产线节拍目标 ${target}s`, C.highlight),
    }],
  }
}

/** 各检测位耗时：找出瓶颈位；节拍预算 = 产线节拍目标 − 转运 */
export function stationCycleOption(cycle: number[], target: number): EChartsOption {
  const budget = target - INSPECTION_TRANSFER_S
  const worst = Math.max(...cycle)
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => `${v} s` },
    grid: { left: 112, right: 56, top: 30, bottom: 22 },
    xAxis: valAxis({ min: 0, max: Math.max(budget + 2, worst + 2) }),
    yAxis: catAxis(INSPECTION_STATIONS.map((s) => `${s.name} ${s.method}`), { inverse: true, axisLine: { show: false }, axisLabel: { color: C.text, fontSize: 12 } }),
    series: [{
      type: 'bar', barWidth: 16, showBackground: true, backgroundStyle: { color: 'rgba(127,200,255,0.06)', borderRadius: 6 },
      label: { show: true, position: 'right', color: C.text, formatter: '{c}s' },
      data: cycle.map((v) => ({ value: v, itemStyle: { color: v === worst ? C.warn : C.room.inspection, borderRadius: 6 } })),
      markLine: { symbol: 'none', silent: true, lineStyle: { color: C.highlight, type: 'dashed' }, label: { color: C.highlight, fontSize: 12, formatter: `预算 ${budget}s`, position: 'start' }, data: [{ xAxis: budget }] },
    }],
  }
}

/** 计划 vs 实际：柱为实际检测数，虚线为每小时计划 */
export function planActualOption(all: HourBucket[]): EChartsOption {
  const hourly = all.slice(0, -1)
  const total = hourly.map((h) => h.pass + h.fail)
  return {
    tooltip: { ...tooltip }, legend,
    grid: { left: 48, right: 24, top: 40, bottom: 26 },
    xAxis: catAxis(labels(hourly)),
    yAxis: valAxis({ name: '件 / 小时', min: 0 }),
    series: [{
      name: '实际检测数', type: 'bar', barWidth: '46%', data: total.map((v) => (v < INSPECTION_PLAN_PER_HOUR * 0.9 ? { value: v, itemStyle: { color: fade(C.warn) } } : v)),
      itemStyle: { color: fade(C.room.inspection), borderRadius: [3, 3, 0, 0] },
      markLine: markLine(INSPECTION_PLAN_PER_HOUR, `计划 ${INSPECTION_PLAN_PER_HOUR} 件/小时`, C.highlight),
    }],
  }
}

/** OEE 损失构成：运行有效部分 + 三类损失，合计 100% */
export function oeeLossOption(oee: number, loss: { downtime: number; speed: number; quality: number }): EChartsOption {
  const items = [
    { name: 'OEE（有效运行）', value: oee, color: C.pos },
    { name: '停机损失', value: loss.downtime, color: C.risk },
    { name: '速度损失', value: loss.speed, color: C.warn },
    { name: '质量损失', value: loss.quality, color: C.room.logistics },
  ]
  return {
    tooltip: { ...tooltip, trigger: 'item', valueFormatter: (v) => `${v}%` }, legend: { ...legend, bottom: 0, top: 'auto' },
    grid: { left: 12, right: 12, top: 18, bottom: 40 },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: { type: 'category', data: ['时间构成'], show: false },
    series: items.map((it) => ({
      name: it.name, type: 'bar', stack: 'total', barWidth: 64, data: [it.value], itemStyle: { color: it.color },
      label: { show: it.value >= 3, color: '#08101c', fontWeight: 700, formatter: `${it.value}%` },
    })),
  }
}

export function oeeTrendOption(hourly: HourBucket[], oee: number[]): EChartsOption {
  return {
    tooltip: { ...tooltip, valueFormatter: (v) => `${v}%` }, legend,
    grid: { left: 48, right: 24, top: 40, bottom: 26 },
    xAxis: catAxis(labels(hourly)),
    yAxis: valAxis({ name: 'OEE %', min: 60, max: 100 }),
    series: [{
      name: '设备 OEE', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: oee,
      lineStyle: { color: C.pos, width: 2.5 }, itemStyle: { color: C.pos }, areaStyle: { color: areaFade(C.pos) },
      markLine: markLine(OEE_WARN, `预警线 ${OEE_WARN}%`, C.warn),
    }],
  }
}

export function consumableTrendOption(hourly: HourBucket[], cost: number[], target: number): EChartsOption {
  return {
    tooltip: { ...tooltip, valueFormatter: (v) => `${v} 元/件` }, legend,
    grid: { left: 56, right: 24, top: 40, bottom: 26 },
    xAxis: catAxis(labels(hourly)),
    yAxis: valAxis({ name: '元/件', min: 0.05, max: Math.max(target + 0.02, ...cost) + 0.01 }),
    series: [{
      name: '耗材单耗', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, data: cost,
      lineStyle: { color: C.room.warehouse, width: 2.5 }, itemStyle: { color: C.room.warehouse }, areaStyle: { color: areaFade(C.room.warehouse) },
      markLine: markLine(target, `目标 ≤ ${target}`, C.highlight),
    }],
  }
}

/** 检测重复性：同一标准件重复检测 30 次，判定一致率 */
export function repeatOption(repeat: number[], target: number): EChartsOption {
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => `${v}%` },
    grid: { left: 70, right: 50, top: 30, bottom: 22 },
    xAxis: { type: 'value', min: 96, max: 100, axisLabel: { color: C.dim, fontSize: 11 }, splitLine: { lineStyle: { color: C.grid } } },
    yAxis: catAxis(INSPECTION_STATIONS.map((s) => s.name), { inverse: true, axisLine: { show: false }, axisLabel: { color: C.text, fontSize: 12 } }),
    series: [{
      type: 'bar', barWidth: 14, showBackground: true, backgroundStyle: { color: 'rgba(127,200,255,0.06)', borderRadius: 6 },
      label: { show: true, position: 'right', color: C.text, formatter: '{c}%' },
      data: repeat.map((v) => ({ value: v, itemStyle: { color: v < target ? C.warn : C.pos, borderRadius: 6 } })),
      markLine: { symbol: 'none', silent: true, lineStyle: { color: C.highlight, type: 'dashed' }, label: { color: C.highlight, fontSize: 12, formatter: `目标 ${target}%`, position: 'start' }, data: [{ xAxis: target }] },
    }],
  }
}

/** 历史异常的响应 + 处理耗时（分钟），叠加后即闭环总时长 */
export function closureOption(list: MttrAlarm[]): EChartsOption {
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => `${v} min` }, legend,
    grid: { left: 48, right: 24, top: 40, bottom: 26 },
    xAxis: catAxis(list.map((r) => `${r.time} ${r.station}`)),
    yAxis: valAxis({ name: '分钟' }),
    series: [
      { name: '响应（发现→开始处理）', type: 'bar', stack: 't', barWidth: '38%', data: list.map((r) => r.respondMin), itemStyle: { color: C.accent } },
      { name: '处理（开始→闭环）', type: 'bar', stack: 't', data: list.map((r) => r.minutes), itemStyle: { color: C.room.inspection, borderRadius: [3, 3, 0, 0] } },
    ],
  }
}
