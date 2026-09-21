<script setup lang="ts">
import { AnimatePresence, Motion } from 'motion-v'
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'

/**
 * 页签转场：内容退场 -> 主题色过渡 -> 新页分层进入（非简单淡入淡出）。
 * 退场 + 入场合计约 600ms，落在 450–650ms 区间；减少动效时压缩为瞬时。
 * 「分层进入」由各页内部的 StaggerReveal 承担。
 */
const ui = useUiStore()

const duration = computed(() => (ui.reducedMotion ? 0.001 : 0.3))
const ease = [0.22, 1, 0.36, 1] as const
</script>

<template>
  <AnimatePresence mode="wait" :initial="false">
    <Motion
      :key="ui.activeTab"
      class="page-layer"
      :initial="{ opacity: 0, y: 30 }"
      :animate="{ opacity: 1, y: 0 }"
      :exit="{ opacity: 0, y: -20 }"
      :transition="{ duration, ease }"
    >
      <slot />
    </Motion>
  </AnimatePresence>
</template>

<style scoped>
.page-layer {
  position: absolute;
  inset: 0;
  padding: var(--space-4) var(--space-5);
  overflow: hidden;
  display: flex;
}
</style>
