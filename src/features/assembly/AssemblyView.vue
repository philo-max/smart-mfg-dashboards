<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { TriangleAlert } from '@lucide/vue'
import type { EChartsOption } from 'echarts'
import AkPanel from '@/components/ui/AkPanel.vue'
import AkModal from '@/components/ui/AkModal.vue'
import StatTile from '@/components/ui/StatTile.vue'
import PointsPanel from '@/components/ui/PointsPanel.vue'
import StreamStrip from '@/components/ui/StreamStrip.vue'
import EventLog from '@/components/ui/EventLog.vue'
import RfidLink from '@/components/ui/RfidLink.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, catAxis, fade, gauge, ring, tooltip, valAxis } from '@/components/charts/theme'
import { MODULES } from '@/data/modules'
import { REWORK_THRESHOLD, TAKT_TARGET, TORQUE_MAX, TORQUE_MIN } from '@/data/sim/constants'
import { equipmentOf, oeeOf } from '@/data/sim/selectors'
import { reworkRate } from '@/data/sim/step-quality'
import { torquePeak } from '@/data/sim/torque'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const STAGES = ['取料', '定位', '拧紧', '打码', '下料'] as const
const TORQUE_DT_S = 0.05

const meta = MODULES.assembly
const plant = usePlantStore()
const ui = useUiStore()
const asm = computed(() => plant.state.assembly)
const eq = computed(() => equipmentOf(plant.state, 'assembly'))
const rework = computed(() => reworkRate(plant.state))
const qualifiedRate = computed(() => Math.round((asm.value.qualified / asm.value.produced) * 10000) / 100)
const ppm = computed(() => Math.round((asm.value.rework / asm.value.produced) * 1e6))
const alarming = computed(() => rework.value > REWORK_THRESHOLD)
const peak = computed(() => torquePeak(asm.value.torque))
const peakOut = computed(() => peak.value > TORQUE_MAX || peak.value < TORQUE_MIN)

/** 返工率超标：组件变红 + 弹窗；确认后本轮超标期间不再弹，恢复后重新武装 */
const acknowledged = ref(false)
watch(alarming, () => { acknowledged.value = false })
const alertOpen = computed({ get: () => alarming.value && !acknowledged.value, set: (v) => { if (!v) acknowledged.value = true } })
const accent = computed(() => (alarming.value ? 'var(--signal-risk)' : meta.color))

const taktProgress = computed(() => Math.min(100, Math.round((asm.value.taktElapsed / asm.value.taktTarget) * 100)))
const stageIndex = computed(() => Math.min(STAGES.length - 1, Math.floor((taktProgress.value / 100) * STAGES.length)))

const rateRing = computed(() => ring(qualifiedRate.value, alarming.value ? C.risk : C.room.assembly, '装配合格率', 98))
const oeeGauge = computed(() => gauge(oeeOf(eq.value), '装配机器人 OEE'))

const outputOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 40, right: 12, top: 18, bottom: 24 },
  xAxis: catAxis(asm.value.workers.map((w) => w.name)),
  yAxis: valAxis(),
  series: [{
    type: 'bar', barWidth: '48%',
    data: asm.value.workers.map((w) => w.output),
    itemStyle: { color: fade(C.highlight), borderRadius: [3, 3, 0, 0] },
    label: { show: true, position: 'top', color: C.text, fontSize: 11 },
  }],
}))

const reworkOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis' },
  grid: { left: 40, right: 16, top: 18, bottom: 20 },
  xAxis: catAxis(asm.value.reworkHistory.map((_, i) => String(i + 1)), { axisLabel: { show: false } }),
  yAxis: valAxis({ name: '%', min: 0 }),
  series: [{
    name: '滚动返工率', type: 'line', smooth: true, showSymbol: false,
    data: asm.value.reworkHistory,
    lineStyle: { color: alarming.value ? C.risk : C.room.assembly, width: 2 },
    areaStyle: { color: fade(alarming.value ? C.risk : C.room.assembly) },
    markLine: { symbol: 'none', silent: true, lineStyle: { color: C.highlight, type: 'dashed' }, label: { color: C.highlight, formatter: `标准 ${REWORK_THRESHOLD}%` }, data: [{ yAxis: REWORK_THRESHOLD }] },
  }],
}))

const torqueOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis', valueFormatter: (v) => `${Number(v).toFixed(3)} N·m` },
  grid: { left: 44, right: 16, top: 26, bottom: 24 },
  graphic: [{ type: 'text', right: 16, top: 0, style: { text: `峰值 ${peak.value.toFixed(3)} N·m ${peakOut.value ? '· 超差' : '· 合格'}`, fill: peakOut.value ? C.risk : C.pos, fontSize: 13, fontWeight: 700 } }],
  xAxis: catAxis(asm.value.torque.map((_, i) => (i * TORQUE_DT_S).toFixed(2)), { name: 's', axisLabel: { color: C.dim, fontSize: 10, interval: 4 } }),
  yAxis: valAxis({ name: 'N·m', min: 0, max: 1.6 }),
  series: [{
    name: '拧紧扭矩', type: 'line', smooth: true, showSymbol: false,
    data: asm.value.torque,
    lineStyle: { color: peakOut.value ? C.risk : C.accent, width: 2.5 },
    areaStyle: { color: fade(peakOut.value ? C.risk : C.accent, '55', '05') },
    markArea: { silent: true, itemStyle: { color: 'rgba(71,209,140,0.10)' }, data: [[{ yAxis: TORQUE_MIN }, { yAxis: TORQUE_MAX }]] },
    markLine: {
      symbol: 'none', silent: true, lineStyle: { color: C.pos, type: 'dashed' },
      label: { color: C.pos, formatter: '{b}', position: 'insideStartTop' },
      data: [{ name: `下限 ${TORQUE_MIN}`, yAxis: TORQUE_MIN }, { name: `上限 ${TORQUE_MAX}`, yAxis: TORQUE_MAX }],
    },
  }],
}))

const taktOption = computed<EChartsOption>(() => ({
  tooltip,
  grid: { left: 40, right: 16, top: 20, bottom: 22 },
  xAxis: catAxis(asm.value.taktHistory.map((_, i) => String(i + 1)), { axisLabel: { show: false } }),
  yAxis: valAxis({ name: '秒' }),
  series: [{
    type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
    data: asm.value.taktHistory.map((v) => (v > TAKT_TARGET + 8 ? { value: v, itemStyle: { color: C.risk }, symbolSize: 10 } : v)),
    lineStyle: { color: C.room.assembly, width: 2 }, itemStyle: { color: C.room.assembly }, areaStyle: { color: fade(C.room.assembly) },
    markLine: { symbol: 'none', silent: true, lineStyle: { color: C.highlight, type: 'dashed' }, label: { color: C.highlight, formatter: `节拍目标 ${TAKT_TARGET}s` }, data: [{ yAxis: TAKT_TARGET }] },
  }],
}))
</script>

<template>
  <div class="module" :class="{ 'is-alarm': alarming }">
    <StreamStrip module="assembly" />

    <div class="col rows-l">
      <AkPanel title="装配合格率" en="ASSEMBLY YIELD" :color="accent" :class="{ 'is-alarm': alarming }">
        <div class="ring"><EChart :option="rateRing" /></div>
        <div class="grid3">
          <StatTile label="今日产出" :value="asm.produced" />
          <StatTile label="合格" :value="asm.qualified" />
          <StatTile label="返工" :value="asm.rework" :level="alarming ? 'risk' : 'normal'" clickable hint="查看 NG 明细" @activate="ui.navigate('inspection', 'ng')" />
        </div>
      </AkPanel>
      <AkPanel title="人均装配产出" en="OUTPUT PER WORKER" :color="meta.color">
        <EChart :option="outputOption" />
      </AkPanel>
      <AkPanel title="返工率趋势" en="REWORK RATE" :color="accent" :class="{ 'is-alarm': alarming }">
        <template #actions><span class="ak-num" :class="alarming ? 'tone-risk' : 'tone-pos'">{{ rework }}%</span></template>
        <EChart :option="reworkOption" />
      </AkPanel>
    </div>

    <div class="col rows-c2">
      <AkPanel title="生产节拍计时器 · 工位阶段" en="TAKT TIMER · STATION STAGE" :color="meta.color">
        <div class="takt">
          <div class="takt__ring" :style="{ '--p': taktProgress }">
            <span class="ak-num">{{ asm.taktElapsed.toFixed(0) }}<small>/ {{ asm.taktTarget }}s</small></span>
          </div>
          <div class="takt__side">
            <ol class="stages" aria-label="工位阶段">
              <li v-for="(s, i) in STAGES" :key="s" :class="{ done: i < stageIndex, active: i === stageIndex }">{{ s }}</li>
            </ol>
            <dl class="takt__meta">
              <div><dt>当前 RFID</dt><dd><RfidLink :rfid="asm.currentRfid" /></dd></div>
              <div><dt>上一节拍</dt><dd class="ak-num" :class="{ 'tone-risk': asm.lastTakt > TAKT_TARGET + 4 }">{{ asm.lastTakt.toFixed(1) }}s</dd></div>
              <div><dt>返工率（滚动）</dt><dd class="ak-num" :class="{ 'tone-risk': alarming }">{{ rework }}%</dd></div>
            </dl>
          </div>
        </div>
      </AkPanel>
      <AkPanel title="拧紧扭矩-时间曲线" en="TORQUE CURVE · 工艺窗口 0.8–1.2 N·m" :color="peakOut ? 'var(--signal-risk)' : meta.color">
        <EChart :option="torqueOption" />
      </AkPanel>
      <AkPanel title="节拍趋势" en="TAKT TREND · LAST 20 CYCLES" :color="meta.color">
        <EChart :option="taktOption" />
      </AkPanel>
    </div>

    <div class="col rows-r">
      <AkPanel title="设备 OEE · 缺陷 PPM" en="OEE · DEFECT PPM" :color="meta.color">
        <div class="gauge"><EChart :option="oeeGauge" /></div>
        <div class="grid3">
          <StatTile label="缺陷 PPM" :value="ppm.toLocaleString()" :level="alarming ? 'risk' : 'normal'" />
          <StatTile label="计划达成" :value="((asm.produced / asm.planToday) * 100).toFixed(1)" unit="%" />
          <StatTile label="人员" :value="asm.workers.length" />
        </div>
      </AkPanel>
      <EventLog module="assembly" :color="meta.color" />
      <PointsPanel unit="assembly" :color="meta.color" />
    </div>

    <AkModal v-model:open="alertOpen" alert title="返工率超标告警" en="REWORK ALERT" :width="640" :height="330" color="var(--signal-risk)">
      <div class="alert">
        <TriangleAlert :size="46" class="tone-risk" />
        <div>
          <p class="alert__big ak-num">{{ rework }}<small>%</small></p>
          <p>滚动返工率已超过 <b>{{ REWORK_THRESHOLD }}%</b> 标准。上游检测单元 NG 回流增多，
            {{ asm.driftTicks > 0 ? '装配质量正处于漂移期，' : '' }}建议排查装配机器人（Alarm_Robot）与拧紧扭矩。</p>
          <div class="alert__act">
            <button type="button" class="btn btn--ghost" @click="ui.navigate('inspection', 'ng')">查看检测 NG 明细</button>
            <button type="button" class="btn" @click="alertOpen = false">确认知晓</button>
          </div>
        </div>
      </div>
    </AkModal>
  </div>
