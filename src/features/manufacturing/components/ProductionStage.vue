<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { Motion } from 'motion-v'
import { useManufacturingStore } from '../stores/manufacturing'
import { useUiStore } from '@/stores/ui'
import { useGsapTimeline } from '@/components/motion/useGsapTimeline'
import { STATIONS, stateMeta, type StationId } from '../data/manufacturing'

const store = useManufacturingStore()
const ui = useUiStore()

const stations = STATIONS
const config = computed(() => store.config)

const selected = computed<StationId>(() => store.selectedStation)
const selectedName = computed(
  () => stations.find((s) => s.id === selected.value)?.name ?? '',
)
const selectedState = computed(() => stateMeta(config.value.stationStates[selected.value]))
const selectedReadout = computed(() => config.value.stationReadouts[selected.value])
const selectedIsBottleneck = computed(() => config.value.bottleneck.node === selected.value)
const stageWidth = ref(0)
let resizeObserver: ResizeObserver | null = null

const stationPoint: Record<StationId, { x: number; y: number }> = {
  inbound: { x: 0.12, y: 0.57 },
  assembly: { x: 0.39, y: 0.7 },
  inspection: { x: 0.64, y: 0.38 },
  outbound: { x: 0.88, y: 0.59 },
}

const holdPoint = computed(() => {
  if (config.value.id === 'agv-jam') return { x: 0.79, y: 0.53 }
  if (config.value.id === 'defect-spike') return { x: 0.64, y: 0.38 }
  if (config.value.id === 'takt-timeout') return { x: 0.39, y: 0.7 }
  return stationPoint.inbound
})

function pointStyle(station: StationId) {
  const point = stationPoint[station]
  return { left: `${point.x * 100}%`, top: `${point.y * 100}%` }
}

function queueStyle(index: number) {
  const point = holdPoint.value
  return {
    left: `calc(${point.x * 100}% - ${index * 34}px)`,
    top: `calc(${point.y * 100}% - ${index % 2 === 0 ? 20 : -12}px)`,
  }
}

/** reduced-motion 或需要静态定位时，直接把物料放到目标节点（不构建动画）。 */
function applyStatic() {
  const host = el.value
  if (!host) return
  const marker = host.querySelector<HTMLElement>('[data-material]')
  const track = host.querySelector<HTMLElement>('[data-track]')
  if (!marker || !track) return
  const markerWidth = marker.offsetWidth || 56
  const markerHeight = marker.offsetHeight || 32
  const point = config.value.flow.mode === 'hold' ? holdPoint.value : stationPoint.inbound
  gsap.set(marker, {
    x: Math.max(0, point.x * track.clientWidth - markerWidth / 2),
    y: Math.max(0, point.y * track.clientHeight - markerHeight / 2),
    opacity: 1,
  })
}

/**
 * GSAP：仅驱动主舞台物料沿轨道移动（本页唯一 GSAP 区域）。
 * - loop（正常）：物料先平滑到位，再持续沿轨道流动；
 * - hold（异常）：物料平滑移动到目标节点并停住（AGV 阻塞停出库前 / 不良突增停质检 / 节拍超时停装配）；
 * - 场景切换经 rebuildOn 重建：先 kill 旧时间线，再从当前 x 平滑过渡，不叠加、不残留；
 * - reduced-motion：不构建动画，仅静态定位（见 applyStatic）。
 */
const { el } = useGsapTimeline(
  ({ tl, el: host }) => {
    const marker = host.querySelector<HTMLElement>('[data-material]')
    const track = host.querySelector<HTMLElement>('[data-track]')
    if (!marker || !track) return

    const width = track.clientWidth
    const height = track.clientHeight
    const markerWidth = marker.offsetWidth || 56
    const markerHeight = marker.offsetHeight || 32
    const project = (point: { x: number; y: number }) => ({
      x: Math.max(0, point.x * width - markerWidth / 2),
      y: Math.max(0, point.y * height - markerHeight / 2),
    })
    const flow = config.value.flow

    if (flow.mode === 'hold') {
      tl.to(marker, {
        ...project(holdPoint.value),
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
      })
    } else {
      const route = [stationPoint.inbound, stationPoint.assembly, stationPoint.inspection, stationPoint.outbound]
      tl.set(marker, { ...project(route[0]), opacity: 1 })
        .to(marker, { ...project(route[1]), duration: 1.1, ease: 'power1.inOut' })
        .to(marker, { ...project(route[2]), duration: 1.1, ease: 'power1.inOut' })
        .to(marker, { ...project(route[3]), duration: 1.1, ease: 'power1.inOut' })
        .set(marker, project(route[0]))
        .to(marker, { ...project(route[1]), duration: 1.1, ease: 'power1.inOut' })
        .to(marker, { ...project(route[2]), duration: 1.1, ease: 'power1.inOut' })
        .to(marker, { ...project(route[3]), duration: 1.1, ease: 'power1.inOut', repeat: -1, repeatDelay: 0.35 })
    }
  },
  {
    reducedMotion: () => ui.reducedMotion,
    rebuildOn: () => [store.scenario, stageWidth.value],
  },
)

