<script setup lang="ts">
import { computed } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import { causalChains } from '@/data/sim/chains'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const plant = usePlantStore()
const ui = useUiStore()
const chains = computed(() => causalChains(plant.state))
</script>

<template>
  <AkPanel title="联动态势" en="LINKAGE">
    <div class="chains">
      <div v-for="c in chains" :key="c.name" class="chain">
        <span class="chain__name">{{ c.name }}</span>
        <template v-for="(step, i) in c.steps" :key="step.label">
          <span v-if="i > 0" class="chain__arrow" :class="{ 'is-hot': step.active && c.steps[i - 1].active }" aria-hidden="true">›</span>
          <button type="button" class="chain__step" :class="{ 'is-active': step.active }" :title="step.evidence" @click="ui.navigate(step.module)">
            {{ step.label }}
          </button>
        </template>
      </div>
    </div>
  </AkPanel>
</template>

<style scoped>
.chains {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  flex: 1;
  gap: 8px;
}

.chain {
  display: flex;
  align-items: center;
  gap: 5px;
}

.chain__name {
  width: 48px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.chain__step {
  flex: 1;
  padding: 5px 0;
  font-size: 12px;
  background: rgba(160, 205, 255, 0.04);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  white-space: nowrap;
}

.chain__step.is-active {
  color: #fff;
  border-color: var(--signal-risk);
  background: var(--signal-risk-soft);
  box-shadow: 0 0 10px rgba(255, 70, 85, 0.35);
}

.chain__arrow {
  color: var(--text-muted);
  font-size: 16px;
}

.chain__arrow.is-hot {
  color: var(--signal-risk);
  animation: ak-blink 0.9s steps(2) infinite;
}
</style>
