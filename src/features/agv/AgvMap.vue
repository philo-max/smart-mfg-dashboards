<script setup lang="ts">
import { computed } from 'vue'
import { BatteryCharging } from '@lucide/vue'
import { AGV_ROUTES, CHARGE_SPOTS, MAP_H, MAP_W, MAP_ZONES } from '@/data/sim/constants'
import { C } from '@/components/charts/theme'
import type { Agv } from '@/data/sim/types'

/** 产线地图：SVG 静态底图 + 沿路径插值的 AGV 图标（悬浮显示 ID 与任务） */
const props = defineProps<{ agvs: Agv[]; selected: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()

function pointOnRoute(routeId: string, progress: number) {
  const route = AGV_ROUTES.find((r) => r.id === routeId) ?? AGV_ROUTES[0]
  const pts = route.points
  const segLen = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y))
  const total = segLen.reduce((a, v) => a + v, 0)
  let dist = progress * total
  for (let i = 0; i < segLen.length; i++) {
    if (dist <= segLen[i] || i === segLen.length - 1) {
      const t = segLen[i] ? dist / segLen[i] : 0
      const a = pts[i]
      const b = pts[i + 1]
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    dist -= segLen[i]
  }
  return pts[0]
}

const positions = computed(() =>
  props.agvs.map((a) => {
    const pt = a.status === 'charging' ? CHARGE_SPOTS[props.agvs.indexOf(a) % CHARGE_SPOTS.length] : pointOnRoute(a.routeId, a.progress)
    return { agv: a, x: pt.x, y: pt.y }
  }),
)
</script>

<template>
  <svg class="map" :viewBox="`0 0 ${MAP_W} ${MAP_H}`" role="img" aria-label="产线地图与 AGV 实时位置">
    <defs>
      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" :stroke="C.grid" stroke-width="1" />
      </pattern>
    </defs>
    <rect :width="MAP_W" :height="MAP_H" fill="url(#grid)" />

    <g v-for="z in MAP_ZONES" :key="z.id">
      <rect :x="z.x" :y="z.y" :width="z.w" :height="z.h" fill="rgba(35,200,255,0.04)" :stroke="C.axis" stroke-dasharray="4 3" />
      <text :x="z.x + 10" :y="z.y + 20" :fill="C.dim" font-size="12">{{ z.name }}</text>
    </g>

    <path
      v-for="r in AGV_ROUTES"
      :key="r.id"
      :d="`M${r.points.map((p) => `${p.x},${p.y}`).join(' L')}`"
      fill="none"
      :stroke="r.id.startsWith('R') && r.id !== 'R4' && r.id !== 'R5' ? C.room.agv : C.dim"
      stroke-width="2"
      stroke-dasharray="1 8"
      stroke-linecap="round"
      opacity="0.5"
    />

    <g v-for="(spot, i) in CHARGE_SPOTS" :key="i" :transform="`translate(${spot.x - 9}, ${spot.y - 9})`">
      <rect width="18" height="18" fill="none" :stroke="C.warn" stroke-dasharray="3 2" rx="2" />
    </g>
    <text :x="CHARGE_SPOTS[0].x - 30" :y="CHARGE_SPOTS[0].y + 30" :fill="C.warn" font-size="11">充电工位</text>

    <g
      v-for="p in positions"
      :key="p.agv.id"
      :transform="`translate(${p.x}, ${p.y})`"
      class="agv-node"
      :class="{ 'is-selected': p.agv.id === selected, 'is-blocked': p.agv.status === 'blocked' }"
      role="button"
      tabindex="0"
      :aria-label="`${p.agv.id}：${p.agv.task}`"
      @click="emit('select', p.agv.id)"
      @keydown.enter="emit('select', p.agv.id)"
    >
      <circle r="15" :fill="p.agv.status === 'blocked' ? C.risk : C.room.agv" :opacity="p.agv.id === selected ? 1 : 0.85" />
      <circle v-if="p.agv.id === selected" r="20" fill="none" :stroke="C.highlight" stroke-width="2" />
      <text text-anchor="middle" dy="4" font-size="11" font-weight="700" fill="#0a0c0f">{{ p.agv.id.slice(-2) }}</text>
      <foreignObject v-if="p.agv.status === 'charging'" x="-8" y="-32" width="16" height="16">
        <BatteryCharging :size="16" :color="C.warn" />
      </foreignObject>
      <title>{{ p.agv.id }} · {{ p.agv.task }} · 电量 {{ Math.round(p.agv.battery) }}%</title>
    </g>
  </svg>
</template>

<style scoped>
.map {
  width: 100%;
  height: 100%;
}

.agv-node {
  cursor: pointer;
  transition: opacity 0.2s;
}

.agv-node.is-blocked circle:first-child {
  animation: ak-blink 0.8s steps(2) infinite;
}
</style>
