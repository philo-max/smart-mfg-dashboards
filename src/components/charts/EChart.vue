<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import type { ECElementEvent, EChartsOption } from 'echarts'

const props = withDefaults(defineProps<{ option: EChartsOption; notMerge?: boolean }>(), { notMerge: false })
const emit = defineEmits<{ click: [params: ECElementEvent] }>()

const host = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!host.value) return
  chart.value = echarts.init(host.value, undefined, { renderer: 'canvas' })
  chart.value.setOption(props.option, true)
  chart.value.on('click', (params) => emit('click', params as ECElementEvent))
  observer = new ResizeObserver(() => chart.value?.resize())
  observer.observe(host.value)
})

watch(
  () => props.option,
  (option) => chart.value?.setOption(option, props.notMerge),
)

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  chart.value?.dispose()
  chart.value = null
})

defineExpose({ chart })
</script>

<template>
  <div ref="host" class="echart"></div>
</template>

<style scoped>
.echart {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
