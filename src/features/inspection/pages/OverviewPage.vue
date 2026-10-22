<script setup lang="ts">
import { computed, ref } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import StatTile from '@/components/ui/StatTile.vue'
import PointsPanel from '@/components/ui/PointsPanel.vue'
import SignalLight from '@/components/ui/SignalLight.vue'
import EventLog from '@/components/ui/EventLog.vue'
import EChart from '@/components/charts/EChart.vue'
import RecordsPanel from '../RecordsPanel.vue'
import InspectionDetailModal from '../InspectionDetailModal.vue'
import { energyOption, trendOption } from '../inspectionCharts'
import { targetText } from '../metricText'
import type { InspectionPageId } from '../pages'
import { MODULES } from '@/data/modules'
import { FPY_THRESHOLD, INSPECTION_STATIONS } from '@/data/sim/constants'
import { inspectionMetrics } from '@/data/sim/metrics'
import { equipmentOf, lightOf, oeeOf } from '@/data/sim/selectors'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

type MetricKey = Exclude<keyof ReturnType<typeof inspectionMetrics>, 'basis'>

const POWER_ALERT_KW = 7.5
const meta = MODULES.inspection
const plant = usePlantStore()
const ui = useUiStore()
const ins = computed(() => plant.state.inspection)
const m = computed(() => inspectionMetrics(plant.state, plant.alarms))

const GROUPS: { page: InspectionPageId; title: string; en: string; items: { key: MetricKey; label: string }[] }[] = [
  { page: 'efficiency', title: '检测效率', en: 'EFFICIENCY', items: [{ key: 'takt', label: '检测线节拍' }, { key: 'completion', label: '检测完成率' }, { key: 'perCapita', label: '人均检测量' }] },
  { page: 'quality', title: '检测质量', en: 'QUALITY', items: [{ key: 'accuracy', label: '检测准确率' }, { key: 'detect', label: '不良品检出率' }, { key: 'repeat', label: '检测重复性' }] },
  { page: 'resource', title: '资源消耗', en: 'RESOURCE', items: [{ key: 'oee', label: '检测设备 OEE' }, { key: 'consumable', label: '耗材单耗' }] },
  { page: 'exception', title: '异常处理', en: 'EXCEPTION', items: [{ key: 'response', label: '异常响应时间' }, { key: 'closure', label: '异常闭环率' }] },
]

const filter = ref<'all' | 'fail'>('all')
const positionFilter = ref<number | null>(null)
const detailFocus = ref<'pass' | 'fail' | null>(null)
const hourHighlight = ref<string | null>(null)

const trend = computed(() => trendOption(ins.value.hourly, FPY_THRESHOLD))
const energy = computed(() => energyOption(ins.value.hourly, POWER_ALERT_KW))
const records = computed(() =>
  (filter.value === 'all' && positionFilter.value === null ? ins.value.records : ins.value.ngHistory)
    .filter((r) => positionFilter.value === null || !r.positions[positionFilter.value])
    .slice(0, 7),
)
const eq = computed(() => equipmentOf(plant.state, 'inspection'))
const light = computed(() => lightOf(plant.levels.inspection))
const LIGHT_TEXT = { green: '运行正常', yellow: '质量预警', red: '故障 / 停线' } as const
const latest = computed(() => ins.value.records[0] ?? null)
const positionCards = computed(() =>
  INSPECTION_STATIONS.map((s, i) => ({ ...s, ok: latest.value ? latest.value.positions[i] : true, fail: ins.value.stations[i].fail, total: ins.value.stations[i].total })),
)
const alarms24h = computed(() => plant.alarms.filter((a) => a.module === 'inspection').length)

function togglePosition(idx: number) {
  positionFilter.value = positionFilter.value === idx ? null : idx
}

function onTrendClick(p: { name?: string }) {
  if (typeof p.name !== 'string') return
  hourHighlight.value = p.name
  detailFocus.value = 'fail'
}

function closeDetail() {
  detailFocus.value = null
  hourHighlight.value = null
}
</script>

