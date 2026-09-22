<script setup lang="ts">
import { computed } from 'vue'
import EChart from '@/components/charts/EChart.vue'
import { C, ring } from '@/components/charts/theme'
import SignalLight from '@/components/ui/SignalLight.vue'
import { HUB_META, MODULES, MODULE_ORDER } from '@/data/modules'
import { lightOf } from '@/data/sim/selectors'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const plant = usePlantStore()
const ui = useUiStore()

const ringOption = computed(() => ring(plant.kpis.achievement, C.accent, '生产计划达成率'))
const lineState = computed(() => {
  const levels = Object.values(plant.levels)
  if (levels.includes('risk')) return { text: '存在紧急异常', tone: 'tone-risk' }
  if (levels.includes('warn')) return { text: '局部预警', tone: 'tone-warn' }
  return { text: '全线正常运行', tone: 'tone-pos' }
})
const LEVEL_TEXT = { normal: '正常', warn: '预警', risk: '异常' } as const
</script>

<template>
  <section class="hub" :style="{ '--room': HUB_META.color }">
    <header class="hub__head">
      <span class="hub__type">{{ HUB_META.name }}</span>
      <span class="ak-num hub__code">{{ HUB_META.code }}</span>
      <span class="ak-en">{{ HUB_META.en }}</span>
    </header>

    <div class="hub__ring"><EChart :option="ringOption" /></div>

    <div class="hub__output">
      <div><span>今日产出</span><b class="ak-num">{{ plant.kpis.produced }}</b></div>
      <div><span>日计划</span><b class="ak-num">{{ plant.kpis.plan }}</b></div>
    </div>

    <p class="hub__state" :class="lineState.tone">
      <i aria-hidden="true"></i>{{ lineState.text }}
    </p>

    <ul class="hub__units">
      <li v-for="id in MODULE_ORDER" :key="id">
        <button type="button" @click="ui.navigate(id)">
          <span class="hub__dot" :style="{ background: MODULES[id].color }"></span>
          <span class="hub__name">{{ MODULES[id].name }}</span>
          <span class="hub__lvl" :class="`is-${plant.levels[id]}`">{{ LEVEL_TEXT[plant.levels[id]] }}</span>
          <SignalLight :light="lightOf(plant.levels[id])" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.hub {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 18px 16px;
  background:
    radial-gradient(circle at 50% 30%, rgba(35, 200, 255, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(16, 32, 52, 0.96), rgba(8, 15, 26, 0.96));
  border: 1px solid var(--accent-line);
  border-top: 4px solid var(--room);
  box-shadow: inset 0 0 50px rgba(35, 200, 255, 0.1), 0 0 24px rgba(35, 200, 255, 0.12);
}

.hub__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 -18px;
  padding: 8px 18px;
  background: rgba(0, 0, 0, 0.35);
}

.hub__type {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  color: #0a0c0f;
  background: var(--room);
}

.hub__code { font-size: 13px; color: var(--text-secondary); }

.hub__ring { height: 210px; }

.hub__output {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.hub__output div {
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-left: 2px solid var(--accent);
  font-size: 11px;
  color: var(--text-muted);
}

.hub__output b { font-size: 22px; color: var(--text-primary); }

.hub__state {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
}

.hub__state i {
  width: 8px;
  height: 8px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
  animation: ak-blink 1.6s steps(2) infinite;
}

.hub__units {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.hub__units button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  background: rgba(160, 205, 255, 0.04);
  border: 1px solid var(--border);
  font-size: 13px;
}

.hub__units button:hover { border-color: var(--accent); background: var(--accent-soft); }

.hub__dot { width: 4px; height: 16px; }
.hub__name { flex: 1; text-align: left; }
.hub__lvl { font-size: 12px; color: var(--signal-pos); }
.hub__lvl.is-warn { color: var(--signal-warn); }
.hub__lvl.is-risk { color: var(--signal-risk); }
</style>
