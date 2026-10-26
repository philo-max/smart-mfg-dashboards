<script setup lang="ts">
import { Check, X } from '@lucide/vue'
import type { ProcessSnapshot } from '../processSim'

defineProps<{ snap: ProcessSnapshot }>()
</script>

<template>
  <ol class="chain" aria-label="检测流程链">
    <li v-for="(s, i) in snap.steps" :key="s.id" class="chain__step" :class="`is-${s.state}`">
      <span class="chain__dot">
        <Check v-if="s.state === 'done'" :size="14" />
        <X v-else-if="s.state === 'fail'" :size="14" />
        <b v-else class="ak-num">{{ i + 1 }}</b>
      </span>
      <span class="chain__text">{{ s.name }}<small>{{ s.device }}</small></span>
    </li>
  </ol>
</template>

<style scoped>
.chain { flex: 1; display: grid; grid-template-columns: repeat(5, 1fr); margin: 0; padding: 0; list-style: none; gap: 6px; }
.chain__step { position: relative; display: flex; align-items: center; gap: 10px; padding: 6px 10px; background: var(--bg-panel-2); border-top: 3px solid var(--border); color: var(--text-muted); }
.chain__step:not(:last-child)::after { content: '›'; position: absolute; right: -9px; top: 50%; transform: translateY(-50%); z-index: 1; font-size: 18px; color: var(--text-muted); }
.chain__dot { flex: none; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; border: 1px solid currentColor; font-size: 13px; }
.chain__text { display: flex; flex-direction: column; font-size: 14px; line-height: 1.25; }
.chain__text small { font-size: 11px; color: var(--text-muted); }
.chain__step.is-done { border-top-color: var(--signal-pos); color: var(--signal-pos); }
.chain__step.is-done .chain__text { color: var(--text-secondary); }
.chain__step.is-active { border-top-color: var(--room-inspection); color: var(--room-inspection); background: var(--accent-soft); animation: chain-pulse 1.4s ease-in-out infinite; }
.chain__step.is-active .chain__text { color: var(--text-primary); }
.chain__step.is-fail { border-top-color: var(--signal-risk); color: var(--signal-risk); background: var(--signal-risk-soft); }
.chain__step.is-fail .chain__text { color: var(--text-primary); }

@keyframes chain-pulse {
  50% { box-shadow: inset 0 0 14px rgba(255, 138, 76, 0.28); }
}

@media (prefers-reduced-motion: reduce) {
  .chain__step.is-active { animation: none; }
}
</style>
