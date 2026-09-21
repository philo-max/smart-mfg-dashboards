<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import AkPanel from '@/components/ui/AkPanel.vue'
import StatTile from '@/components/ui/StatTile.vue'
import PointsPanel from '@/components/ui/PointsPanel.vue'
import EquipmentModal from '@/components/ui/EquipmentModal.vue'
import StreamStrip from '@/components/ui/StreamStrip.vue'
import EventLog from '@/components/ui/EventLog.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, catAxis, fade, miniGauge, ring, tooltip, valAxis } from '@/components/charts/theme'
import { MODULES } from '@/data/modules'
import { OEE_WARN, TRANSPORT_LATE_S } from '@/data/sim/constants'
import { agvResponseRate, avgStorageMinutes, oeeOf } from '@/data/sim/selectors'
import type { Equipment } from '@/data/sim/types'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const ON_TIME_TARGET = 95
/** 订单太少的时段（含刚开始的当前小时）比率没有统计意义，不画点 */
const MIN_BUCKET_ORDERS = 3

const meta = MODULES.logistics
const plant = usePlantStore()
const ui = useUiStore()
const lg = computed(() => plant.state.logistics)

const selectedId = ref<string | null>(null)
const selectedEquipment = computed<Equipment | null>(() => lg.value.equipment.find((e) => e.id === selectedId.value) ?? null)

onMounted(() => {
  if (ui.focus && lg.value.equipment.some((e) => e.id === ui.focus)) selectedId.value = ui.focus
  ui.clearFocus()
})

const lastTransport = computed(() => lg.value.transport[lg.value.transport.length - 1])
const lateTrace = computed(() => lg.value.trace.filter((t) => t.status === '延误').length)
const onTimeRing = computed(() => ring(plant.kpis.onTime, C.room.logistics, '订单准时交付率', ON_TIME_TARGET))

const deliveryOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis', valueFormatter: (v) => `${v}%` },
  grid: { left: 40, right: 14, top: 22, bottom: 24 },
  xAxis: catAxis(lg.value.orderHourly.map((b) => b.label), { axisLabel: { color: C.dim, fontSize: 10, interval: 3 } }),
  yAxis: valAxis({ name: '%', min: 70, max: 100 }),
  series: [{
    type: 'line', smooth: true, connectNulls: true, symbol: 'circle', symbolSize: 5,
    data: lg.value.orderHourly.map((b) => (b.total >= MIN_BUCKET_ORDERS ? Math.round((b.onTime / b.total) * 1000) / 10 : null)),
    lineStyle: { color: C.room.logistics, width: 2 }, itemStyle: { color: C.room.logistics }, areaStyle: { color: fade(C.room.logistics) },
    markLine: { symbol: 'none', silent: true, lineStyle: { color: C.highlight, type: 'dashed' }, label: { color: C.highlight, formatter: `目标 ${ON_TIME_TARGET}%` }, data: [{ yAxis: ON_TIME_TARGET }] },
  }],
}))

const transportOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis' },
  grid: { left: 44, right: 16, top: 18, bottom: 26 },
  xAxis: catAxis(lg.value.transport.map((t) => t.label), { axisLabel: { color: C.dim, fontSize: 10, interval: 4 } }),
  yAxis: valAxis({ name: '秒' }),
  series: [{
    type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
    data: lg.value.transport.map((t) => (t.seconds > TRANSPORT_LATE_S ? { value: t.seconds, itemStyle: { color: C.risk }, symbolSize: 9 } : t.seconds)),
    lineStyle: { color: C.room.logistics, width: 2 }, itemStyle: { color: C.room.logistics }, areaStyle: { color: fade(C.room.logistics) },
    markLine: { symbol: 'none', silent: true, lineStyle: { color: C.highlight, type: 'dashed' }, label: { color: C.highlight, formatter: `交付红线 ${TRANSPORT_LATE_S}s` }, data: [{ yAxis: TRANSPORT_LATE_S }] },
  }],
}))
</script>

