import * as echarts from 'echarts'

/** ECharts 无法读取 CSS 变量，这里与 tokens.css 保持同值 */
export const C = {
  accent: '#23c8ff',
  accentStrong: '#7fe3ff',
  highlight: '#ffd23c',
  pos: '#47d18c',
  warn: '#ffb020',
  risk: '#ff4655',
  text: '#e9edf1',
  dim: '#8a939c',
  grid: 'rgba(35,200,255,0.08)',
  axis: 'rgba(163,173,183,0.35)',
  bg: '#10141a',
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
  backgroundColor: 'rgba(12,16,22,0.95)',
  borderColor: C.accent,
  borderWidth: 1,
  textStyle: { color: C.text, fontSize: 13 },
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
          { value: 100 - safe, itemStyle: { color: 'rgba(255,255,255,0.06)' } },
        ],
      },
      {
        type: 'pie' as const,
        radius: ['88%', '89.5%'],
        silent: true,
        label: { show: false },
        data: [{ value: 1, itemStyle: { color: 'rgba(163,173,183,0.25)' } }],
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
        axisTick: { distance: -12, length: 5, lineStyle: { color: '#fff', width: 1 } },
        splitLine: { distance: -14, length: 14, lineStyle: { color: '#fff', width: 2 } },
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
