<script setup lang="ts">
import { computed } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import StatTile from '@/components/ui/StatTile.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, ring } from '@/components/charts/theme'
import { planActualOption, stationCycleOption, taktTrendOption } from '../pageCharts'
import { targetText } from '../metricText'
import { MODULES } from '@/data/modules'
import { INSPECTION_OPERATORS, INSPECTION_STATIONS, INSPECTION_TRANSFER_S, TAKT_TARGET } from '@/data/sim/constants'
import { inspectionMetrics } from '@/data/sim/metrics'
import { inspectionTotals } from '@/data/sim/selectors'
import { usePlantStore } from '@/stores/plant'

const meta = MODULES.inspection
const plant = usePlantStore()
const ins = computed(() => plant.state.inspection)
const ops = computed(() => ins.value.ops)
const m = computed(() => inspectionMetrics(plant.state, plant.alarms))
const totals = computed(() => inspectionTotals(plant.state))

const bottleneck = computed(() => {
  const cycle = ops.value.stationCycle
  const idx = cycle.indexOf(Math.max(...cycle))
  return { name: INSPECTION_STATIONS[idx].name, item: INSPECTION_STATIONS[idx].item, seconds: cycle[idx] }
})
const margin = computed(() => Math.round((TAKT_TARGET - m.value.takt.value) * 10) / 10)
const taktPct = computed(() => Math.min(100, (m.value.takt.value / TAKT_TARGET) * 100))

const manual = computed(() => totals.value.fail + ops.value.audit.sampled)
const manualShare = computed(() => Math.round((manual.value / Math.max(1, totals.value.total)) * 1000) / 10)

const taktTrend = computed(() => taktTrendOption(ins.value.hourly, ops.value.taktHourly, TAKT_TARGET))
const cycle = computed(() => stationCycleOption(ops.value.stationCycle, TAKT_TARGET))
const planActual = computed(() => planActualOption(ins.value.hourly))
const completionRing = computed(() => ring(m.value.completion.value, m.value.completion.level === 'normal' ? C.pos : C.warn, '完成率'))
const autoRing = computed(() => ring(100 - manualShare.value, C.accent, '自动检测占比'))
</script>

<template>
  <div class="col col--left">
    <AkPanel title="检测效率核心指标" en="EFFICIENCY KPI" :color="meta.color">
      <div class="kpi3">
        <StatTile label="检测线节拍时间" :value="m.takt.value" :unit="m.takt.unit" :level="m.takt.level" :hint="targetText(m.takt)" />
        <StatTile label="检测完成率" :value="m.completion.value" unit="%" :level="m.completion.level" :hint="targetText(m.completion)" />
        <StatTile label="人均检测量" :value="m.perCapita.value" :unit="m.perCapita.unit" :level="m.perCapita.level" :hint="targetText(m.perCapita)" />
      </div>
    </AkPanel>
    <AkPanel title="生产节拍解读" en="TAKT TIME" :color="meta.color">
      <div class="takt">
        <p>产线节拍目标 <b class="ak-num">{{ TAKT_TARGET }} s</b>（装配节拍）：检测每 {{ TAKT_TARGET }} 秒必须放行一件，否则会拖慢整条线。</p>
        <ul>
          <li>瓶颈检测位<b>{{ bottleneck.name }}</b>（{{ bottleneck.item }}）<span class="ak-num">{{ bottleneck.seconds }} s</span></li>
          <li>上下料转运<span class="ak-num">{{ INSPECTION_TRANSFER_S }} s</span></li>
          <li>检测线节拍<b class="ak-num">{{ m.takt.value }} s</b></li>
          <li>节拍余量<b class="ak-num" :class="margin < 2 ? 'tone-warn' : 'tone-pos'">{{ margin }} s</b></li>
        </ul>
        <div class="takt__bar" :class="`is-${m.takt.level}`"><i :style="{ width: taktPct + '%' }"></i><span>{{ m.takt.value }} / {{ TAKT_TARGET }} s</span></div>
      </div>
    </AkPanel>
    <AkPanel title="检测完成率" en="COMPLETION" :color="meta.color">
      <div class="ring"><EChart :option="completionRing" /></div>
      <p class="sub">近 {{ m.basis.hours }} 个整点小时：已检测 <b class="ak-num">{{ m.basis.total }}</b> 件 / 计划 <b class="ak-num">{{ m.basis.plan }}</b> 件</p>
    </AkPanel>
  </div>

  <div class="col col--center centerE">
    <AkPanel title="检测线节拍趋势" en="TAKT TREND · 24H" :color="meta.color"><EChart :option="taktTrend" /></AkPanel>
    <div class="pair">
      <AkPanel title="各检测位耗时（瓶颈分析）" en="STATION CYCLE" :color="meta.color"><EChart :option="cycle" /></AkPanel>
      <AkPanel title="计划 vs 实际检测数" en="PLAN VS ACTUAL" :color="meta.color">
        <template #actions><span class="hint">已完成的整点小时</span></template><EChart :option="planActual" /></AkPanel>
    </div>
  </div>

  <div class="col col--right colE">
    <AkPanel title="人机协同效率" en="HUMAN × MACHINE" :color="meta.color">
      <div class="hm">
        <div class="hm__tiles">
          <StatTile label="人均检测量" :value="m.perCapita.value" unit="件/人·h" :level="m.perCapita.level" />
          <StatTile label="在岗人数" :value="INSPECTION_OPERATORS" unit="人" hint="1 操作员 + 1 巡检" />
          <StatTile label="人工复检数" :value="manual" unit="件" hint="NG 复判 + 抽检" />
        </div>
        <div class="hm__ring"><EChart :option="autoRing" /></div>
      </div>
    </AkPanel>
    <AkPanel title="检测位耗时明细" en="CYCLE DETAIL" :color="meta.color">
      <table class="tbl">
        <tr><th>检测位</th><th>方法</th><th>耗时</th><th>占节拍</th></tr>
        <tr v-for="(s, i) in INSPECTION_STATIONS" :key="s.name" :class="{ 'is-hot': ops.stationCycle[i] === bottleneck.seconds }">
          <td>{{ s.name }}</td><td>{{ s.method }}</td>
          <td class="ak-num">{{ ops.stationCycle[i] }} s</td>
          <td class="ak-num">{{ Math.round((ops.stationCycle[i] / TAKT_TARGET) * 100) }}%</td>
        </tr>
      </table>
    </AkPanel>
  </div>
