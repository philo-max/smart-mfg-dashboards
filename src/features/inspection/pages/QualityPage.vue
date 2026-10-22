<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ECElementEvent } from 'echarts'
import AkPanel from '@/components/ui/AkPanel.vue'
import AkTabs from '@/components/ui/AkTabs.vue'
import StatTile from '@/components/ui/StatTile.vue'
import EChart from '@/components/charts/EChart.vue'
import RecordsPanel from '../RecordsPanel.vue'
import InspectionDetailModal from '../InspectionDetailModal.vue'
import { defectPieOption, stationBarOption, toleranceOption, trendOption } from '../inspectionCharts'
import { repeatOption } from '../pageCharts'
import { targetText } from '../metricText'
import { MODULES } from '@/data/modules'
import { FPY_THRESHOLD } from '@/data/sim/constants'
import { inspectionMetrics } from '@/data/sim/metrics'
import { inspectionTotals } from '@/data/sim/selectors'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const meta = MODULES.inspection
const plant = usePlantStore()
const ui = useUiStore()
const ins = computed(() => plant.state.inspection)
const m = computed(() => inspectionMetrics(plant.state, plant.alarms))
const totals = computed(() => inspectionTotals(plant.state))
const audit = computed(() => ins.value.ops.audit)

const range = ref<'24h' | '7d'>('24h')
const filter = ref<'all' | 'fail'>('all')
const detailFocus = ref<'pass' | 'fail' | null>(null)
const hourHighlight = ref<string | null>(null)
const defectFilter = ref<string | null>(null)
const positionFilter = ref<number | null>(null)

onMounted(() => {
  if (ui.focus === 'ng') filter.value = 'fail'
  ui.clearFocus()
})

const filtered = computed(() => defectFilter.value !== null || positionFilter.value !== null)
const trend = computed(() => trendOption(range.value === '24h' ? ins.value.hourly : ins.value.daily, FPY_THRESHOLD))
const pie = computed(() => defectPieOption(ins.value.defects, defectFilter.value))
const stations = computed(() => stationBarOption(ins.value.stations, FPY_THRESHOLD, positionFilter.value))
const tolerance = computed(() => toleranceOption(ins.value.tolerance))
const repeat = computed(() => repeatOption(ins.value.ops.repeat, m.value.repeat.target))
const records = computed(() =>
  (filter.value === 'all' && !filtered.value ? ins.value.records : ins.value.ngHistory)
    .filter((r) => defectFilter.value === null || r.defect === defectFilter.value)
    .filter((r) => positionFilter.value === null || !r.positions[positionFilter.value])
    .slice(0, 7),
)

function toggleDefect(name: string) {
  defectFilter.value = defectFilter.value === name ? null : name
}

function togglePosition(idx: number) {
  positionFilter.value = positionFilter.value === idx ? null : idx
}

function clearFilters() {
  defectFilter.value = null
  positionFilter.value = null
}

function onTrendClick(p: ECElementEvent) {
  if (range.value !== '24h' || typeof p.name !== 'string') return
  hourHighlight.value = p.name
  detailFocus.value = 'fail'
}

function closeDetail() {
  detailFocus.value = null
  hourHighlight.value = null
}
</script>

<template>
  <div class="col col--left">
    <AkPanel title="检测质量核心指标" en="QUALITY KPI" :color="meta.color">
      <div class="kpis">
        <StatTile label="检测准确率" :value="m.accuracy.value" unit="%" :level="m.accuracy.level" :hint="targetText(m.accuracy)" />
        <StatTile label="不良品检出率" :value="m.detect.value" unit="%" :level="m.detect.level" :hint="targetText(m.detect)" />
        <StatTile label="检测重复性" :value="m.repeat.value" unit="%" :level="m.repeat.level" :hint="targetText(m.repeat)" />
        <StatTile label="检测总数" :value="totals.total" />
        <StatTile label="合格数量" :value="totals.pass" clickable hint="点击查看明细" @activate="detailFocus = 'pass'" />
        <StatTile label="不合格数量" :value="totals.fail" level="warn" clickable hint="点击查看明细" @activate="detailFocus = 'fail'" />
      </div>
    </AkPanel>
    <AkPanel title="缺陷类型分布" en="DEFECT MIX">
      <template #actions><span class="hint">点击扇区筛选检测记录</span></template>
      <EChart :option="pie" @click="(p) => p.name && toggleDefect(p.name)" />
    </AkPanel>
    <AkPanel title="检测位合格率" en="POSITION YIELD">
      <template #actions><span class="hint">点击条形筛选该位 NG</span></template>
      <EChart :option="stations" @click="(p) => togglePosition(p.dataIndex)" />
    </AkPanel>
  </div>

  <div class="col col--center centerQ">
    <AkPanel title="质量趋势" en="QUALITY TREND · FPY / PPM" :color="meta.color">
      <template #actions>
        <span class="hint">点击小时查看明细</span>
        <AkTabs v-model="range" :options="[{ value: '24h', label: '近 24 小时' }, { value: '7d', label: '近 7 天' }]" />
      </template>
      <EChart :option="trend" @click="onTrendClick" />
    </AkPanel>
    <RecordsPanel
      v-model:filter="filter"
      :records="records"
      :color="meta.color"
      :defect-filter="defectFilter"
      :position-filter="positionFilter"
      :filtered="filtered"
      @clear="clearFilters"
    />
  </div>

  <div class="col col--right colQ">
    <AkPanel title="孔径公差分布" en="TOLERANCE · Φ2.50±0.03" :color="meta.color"><EChart :option="tolerance" /></AkPanel>
    <AkPanel title="抽检复核" en="SPOT CHECK" :color="meta.color">
      <div class="audit">
        <StatTile label="抽检数" :value="audit.sampled" unit="件" hint="抽检比例 10%" />
        <StatTile label="漏检（放过不良品）" :value="audit.missed" unit="件" :level="audit.missed > 0 ? 'warn' : 'normal'" />
        <StatTile label="误判（良品判 NG）" :value="audit.falseCall" unit="件" :level="audit.falseCall > 1 ? 'warn' : 'normal'" />
      </div>
      <p class="formula">检测准确率 = 1 − (漏检 + 误判) ÷ 抽检数；不良品检出率 = 不合格 ÷ (不合格 + 漏检)</p>
    </AkPanel>
    <AkPanel title="检测重复性" en="REPEATABILITY" :color="meta.color">
      <template #actions><span class="hint">同件重复 30 次 · 判定一致率</span></template>
      <EChart :option="repeat" />
    </AkPanel>
  </div>

  <InspectionDetailModal :focus="detailFocus" :hourly="ins.hourly" :highlight="hourHighlight" @close="closeDetail" />
</template>

<style scoped>
.col--left { grid-template-rows: 250px minmax(0, 1fr) minmax(0, 1fr); }
.centerQ { grid-template-rows: minmax(0, 1fr) 300px; }
.colQ { grid-template-rows: minmax(0, 1fr) 210px minmax(0, 1fr); }

.kpis { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; gap: 8px; }
.kpis :deep(.stat__value) { font-size: 22px; }
.kpis :deep(.stat) { padding: 6px 10px; }
.kpis :deep(.stat__label) { font-size: 11px; white-space: normal; line-height: 1.2; }
.hint { font-size: 12px; color: var(--text-muted); margin-right: 8px; }

.audit { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.audit :deep(.stat__value) { font-size: 22px; }
.audit :deep(.stat__label) { font-size: 11px; white-space: normal; line-height: 1.2; }
.formula { margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: var(--text-muted); }
</style>
