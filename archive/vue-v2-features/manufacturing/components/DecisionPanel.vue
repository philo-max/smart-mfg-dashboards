<script setup lang="ts">
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { useManufacturingStore } from '../stores/manufacturing'
import { riskMeta } from '../data/manufacturing'

const store = useManufacturingStore()

const decision = computed(() => store.config.decision)
const risk = computed(() => riskMeta(decision.value.risk))
</script>

<template>
  <section class="decision panel" aria-label="决策建议">
    <header class="decision__head">
      <Motion
        class="chip"
        :key="store.scenario + '-drisk'"
        :data-tone="risk.tone"
        :initial="{ opacity: 0, scale: 0.9 }"
        :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.3 }"
      >
        {{ risk.label }}
      </Motion>
      <span class="decision__severity">瓶颈 · {{ store.bottleneckName }}</span>
    </header>

    <Motion
      class="decision__body"
      :key="store.scenario + '-dbody'"
      :initial="{ opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.15 }"
    >
      <h3 class="decision__headline">{{ decision.headline }}</h3>
      <p class="decision__label">根因</p>
      <p class="decision__cause">{{ decision.rootCause }}</p>

      <p class="decision__label">建议动作</p>
      <ul class="decision__actions">
        <li v-for="(action, i) in decision.actions" :key="action" class="action">
          <span class="action__index">{{ i + 1 }}</span>
          <span class="action__text">{{ action }}</span>
          <button
            type="button"
            class="action__claim"
            :class="{ 'is-claimed': store.isClaimed(action) }"
            @click="store.toggleClaim(action)"
          >
            {{ store.isClaimed(action) ? '已认领' : '认领' }}
          </button>
        </li>
      </ul>
    </Motion>
  </section>
</template>

<style scoped>
.decision {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px var(--space-4);
  min-width: 0;
  overflow: hidden;
}

.decision__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
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

.decision__severity {
  font-size: 11px;
  color: var(--text-muted);
}

.decision__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.decision__headline {
  font-size: 16px;
  font-weight: 600;
}

.decision__label {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-top: 4px;
}

.decision__cause {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.decision__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.action {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-panel-2);
}

.action__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 11px;
  color: var(--accent-strong);
  background: var(--accent-soft);
}

.action__text {
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--text-primary);
}

.action__claim {
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color var(--motion-theme) var(--ease-standard),
    color var(--motion-theme) var(--ease-standard),
    border-color var(--motion-theme) var(--ease-standard);
}

.action__claim:hover {
  color: var(--text-primary);
  border-color: var(--accent-line);
}

.action__claim.is-claimed {
  color: var(--signal-pos);
  border-color: color-mix(in srgb, var(--signal-pos) 45%, transparent);
  background: color-mix(in srgb, var(--signal-pos) 12%, transparent);
}
</style>
