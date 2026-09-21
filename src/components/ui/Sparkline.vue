<script setup lang="ts">
import { computed } from 'vue'
import type { RoomSpark } from '@/data/sim/selectors'

/** 轻量 SVG 迷你趋势：含阈值虚线，越界点/柱标红 */
const props = defineProps<{ spark: RoomSpark; color: string }>()

const W = 200
const H = 56
const PAD = 4

const geo = computed(() => {
  const { values, threshold, highIsBad } = props.spark
  const lo = Math.min(...values, threshold)
  const hi = Math.max(...values, threshold)
  const span = hi - lo || 1
  const min = props.spark.kind === 'bar' ? 0 : lo - span * 0.15
  const max = hi + span * 0.15
  const y = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2)
  const step = values.length > 1 ? W / (values.length - (props.spark.kind === 'bar' ? 0 : 1)) : W
  const bad = (v: number) => (highIsBad ? v > threshold : v < threshold)
  const points = values.map((v, i) => ({ x: props.spark.kind === 'bar' ? i * step + step / 2 : i * step, y: y(v), bad: bad(v), v }))
  return { points, step, thresholdY: y(threshold), baseY: y(min) }
})

const path = computed(() => geo.value.points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
</script>

<template>
  <figure class="spark">
    <figcaption>{{ spark.label }}</figcaption>
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" role="img" :aria-label="spark.label">
      <line x1="0" :x2="W" :y1="geo.thresholdY" :y2="geo.thresholdY" class="spark__th" />
      <template v-if="spark.kind === 'bar'">
        <rect
          v-for="(p, i) in geo.points"
          :key="i"
          :x="p.x - geo.step * 0.32"
          :width="geo.step * 0.64"
          :y="Math.min(p.y, geo.baseY - 1)"
          :height="Math.max(1, geo.baseY - p.y)"
          :fill="p.bad ? 'var(--signal-risk)' : color"
          :opacity="p.bad ? 1 : 0.75"
        />
      </template>
      <template v-else>
        <path :d="path" fill="none" :stroke="color" stroke-width="1.6" vector-effect="non-scaling-stroke" />
        <circle v-for="(p, i) in geo.points.filter((q) => q.bad)" :key="i" :cx="p.x" :cy="p.y" r="2.2" fill="var(--signal-risk)" />
      </template>
    </svg>
  </figure>
</template>

<style scoped>
.spark {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

figcaption {
  font-size: 11px;
  color: var(--text-muted);
}

svg {
  width: 100%;
  height: 56px;
  background: rgba(0, 0, 0, 0.25);
}

.spark__th {
  stroke: var(--highlight);
  stroke-dasharray: 4 3;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  opacity: 0.7;
}
</style>