<template>
  <div class="module">
    <StreamStrip module="logistics" />

    <div class="col rows-l">
      <AkPanel title="订单准时交付率" en="ON-TIME DELIVERY" :color="meta.color">
        <div class="ring"><EChart :option="onTimeRing" /></div>
        <div class="grid3">
          <StatTile label="订单总数" :value="lg.ordersTotal" />
          <StatTile label="RFID 写入" en="IMS_RFID" :value="lg.rfidWrites" />
          <StatTile label="当前运输" :value="lastTransport.seconds" unit="s" :level="lastTransport.seconds > TRANSPORT_LATE_S ? 'warn' : 'normal'" />
        </div>
      </AkPanel>
      <AkPanel title="订单交付趋势" en="DELIVERY TREND · 24H" :color="meta.color">
        <EChart :option="deliveryOption" />
      </AkPanel>
      <AkPanel title="物流调度指标" en="DISPATCH KPI" :color="meta.color">
        <div class="kpis">
          <StatTile label="AGV 托盘完成率" :value="plant.kpis.agvCompletion" unit="%" />
          <StatTile label="AGV 任务响应率" :value="agvResponseRate(plant.state)" unit="%" />
          <StatTile label="平均仓储时间" :value="avgStorageMinutes(plant.state)" unit="min" />
          <StatTile label="计划达成率" :value="plant.kpis.achievement" unit="%" />
          <StatTile label="延误配送" :value="lateTrace" :level="lateTrace > 0 ? 'warn' : 'normal'" hint="近 14 条流转" />
          <StatTile label="产线 OEE" :value="plant.kpis.lineOee" unit="%" :level="plant.kpis.lineOee < OEE_WARN ? 'warn' : 'normal'" />
        </div>
      </AkPanel>
    </div>

    <div class="col col--center center">
      <AkPanel title="设备 OEE 仪表盘" en="OEE DASHBOARD" :color="meta.color">
        <template #actions><span class="hint">点击仪表查看该设备故障记录</span></template>
        <div class="gauges">
          <button v-for="e in lg.equipment" :key="e.id" type="button" class="gauges__item" :class="{ 'is-warn': oeeOf(e) < OEE_WARN }" @click="selectedId = e.id">
            <div class="gauges__chart"><EChart :option="miniGauge(oeeOf(e), e.name)" /></div>
            <span class="gauges__name">{{ e.name }}</span>
            <span class="ak-en">{{ e.id }} · 故障 {{ e.faults.length }} 次</span>
          </button>
        </div>
      </AkPanel>
      <AkPanel title="物料运输时间" en="TRANSPORT TIME · 物流 → 装配" :color="meta.color">
        <EChart :option="transportOption" />
      </AkPanel>
      <AkPanel title="物料流转 RFID 追踪" en="MATERIAL TRACE · RFID" :color="meta.color">
        <div class="trace scroll-y">
          <div class="trace__row trace__row--head"><span>时间</span><span>RFID</span><span>工件</span><span>流转路径</span><span>状态</span></div>
          <div v-for="t in lg.trace" :key="t.rfid + t.time" class="trace__row">
            <span class="ak-num">{{ t.time }}</span>
            <span class="ak-num">{{ t.rfid }}</span>
            <span>{{ t.name }}</span>
            <span>{{ t.from }} → {{ t.to }}</span>
            <span><b class="tag" :class="t.status === '延误' ? 'late' : 'ok'">{{ t.status }}</b></span>
          </div>
        </div>
      </AkPanel>
    </div>

    <div class="col rows-r">
      <AkPanel title="设备台账" en="EQUIPMENT LEDGER" :color="meta.color">
        <div class="ledger">
          <button v-for="e in lg.equipment" :key="e.id" type="button" class="eq-row" @click="selectedId = e.id">
            <span class="eq-row__name">{{ e.name }}</span>
            <span>可用 <b class="ak-num">{{ (e.availability * 100).toFixed(0) }}%</b></span>
            <span>性能 <b class="ak-num">{{ (e.performance * 100).toFixed(0) }}%</b></span>
            <span>合格 <b class="ak-num">{{ (e.quality * 100).toFixed(0) }}%</b></span>
          </button>
        </div>
      </AkPanel>
      <EventLog module="logistics" :color="meta.color" />
      <PointsPanel unit="logistics" :color="meta.color" />
    </div>

    <EquipmentModal :equipment="selectedEquipment" color="var(--room-logistics)" @close="selectedId = null" />
  </div>
</template>

<style scoped>
.rows-l { grid-template-rows: 300px minmax(0, 1fr) 210px; }
.rows-r { grid-template-rows: 226px minmax(0, 1fr) 250px; }
.center { grid-template-rows: 222px minmax(0, 1fr) 232px; }
.ring { height: 150px; }
.hint { font-size: 12px; color: var(--text-muted); }

.kpis { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; gap: 8px; }
.kpis :deep(.stat) { padding: 6px 10px; }
.kpis :deep(.stat__label) { font-size: 11px; }
.kpis :deep(.stat__value) { font-size: 20px; }
.kpis :deep(.stat__hint) { display: none; }

.gauges { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }

.gauges__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 0;
  padding: 6px 4px 8px;
  background: rgba(58, 141, 255, 0.06);
  border: 1px solid var(--border);
  border-top: 3px solid var(--room-logistics);
  color: var(--text-secondary);
}

.gauges__item:hover { background: rgba(58, 141, 255, 0.16); }
.gauges__item.is-warn { border-top-color: var(--signal-warn); }
.gauges__chart { flex: 1; min-height: 0; width: 100%; }
.gauges__name { font-size: 13px; color: var(--text-primary); }

.trace { flex: 1; font-size: 12px; }

.trace__row {
  display: grid;
  grid-template-columns: 70px 84px 100px 1fr 60px;
  gap: 8px;
  align-items: center;
  height: 26px;
  border-bottom: 1px solid var(--border);
}

.trace__row--head { color: var(--text-muted); font-size: 11px; position: sticky; top: 0; background: var(--bg-panel); }
.tag { font-weight: 400; font-size: 11px; padding: 1px 8px; }
.tag.ok { color: var(--signal-pos); border: 1px solid var(--signal-pos); }
.tag.late { color: var(--signal-warn); border: 1px solid var(--signal-warn); }

.ledger { flex: 1; display: flex; flex-direction: column; gap: 5px; }

.eq-row {
  flex: 1;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 6px;
  align-items: center;
  padding: 0 10px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: left;
  background: rgba(58, 141, 255, 0.07);
  border: 0;
  border-left: 3px solid var(--room-logistics);
}

.eq-row:hover { background: rgba(58, 141, 255, 0.16); }
.eq-row__name { color: var(--text-primary); font-size: 13px; }
.eq-row b { color: var(--text-primary); }
</style>
