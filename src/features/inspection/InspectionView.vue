<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import StreamStrip from '@/components/ui/StreamStrip.vue'
import InspectionNav from './InspectionNav.vue'
import InspectionReportModal from './InspectionReportModal.vue'
import OverviewPage from './pages/OverviewPage.vue'
import EfficiencyPage from './pages/EfficiencyPage.vue'
import QualityPage from './pages/QualityPage.vue'
import ResourcePage from './pages/ResourcePage.vue'
import ExceptionPage from './pages/ExceptionPage.vue'
import type { InspectionPageId } from './pages'
import { useUiStore } from '@/stores/ui'

const PAGES: Record<InspectionPageId, Component> = {
  overview: OverviewPage,
  efficiency: EfficiencyPage,
  quality: QualityPage,
  resource: ResourcePage,
  exception: ExceptionPage,
}

const ui = useUiStore()
const page = computed(() => PAGES[ui.inspectionPage])
const reportOpen = ref(false)
</script>

<template>
  <div class="module insp" :class="{ 'insp--solo': ui.solo }">
    <StreamStrip v-if="!ui.solo" module="inspection" />
    <InspectionNav @report="reportOpen = true" />
    <div :key="ui.inspectionPage" class="insp__page"><component :is="page" /></div>
    <InspectionReportModal v-model:open="reportOpen" />
  </div>
</template>

<style scoped>
.insp { grid-template-rows: auto auto minmax(0, 1fr); }
.insp--solo { grid-template-rows: auto minmax(0, 1fr); }
.insp__page { display: contents; }
.insp__page > :deep(.col) { animation: insp-rise 0.38s ease both; }
.insp__page > :deep(.col:nth-child(2)) { animation-delay: 0.05s; }
.insp__page > :deep(.col:nth-child(3)) { animation-delay: 0.1s; }

@keyframes insp-rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .insp__page > :deep(.col) { animation: none; }
}
</style>
