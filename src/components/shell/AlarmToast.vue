<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { TriangleAlert } from '@lucide/vue'
import { MODULES } from '@/data/modules'
import type { PlantAlarm } from '@/data/sim/types'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

/** 新告警弹条：持续 5 秒自动消失；点击直达对应模块并带上焦点 */
const TOAST_MS = 5000
const plant = usePlantStore()
const ui = useUiStore()
const current = ref<PlantAlarm | null>(null)
let timer: number | null = null

watch(
  () => plant.latestAlarm,
  (alarm) => {
    if (!alarm) return
    current.value = alarm
    if (timer !== null) window.clearTimeout(timer)
    timer = window.setTimeout(() => { current.value = null }, TOAST_MS)
  },
)

onBeforeUnmount(() => { if (timer !== null) window.clearTimeout(timer) })

function open() {
  if (!current.value) return
  ui.navigate(current.value.module, current.value.focus ?? null)
  current.value = null
}
</script>

<template>
  <Transition name="toast">
    <button v-if="current" type="button" class="toast" :class="`is-${current.level}`" @click="open">
      <span class="toast__stripe ak-hazard" aria-hidden="true"></span>
      <TriangleAlert :size="22" />
      <span class="toast__meta">
        <b>{{ current.level === 'risk' ? '紧急' : '重要' }} · {{ current.category }}</b>
        <span class="ak-num">{{ current.time }} · {{ MODULES[current.module].name }}</span>
      </span>
      <span class="toast__text">{{ current.text }}</span>
      <span class="toast__go">查看 ›</span>
    </button>
  </Transition>
</template>

<style scoped>
.toast {
  position: absolute;
  top: 92px;
  left: 50%;
  z-index: 40;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 1100px;
  padding: 12px 22px 12px 0;
  border: 1px solid var(--signal-warn);
  background: rgba(40, 28, 6, 0.95);
  color: var(--signal-warn);
  text-align: left;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
}

.toast.is-risk {
  border-color: var(--signal-risk);
  background: rgba(52, 8, 14, 0.95);
  color: var(--signal-risk);
}

.toast__stripe {
  align-self: stretch;
  width: 14px;
}

.toast__meta {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  white-space: nowrap;
}

.toast__meta b { font-size: 15px; }

.toast__text {
  font-size: 16px;
  color: var(--text-primary);
}

.toast__go {
  font-size: 13px;
  white-space: nowrap;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s var(--ease-standard), transform 0.3s var(--ease-standard);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -16px);
}
</style>
