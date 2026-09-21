<script setup lang="ts">
import { Motion } from 'motion-v'
import { useManufacturingStore } from '../stores/manufacturing'

const store = useManufacturingStore()
</script>

<template>
  <section class="metric-rail panel" aria-label="关键指标">
    <span class="metric-rail__title">关键指标</span>
    <ul class="metric-rail__list">
      <li v-for="m in store.config.metrics" :key="m.key" class="metric">
        <span class="metric__label">{{ m.label }}</span>
        <Motion
          class="metric__value"
          :key="store.scenario + '-' + m.key"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.35 }"
        >
          {{ m.value }}<em>{{ m.unit }}</em>
        </Motion>
        <span class="metric__delta" :data-tone="m.tone">{{ m.deltaText }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.metric-rail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px var(--space-5);
  min-width: 0;
}

.metric-rail__title {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.metric-rail__list {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
  flex: 1;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.metric__label {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.metric__value {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.metric__value em {
  font-style: normal;
  font-size: 11px;
  color: var(--text-muted);
  margin-left: 3px;
}

.metric__delta {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.metric__delta[data-tone='pos'] { color: var(--signal-pos); }
.metric__delta[data-tone='warn'] { color: var(--signal-warn); }
.metric__delta[data-tone='neg'] { color: var(--signal-risk); }
.metric__delta[data-tone='risk'] { color: var(--signal-risk); }
</style>
