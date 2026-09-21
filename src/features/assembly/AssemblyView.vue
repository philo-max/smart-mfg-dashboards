<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import AkPanel from '@/components/ui/AkPanel.vue'
import StatTile from '@/components/ui/StatTile.vue'
import PointsPanel from '@/components/ui/PointsPanel.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, catAxis, fade, ring, tooltip, valAxis } from '@/components/charts/theme'
import { MODULES } from '@/data/modules'
import { REWORK_THRESHOLD, TAKT_TARGET } from '@/data/sim/constants'
import { reworkRate } from '@/data/sim/step-quality'
import { usePlantStore } from '@/stores/plant'

const meta = MODULES.assembly
const plant = usePlantStore()
const asm = computed(() => plant.state.assembly)
const rework = computed(() => reworkRate(plant.state))
const qualifiedRate = computed(() => Math.round((asm.value.qualified / asm.value.produced) * 10000) / 100)

const rateRing = computed(() => ring(qualifiedRate.value, C.room.assembly, '装配合格率', 98))

const taktOption = computed<EChartsOption>(() => ({
  tooltip,
  grid: { left: 44, right: 16, top: 20, bottom: 26 },
  xAxis: catAxis(asm.value.taktHistory.map((_, i) => String(i + 1)), { axisLabel: { show: false } }),
  yAxis: valAxis({ name: '秒' }),
  series: [{
    type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
    data: asm.value.taktHistory.map((v) => (v > TAKT_TARGET + 8 ? { value: v, itemStyle: { color: C.risk }, symbolSize: 10 } : v)),
    lineStyle: { color: C.room.assembly, width: 2 },
    itemStyle: { color: C.room.assembly },
    areaStyle: { color: fade(C.room.assembly) },
    markLine: {
      symbol: 'none', silent: true, lineStyle: { color: C.highlight, type: 'dashed' },
      label: { color: C.highlight, formatter: `节拍目标 ${TAKT_TARGET}s` },
      data: [{ yAxis: TAKT_TARGET }],
    },
  }],
}))

const outputOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 44, right: 16, top: 16, bottom: 26 },
  xAxis: catAxis(asm.value.workers.map((w) => w.name)),
  yAxis: valAxis(),
  series: [{
    type: 'bar', barWidth: '48%',
    data: asm.value.workers.map((w) => w.output),
    itemStyle: { color: fade(C.highlight), borderRadius: [3, 3, 0, 0] },
    label: { show: true, position: 'top', color: C.text, fontSize: 11 },
  }],
}))

const taktProgress = computed(() => Math.min(100, Math.round((asm.value.taktElapsed / asm.value.taktTarget) * 100)))
</script>

<template>
  <div class="module">
    <div class="col">
      <AkPanel title="装配合格率" en="ASSEMBLY YIELD" :color="meta.color">
        <EChart :option="rateRing" />
        <div class="grid3">
          <StatTile label="今日产出" :value="asm.produced" />
          <StatTile label="合格" :value="asm.qualified" />
          <StatTile label="返工" :value="asm.rework" :level="rework > REWORK_THRESHOLD ? 'risk' : 'normal'" />
        </div>
      </AkPanel>
      <AkPanel title="人均装配产出" en="OUTPUT PER WORKER">
        <div class="chart-fill"><EChart :option="outputOption" /></div>
      </AkPanel>
    </div>

    <div class="col col--center">
      <AkPanel title="生产节拍计时器" en="TAKT TIMER" :color="meta.color">
        <div class="takt">
          <div class="takt__ring" :style="{ '--p': taktProgress }">
            <span class="ak-num">{{ asm.taktElapsed.toFixed(0) }}<small>/ {{ asm.taktTarget }}s</small></span>
          </div>
          <dl class="takt__meta">
            <div><dt>当前 RFID</dt><dd class="ak-num">{{ asm.currentRfid }}</dd></div>
            <div><dt>上一节拍</dt><dd class="ak-num" :class="{ 'tone-risk': asm.lastTakt > TAKT_TARGET + 4 }">{{ asm.lastTakt.toFixed(1) }}s</dd></div>
            <div><dt>返工率（滚动）</dt><dd class="ak-num" :class="{ 'tone-risk': rework > REWORK_THRESHOLD }">{{ rework }}%</dd></div>
          </dl>
        </div>
        <p v-if="rework > REWORK_THRESHOLD" class="alert">
          返工率超过 {{ REWORK_THRESHOLD }}% 标准，装配质量波动，建议排查装配机器人（Alarm_Robot）
        </p>
      </AkPanel>
      <AkPanel title="节拍趋势" en="TAKT TREND · LAST 20 CYCLES" :color="meta.color">
        <div class="chart-fill"><EChart :option="taktOption" /></div>
      </AkPanel>
    </div>

    <div class="col">
      <AkPanel title="装配任务" en="ASSEMBLY TASK" :color="meta.color">
        <div class="grid3">
          <StatTile label="日计划" :value="asm.planToday" />
          <StatTile label="达成率" :value="((asm.produced / asm.planToday) * 100).toFixed(1)" unit="%" />
          <StatTile label="人员" :value="asm.workers.length" />
        </div>
      </AkPanel>
      <PointsPanel unit="assembly" :color="meta.color" />
    </div>
  </div>
</template>

<style scoped>
.chart-fill {
  flex: 1;
  min-height: 0;
}

.takt {
  display: flex;
  align-items: center;
  gap: 24px;
}

.takt__ring {
  --p: 0;
  width: 130px;
  height: 130px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: conic-gradient(var(--room-assembly) calc(var(--p) * 1%), rgba(255, 255, 255, 0.08) 0);
}

.takt__ring::before {
  content: '';
  position: absolute;
}

.takt__ring span {
  width: 106px;
  height: 106px;
  border-radius: 50%;
  background: var(--bg-panel);
  display: grid;
  place-items: center;
  font-size: 26px;
  font-weight: 700;
}

.takt__ring span small {
  display: block;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
}

.takt__meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.takt__meta div {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-panel-2);
  border-left: 2px solid var(--room-assembly);
}

.takt__meta dt { font-size: 12px; color: var(--text-muted); }
.takt__meta dd { margin: 0; font-size: 15px; }

.alert {
  margin-top: 10px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--signal-risk);
  background: var(--signal-risk-soft);
  border-left: 3px solid var(--signal-risk);
}
</style>
