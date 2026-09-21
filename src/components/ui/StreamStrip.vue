<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from '@lucide/vue'
import { MODULES, type ModuleId } from '@/data/modules'
import { moduleLinkage } from '@/data/sim/selectors'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

/** 上下游联动条：显示当前模块在物料流中的位置，点击上/下游节点直接跳转 */
const props = defineProps<{ module: ModuleId }>()
const plant = usePlantStore()
const ui = useUiStore()

const link = computed(() => moduleLinkage(plant.state, props.module))
const self = computed(() => MODULES[props.module])
const LEVEL_TEXT = { normal: '正常', warn: '预警', risk: '异常' } as const
</script>

<template>
  <section class="strip" :style="{ '--room': self.color }" aria-label="上下游联动">
    <button type="button" class="node" :class="`is-${link.up.level}`" @click="ui.navigate(link.up.module)">
      <span class="node__tag">上游</span>
      <span class="node__name">{{ MODULES[link.up.module].name }}</span>
      <span class="node__label">{{ link.up.label }}</span>
      <b class="node__value ak-num">{{ link.up.value }}</b>
      <span class="node__lvl">{{ LEVEL_TEXT[link.up.level] }}</span>
    </button>

    <span class="flow" aria-hidden="true"><ChevronRight :size="18" /></span>

    <div class="self">
      <component :is="self.icon" :size="20" />
      <b>{{ self.name }}</b>
      <span class="ak-en">{{ LEVEL_TEXT[plant.levels[module]] }} · {{ self.en }}</span>
    </div>

    <span class="flow" aria-hidden="true"><ChevronRight :size="18" /></span>

    <button type="button" class="node" :class="`is-${link.down.level}`" @click="ui.navigate(link.down.module)">
      <span class="node__tag">下游</span>
      <span class="node__name">{{ MODULES[link.down.module].name }}</span>
      <span class="node__label">{{ link.down.label }}</span>
      <b class="node__value ak-num">{{ link.down.value }}</b>
      <span class="node__lvl">{{ LEVEL_TEXT[link.down.level] }}</span>
    </button>
  </section>
</template>

<style scoped>
.strip {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr auto minmax(240px, 0.6fr) auto 1fr;
  align-items: center;
  gap: 10px;
  height: 52px;
}

.node {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  text-align: left;
  font-size: 13px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-left: 3px solid var(--signal-pos);
  color: var(--text-secondary);
}

.node:hover { border-color: var(--accent); background: var(--accent-soft); }
.node.is-warn { border-left-color: var(--signal-warn); }
.node.is-risk { border-left-color: var(--signal-risk); background: var(--signal-risk-soft); }

.node__tag {
  font-size: 11px;
  padding: 1px 6px;
  color: #0a0c0f;
  background: var(--text-secondary);
  font-weight: 700;
}

.node__name { color: var(--text-primary); font-weight: 700; }
.node__label { flex: 1; color: var(--text-muted); }
.node__value { font-size: 16px; color: var(--text-primary); }
.node__lvl { font-size: 11px; color: var(--signal-pos); }
.node.is-warn .node__lvl { color: var(--signal-warn); }
.node.is-risk .node__lvl { color: var(--signal-risk); }

.flow {
  color: var(--room);
  animation: strip-flow 1.6s ease-in-out infinite;
}

@keyframes strip-flow {
  50% { transform: translateX(4px); opacity: 0.4; }
}

.self {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--room);
  background: color-mix(in srgb, var(--room) 12%, transparent);
  border: 1px solid var(--room);
  clip-path: polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%);
}

.self b { font-size: 17px; color: var(--text-primary); letter-spacing: 0.06em; }
</style>
