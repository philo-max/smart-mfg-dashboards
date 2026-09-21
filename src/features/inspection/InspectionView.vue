<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ECElementEvent } from 'echarts'
import { FileText } from '@lucide/vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import AkTabs from '@/components/ui/AkTabs.vue'
import StatTile from '@/components/ui/StatTile.vue'
import PointsPanel from '@/components/ui/PointsPanel.vue'
import SignalLight from '@/components/ui/SignalLight.vue'
import StreamStrip from '@/components/ui/StreamStrip.vue'
import EventLog from '@/components/ui/EventLog.vue'
import EChart from '@/components/charts/EChart.vue'
import InspectionDetailModal from './InspectionDetailModal.vue'
import InspectionReportModal from './InspectionReportModal.vue'
import { defectPieOption, energyOption, stationBarOption, toleranceOption, trendOption } from './inspectionCharts'
import { mttrOf } from './buildReport'
import { MODULES } from '@/data/modules'
import { FPY_THRESHOLD, INSPECTION_STATIONS } from '@/data/sim/constants'
import { equipmentOf, inspectionTotals, lightOf, oeeOf } from '@/data/sim/selectors'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const POWER_ALERT_KW = 7.5

const meta = MODULES.inspection
const plant = usePlantStore()
const ui = useUiStore()
const ins = computed(() => plant.state.inspection)
const totals = computed(() => inspectionTotals(plant.state))

const range = ref<'24h' | '7d'>('24h')
const filter = ref<'all' | 'fail'>('all')
const detailFocus = ref<'pass' | 'fail' | null>(null)
const hourHighlight = ref<string | null>(null)
const reportOpen = ref(false)
/** 交叉筛选：缺陷类型 / 检测位（0 起）——饼图、检测位柱、检测位卡片三处联动 */
const defectFilter = ref<string | null>(null)
const positionFilter = ref<number | null>(null)

onMounted(() => {
  if (ui.focus === 'ng') filter.value = 'fail'
  ui.clearFocus()
})

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

const filtered = computed(() => defectFilter.value !== null || positionFilter.value !== null)

const trend = computed(() => trendOption(range.value === '24h' ? ins.value.hourly : ins.value.daily, FPY_THRESHOLD))
const pie = computed(() => defectPieOption(ins.value.defects, defectFilter.value))
const stations = computed(() => stationBarOption(ins.value.stations, FPY_THRESHOLD, positionFilter.value))
const tolerance = computed(() => toleranceOption(ins.value.tolerance))
const energy = computed(() => energyOption(ins.value.hourly, POWER_ALERT_KW))
/** 「全部」看实时流；「仅 NG」与任何交叉筛选都改查更长的 NG 历史，避免筛完是空的 */
const records = computed(() =>
  (filter.value === 'all' && !filtered.value ? ins.value.records : ins.value.ngHistory)
    .filter((r) => defectFilter.value === null || r.defect === defectFilter.value)
    .filter((r) => positionFilter.value === null || !r.positions[positionFilter.value])
    .slice(0, 7),
)

const eq = computed(() => equipmentOf(plant.state, 'inspection'))
const light = computed(() => lightOf(plant.levels.inspection))
const LIGHT_TEXT = { green: '运行正常', yellow: '质量预警', red: '故障 / 停线' } as const
const latest = computed(() => ins.value.records[0] ?? null)
const positionCards = computed(() =>
  INSPECTION_STATIONS.map((s, i) => ({
    ...s,
    ok: latest.value ? latest.value.positions[i] : true,
    fail: ins.value.stations[i].fail,
    total: ins.value.stations[i].total,
  })),
)
const alarms24h = computed(() => plant.alarms.filter((a) => a.module === 'inspection').length)
</script>