onMounted(() => {
  const track = el.value?.querySelector<HTMLElement>('[data-track]')
  if (track) {
    stageWidth.value = Math.round(track.clientWidth)
    resizeObserver = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width)
      if (nextWidth !== stageWidth.value) stageWidth.value = nextWidth
    })
    resizeObserver.observe(track)
  }
  if (ui.reducedMotion) applyStatic()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(
  () => store.scenario,
  () => {
    if (ui.reducedMotion) window.requestAnimationFrame(applyStatic)
  },
)
watch(
  () => ui.reducedMotion,
  (reduced) => {
    if (reduced) applyStatic()
  },
)
</script>

<template>
  <section ref="el" class="stage panel" aria-label="产线主舞台">
    <header class="stage__head">
      <h3 class="stage__title">产线主舞台 · 订单 {{ config.order.code }}</h3>
      <span class="stage__direction">{{ config.direction }}</span>
    </header>

    <div class="stage__track" data-track>
      <div class="stage__ambient" aria-hidden="true">
        <span class="stage__ambient-label">产线单元 / A-01</span>
        <span class="stage__ambient-state" :data-tone="stateMeta(config.stationStates[config.bottleneck.node]).tone">
          {{ config.bottleneck.affectedOrders }} 单待关注
        </span>
      </div>
      <svg class="stage__map" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="mfg-floor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="rgba(35, 53, 64, .92)" />
            <stop offset="1" stop-color="rgba(15, 25, 32, .15)" />
          </linearGradient>
          <linearGradient id="mfg-route" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="rgba(56, 182, 200, .2)" />
            <stop offset=".5" stop-color="rgba(95, 208, 224, .95)" />
            <stop offset="1" stop-color="rgba(56, 182, 200, .2)" />
          </linearGradient>
        </defs>
        <path class="stage__floor" d="M68 125 L600 42 L944 186 L425 505 Z" />
        <path class="stage__floor-line" d="M68 125 L425 505 M244 98 L604 465 M424 72 L781 426 M600 42 L944 186" />
        <path class="stage__floor-line" d="M130 192 L666 109 M194 262 L728 177 M258 332 L792 247 M322 402 L854 317" />
        <path class="stage__route" :class="{ 'is-held': config.flow.mode === 'hold' }" d="M120 320 C224 302 292 390 390 390 S554 214 640 214 S796 344 885 330" />
        <path class="stage__route-edge" d="M120 333 C225 315 294 403 392 403 S556 227 642 227 S798 357 885 343" />
        <circle class="stage__map-node" cx="120" cy="320" r="18" />
        <circle class="stage__map-node" cx="390" cy="390" r="18" />
        <circle class="stage__map-node" cx="640" cy="214" r="18" />
        <circle class="stage__map-node" cx="885" cy="330" r="18" />
      </svg>
      <span class="stage__grid" aria-hidden="true"></span>

      <button
        v-for="s in stations"
        :key="s.id"
        type="button"
        class="node"
        :class="{ 'is-selected': s.id === selected, 'is-bottleneck': s.id === config.bottleneck.node }"
        :data-state="config.stationStates[s.id]"
        :data-station="s.id"
        :style="pointStyle(s.id)"
        @click="store.selectStation(s.id)"
      >
        <span class="node__machine" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="node__led" aria-hidden="true"></span>
        <span class="node__name">{{ s.name }}</span>
        <span class="node__state">{{ stateMeta(config.stationStates[s.id]).label }}</span>
      </button>

      <span
        v-for="index in config.flow.mode === 'hold' ? 3 : 0"
        :key="index"
        class="stage__queue-material"
        :style="queueStyle(index)"
        aria-hidden="true"
      ></span>

      <span class="stage__material" data-material aria-hidden="true">
        <span class="stage__material-core"></span>
      </span>
    </div>

    <Motion
      class="stage__detail"
      :key="selected + '-' + store.scenario"
      :initial="{ opacity: 0, y: 10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.35 }"
    >
      <span class="stage__detail-name">{{ selectedName }}</span>
      <span class="stage__detail-chip" :data-tone="selectedState.tone">{{ selectedState.label }}</span>
      <span class="stage__detail-readout">{{ selectedReadout }}</span>
      <span v-if="selectedIsBottleneck" class="stage__detail-bottleneck">当前瓶颈</span>
    </Motion>
  </section>
</template>

<style scoped>
.stage {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 10px;
  padding: 14px var(--space-5) 16px;
  min-height: 0;
  min-width: 0;
}

