<script setup lang="ts">
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { useManufacturingStore } from '../stores/manufacturing'
import { riskMeta } from '../data/manufacturing'

const store = useManufacturingStore()

const order = computed(() => store.config.order)
const risk = computed(() => riskMeta(order.value.risk))
</script>

<template>
  <header class="ribbon panel">
    <div class="ribbon__order">
      <span class="ribbon__code">订单 {{ order.code }}</span>
      <span class="ribbon__node">当前 · {{ store.currentNodeName }}</span>
    </div>

    <dl class="ribbon__facts">
      <div class="ribbon__fact">
        <dt>当前工位</dt>
        <dd>
          <Motion
            :key="store.scenario + '-node'"
            :initial="{ opacity: 0, y: 6 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.3 }"
          >
            {{ store.currentNodeName }}
          </Motion>
        </dd>
      </div>
      <div class="ribbon__fact">
        <dt>预计交付</dt>
        <dd>
          <Motion
            :key="store.scenario + '-eta'"
            :initial="{ opacity: 0, y: 6 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.3, delay: 0.05 }"
          >
            {{ order.eta }}
          </Motion>
        </dd>
      </div>
      <div class="ribbon__fact">
        <dt>责任角色</dt>
        <dd>{{ order.owner }}</dd>
      </div>
    </dl>

    <div class="ribbon__tail">
      <Motion
        class="chip"
        :key="store.scenario + '-risk'"
        :data-tone="risk.tone"
        :initial="{ opacity: 0, scale: 0.9 }"
        :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.3 }"
      >
        {{ risk.label }}
      </Motion>

      <div class="ribbon__scenarios" role="group" aria-label="场景切换">
        <button
          v-for="s in store.scenarios"
          :key="s.id"
          type="button"
          class="seg-btn"
          :class="{ 'is-active': s.id === store.scenario }"
          :aria-pressed="s.id === store.scenario"
          @click="store.setScenario(s.id)"
        >
          {{ s.label }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.ribbon {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-5);
  padding: 10px var(--space-5);
}

.ribbon__order {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ribbon__code {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.ribbon__node {
  font-size: 11px;
  color: var(--text-muted);
}

.ribbon__facts {
  display: flex;
  gap: var(--space-6);
  margin: 0;
  min-width: 0;
}

.ribbon__fact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ribbon__fact dt {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

.ribbon__fact dd {
  margin: 0;
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
}

.ribbon__tail {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid transparent;
  white-space: nowrap;
}

.chip[data-tone='pos'] {
  color: var(--signal-pos);
  background: color-mix(in srgb, var(--signal-pos) 14%, transparent);
  border-color: color-mix(in srgb, var(--signal-pos) 40%, transparent);
}

.chip[data-tone='warn'] {
  color: var(--signal-warn);
  background: color-mix(in srgb, var(--signal-warn) 14%, transparent);
  border-color: color-mix(in srgb, var(--signal-warn) 40%, transparent);
}

.chip[data-tone='risk'] {
  color: var(--signal-risk);
  background: color-mix(in srgb, var(--signal-risk) 16%, transparent);
  border-color: color-mix(in srgb, var(--signal-risk) 45%, transparent);
}

.ribbon__scenarios {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-panel-2);
}

.seg-btn {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color var(--motion-theme) var(--ease-standard),
    color var(--motion-theme) var(--ease-standard);
}

.seg-btn:hover {
  color: var(--text-primary);
}

.seg-btn.is-active {
  background: var(--accent-soft);
  color: var(--accent-strong);
  box-shadow: inset 0 0 0 1px var(--accent-line);
}
</style>