<template>
  <div class="module">
    <StreamStrip module="inspection" />

    <div class="col col--three">
      <AkPanel title="检测实时计数" en="LIVE COUNTER · 24H" :color="meta.color">
        <template #actions>
          <button type="button" class="report-btn" @click="reportOpen = true"><FileText :size="14" />检测报告</button>
        </template>
        <div class="kpis">
          <StatTile label="检测总数" :value="totals.total" />
          <StatTile label="合格数量" :value="totals.pass" clickable hint="点击查看 24h 明细" @activate="detailFocus = 'pass'" />
          <StatTile label="不合格数量" :value="totals.fail" clickable level="warn" hint="点击查看 24h 明细" @activate="detailFocus = 'fail'" />
          <StatTile label="一次合格率" :value="totals.fpy" unit="%" :level="totals.fpy < FPY_THRESHOLD ? 'warn' : 'normal'" />
          <StatTile label="不良品检出率" :value="totals.detect" unit="%" />
          <StatTile label="异常闭环 MTTR" :value="mttrOf(plant.state)" unit="min" />
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

    <div class="col col--center center3">
      <AkPanel title="质量趋势" en="QUALITY TREND · FPY / PPM" :color="meta.color">
        <template #actions>
          <span class="hint">点击小时查看明细</span>
          <AkTabs v-model="range" :options="[{ value: '24h', label: '近 24 小时' }, { value: '7d', label: '近 7 天' }]" />
        </template>
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
      <AkPanel title="实时检测记录" en="LIVE RECORDS" :color="meta.color">
        <template #actions>
          <span v-if="defectFilter !== null" class="fchip">缺陷：{{ defectFilter }}</span>
          <span v-if="positionFilter !== null" class="fchip">检测位 {{ positionFilter + 1 }} NG</span>
          <button v-if="filtered" type="button" class="fclear" @click="clearFilters">清除筛选 ✕</button>
          <AkTabs v-model="filter" :options="[{ value: 'all', label: '全部' }, { value: 'fail', label: '仅 NG' }]" />
        </template>
        <div class="rec">
          <div class="rec__row rec__row--head">
            <span>时间</span><span>工件编号</span><span>RFID</span>
            <span class="rec__pos">
              <i v-for="(s, i) in INSPECTION_STATIONS" :key="s.name" :title="`${s.name} ${s.item}`">{{ i + 1 }}</i>
            </span>
            <span>结果</span><span>判定</span>
          </div>
          <div v-for="r in records" :key="r.id + r.time" class="rec__row">
            <span class="ak-num">{{ r.time }}</span>
            <span class="ak-num">{{ r.id }}</span>
            <span class="ak-num">{{ r.rfid }}</span>
            <span class="rec__pos">
              <i v-for="(ok, i) in r.positions" :key="i" :class="ok ? 'ok' : 'ng'">{{ ok ? 'OK' : 'NG' }}</i>
            </span>
            <span :class="{ 'tone-risk': !r.pass }">{{ r.result }}</span>
            <span><b class="tag" :class="r.pass ? 'ok' : 'ng'">{{ r.pass ? '合格' : '不合格' }}</b></span>
          </div>
          <p v-if="records.length === 0" class="rec__empty">当前筛选条件下暂无记录</p>
        </div>
      </AkPanel>
    </div>

    <div class="col col--right">
      <AkPanel title="孔径公差分布" en="TOLERANCE · Φ2.50±0.03" :color="meta.color"><EChart :option="tolerance" /></AkPanel>
      <AkPanel title="能耗 × 质量联动" en="ENERGY × QUALITY"><EChart :option="energy" /></AkPanel>
      <EventLog module="inspection" :color="meta.color" />
      <PointsPanel unit="inspection" :color="meta.color" />
    </div>

    <InspectionDetailModal :focus="detailFocus" :hourly="ins.hourly" :highlight="hourHighlight" @close="closeDetail" />
    <InspectionReportModal v-model:open="reportOpen" />
  </div>
</template>

<style scoped>
.col--three { grid-template-rows: 250px 1fr 1fr; }
.col--right { grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) 170px 220px; }
.center3 { grid-template-rows: minmax(0, 1fr) 192px 222px; }

.live { flex: 1; display: grid; grid-template-columns: 290px 1fr; gap: 14px; min-height: 0; }
.live__info { display: flex; flex-direction: column; gap: 10px; }

.live__light {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg-panel-2);
  border-left: 3px solid var(--room-inspection);
}

.live__light b { display: block; font-size: 15px; }
.live__tiles { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.live__tiles :deep(.stat) { padding: 6px 8px; }
.live__tiles :deep(.stat__label) { font-size: 11px; white-space: normal; line-height: 1.2; }
.live__tiles :deep(.stat__value) { font-size: 20px; }
.live__pos { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }

.pos {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-panel-2);
  border-top: 3px solid var(--signal-pos);
}

.pos { cursor: pointer; }
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

.kpis {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
}

.hint { font-size: 12px; color: var(--text-muted); margin-right: 8px; }

.fchip { font-size: 12px; padding: 2px 8px; color: #0a0c0f; background: var(--highlight); font-weight: 700; margin-right: 6px; }
.fclear { font-size: 12px; margin-right: 8px; background: none; border: 0; color: var(--highlight); text-decoration: underline; }
.rec__empty { margin: 14px 0; text-align: center; font-size: 13px; color: var(--text-muted); }

.kpis :deep(.stat__value) { font-size: 22px; }
.kpis :deep(.stat) { padding: 6px 10px; }

.report-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #0a0c0f;
  background: var(--room-inspection);
  border: 0;
}

.rec { flex: 1; min-height: 0; overflow: hidden; font-size: 13px; }

.rec__row {
  display: grid;
  grid-template-columns: 76px 140px 76px 200px 1fr 70px;
  gap: 8px;
  align-items: center;
  height: 27px;
  border-bottom: 1px solid var(--border);
}

.rec__row--head { color: var(--text-muted); font-size: 12px; height: 24px; }

.rec__pos { display: flex; gap: 4px; }

.rec__pos i {
  flex: 1;
  font-style: normal;
  text-align: center;
  font-size: 10px;
  padding: 1px 0;
  background: rgba(255, 255, 255, 0.05);
}

.rec__pos i.ok { color: var(--signal-pos); background: rgba(71, 209, 140, 0.1); }
.rec__pos i.ng { color: #fff; background: var(--signal-risk); }

.tag { font-weight: 400; font-size: 11px; padding: 1px 8px; }
.tag.ok { color: var(--signal-pos); border: 1px solid var(--signal-pos); }
.tag.ng { color: var(--signal-risk); border: 1px solid var(--signal-risk); }
</style>
