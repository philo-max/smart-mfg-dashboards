<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { useManufacturingStore } from '../stores/manufacturing'

const store = useManufacturingStore()
const el = ref<HTMLElement | null>(null)
let chart: ReturnType<typeof echarts.init> | null = null
let observer: ResizeObserver | null = null

function cssVar(name: string, fallback: string): string {
  const host = el.value
  if (!host) return fallback
  const value = getComputedStyle(host).getPropertyValue(name).trim()
  return value || fallback
}

function buildOption(): EChartsOption {
  const trend = store.config.trend
  const axis = cssVar('--text-muted', '#8a97a1')
  const line = cssVar('--accent', '#38b6c8')
  const risk = cssVar('--signal-risk', '#e05252')
  const grid = cssVar('--border', '#26333d')

  return {
    animationDuration: 450,
    grid: { left: 46, right: 14, top: 26, bottom: 22 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: trend.axis,
      boundaryGap: false,
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      axisLabel: { color: axis, fontSize: 10, interval: 0 },
    },
    yAxis: {
      type: 'value',
      name: '偏差 %',
      nameTextStyle: { color: axis, fontSize: 10 },
      axisLabel: { color: axis, fontSize: 10 },
      splitLine: { lineStyle: { color: grid, opacity: 0.5 } },
    },
    series: [
      {
        name: '节拍偏差',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: trend.deviation,
        lineStyle: { color: line, width: 2.4 },
        itemStyle: { color: line },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: cssVar('--accent-soft', 'rgba(56,182,200,0.25)') },
            { offset: 1, color: 'rgba(0,0,0,0)' },
          ]),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: risk, type: 'dashed', width: 1.4 },
          label: { color: risk, fontSize: 10, formatter: `阈值 ${trend.threshold}` },
          data: [{ yAxis: trend.threshold }],
        },
      },
    ],
  }
}

function render() {
  chart?.setOption(buildOption(), true)
}

watch(() => store.scenario, () => window.requestAnimationFrame(render))
watch(() => store.config.trend, render, { deep: true })

onMounted(() => {
  if (!el.value) return
  chart = echarts.init(el.value)
  render()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(el.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  chart?.dispose()
  chart = null
})
</script>

<template>
  <section class="bottleneck panel" aria-label="节拍偏差趋势">
    <header class="bottleneck__head">
      <h3 class="bottleneck__title">节拍偏差趋势</h3>
      <span class="bottleneck__node">瓶颈 · {{ store.bottleneckName }}</span>
    </header>
    <div ref="el" class="bottleneck__chart"></div>
  </section>
</template>

<style scoped>
.bottleneck {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 6px;
  padding: 12px var(--space-4);
  min-height: 0;
  min-width: 0;
}

.bottleneck__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.bottleneck__title {
  font-size: 13px;
  font-weight: 600;
}

.bottleneck__node {
  font-size: 11px;
  color: var(--text-muted);
}

.bottleneck__chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
