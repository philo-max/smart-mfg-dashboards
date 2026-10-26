<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import TopBar from './TopBar.vue'
import AlarmToast from './AlarmToast.vue'
import ScenarioConsole from './ScenarioConsole.vue'
import TraceModal from './TraceModal.vue'
import CauseModal from './CauseModal.vue'
import TransitionCurtain from './TransitionCurtain.vue'
import BootSequence from './BootSequence.vue'
import PageTransition from '@/components/motion/PageTransition.vue'
import BaseOverview from '@/features/overview/BaseOverview.vue'
import WarehouseView from '@/features/warehouse/WarehouseView.vue'
import AgvView from '@/features/agv/AgvView.vue'
import AssemblyView from '@/features/assembly/AssemblyView.vue'
import InspectionView from '@/features/inspection/InspectionView.vue'
import LogisticsView from '@/features/logistics/LogisticsView.vue'
import { MODULE_ORDER, MODULES, type ModuleId } from '@/data/modules'
import { INSPECTION_PAGES, isInspectionPage } from '@/features/inspection/pages'
import { usePlantStore } from '@/stores/plant'
import { useUiStore, type ViewId } from '@/stores/ui'

const DESIGN_W = 1920
const TOUR_DWELL_MS = 12000
const DESIGN_H = 1080

const VIEWS: Record<ViewId, Component> = {
  overview: BaseOverview,
  warehouse: WarehouseView,
  agv: AgvView,
  assembly: AssemblyView,
  inspection: InspectionView,
  logistics: LogisticsView,
}

const ui = useUiStore()
const plant = usePlantStore()
const soloParam = new URLSearchParams(window.location.search).get('unit')
if (soloParam && soloParam in MODULES) ui.enterSolo(soloParam as ModuleId)
const pageParam = new URLSearchParams(window.location.search).get('page')
if (isInspectionPage(pageParam)) ui.setInspectionPage(pageParam)
const scale = ref(1)
const skipBoot = new URLSearchParams(window.location.search).has('noboot') || window.matchMedia('(prefers-reduced-motion: reduce)').matches
const contentReady = ref(skipBoot)
const bootVisible = ref(!skipBoot)

if (skipBoot) ui.endBoot()

function onBootOpen() {
  contentReady.value = true
}

function onBootDone() {
  bootVisible.value = false
  ui.endBoot()
}
const viewport = ref<HTMLDivElement | null>(null)
const activeView = computed(() => VIEWS[ui.view])
let observer: ResizeObserver | null = null

function fit() {
  const el = viewport.value
  if (!el) return
  scale.value = Math.min(el.clientWidth / DESIGN_W, el.clientHeight / DESIGN_H)
}

/** 大屏自动巡视：总览与五个模块依次轮播；弹窗打开时暂缓；手动切换视图后重新计时 */
const TOUR_ORDER: ViewId[] = ['overview', ...MODULE_ORDER]
let tourTimer: number | null = null

/** 用户主动打开的弹窗（不含系统自动弹出的告警窗）：巡视与快捷键都要让路 */
const USER_MODAL = '#ak-overlay .ak-modal-mask:not([data-alert])'

function stepTour() {
  if (document.querySelector(USER_MODAL)) return
  const next = (TOUR_ORDER.indexOf(ui.view) + 1) % TOUR_ORDER.length
  ui.navigate(TOUR_ORDER[next])
}

function scheduleTour() {
  if (tourTimer !== null) window.clearInterval(tourTimer)
  tourTimer = ui.tour ? window.setInterval(stepTour, TOUR_DWELL_MS) : null
}

watch(() => [ui.tour, ui.view], scheduleTour)

/** 快捷键：0 总览 · 1–5 模块 · 空格 暂停 · S 演练台；输入框内与弹窗打开时不响应 */
function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  if (e.ctrlKey || e.metaKey || e.altKey || ui.booting) return
  if (document.querySelector(USER_MODAL)) return
  if (e.key === '0') ui.back()
  else if (e.key >= '1' && e.key <= (ui.solo === 'inspection' ? String(INSPECTION_PAGES.length) : '5')) {
    if (ui.solo === 'inspection') ui.setInspectionPage(INSPECTION_PAGES[Number(e.key) - 1].id)
    else ui.navigate(MODULE_ORDER[Number(e.key) - 1])
  }
  else if (e.key === ' ') {
    e.preventDefault()
    plant.togglePause()
  } else if (e.key.toLowerCase() === 's') ui.toggleConsole()
  else if (e.key.toLowerCase() === 't' && !ui.solo) ui.toggleTour()
}

onMounted(() => {
  fit()
  observer = new ResizeObserver(fit)
  if (viewport.value) observer.observe(viewport.value)
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  window.removeEventListener('keydown', onKey)
  if (tourTimer !== null) window.clearInterval(tourTimer)
})
</script>

<template>
  <div ref="viewport" class="viewport">
    <div class="stage" :style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
      <div class="stage__bg" aria-hidden="true"></div>
      <div class="stage__scan" aria-hidden="true"></div>
      <TopBar />
      <main class="stage__main">
        <PageTransition v-if="contentReady">
          <component :is="activeView" :key="ui.view" />
        </PageTransition>
      </main>
      <TransitionCurtain />
      <BootSequence v-if="bootVisible" @open="onBootOpen" @done="onBootDone" />
      <AlarmToast />
      <ScenarioConsole />
      <TraceModal />
      <CauseModal />
      <div id="ak-overlay"></div>
    </div>
  </div>
</template>

<style scoped>
.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #050608;
}

.stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--stage-w);
  height: var(--stage-h);
  display: grid;
  grid-template-rows: 76px minmax(0, 1fr);
  overflow: hidden;
  background: var(--bg-app);
  transform-origin: center center;
}

.stage__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 18% 8%, rgba(35, 200, 255, 0.16), transparent 46%),
    radial-gradient(ellipse at 88% 92%, rgba(58, 141, 255, 0.14), transparent 50%),
    radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.55)),
    linear-gradient(var(--grid-line) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px) 0 0 / 40px 40px;
}

.stage__bg::before,
.stage__bg::after {
  content: '';
  position: absolute;
  top: -20%;
  bottom: -20%;
  transform: skewX(-14deg);
}

.stage__bg::before {
  left: 8%;
  width: 260px;
  background: linear-gradient(90deg, transparent, rgba(35, 200, 255, 0.06), transparent);
  animation: beam-drift 26s ease-in-out infinite alternate;
}

.stage__bg::after {
  left: 52%;
  width: 120px;
  background: linear-gradient(90deg, transparent, rgba(127, 227, 255, 0.05), transparent);
  animation: beam-drift 34s ease-in-out -9s infinite alternate-reverse;
}

@keyframes beam-drift {
  from { transform: translateX(-260px) skewX(-14deg); }
  to { transform: translateX(520px) skewX(-14deg); }
}

.stage__scan {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(160, 220, 255, 0.022) 0 1px, transparent 1px 3px);
}

.stage__scan::after {
  content: 'INTELLIGENT MANUFACTURING · LENOVO MINI LINE';
  position: absolute;
  right: 30px;
  bottom: 8px;
  font-family: var(--font-en);
  font-size: 11px;
  font-style: italic;
  letter-spacing: 0.4em;
  color: rgba(159, 179, 202, 0.22);
}

.stage__main {
  position: relative;
  min-height: 0;
  overflow: hidden;
}

#ak-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  pointer-events: none;
}

#ak-overlay > :deep(*) {
  pointer-events: auto;
}
</style>
