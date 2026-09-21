<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useGsapTimeline } from '@/components/motion/useGsapTimeline'

/**
 * 主舞台动效演示（GSAP）。
 * 业务隐喻：物料/需求沿产线流动 —— 一枚「流动标记」沿轨道持续移动，非无意义闪烁/漂浮。
 * 该组件在 AppShell 中按页签 key 强制重挂载，用于验证切页时时间线被正确销毁。
 * 注：GSAP 统一由 useGsapTimeline 封装使用，此处不引入 gsap；
 *     红色仅用于风险语义，此处不涉及风险，因此只用主题强调色。
 */
const ui = useUiStore()

const { el } = useGsapTimeline(
  ({ tl, el: stageEl }) => {
    const marker = stageEl.querySelector<HTMLElement>('[data-flow-marker]')
    const rail = stageEl.querySelector<HTMLElement>('[data-flow-rail]')
    if (!marker || !rail) return

    tl.fromTo(
      marker,
      { x: 0, opacity: 0 },
      {
        x: () => Math.max(0, rail.clientWidth - marker.offsetWidth),
        opacity: 1,
        duration: 2.6,
        ease: 'none',
        repeat: -1,
        repeatDelay: 0.45,
      },
    )
  },
  { reducedMotion: () => ui.reducedMotion, delay: 120 },
)

const themeLabel = computed(() => ui.activeMeta.label)
</script>

<template>
  <footer ref="el" class="main-stage">
    <span class="main-stage__label">主舞台 · 物料流演示</span>
    <div class="main-stage__rail" data-flow-rail>
      <span v-for="n in 7" :key="n" class="main-stage__node" aria-hidden="true"></span>
      <span class="main-stage__marker" data-flow-marker aria-hidden="true"></span>
    </div>
    <span class="main-stage__theme">{{ themeLabel }}</span>
  </footer>
</template>

<style scoped>
.main-stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-5);
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  transition: background-color var(--motion-theme) var(--ease-standard),
    border-color var(--motion-theme) var(--ease-standard);
}

.main-stage__label,
.main-stage__theme {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  white-space: nowrap;
}

.main-stage__rail {
  position: relative;
  height: 16px;
  border-radius: 999px;
  background: var(--bg-panel-2);
  border: 1px solid var(--border);
  overflow: hidden;
}

.main-stage__node {
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  margin-top: -3px;
  border-radius: 50%;
  background: var(--border-strong);
}

.main-stage__node:nth-child(1) { left: 4%; }
.main-stage__node:nth-child(2) { left: 18%; }
.main-stage__node:nth-child(3) { left: 32%; }
.main-stage__node:nth-child(4) { left: 46%; }
.main-stage__node:nth-child(5) { left: 60%; }
.main-stage__node:nth-child(6) { left: 74%; }
.main-stage__node:nth-child(7) { left: 88%; }

.main-stage__marker {
  position: absolute;
  top: 2px;
  left: 0;
  width: 46px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  will-change: transform;
}
</style>
