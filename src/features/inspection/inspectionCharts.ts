import type { EChartsOption } from 'echarts'
import { C, PALETTE, catAxis, fade, legend, tooltip, valAxis } from '@/components/charts/theme'
import { NOMINAL, TOLERANCE } from '@/data/sim/constants'
import type { HourBucket, InspectionStation } from '@/data/sim/types'

const BIN_STEP = 0.002
const BIN_MIN = NOMINAL - TOLERANCE - 0.014
const BIN_COUNT = 40

function rateOf(d: HourBucket): number {
  const total = d.pass + d.fail
  return total ? Math.round((d.pass / total) * 10000) / 100 : 100
}
function ppmOf(d: HourBucket): number {
  const total = d.pass + d.fail
  return total ? Math.round((d.fail / total) * 1e6) : 0
}

export function trendOption(list: HourBucket[], threshold: number): EChartsOption {
  return {
    tooltip: { ...tooltip, trigger: 'axis' }, legend,
    grid: { left: 52, right: 60, top: 40, bottom: 26 },
    xAxis: catAxis(list.map((d) => d.label)),
    yAxis: [valAxis({ name: '合格率 %', min: 90, max: 100 }), valAxis({ name: '不良 PPM', splitLine: { show: false } })],
    series: [
      { name: '不良 PPM', type: 'bar', yAxisIndex: 1, barWidth: '40%', data: list.map(ppmOf), itemStyle: { color: fade(C.room.logistics), borderRadius: [3, 3, 0, 0] } },
      {
        name: '一次合格率', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
        data: list.map((d) => { const v = rateOf(d); return v < threshold ? { value: v, itemStyle: { color: C.risk }, symbolSize: 10 } : v }),
        lineStyle: { color: C.room.inspection, width: 2.5 }, itemStyle: { color: C.room.inspection }, areaStyle: { color: fade(C.room.inspection) },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: C.highlight, type: 'dashed' }, label: { color: C.highlight, formatter: `FPY 阈值 ${threshold}%` }, data: [{ yAxis: threshold }] },
      },
    ],
  }
}

export function defectPieOption(defects: { name: string; value: number }[], selected: string | null = null): EChartsOption {
  return {
    color: [...PALETTE],
    tooltip: { trigger: 'item', backgroundColor: tooltip.backgroundColor, borderColor: C.accent, textStyle: tooltip.textStyle, formatter: '{b}<br/>{c} 件（{d}%）' },
    legend: { orient: 'vertical', right: 4, top: 'middle', textStyle: { color: C.text, fontSize: 12 }, itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie', radius: ['42%', '70%'], center: ['32%', '52%'], roseType: 'radius', itemStyle: { borderColor: C.bg, borderWidth: 2 },
      label: { color: C.text, formatter: '{d}%', fontSize: 11 }, selectedMode: 'single', selectedOffset: 8,
      select: { itemStyle: { borderColor: C.highlight, borderWidth: 3 } },
      data: defects.map((d) => ({ ...d, selected: d.name === selected })),
    }],
  }
}

export function stationBarOption(stations: InspectionStation[], threshold: number, selected: number | null = null): EChartsOption {
  const rates = stations.map((s) => (s.total ? Math.round(((s.total - s.fail) / s.total) * 10000) / 100 : 100))
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 76, right: 50, top: 6, bottom: 6 },
    xAxis: { type: 'value', min: 95, max: 100, show: false },
    yAxis: catAxis(stations.map((s) => s.name), { inverse: true, axisLine: { show: false }, axisLabel: { color: C.text, fontSize: 12 } }),
    series: [{
      type: 'bar', barWidth: 12, showBackground: true, backgroundStyle: { color: 'rgba(255,255,255,0.06)', borderRadius: 6 },
      label: { show: true, position: 'right', color: C.text, formatter: '{c}%' },
      data: rates.map((v, i) => ({ value: v, itemStyle: { borderRadius: 6, color: i === selected ? C.highlight : v < threshold ? C.risk : C.room.inspection } })),
    }],
  }
}

