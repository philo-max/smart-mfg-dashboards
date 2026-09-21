<script setup lang="ts">
import { computed } from 'vue'
import type { ECElementEvent, EChartsOption } from 'echarts'
import EChart from '@/components/charts/EChart.vue'
import { C, itemTooltip } from '@/components/charts/theme'
import { DWELL_HOT_MIN, WAREHOUSE_COLS, WAREHOUSE_ROWS } from '@/data/sim/constants'
import type { WarehouseCell } from '@/data/sim/types'

/** 库位占用热力图：颜色 = 停留时长；超过呆滞阈值为红色，可点击查看工件 */
const props = defineProps<{ cells: WarehouseCell[]; selected: string | null }>()
const emit = defineEmits<{ select: [cellId: string] }>()

const EMPTY = -1
const MAX_DWELL = 240

const option = computed<EChartsOption>(() => ({
  tooltip: {
    ...itemTooltip,
    formatter: (p: unknown) => {
      const cell = props.cells[(p as { dataIndex: number }).dataIndex]
      if (!cell.item) return `${cell.id}工位<br/>空闲`
      return `${cell.id}工位 · ${cell.material} 料<br/>${cell.item.name} ${cell.item.rfid}<br/>停留 ${cell.dwellMin} 分钟`
    },
  },
  grid: { left: 70, right: 20, top: 16, bottom: 56 },
  xAxis: {
    type: 'category',
    data: Array.from({ length: WAREHOUSE_COLS }, (_, i) => `第 ${i + 1} 列`),
    axisLine: { show: false }, axisTick: { show: false },
    axisLabel: { color: C.dim },
    splitArea: { show: false },
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: Array.from({ length: WAREHOUSE_ROWS }, (_, i) => `${i + 1} 层`),
    axisLine: { show: false }, axisTick: { show: false },
    axisLabel: { color: C.dim },
  },
  visualMap: {
    min: 0, max: MAX_DWELL, calculable: false, orient: 'horizontal', left: 'center', bottom: 6,
    itemWidth: 12, itemHeight: 220, text: [`${MAX_DWELL} min`, '0'], textStyle: { color: C.dim },
    inRange: { color: ['#123a2a', '#1f7a4d', C.pos, C.warn, C.risk] },
    outOfRange: { color: '#1c232c' },
  },
  series: [{
    type: 'heatmap',
    data: props.cells.map((c) => [c.col, c.row, c.item ? Math.min(c.dwellMin, MAX_DWELL) : EMPTY]),
    itemStyle: { borderColor: C.bg, borderWidth: 6 },
    label: {
      show: true,
      color: '#fff',
      fontSize: 14,
      lineHeight: 20,
      formatter: (p: unknown) => {
        const cell = props.cells[(p as { dataIndex: number }).dataIndex]
        const mark = cell.id === props.selected ? '▶ ' : ''
        if (!cell.item) return `${mark}${cell.id}\n{empty|空}`
        const hot = cell.dwellMin >= DWELL_HOT_MIN ? '{hot|呆滞}' : ''
        return `${mark}${cell.id} {mat|${cell.material}}\n${cell.dwellMin} min ${hot}`
      },
      rich: {
        mat: { backgroundColor: 'rgba(0,0,0,0.45)', padding: [2, 6], color: C.highlight, fontWeight: 700 },
        hot: { backgroundColor: C.risk, padding: [2, 6], color: '#fff' },
        empty: { color: C.dim },
      },
    },
    emphasis: { itemStyle: { borderColor: C.highlight, borderWidth: 3 } },
  }],
}))

function onClick(params: ECElementEvent) {
  const cell = props.cells[params.dataIndex]
  if (cell) emit('select', cell.id)
}
</script>

<template>
  <EChart :option="option" @click="onClick" />
</template>
