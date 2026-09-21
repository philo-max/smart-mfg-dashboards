<script setup lang="ts">
import { computed } from 'vue'
import { useCountUp } from '@/components/motion/useCountUp'
import type { Level } from '@/data/sim/types'

const props = withDefaults(
  defineProps<{ label: string; value: string | number; unit?: string; en?: string; level?: Level; hint?: string; clickable?: boolean }>(),
  { unit: '', en: '', level: 'normal', hint: '', clickable: false },
)
const emit = defineEmits<{ activate: [] }>()
const shown = useCountUp(() => props.value)

const tone = computed(() => ({ normal: '', warn: 'tone-warn', risk: 'tone-risk' })[props.level])

function onKey(e: KeyboardEvent) {
  if (!props.clickable) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('activate')
  }
}
</script>

<template>
  <div
    class="stat"
    :class="[`is-${level}`, { 'is-clickable': clickable }]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="clickable && emit('activate')"
    @keydown="onKey"
  >
    <span class="stat__label">{{ label }}<span v-if="en" class="ak-en stat__en">{{ en }}</span></span>
    <span class="stat__value ak-num" :class="tone">{{ shown }}<small v-if="unit">{{ unit }}</small></span>
    <span v-if="hint" class="stat__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.stat {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 10px 14px 10px 16px;
  background: var(--bg-panel-2);
  border-left: 3px solid var(--accent);
  min-width: 0;
  transition: background-color var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast);
}

.stat.is-warn { border-left-color: var(--signal-warn); }

.stat.is-risk {
  border-left-color: var(--signal-risk);
  background: var(--signal-risk-soft);
  animation: ak-alarm-pulse 1.4s ease-in-out infinite;
}

.stat.is-picked { box-shadow: inset 0 0 0 2px var(--highlight); background: var(--highlight-soft); }
.stat.is-clickable { cursor: pointer; }
.stat.is-clickable:hover { background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent-line); }

.stat__label {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}

.stat__en { font-size: 10px; }

.stat__value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.05;
  color: var(--text-primary);
}

.stat__value small {
  font-size: 14px;
  margin-left: 3px;
  color: var(--text-secondary);
  font-weight: 400;
}

.stat__hint {
  font-size: 11px;
  color: var(--accent);
}
</style>
