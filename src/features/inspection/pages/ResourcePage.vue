<script setup lang="ts">
import { computed } from 'vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import StatTile from '@/components/ui/StatTile.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, ring } from '@/components/charts/theme'
import { energyOption } from '../inspectionCharts'
import { consumableTrendOption, oeeLossOption, oeeTrendOption } from '../pageCharts'
import { targetText } from '../metricText'
import { MODULES } from '@/data/modules'
import { OEE_WARN } from '@/data/sim/constants'
import { inspectionMetrics } from '@/data/sim/metrics'
import { equipmentOf } from '@/data/sim/selectors'
import { usePlantStore } from '@/stores/plant'

const POWER_ALERT_KW = 7.5
const meta = MODULES.inspection
const plant = usePlantStore()
const ins = computed(() => plant.state.inspection)
const ops = computed(() => ins.value.ops)
const m = computed(() => inspectionMetrics(plant.state, plant.alarms))
const eq = computed(() => equipmentOf(plant.state, 'inspection'))

const oeeRing = computed(() => ring(m.value.oee.value, m.value.oee.level === 'normal' ? C.pos : C.warn, 'OEE'))
const loss = computed(() => oeeLossOption(m.value.oee.value, m.value.oee.loss))
const oeeTrend = computed(() => oeeTrendOption(ins.value.hourly, ops.value.oeeHourly))
const costTrend = computed(() => consumableTrendOption(ins.value.hourly, ops.value.consumableHourly, m.value.consumable.target))
const energy = computed(() => energyOption(ins.value.hourly, POWER_ALERT_KW))
const items = computed(() => ops.value.consumables.map((c) => ({ ...c, share: Math.round((c.unitCost / m.value.consumable.value) * 100) })))
</script>

<template>
  <div class="col col--left">
    <AkPanel title="资源消耗核心指标" en="RESOURCE KPI" :color="meta.color">
      <div class="kpis">
        <StatTile label="检测设备 OEE" :value="m.oee.value" unit="%" :level="m.oee.level" :hint="targetText(m.oee)" />
        <StatTile label="耗材单耗" :value="m.consumable.value" :unit="m.consumable.unit" :level="m.consumable.level" :hint="targetText(m.consumable)" />
        <StatTile label="时间开动率 A" :value="m.oee.availability" unit="%" hint="1 − 停机损失" />
        <StatTile label="性能开动率 P" :value="m.oee.performance" unit="%" hint="实际 / 理论节拍" />
        <StatTile label="合格品率 Q" :value="m.oee.quality" unit="%" hint="一次合格" />
      </div>
    </AkPanel>
    <AkPanel title="OEE 损失构成" en="OEE LOSS" :color="meta.color">
      <template #actions><span class="hint">OEE = A × P × Q</span></template>
      <EChart :option="loss" />
    </AkPanel>
    <AkPanel title="OEE 趋势" en="OEE · 24H" :color="meta.color"><EChart :option="oeeTrend" /></AkPanel>
  </div>

  <div class="col col--center centerR">
    <AkPanel title="耗材单耗趋势" en="CONSUMABLE COST · 24H" :color="meta.color"><EChart :option="costTrend" /></AkPanel>
    <AkPanel title="耗材明细" en="CONSUMABLES" :color="meta.color">
      <template #actions><span class="hint">单耗 = 各耗材每检一件的成本之和</span></template>
      <table class="tbl">
        <tr><th>耗材</th><th>单件成本</th><th>占比</th><th>已用 / 额定寿命（件）</th><th>剩余寿命</th></tr>
        <tr v-for="c in items" :key="c.name" :class="{ 'is-low': c.lifePct < 30 }">
          <td>{{ c.name }}</td>
          <td class="ak-num">{{ c.unitCost.toFixed(3) }} 元</td>
          <td class="ak-num">{{ c.share }}%</td>
          <td class="ak-num">{{ c.used }} / {{ c.lifeCount }}</td>
          <td><span class="life"><i :style="{ width: c.lifePct + '%' }"></i></span><b class="ak-num">{{ c.lifePct }}%</b></td>
        </tr>
      </table>
    </AkPanel>
  </div>

  <div class="col col--right colR">
    <AkPanel title="设备综合效率" en="OEE" :color="meta.color">
      <div class="ring"><EChart :option="oeeRing" /></div>
      <p class="sub">预警线 {{ OEE_WARN }}% · 设备 {{ eq.name }}</p>
    </AkPanel>
    <AkPanel title="能耗 × 质量联动" en="ENERGY × QUALITY"><EChart :option="energy" /></AkPanel>
    <AkPanel title="停机与故障记录" en="DOWNTIME LOG" :color="meta.color">
      <ul class="faults">
        <li v-for="f in eq.faults" :key="f.time + f.code">
          <span class="ak-num">{{ f.time }}</span><span>{{ f.desc }}</span><em class="ak-num">{{ f.minutes }} min</em>
        </li>
        <li v-if="eq.faults.length === 0" class="faults__empty">近 24 小时无停机</li>
      </ul>
    </AkPanel>
  </div>
</template>

<style scoped>
.col--left { grid-template-rows: 250px minmax(0, 1fr) minmax(0, 1fr); }
.centerR { grid-template-rows: minmax(0, 1fr) 270px; }
.colR { grid-template-rows: 280px minmax(0, 1fr) 190px; }

.kpis { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; gap: 8px; }
.kpis :deep(.stat__value) { font-size: 22px; }
.kpis :deep(.stat) { padding: 6px 10px; }
.kpis :deep(.stat__label) { font-size: 11px; white-space: normal; line-height: 1.2; }
.hint { font-size: 12px; color: var(--text-muted); }

.ring { flex: 1; min-height: 0; }
.sub { margin: 0; text-align: center; font-size: 12px; color: var(--text-muted); }

.tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tbl th { text-align: left; font-weight: 400; font-size: 12px; color: var(--text-muted); padding: 4px 8px; border-bottom: 1px solid var(--border); }
.tbl td { padding: 9px 8px; border-bottom: 1px solid var(--border); }
.tbl tr.is-low td { color: var(--signal-warn); }
.life { display: inline-block; width: 120px; height: 10px; margin-right: 10px; vertical-align: middle; background: rgba(127, 200, 255, 0.1); }
.life i { display: block; height: 100%; background: var(--signal-pos); }
.is-low .life i { background: var(--signal-warn); }

.faults { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 13px; }
.faults li { display: grid; grid-template-columns: 70px 1fr auto; gap: 8px; padding: 6px 10px; background: var(--bg-panel-2); border-left: 2px solid var(--signal-warn); }
.faults em { font-style: normal; color: var(--text-muted); }
.faults__empty { display: block !important; text-align: center; color: var(--text-muted); border-left-color: var(--border) !important; }
</style>
