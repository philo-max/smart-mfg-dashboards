<script setup lang="ts">
import { computed, ref } from 'vue'
import { BatteryCharging } from '@lucide/vue'
import { AGV_ROUTES, CHARGE_SPOTS, MAP_H, MAP_W, MAP_ZONES } from '@/data/sim/constants'
import { C } from '@/components/charts/theme'
import type { Agv } from '@/data/sim/types'

/** 产线地图：SVG 底图 + 沿路径插值的 AGV 图标；悬浮显示设备 ID 与当前任务 */
const props = defineProps<{ agvs: Agv[]; selected: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()

const STATUS_TEXT = { running: '运行中', idle: '空闲', charging: '充电中', blocked: '阻塞' } as const
const WORK_LANES = new Set(['R1', 'R2', 'R3'])

const wrap = ref<HTMLDivElement | null>(null)
const hover = ref<{ id: string; x: number; y: number } | null>(null)
const hoveredAgv = computed(() => props.agvs.find((a) => a.id === hover.value?.id) ?? null)

function pointOnRoute(routeId: string, progress: number) {
  const route = AGV_ROUTES.find((r) => r.id === routeId) ?? AGV_ROUTES[0]
  const pts = route.points
  const segLen = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y))
  let dist = Math.min(1, progress) * segLen.reduce((a, v) => a + v, 0)
  for (let i = 0; i < segLen.length; i++) {
    if (dist <= segLen[i] || i === segLen.length - 1) {
      const t = segLen[i] ? dist / segLen[i] : 0
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t }
    }
    dist -= segLen[i]
  }
  return pts[0]
}

const positions = computed(() =>
  props.agvs.map((a, i) => {
    const pt = a.status === 'charging' ? CHARGE_SPOTS[i % CHARGE_SPOTS.length] : pointOnRoute(a.routeId, a.progress)
    return { agv: a, x: pt.x, y: pt.y }
  }),
)

/** 舞台整体被 CSS 缩放，需要把屏幕坐标换算回舞台内部坐标 */
function track(e: MouseEvent, id: string) {
  const w = wrap.value
  if (!w) return
  const wr = w.getBoundingClientRect()
  const k = wr.width / w.offsetWidth || 1
  const r = (e.currentTarget as Element).getBoundingClientRect()
  hover.value = { id, x: (r.left + r.width / 2 - wr.left) / k, y: (r.top - wr.top) / k }
}
</script>

<template>
  <div ref="wrap" class="wrap">
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
        :stroke="WORK_LANES.has(r.id) ? C.room.agv : C.dim"
        stroke-width="2"
        stroke-dasharray="1 8"
        stroke-linecap="round"
        opacity="0.5"
      />
      <g v-for="r in AGV_ROUTES.filter((x) => WORK_LANES.has(x.id))" :key="`l-${r.id}`">
        <text :x="r.points[Math.floor(r.points.length / 2)].x + 6" :y="r.points[Math.floor(r.points.length / 2)].y - 6" :fill="C.room.agv" font-size="11" opacity="0.8">{{ r.id }}</text>
      </g>

      <g v-for="(spot, i) in CHARGE_SPOTS" :key="i" :transform="`translate(${spot.x - 9}, ${spot.y - 9})`">
        <rect width="18" height="18" fill="none" :stroke="C.warn" stroke-dasharray="3 2" rx="2" />
      </g>
      <text :x="CHARGE_SPOTS[0].x - 30" :y="CHARGE_SPOTS[0].y + 30" :fill="C.warn" font-size="11">充电工位</text>

      <g
        v-for="p in positions"
        :key="p.agv.id"
        :transform="`translate(${p.x}, ${p.y})`"
        class="agv-node"
        :class="{ 'is-blocked': p.agv.status === 'blocked' }"
        role="button"
        tabindex="0"
        :aria-label="`${p.agv.id}：${p.agv.task}`"
        @click="emit('select', p.agv.id)"
        @keydown.enter="emit('select', p.agv.id)"
        @mouseenter="track($event, p.agv.id)"
        @mousemove="track($event, p.agv.id)"
        @mouseleave="hover = null"
        @focus="track($event as unknown as MouseEvent, p.agv.id)"
        @blur="hover = null"
      >
        <circle r="15" :fill="p.agv.status === 'blocked' ? C.risk : C.room.agv" :opacity="p.agv.id === selected ? 1 : 0.85" />
        <circle v-if="p.agv.id === selected" r="20" fill="none" :stroke="C.highlight" stroke-width="2" />
        <text text-anchor="middle" dy="4" font-size="11" font-weight="700" fill="#0a0c0f">{{ p.agv.id.slice(-2) }}</text>
        <foreignObject v-if="p.agv.status === 'charging'" x="-8" y="-32" width="16" height="16">
          <BatteryCharging :size="16" :color="C.warn" />
        </foreignObject>
      </g>
    </svg>

    <div v-if="hover && hoveredAgv" class="tip" :style="{ left: `${hover.x}px`, top: `${hover.y}px` }" role="tooltip">
      <b class="ak-num">{{ hoveredAgv.id }}</b>
      <span class="tip__status" :class="`is-${hoveredAgv.status}`">{{ STATUS_TEXT[hoveredAgv.status] }}</span>
      <p>{{ hoveredAgv.task }}</p>
      <div class="tip__row"><span>电量</span><b class="ak-num">{{ Math.round(hoveredAgv.battery) }}%</b></div>
      <div class="tip__row"><span>路段进度</span><b class="ak-num">{{ Math.round(hoveredAgv.progress * 100) }}%</b></div>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

.map {
  width: 100%;
  height: 100%;
}

.agv-node { cursor: pointer; }
.agv-node.is-blocked circle:first-child { animation: ak-blink 0.8s steps(2) infinite; }

.tip {
  position: absolute;
  z-index: 5;
  min-width: 190px;
  transform: translate(-50%, calc(-100% - 22px));
  padding: 10px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(12, 16, 22, 0.96);
  border: 1px solid var(--room-agv);
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.tip b { color: var(--text-primary); }
.tip > b { font-size: 16px; margin-right: 8px; }
.tip p { margin: 6px 0; color: var(--text-primary); font-size: 13px; }
.tip__status { font-size: 11px; color: var(--signal-pos); }
.tip__status.is-blocked { color: var(--signal-risk); }
.tip__status.is-charging { color: var(--signal-warn); }
.tip__row { display: flex; justify-content: space-between; }
</style>