.stage__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
}

.stage__title {
  font-size: 15px;
  font-weight: 600;
}

.stage__direction {
  font-size: 11.5px;
  color: var(--text-muted);
}

.stage__track {
  position: relative;
  min-height: 0;
  overflow: visible;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 12px;
  background:
    radial-gradient(circle at 50% 58%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 72%, transparent), var(--bg-panel-2));
  isolation: isolate;
}

.stage__ambient {
  position: absolute;
  z-index: 2;
  top: 14px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.stage__ambient-state {
  padding: 4px 7px;
  border: 1px solid var(--border);
  border-radius: 999px;
  letter-spacing: 0.04em;
}

.stage__ambient-state[data-tone='warn'] { color: var(--signal-warn); }
.stage__ambient-state[data-tone='risk'] { color: var(--signal-risk); }

.stage__grid {
  position: absolute;
  inset: 0;
  opacity: 0.85;
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(180deg, transparent, #000 20%, #000 80%, transparent);
}

.stage__rail {
  position: absolute;
  left: 0;
  right: 0;
  top: 58%;
  height: 3px;
  margin-top: -1.5px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent-line), var(--border-strong) 50%, var(--accent-line));
  opacity: 0.9;
}

.stage__rail-glow {
  position: absolute;
  z-index: -1;
  top: calc(58% - 15px);
  left: 4%;
  right: 4%;
  height: 30px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 22%, transparent), transparent);
  filter: blur(12px);
}

.node {
  position: absolute;
  z-index: 1;
  top: 58%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 116px;
  padding: 9px 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-panel-2) 90%, transparent);
  cursor: pointer;
  transition: border-color var(--motion-theme) var(--ease-standard),
    background-color var(--motion-theme) var(--ease-standard),
    transform 0.25s var(--ease-standard),
    box-shadow var(--motion-theme) var(--ease-standard);
}

.node:hover {
  border-color: var(--accent-line);
}

.node.is-selected {
  border-color: var(--accent-line);
  background: var(--accent-soft);
  box-shadow: var(--glow);
}

.node.is-bottleneck {
  border-color: color-mix(in srgb, var(--signal-risk) 55%, transparent);
}

.node__led {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--signal-pos);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--signal-pos) 20%, transparent);
  transition: background-color 0.4s var(--ease-standard),
    box-shadow 0.4s var(--ease-standard);
}

.node__machine {
  position: relative;
  display: block;
  width: 52px;
  height: 30px;
  margin-bottom: 2px;
  color: var(--accent-strong);
}

.node__machine i {
  position: absolute;
  display: block;
  border: 1px solid currentColor;
  opacity: 0.82;
}

.node[data-station='inbound'] .node__machine i:nth-child(1) { inset: 3px 4px 3px 4px; }
.node[data-station='inbound'] .node__machine i:nth-child(2) { left: 4px; right: 4px; top: 12px; }
.node[data-station='inbound'] .node__machine i:nth-child(3) { left: 20px; top: 3px; bottom: 3px; }

.node[data-station='assembly'] .node__machine i:nth-child(1) { width: 25px; height: 3px; left: 7px; top: 19px; background: currentColor; border: 0; transform: rotate(-35deg); transform-origin: left center; }
.node[data-station='assembly'] .node__machine i:nth-child(2) { width: 18px; height: 3px; left: 27px; top: 11px; background: currentColor; border: 0; transform: rotate(42deg); transform-origin: left center; }
.node[data-station='assembly'] .node__machine i:nth-child(3) { width: 40px; height: 5px; left: 6px; bottom: 3px; border-radius: 3px; background: currentColor; }

.node[data-station='inspection'] .node__machine i:nth-child(1) { width: 24px; height: 24px; left: 14px; top: 1px; border-radius: 50%; }
.node[data-station='inspection'] .node__machine i:nth-child(2) { width: 8px; height: 8px; left: 22px; top: 9px; border-radius: 50%; background: currentColor; }
.node[data-station='inspection'] .node__machine i:nth-child(3) { width: 42px; height: 3px; left: 5px; bottom: 2px; background: currentColor; border: 0; }

.node[data-station='outbound'] .node__machine i:nth-child(1) { width: 38px; height: 16px; left: 7px; top: 6px; border-radius: 4px; }
.node[data-station='outbound'] .node__machine i:nth-child(2) { width: 7px; height: 7px; left: 11px; bottom: 2px; border-radius: 50%; background: currentColor; }
.node[data-station='outbound'] .node__machine i:nth-child(3) { width: 7px; height: 7px; right: 11px; bottom: 2px; border-radius: 50%; background: currentColor; }

.node[data-state='warn'] .node__led {
  background: var(--signal-warn);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--signal-warn) 22%, transparent);
  animation: led-pulse 1.6s ease-in-out infinite;
}

