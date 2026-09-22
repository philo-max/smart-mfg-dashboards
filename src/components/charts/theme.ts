import * as echarts from 'echarts'

/** ECharts 无法读取 CSS 变量，这里与 tokens.css 保持同值 */
export const C = {
  accent: '#23c8ff',
  accentStrong: '#7fe3ff',
  highlight: '#ffd23c',
  pos: '#47d18c',
  warn: '#ffb020',
  risk: '#ff4655',
  text: '#eaf2fb',
  dim: '#8fa8c4',
  grid: 'rgba(80,170,255,0.09)',
  axis: 'rgba(127,170,215,0.32)',
  bg: '#0b1320',
  room: {
    warehouse: '#9b7bff',
    agv: '#8bdc3a',
    assembly: '#ffb400',
    inspection: '#ff6f3c',
    logistics: '#3a8dff',
  },
} as const

export const PALETTE = [C.accent, C.highlight, C.room.warehouse, C.pos, C.room.inspection, C.room.logistics]

export const tooltip = {
  trigger: 'axis' as const,
  backgroundColor: 'rgba(8,17,31,0.92)',
  borderColor: C.accent,
  borderWidth: 1,
  textStyle: { color: C.text, fontSize: 13 },
  extraCssText: 'backdrop-filter: blur(6px); box-shadow: 0 0 18px rgba(35,200,255,0.28); border-radius: 0;',
  axisPointer: {
    lineStyle: { color: C.accent, type: 'dashed' as const, opacity: 0.6 },
    shadowStyle: { color: 'rgba(35,200,255,0.08)' },
    label: { backgroundColor: '#123a5c', color: C.text },
  },
}

export const itemTooltip = { ...tooltip, trigger: 'item' as const }

export const legend = {
  top: 0,
  left: 'center',
  icon: 'rect',
  itemWidth: 12,
  itemHeight: 4,
  textStyle: { color: C.dim, fontSize: 12 },
}

export function catAxis(data: string[], extra: Record<string, unknown> = {}) {
  return {
    type: 'category' as const,
    data,
    axisLine: { lineStyle: { color: C.axis } },
    axisTick: { show: false },
    axisLabel: { color: C.dim, fontSize: 11, fontFamily: 'Bahnschrift, sans-serif' },
    ...extra,
  }
}

export function valAxis(extra: Record<string, unknown> = {}) {
  return {
    type: 'value' as const,
    nameTextStyle: { color: C.dim, fontSize: 11 },
    axisLabel: { color: C.dim, fontSize: 11, fontFamily: 'Bahnschrift, sans-serif' },
    splitLine: { lineStyle: { color: C.grid } },
    ...extra,
  }
}

export function fade(color: string, from = '99', to = '05') {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: color + from },
    { offset: 1, color: color + to },
  ])
}

export function areaFade(color: string, from = '48', to = '00') {
  return fade(color, from, to)
}

export function hGrad(from: string, to: string) {
  return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
    { offset: 0, color: from },
    { offset: 1, color: to },
  ])
}

/** 环形进度（订单准时率 / 任务完成率 / 合格率 等） */
export function ring(value: number, color: string, label: string, target?: number) {
  const safe = Math.max(0, Math.min(100, value))
  return {
    title: {
      text: `${value.toFixed(1)}%`,
      subtext: target === undefined ? label : `${label} · 目标 ${target}%`,
      left: 'center',
      top: '38%',
      itemGap: 6,
      textStyle: { color: C.text, fontSize: 30, fontWeight: 700, fontFamily: 'Bahnschrift, sans-serif' },
      subtextStyle: { color: C.dim, fontSize: 12 },
    },
    series: [
      {
        type: 'pie' as const,
        radius: ['70%', '82%'],
        silent: true,
        label: { show: false },
        startAngle: 90,
        data: [
          { value: safe, itemStyle: { color, shadowBlur: 12, shadowColor: color } },
          { value: 100 - safe, itemStyle: { color: 'rgba(127,200,255,0.09)' } },
        ],
      },
      {
        type: 'pie' as const,
        radius: ['88%', '89.5%'],
        silent: true,
        label: { show: false },
        data: [{ value: 1, itemStyle: { color: 'rgba(127,227,255,0.3)' } }],
      },
    ],
  }
}

/** 仪表盘（OEE / 检出率） */
export function gauge(value: number, name: string, min = 0, max = 100) {
  return {
    series: [
      {
        type: 'gauge' as const,
        min, max, splitNumber: 5, radius: '94%', center: ['50%', '60%'],
        startAngle: 210, endAngle: -30,
        axisLine: { lineStyle: { width: 12, color: [[0.6, C.risk], [0.8, C.warn], [1, C.pos]] as [number, string][] } },
        pointer: { width: 4, length: '60%', itemStyle: { color: C.accent } },
        axisTick: { distance: -12, length: 5, lineStyle: { color: C.accentStrong, width: 1 } },
        splitLine: { distance: -14, length: 14, lineStyle: { color: C.accentStrong, width: 2 } },
        axisLabel: { color: C.dim, distance: 18, fontSize: 11 },
        anchor: { show: true, size: 10, itemStyle: { color: C.accent } },
        title: { offsetCenter: [0, '36%'], color: C.dim, fontSize: 13 },
        detail: {
          valueAnimation: true, offsetCenter: [0, '66%'], formatter: '{value}%',
          color: C.highlight, fontSize: 28, fontWeight: 700, fontFamily: 'Bahnschrift, sans-serif',
        },
        data: [{ value, name }],
      },
    ],
  }
}

/** 迷你仪表盘（设备 OEE 排行行） */
export function miniGauge(value: number, name: string) {
  return {
    series: [
      {
        type: 'gauge' as const,
        min: 0, max: 100, splitNumber: 4, radius: '98%', center: ['50%', '62%'],
        startAngle: 210, endAngle: -30,
        axisLine: { lineStyle: { width: 8, color: [[0.6, C.risk], [0.75, C.warn], [1, C.pos]] as [number, string][] } },
        pointer: { width: 3, length: '58%', itemStyle: { color: C.accent } },
        axisTick: { show: false },
        splitLine: { distance: -8, length: 8, lineStyle: { color: C.accentStrong, width: 1 } },
        axisLabel: { show: false },
        anchor: { show: true, size: 7, itemStyle: { color: C.accent } },
        title: { show: false },
        detail: { valueAnimation: true, offsetCenter: [0, '58%'], formatter: '{value}%', color: C.highlight, fontSize: 18, fontWeight: 700, fontFamily: 'Bahnschrift, sans-serif' },
        data: [{ value, name }],
      },
    ],
  }
}