</template>

<style scoped>
.col--left { grid-template-rows: 190px minmax(0, 1fr) 280px; }
.centerE { grid-template-rows: minmax(0, 1fr) 330px; }
.colE { grid-template-rows: 330px minmax(0, 1fr); }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 0; }
.pair > :deep(.ak-panel) { min-height: 0; }

.kpi3 { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.kpi3 :deep(.stat) { padding: 8px 10px; }
.kpi3 :deep(.stat__label) { font-size: 12px; white-space: normal; line-height: 1.2; }
.kpi3 :deep(.stat__value) { font-size: 24px; }

.takt { display: flex; flex-direction: column; gap: 10px; font-size: 14px; color: var(--text-secondary); }
.takt p { margin: 0; line-height: 1.6; }
.takt ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.takt li { display: flex; justify-content: space-between; padding: 4px 10px; background: var(--bg-panel-2); border-left: 2px solid var(--border-strong); }
.takt b { color: var(--text-primary); }
.takt__bar { position: relative; height: 22px; background: rgba(127, 200, 255, 0.08); overflow: hidden; }
.takt__bar i { position: absolute; inset: 0 auto 0 0; background: var(--signal-pos); opacity: 0.7; transition: width var(--motion-fast); }
.takt__bar.is-warn i { background: var(--signal-warn); }
.takt__bar.is-risk i { background: var(--signal-risk); }
.takt__bar span { position: relative; display: block; text-align: center; line-height: 22px; font-size: 12px; color: #fff; }

.ring { flex: 1; min-height: 0; }
.sub { margin: 0; text-align: center; font-size: 13px; color: var(--text-muted); }
.hint { font-size: 12px; color: var(--text-muted); }
.sub b { color: var(--text-primary); }

.hm { flex: 1; display: grid; grid-template-columns: 1fr 150px; gap: 10px; min-height: 0; }
.hm__tiles { display: grid; grid-template-rows: repeat(3, 1fr); gap: 6px; }
.hm__tiles :deep(.stat) { padding: 6px 10px; }
.hm__tiles :deep(.stat__value) { font-size: 22px; }
.hm__ring { min-height: 0; }

.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; font-weight: 400; font-size: 12px; color: var(--text-muted); padding: 4px 6px; border-bottom: 1px solid var(--border); }
.tbl td { padding: 7px 6px; border-bottom: 1px solid var(--border); }
.tbl tr.is-hot td { color: var(--signal-warn); font-weight: 700; }
</style>