.node[data-state='risk'] .node__led {
  background: var(--signal-risk);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--signal-risk) 22%, transparent);
  animation: led-pulse 1.1s ease-in-out infinite;
}

@keyframes led-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.node__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.node__state {
  font-size: 10px;
  color: var(--text-muted);
}

.node[data-state='warn'] .node__state { color: var(--signal-warn); }
.node[data-state='risk'] .node__state { color: var(--signal-risk); }

.stage__material {
  position: absolute;
  top: 58%;
  left: 0;
  margin-top: -16px;
  width: 56px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  box-shadow: 0 10px 22px -12px var(--accent);
  will-change: transform;
  z-index: 2;
}

.stage__queue-material {
  position: absolute;
  z-index: 0;
  top: calc(58% - 10px);
  width: 24px;
  height: 20px;
  border: 1px solid color-mix(in srgb, var(--signal-warn) 58%, var(--border));
  border-radius: 5px;
  background: color-mix(in srgb, var(--signal-warn) 20%, var(--bg-panel-2));
  box-shadow: 0 0 16px -8px var(--signal-warn);
}

.stage__queue-material::after {
  content: '';
  position: absolute;
  inset: 6px 5px;
  border: 1px solid color-mix(in srgb, var(--signal-warn) 70%, transparent);
  border-radius: 2px;
}

.stage__material-core {
  width: 22px;
  height: 8px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--bg-app) 55%, transparent);
}

.stage__detail {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-panel-2);
  font-size: 12.5px;
}

.stage__detail-name {
  font-weight: 600;
}

.stage__detail-chip {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.stage__detail-chip[data-tone='pos'] { color: var(--signal-pos); background: color-mix(in srgb, var(--signal-pos) 14%, transparent); }
.stage__detail-chip[data-tone='warn'] { color: var(--signal-warn); background: color-mix(in srgb, var(--signal-warn) 14%, transparent); }
.stage__detail-chip[data-tone='risk'] { color: var(--signal-risk); background: color-mix(in srgb, var(--signal-risk) 16%, transparent); }

.stage__detail-readout {
  color: var(--text-secondary);
}

.stage__detail-bottleneck {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: var(--signal-risk);
}

.stage__track {
  overflow: hidden;
  min-height: 300px;
  background: linear-gradient(145deg, #14222d, #111920 72%);
}

.stage__map {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
}

.stage__floor {
  fill: url(#mfg-floor);
  stroke: color-mix(in srgb, var(--accent) 28%, var(--border));
  stroke-width: 1.3;
}

.stage__floor-line {
  fill: none;
  stroke: rgba(114, 170, 183, 0.16);
  stroke-width: 1;
}

.stage__route {
  fill: none;
  stroke: url(#mfg-route);
  stroke-width: 7;
  stroke-linecap: round;
  filter: drop-shadow(0 0 5px rgba(56, 182, 200, 0.75));
}

.stage__route.is-held {
  stroke: color-mix(in srgb, var(--signal-warn) 74%, var(--accent));
  stroke-dasharray: 18 12;
  animation: route-alert 1.4s linear infinite;
}

.stage__route-edge {
  fill: none;
  stroke: rgba(226, 238, 242, 0.24);
  stroke-width: 1;
}

.stage__map-node {
  fill: var(--bg-panel-2);
  stroke: color-mix(in srgb, var(--accent) 50%, var(--border));
  stroke-width: 2;
}

.node {
  top: auto;
  transform: translate(-50%, -50%) perspective(320px) rotateX(7deg);
  background: linear-gradient(145deg, color-mix(in srgb, var(--bg-elevated) 92%, transparent), var(--bg-panel-2));
  box-shadow: 0 16px 30px -24px #000;
}

.node:hover,
.node.is-selected {
  transform: translate(-50%, -50%) perspective(320px) rotateX(7deg) translateY(-4px);
}

.node.is-selected {
  box-shadow: 0 0 0 1px rgba(56, 182, 200, 0.25), 0 18px 34px -19px rgba(56, 182, 200, 0.75);
}

.stage__material {
  top: 0;
  margin-top: 0;
  z-index: 3;
  transform-origin: center;
}

.stage__queue-material {
  z-index: 2;
  transform: rotate(-12deg);
  animation: queue-pulse 1.5s ease-in-out infinite;
}

@keyframes route-alert {
  to { stroke-dashoffset: -60; }
}

@keyframes queue-pulse {
  50% { opacity: 0.55; transform: rotate(-12deg) translateY(-3px); }
}

@media (prefers-reduced-motion: reduce) {
  .node[data-state='warn'] .node__led,
  .node[data-state='risk'] .node__led {
    animation: none;
  }

  .stage__route.is-held,
  .stage__queue-material {
    animation: none;
  }
}
</style>
