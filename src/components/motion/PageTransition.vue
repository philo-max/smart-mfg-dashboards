<script setup lang="ts">
import { AnimatePresence, Motion } from 'motion-v'
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'

/**
 * 视图转场：基建总览 ↔ 房间。进入房间时内容自右滑入（方舟式推进），返回时自左滑入。
 * 退场 + 入场合计约 600ms；减少动效时压缩为瞬时。
 */
const ui = useUiStore()

const duration = computed(() => (ui.reducedMotion ? 0.001 : 0.3))
const dir = computed(() => (ui.view === 'overview' ? -1 : 1))
const ease = [0.22, 1, 0.36, 1] as const
</script>

<template>
  <AnimatePresence mode="wait" :initial="false">
    <Motion
      :key="ui.view"
      class="page-layer"
      :initial="{ opacity: 0, x: 60 * dir }"
      :animate="{ opacity: 1, x: 0 }"
      :exit="{ opacity: 0, x: -40 * dir }"
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
  padding: 18px 24px 22px;
  overflow: hidden;
  display: flex;
}

.page-layer > :deep(*) {
  flex: 1;
  min-width: 0;
}
</style>
