<script setup lang="ts">
import { computed } from 'vue'
import TopBar from './TopBar.vue'
import MainStage from './MainStage.vue'
import PageTransition from '@/components/motion/PageTransition.vue'
import ManufacturingView from '@/features/manufacturing/ManufacturingView.vue'
import ProductInsightView from '@/features/product-insight/ProductInsightView.vue'
import HealthMarketView from '@/features/health-market/HealthMarketView.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()

const activeView = computed(() => {
  switch (ui.activeTab) {
    case 'product-insight':
      return ProductInsightView
    case 'health-market':
      return HealthMarketView
    default:
      return ManufacturingView
  }
})
</script>

<template>
  <div class="app-shell theme-surface" :data-theme="ui.activeTheme">
    <TopBar />
    <main class="app-shell__stage">
      <PageTransition>
        <component :is="activeView" :key="ui.activeTab" />
      </PageTransition>
    </main>
    <MainStage v-if="ui.activeTab !== 'manufacturing'" :key="`stage-${ui.activeTab}`" />
  </div>
</template>

<style scoped>
.app-shell {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  background: var(--bg-app);
}

.app-shell__stage {
  position: relative;
  min-height: 0;
  overflow: hidden;
}
</style>
