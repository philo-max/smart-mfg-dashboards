<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui'

const ENTER_WINDOW_MS = 2000
const MAX_SEQ = 14
const ROW_PX = 60

const ui = useUiStore()
const layer = ref<HTMLDivElement | null>(null)
const entering = ref(false)
let leaveTimer: number | null = null

function assignSequence() {
  const root = layer.value
  if (!root) return
  const rows = [...root.querySelectorAll<HTMLElement>('.ak-panel')].map((el) => {
    const r = el.getBoundingClientRect()
    return { el, row: Math.round(r.top / ROW_PX), left: r.left }
  })
  rows.sort((a, b) => a.row - b.row || a.left - b.left)
  rows.forEach((item, i) => item.el.style.setProperty('--seq', String(Math.min(i, MAX_SEQ))))
}

async function playEnter() {
  entering.value = true
  await nextTick()
  assignSequence()
  if (leaveTimer !== null) window.clearTimeout(leaveTimer)
  leaveTimer = window.setTimeout(() => (entering.value = false), ENTER_WINDOW_MS)
}

onMounted(playEnter)
watch(() => ui.view, playEnter, { flush: 'post' })
onBeforeUnmount(() => {
  if (leaveTimer !== null) window.clearTimeout(leaveTimer)
})
</script>

<template>
  <div ref="layer" class="page-layer" :class="{ 'is-entering': entering }">
    <slot />
  </div>
</template>

<style scoped>
.page-layer {
  position: absolute;
  inset: 0;
  padding: 18px 24px 22px;
  overflow: hidden;
  display: flex;
  --enter-base: 0.24s;
}

.page-layer > :deep(*) {
  flex: 1;
  min-width: 0;
}

.page-layer.is-entering :deep(.ak-panel) {
  animation: panel-in 0.62s var(--ease-standard) both;
  animation-delay: calc(var(--enter-base) + var(--seq, 0) * 0.055s);
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(26px) scale(0.985);
    filter: brightness(2.2) saturate(0.4);
  }
  60% {
    filter: brightness(1.35);
  }
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
</style>
