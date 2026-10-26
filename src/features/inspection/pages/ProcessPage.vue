<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import RecordsPanel from '../RecordsPanel.vue'
import EventLog from '@/components/ui/EventLog.vue'
const RobotScene = defineAsyncComponent(() => import('../RobotScene.vue'))
import ProcessChain from '../process/ProcessChain.vue'
import LocatePanel from '../process/LocatePanel.vue'
import SortVisionPanel from '../process/SortVisionPanel.vue'
import { useProcess } from '../useProcess'
import { MODULES } from '@/data/modules'
import { INSPECTION_STATIONS } from '@/data/sim/constants'
import { usePlantStore } from '@/stores/plant'

const meta = MODULES.inspection
const plant = usePlantStore()
const snap = useProcess()
const latest = computed(() => plant.state.inspection.records[0] ?? null)
const filter = ref<'all' | 'fail'>('all')
const records = computed(() => (filter.value === 'all' ? plant.state.inspection.records : plant.state.inspection.ngHistory).slice(0, 8))
const tone = computed(() => (snap.value.halted ? 'halt' : snap.value.verdict === false ? 'ng' : snap.value.stepIndex === 0 ? 'idle' : 'ok'))
const cards = computed(() =>
  INSPECTION_STATIONS.map((s, i) => ({ ...s, ok: latest.value ? latest.value.positions[i] : true })),
)
const headline = computed(() => {
  if (snap.value.halted) return '定位失败 · 流程暂停，等待重新定位'
  const cur = snap.value.steps[snap.value.stepIndex]
  return `当前环节：${cur.name} · ${cur.device}`
})
</script>

<template>
  <div class="col col--left colL">
    <LocatePanel :snap="snap" />
    <RecordsPanel
      v-model:filter="filter"
      :records="records"
      :color="meta.color"
      :defect-filter="null"
      :position-filter="null"
      :filtered="false"
      @clear="filter = 'all'"
    />
  </div>

  <div class="col col--center colC">
    <AkPanel title="检测流程链" en="PROCESS CHAIN" :color="meta.color">
      <template #actions><span class="hint">{{ headline }}</span></template>
      <ProcessChain :snap="snap" />
    </AkPanel>
    <AkPanel title="机械臂分拣工位 · 3D" en="3D DIGITAL TWIN" :color="meta.color" flush>
      <RobotScene :tone="tone" :action="snap.sort.action" />
    </AkPanel>
    <AkPanel title="检测位判定" en="POSITION RESULT" :color="meta.color">
      <div class="pos5">
        <article v-for="(p, i) in cards" :key="p.name" class="pos" :class="{ 'is-ng': !p.ok }">
          <header><b class="ak-num">{{ i + 1 }}</b><span>{{ p.method }}</span></header>
          <p>{{ p.item }}</p>
          <strong>{{ p.ok ? 'OK' : 'NG' }}</strong>
        </article>
      </div>
    </AkPanel>
  </div>

  <div class="col col--right colR">
    <SortVisionPanel :snap="snap" />
    <EventLog module="inspection" :color="meta.color" />
  </div>
</template>

<style scoped>
.colL { grid-template-rows: 220px 190px minmax(0, 1fr); }
.colC { grid-template-rows: 112px minmax(0, 1fr) 150px; }
.colR { grid-template-rows: 300px 280px minmax(0, 1fr); }

.hint { font-size: 13px; color: var(--text-muted); }
.pos5 { flex: 1; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.pos { display: flex; flex-direction: column; justify-content: space-between; padding: 6px 10px; background: var(--bg-panel-2); border-top: 3px solid var(--signal-pos); font-size: 12px; color: var(--text-secondary); }
.pos header { display: flex; align-items: center; gap: 6px; }
.pos header b { font-size: 16px; color: var(--room-inspection); }
.pos p { margin: 0; font-size: 11px; color: var(--text-muted); }
.pos strong { font-family: var(--font-en); font-size: 24px; line-height: 1; color: var(--signal-pos); }
.pos.is-ng { border-top-color: var(--signal-risk); background: var(--signal-risk-soft); }
.pos.is-ng strong { color: var(--signal-risk); }
</style>