</template>

<style scoped>
.rows-l { grid-template-rows: 300px minmax(0, 1fr) minmax(0, 1fr); }
.rows-c2 { grid-template-rows: 224px minmax(0, 1fr) 236px; }
.rows-r { grid-template-rows: 310px minmax(0, 1fr) 250px; }
.ring { height: 150px; }
.gauge { height: 170px; }

.ak-panel.is-alarm {
  border-color: var(--signal-risk);
  background: linear-gradient(180deg, rgba(255, 70, 85, 0.1), var(--bg-panel));
}

.takt { display: flex; align-items: center; gap: 24px; flex: 1; }

.takt__ring {
  --p: 0;
  position: relative;
  width: 130px;
  height: 130px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: conic-gradient(var(--room-assembly) calc(var(--p) * 1%), rgba(255, 255, 255, 0.08) 0);
}

.takt__ring span {
  width: 106px;
  height: 106px;
  border-radius: 50%;
  background: var(--bg-panel);
  display: grid;
  place-items: center;
  align-content: center;
  font-size: 28px;
  font-weight: 700;
}

.takt__ring span small { display: block; font-size: 12px; font-weight: 400; color: var(--text-muted); }

.takt__side { flex: 1; display: flex; flex-direction: column; gap: 12px; }

.stages {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stages li {
  text-align: center;
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%);
}

.stages li.done { color: var(--text-primary); background: rgba(255, 180, 0, 0.22); }
.stages li.active { color: #0a0c0f; background: var(--room-assembly); font-weight: 700; }

.takt__meta { margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

.takt__meta div {
  padding: 6px 10px;
  background: var(--bg-panel-2);
  border-left: 2px solid var(--room-assembly);
}

.takt__meta dt { font-size: 11px; color: var(--text-muted); }
.takt__meta dd { margin: 0; font-size: 16px; }

.alert { display: flex; gap: 22px; align-items: center; flex: 1; }
.alert p { margin: 0; font-size: 14px; line-height: 1.8; color: var(--text-secondary); }
.alert b { color: var(--highlight); }
.alert__big { font-size: 48px !important; line-height: 1.1 !important; color: var(--signal-risk) !important; font-weight: 700; }
.alert__big small { font-size: 22px; }
.alert__act { display: flex; gap: 10px; margin-top: 14px; }

.btn {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 700;
  color: #0a0c0f;
  background: var(--text-primary);
  border: 0;
}

.btn:hover { background: var(--highlight); }
.btn--ghost { color: var(--text-primary); background: transparent; border: 1px solid var(--border-strong); }
.btn--ghost:hover { background: var(--accent-soft); }
</style>
