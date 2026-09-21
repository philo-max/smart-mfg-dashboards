<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import AkPanel from '@/components/ui/AkPanel.vue'
import StatTile from '@/components/ui/StatTile.vue'
import PointsPanel from '@/components/ui/PointsPanel.vue'
import EquipmentModal from '@/components/ui/EquipmentModal.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, catAxis, fade, ring, tooltip, valAxis } from '@/components/charts/theme'
import { MODULES } from '@/data/modules'
import { TRANSPORT_LATE_S } from '@/data/sim/constants'
import { oeeOf } from '@/data/sim/selectors'
import type { Equipment } from '@/data/sim/types'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

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

const onTimeRing = computed(() => ring(plant.kpis.onTime, C.room.logistics, '订单准时交付率', 95))

const transportOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis' },
  grid: { left: 44, right: 16, top: 16, bottom: 26 },
  xAxis: catAxis(lg.value.transport.map((t) => t.label), { axisLabel: { color: C.dim, fontSize: 10, interval: 4 } }),
  yAxis: valAxis({ name: '秒' }),
  series: [{
    type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
    data: lg.value.transport.map((t) => (t.seconds > TRANSPORT_LATE_S ? { value: t.seconds, itemStyle: { color: C.risk }, symbolSize: 9 } : t.seconds)),
    lineStyle: { color: C.room.logistics, width: 2 },
    itemStyle: { color: C.room.logistics },
    areaStyle: { color: fade(C.room.logistics) },
    markLine: {
      symbol: 'none', silent: true, lineStyle: { color: C.highlight, type: 'dashed' },
      label: { color: C.highlight, formatter: `交付红线 ${TRANSPORT_LATE_S}s` },
      data: [{ yAxis: TRANSPORT_LATE_S }],
    },
  }],
}))

const oeeOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 100, right: 48, top: 10, bottom: 10 },
  xAxis: { type: 'value', min: 0, max: 100, show: false },
  yAxis: catAxis(lg.value.equipment.map((e) => e.name), { inverse: true, axisLine: { show: false }, axisLabel: { color: C.text, fontSize: 12 } }),
  series: [{
    type: 'bar', barWidth: 14, showBackground: true, backgroundStyle: { color: 'rgba(255,255,255,0.06)', borderRadius: 6 },
    label: { show: true, position: 'right', color: C.text, formatter: '{c}%' },
    data: lg.value.equipment.map((e) => {
      const v = oeeOf(e)
      return { value: v, itemStyle: { borderRadius: 6, color: v < 75 ? C.warn : C.room.logistics } }
    }),
  }],
}))

const lastTransport = computed(() => lg.value.transport[lg.value.transport.length - 1])
</script>

<template>
  <div class="module">
    <div class="col">
      <AkPanel title="订单准时交付率" en="ON-TIME DELIVERY" :color="meta.color">
        <EChart :option="onTimeRing" />
        <div class="grid3">
          <StatTile label="订单总数" :value="lg.ordersTotal" />
          <StatTile label="RFID 写入" :value="lg.rfidWrites" />
          <StatTile label="当前运输" :value="lastTransport.seconds" unit="s" :level="lastTransport.seconds > TRANSPORT_LATE_S ? 'warn' : 'normal'" />
        </div>
      </AkPanel>
      <AkPanel title="设备综合效率" en="OEE BY EQUIPMENT" :color="meta.color">
        <template #actions><span class="hint">点击查看故障记录</span></template>
        <div class="oee-list">
          <EChart :option="oeeOption" @click="(p) => { selectedId = lg.equipment[p.dataIndex as number]?.id ?? null }" />
        </div>
      </AkPanel>
    </div>

    <div class="col col--center">
      <AkPanel title="物料运输时间" en="TRANSPORT TIME · 物流 → 装配" :color="meta.color">
        <EChart :option="transportOption" />
      </AkPanel>
      <AkPanel title="设备台账" en="EQUIPMENT LEDGER">
        <div class="ledger scroll-y">
          <button v-for="e in lg.equipment" :key="e.id" type="button" class="eq-row" @click="selectedId = e.id">
            <span class="eq-row__name">{{ e.name }}<small class="ak-en">{{ e.id }}</small></span>
            <span>可用率 <b class="ak-num">{{ (e.availability * 100).toFixed(1) }}%</b></span>
            <span>性能率 <b class="ak-num">{{ (e.performance * 100).toFixed(1) }}%</b></span>
            <span>合格率 <b class="ak-num">{{ (e.quality * 100).toFixed(1) }}%</b></span>
            <span class="eq-row__oee" :class="{ 'tone-warn': oeeOf(e) < 75 }">OEE <b class="ak-num">{{ oeeOf(e) }}%</b></span>
          </button>
        </div>
      </AkPanel>
    </div>

    <div class="col">
      <AkPanel title="生产计划达成率" en="PLAN ACHIEVEMENT" :color="meta.color">
        <div class="grid3">
          <StatTile label="今日产出" :value="plant.kpis.produced" />
          <StatTile label="日计划" :value="plant.kpis.plan" />
          <StatTile label="达成率" :value="plant.kpis.achievement" unit="%" />
        </div>
      </AkPanel>
      <PointsPanel unit="logistics" :color="meta.color" />
    </div>

    <EquipmentModal :equipment="selectedEquipment" color="var(--room-logistics)" @close="selectedId = null" />
  </div>
</template>

<style scoped>
.hint { font-size: 12px; color: var(--text-muted); }
.oee-list { flex: 1; min-height: 0; }

.ledger {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eq-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: rgba(58, 141, 255, 0.07);
  border: 0;
  border-left: 3px solid var(--room-logistics);
  font-size: 12px;
  color: var(--text-secondary);
  text-align: left;
}

.eq-row:hover { background: rgba(58, 141, 255, 0.16); }

.eq-row__name {
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  font-size: 13px;
}

.eq-row b { font-size: 14px; color: var(--text-primary); }
.eq-row__oee.tone-warn b { color: var(--signal-warn); }
</style>
