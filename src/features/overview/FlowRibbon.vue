<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from '@lucide/vue'
import { MODULES, type ModuleId } from '@/data/modules'
import { inspectionTotals } from '@/data/sim/selectors'
import type { Level } from '@/data/sim/types'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

/**
 * 物料流向带：仓库 → AGV → 装配 → 检测 → 回库。
 * 动效带业务含义：上下游都正常时粒子匀速流动；任一侧预警则变慢变黄；异常则停滞变红。
 */
const plant = usePlantStore()
const ui = useUiStore()

interface Node {
  module: ModuleId
  label: string
  value: number
  unit: string
}

const nodes = computed<Node[]>(() => {
  const s = plant.state
  return [
    { module: 'warehouse', label: '仓库出库', value: s.warehouse.outboundToday, unit: '件' },
    { module: 'agv', label: 'AGV 配送', value: s.agv.tasksDone, unit: '趟' },
    { module: 'assembly', label: '装配', value: s.assembly.produced, unit: '件' },
    { module: 'inspection', label: '检测', value: inspectionTotals(s).total, unit: '件' },
    { module: 'logistics', label: '合格回库', value: s.logistics.ordersTotal, unit: '单' },
  ]
})

const RANK: Record<Level, number> = { normal: 0, warn: 1, risk: 2 }

/** 连接 i → i+1 的状态：取两端中更差的等级 */
function flowState(i: number): Level {
  const a = plant.levels[nodes.value[i].module]
  const b = plant.levels[nodes.value[i + 1].module]
  return RANK[a] >= RANK[b] ? a : b
}
</script>

<template>
  <nav class="ribbon" aria-label="物料流向">
    <template v-for="(n, i) in nodes" :key="n.module">
      <div v-if="i > 0" class="link" :class="`is-${flowState(i - 1)}`" aria-hidden="true">
        <i></i><i></i><i></i>
        <ChevronRight :size="16" class="link__head" />
      </div>
      <button type="button" class="node" :class="`is-${plant.levels[n.module]}`" :style="{ '--room': MODULES[n.module].color }" @click="ui.navigate(n.module)">
        <span class="node__label">{{ n.label }}</span>
        <b class="ak-num">{{ n.value.toLocaleString() }}<small>{{ n.unit }}</small></b>
      </button>
    </template>
  </nav>
</template>

<style scoped>
.ribbon {
  display: flex;
  align-items: center;
  gap: 0;
  height: 56px;
}

.node {
  flex: 0 0 auto;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  height: 100%;
  padding: 0 16px;
  text-align: left;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-left: 4px solid var(--room);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
}

.node:hover { background: color-mix(in srgb, var(--room) 14%, transparent); }
.node.is-warn { border-bottom: 3px solid var(--signal-warn); }
.node.is-risk { border-bottom: 3px solid var(--signal-risk); background: var(--signal-risk-soft); }
.node__label { font-size: 12px; color: var(--text-secondary); }
.node b { font-size: 22px; line-height: 1.1; color: var(--text-primary); }
.node small { margin-left: 3px; font-size: 12px; font-weight: 400; color: var(--text-muted); }

.link {
  position: relative;
  flex: 1;
  height: 100%;
  min-width: 60px;
  display: flex;
  align-items: center;
  --flow: var(--accent);
  --flow-time: 1.6s;
}

.link::before {
  content: '';
  position: absolute;
  left: 0;
  right: 14px;
  top: 50%;
  height: 2px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--flow) 45%, transparent) 20%, color-mix(in srgb, var(--flow) 45%, transparent) 80%, transparent);
}

.link i {
  position: absolute;
  top: calc(50% - 3px);
  left: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--flow);
  box-shadow: 0 0 8px var(--flow);
  animation: ribbon-flow var(--flow-time) linear infinite;
}

.link i:nth-child(2) { animation-delay: calc(var(--flow-time) / -3); }
.link i:nth-child(3) { animation-delay: calc(var(--flow-time) / -1.5); }

.link__head { position: absolute; right: -2px; top: calc(50% - 8px); color: var(--flow); }

.link.is-warn { --flow: var(--signal-warn); --flow-time: 3.6s; }

.link.is-risk { --flow: var(--signal-risk); }
.link.is-risk i { animation-play-state: paused; opacity: 0.55; }

@keyframes ribbon-flow {
  from { left: 0; opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  to { left: calc(100% - 16px); opacity: 0; }
}
</style>
