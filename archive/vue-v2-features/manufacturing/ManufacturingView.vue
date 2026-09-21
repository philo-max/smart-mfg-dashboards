<script setup lang="ts">
import OrderRibbon from './components/OrderRibbon.vue'
import ProductionStage from './components/ProductionStage.vue'
import DecisionPanel from './components/DecisionPanel.vue'
import BottleneckPanel from './components/BottleneckPanel.vue'
import MetricRail from './components/MetricRail.vue'
</script>

<template>
  <section class="mfg">
    <!-- L1 -->
    <OrderRibbon />

    <!-- L2：主视觉 + 决策 -->
    <div class="mfg__l2">
      <ProductionStage />
      <DecisionPanel />
    </div>

    <!-- L3：趋势 + 指标 -->
    <div class="mfg__l3">
      <BottleneckPanel />
      <MetricRail />
    </div>
  </section>
</template>

<style scoped>
.mfg {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 10px;
}

.mfg__l2 {
  display: grid;
  grid-template-columns: 1.9fr 1fr;
  gap: 10px;
  min-height: 0;
}

.mfg__l3 {
  display: grid;
  grid-template-columns: 1.9fr 1fr;
  gap: 10px;
  height: 168px;
}
</style>