export function toleranceOption(samples: number[]): EChartsOption {
  const bins = Array.from({ length: BIN_COUNT }, (_, i) => ({ left: +(BIN_MIN + i * BIN_STEP).toFixed(3), count: 0 }))
  samples.forEach((v) => { const idx = Math.floor((v - BIN_MIN) / BIN_STEP); if (idx >= 0 && idx < bins.length) bins[idx].count += 1 })
  const lsl = +(NOMINAL - TOLERANCE).toFixed(3)
  const usl = +(NOMINAL + TOLERANCE).toFixed(3)
  const mean = samples.reduce((a, v) => a + v, 0) / samples.length
  const sd = Math.sqrt(samples.reduce((a, v) => a + (v - mean) ** 2, 0) / (samples.length - 1))
  const cpk = Math.min(NOMINAL + TOLERANCE - mean, mean - (NOMINAL - TOLERANCE)) / (3 * sd)
  return {
    tooltip: { ...tooltip, formatter: (p) => `${(p as { name: string }[])[0].name} mm<br/>样本 ${(p as { value: number }[])[0].value} 件` },
    grid: { left: 40, right: 12, top: 34, bottom: 26 },
    graphic: [{ type: 'text', right: 12, top: 0, style: { text: `Cpk ${cpk.toFixed(2)}  均值 ${mean.toFixed(3)}`, fill: cpk >= 1.33 ? C.pos : C.warn, fontSize: 13, fontWeight: 700 } }],
    xAxis: catAxis(bins.map((b) => b.left.toFixed(3)), { axisLabel: { color: C.dim, fontSize: 10, interval: 4 } }),
    yAxis: valAxis({ minInterval: 1 }),
    series: [{
      type: 'bar', barCategoryGap: '10%',
      data: bins.map((b) => ({ value: b.count, itemStyle: { color: b.left < lsl || b.left >= usl ? C.risk : fade(C.room.inspection) } })),
      markLine: {
        symbol: 'none', silent: true, label: { color: C.highlight, fontSize: 11, formatter: '{b}' }, lineStyle: { color: C.highlight, type: 'dashed' },
        data: [{ name: 'LSL', xAxis: lsl.toFixed(3) }, { name: '标称', xAxis: NOMINAL.toFixed(3), lineStyle: { color: C.pos } }, { name: 'USL', xAxis: usl.toFixed(3) }],
      },
    }],
  }
}

export function energyOption(hourly: HourBucket[], alertKw: number): EChartsOption {
  const ranges: [number, number][] = []
  hourly.forEach((h, i) => {
    if (h.power <= alertKw) return
    const last = ranges[ranges.length - 1]
    if (last && last[1] === i - 1) last[1] = i
    else ranges.push([Math.max(0, i - 1), i])
  })
  const areas = ranges.map(([a, b]) => [{ xAxis: hourly[a].label }, { xAxis: hourly[b].label }])
  return {
    tooltip: { ...tooltip, trigger: 'axis' }, legend,
    grid: { left: 44, right: 44, top: 36, bottom: 24 },
    xAxis: catAxis(hourly.map((h) => h.label), { axisLabel: { color: C.dim, fontSize: 10, interval: 3 } }),
    yAxis: [valAxis({ name: 'kW' }), valAxis({ name: '缺陷率 %', splitLine: { show: false } })],
    series: [
      { name: '设备功率', type: 'line', smooth: true, showSymbol: false, data: hourly.map((h) => h.power), lineStyle: { color: C.warn, width: 2 }, areaStyle: { color: fade(C.warn) }, markArea: { silent: true, itemStyle: { color: 'rgba(255,70,85,0.16)' }, data: areas as never } },
      { name: '缺陷率', type: 'line', smooth: true, yAxisIndex: 1, symbol: 'circle', symbolSize: 5, data: hourly.map((h) => (h.pass + h.fail ? Math.round((h.fail / (h.pass + h.fail)) * 10000) / 100 : 0)), lineStyle: { color: C.risk, width: 2 }, itemStyle: { color: C.risk } },
    ],
  }
}

export function detailOption(hourly: HourBucket[], focus: 'pass' | 'fail'): EChartsOption {
  return {
    tooltip: { ...tooltip, trigger: 'axis' }, legend,
    grid: { left: 52, right: 56, top: 40, bottom: 26 },
    xAxis: catAxis(hourly.map((h) => h.label)),
    yAxis: [valAxis({ name: '件' }), valAxis({ name: '不合格率 %', splitLine: { show: false } })],
    series: [
      { name: '合格', type: 'bar', stack: 'qty', data: hourly.map((h) => h.pass), itemStyle: { color: focus === 'pass' ? C.pos : 'rgba(71,209,140,0.35)' } },
      { name: '不合格', type: 'bar', stack: 'qty', data: hourly.map((h) => h.fail), itemStyle: { color: focus === 'fail' ? C.risk : 'rgba(255,70,85,0.45)', borderRadius: [3, 3, 0, 0] } },
      { name: '不合格率', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 5, data: hourly.map((h) => (h.pass + h.fail ? Math.round((h.fail / (h.pass + h.fail)) * 10000) / 100 : 0)), lineStyle: { color: C.highlight }, itemStyle: { color: C.highlight } },
    ],
  }
}
