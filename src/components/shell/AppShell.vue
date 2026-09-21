<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import TopBar from './TopBar.vue'
import AlarmToast from './AlarmToast.vue'
import PageTransition from '@/components/motion/PageTransition.vue'
import BaseOverview from '@/features/overview/BaseOverview.vue'
import WarehouseView from '@/features/warehouse/WarehouseView.vue'
import AgvView from '@/features/agv/AgvView.vue'
import AssemblyView from '@/features/assembly/AssemblyView.vue'
import InspectionView from '@/features/inspection/InspectionView.vue'
import LogisticsView from '@/features/logistics/LogisticsView.vue'
import { useUiStore, type ViewId } from '@/stores/ui'

const DESIGN_W = 1920
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
const scale = ref(1)
const viewport = ref<HTMLDivElement | null>(null)
const activeView = computed(() => VIEWS[ui.view])
let observer: ResizeObserver | null = null

function fit() {
  const el = viewport.value
  if (!el) return
  scale.value = Math.min(el.clientWidth / DESIGN_W, el.clientHeight / DESIGN_H)
}

onMounted(() => {
  fit()
  observer = new ResizeObserver(fit)
  if (viewport.value) observer.observe(viewport.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div ref="viewport" class="viewport">
    <div class="stage" :style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
      <div class="stage__bg" aria-hidden="true"></div>
      <TopBar />
      <main class="stage__main">
        <PageTransition>
          <component :is="activeView" :key="ui.view" />
        </PageTransition>
      </main>
      <AlarmToast />
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
  background:
    radial-gradient(ellipse at 45% 55%, rgba(35, 200, 255, 0.1), transparent 60%),
    linear-gradient(var(--grid-line) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px) 0 0 / 40px 40px;
}

.stage__bg::after {
  content: 'RHODES ISLAND · RIIC';
  position: absolute;
  right: 28px;
  bottom: 10px;
  font-family: var(--font-en);
  font-size: 11px;
  letter-spacing: 0.4em;
  color: rgba(163, 173, 183, 0.18);
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