<template>
  <div class="col col--wall">
    <AkPanel v-for="g in GROUPS" :key="g.page" :title="g.title" :en="g.en" :color="meta.color">
      <template #actions><button type="button" class="more" @click="ui.setInspectionPage(g.page)">详情 ›</button></template>
      <div class="wall" :style="{ '--n': g.items.length }">
        <StatTile
          v-for="it in g.items"
          :key="it.key"
          :label="it.label"
          :value="m[it.key].value"
          :unit="m[it.key].unit"
          :level="m[it.key].level"
          :hint="targetText(m[it.key])"
          clickable
          @activate="ui.setInspectionPage(g.page)"
        />
      </div>
    </AkPanel>
  </div>

  <div class="col col--center center3">
    <AkPanel title="质量趋势" en="QUALITY TREND · FPY / PPM" :color="meta.color">
      <template #actions><span class="hint">点击小时查看明细</span></template>
      <EChart :option="trend" @click="onTrendClick" />
    </AkPanel>
    <AkPanel title="检测工位实时状态" en="STATION LIVE STATUS" :color="meta.color">
      <div class="live">
        <div class="live__info">
          <div class="live__light">
            <SignalLight :light="light" />
            <div><b>{{ LIGHT_TEXT[light] }}</b><span class="ak-en">Green / Yellow / Red_Light</span></div>
          </div>
          <div class="live__tiles">
            <StatTile label="单件检测 TakeTime" :value="ins.takeTime" unit="s" />
            <StatTile label="设备 OEE" :value="oeeOf(eq)" unit="%" :level="oeeOf(eq) < 75 ? 'warn' : 'normal'" />
            <StatTile label="近期告警数" :value="alarms24h" :level="alarms24h > 0 ? 'warn' : 'normal'" />
          </div>
        </div>
        <div class="live__pos">
          <article
            v-for="(p, i) in positionCards"
            :key="p.name"
            class="pos"
            :class="{ 'is-ng': !p.ok, 'is-selected': positionFilter === i }"
            role="button"
            tabindex="0"
            :aria-pressed="positionFilter === i"
            @click="togglePosition(i)"
            @keydown.enter="togglePosition(i)"
          >
            <header><b class="ak-num">{{ i + 1 }}</b><span>{{ p.name }}</span></header>
            <p class="pos__item">{{ p.method }} · {{ p.item }}</p>
            <strong class="pos__result">{{ p.ok ? 'OK' : 'NG' }}</strong>
            <footer class="ak-num">累计 NG {{ p.fail }} / {{ p.total }}</footer>
          </article>
        </div>
      </div>
    </AkPanel>
    <RecordsPanel
      v-model:filter="filter"
      :records="records"
      :color="meta.color"
      :defect-filter="null"
      :position-filter="positionFilter"
      :filtered="positionFilter !== null"
      @clear="positionFilter = null"
    />
  </div>

  <div class="col col--right">
    <AkPanel title="能耗 × 质量联动" en="ENERGY × QUALITY"><EChart :option="energy" /></AkPanel>
    <EventLog module="inspection" :color="meta.color" />
    <PointsPanel unit="inspection" :color="meta.color" />
  </div>

  <InspectionDetailModal :focus="detailFocus" :hourly="ins.hourly" :highlight="hourHighlight" @close="closeDetail" />
</template>

<style scoped>
.col--wall { grid-template-rows: repeat(2, minmax(0, 1fr)) repeat(2, minmax(0, 0.9fr)); }
.col--right { grid-template-rows: minmax(0, 1fr) 210px 230px; }
.center3 { grid-template-rows: minmax(0, 1fr) 192px 222px; }

.wall { flex: 1; display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 8px; }
.wall :deep(.stat) { padding: 8px 10px; }
.wall :deep(.stat__label) { font-size: 12px; white-space: normal; line-height: 1.2; }
.wall :deep(.stat__value) { font-size: 24px; }
.wall :deep(.stat__hint) { font-size: 11px; }

.more { font-size: 12px; background: none; border: 0; color: var(--room-inspection); }
.more:hover { text-decoration: underline; }
.hint { font-size: 12px; color: var(--text-muted); }

.live { flex: 1; display: grid; grid-template-columns: 290px 1fr; gap: 14px; min-height: 0; }
.live__info { display: flex; flex-direction: column; gap: 10px; }
.live__light { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: var(--bg-panel-2); border-left: 3px solid var(--room-inspection); }
.live__light b { display: block; font-size: 15px; }
.live__tiles { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.live__tiles :deep(.stat) { padding: 6px 8px; }
.live__tiles :deep(.stat__label) { font-size: 11px; white-space: normal; line-height: 1.2; }
.live__tiles :deep(.stat__value) { font-size: 20px; }
.live__pos { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }

.pos { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; font-size: 12px; color: var(--text-secondary); background: var(--bg-panel-2); border-top: 3px solid var(--signal-pos); cursor: pointer; }
.pos:hover { background: var(--accent-soft); }
.pos.is-ng { border-top-color: var(--signal-risk); background: var(--signal-risk-soft); }
.pos.is-selected { outline: 2px solid var(--highlight); outline-offset: -2px; }
.pos header { display: flex; align-items: center; gap: 6px; }
.pos header b { color: var(--room-inspection); font-size: 16px; }
.pos header span { color: var(--text-primary); }
.pos__item { margin: 0; font-size: 11px; color: var(--text-muted); min-height: 28px; }
.pos__result { font-family: var(--font-en); font-size: 26px; line-height: 1; color: var(--signal-pos); }
.pos.is-ng .pos__result { color: var(--signal-risk); }
.pos footer { font-size: 11px; color: var(--text-muted); }
</style>
