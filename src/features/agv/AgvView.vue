<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import AkPanel from '@/components/ui/AkPanel.vue'
import AkModal from '@/components/ui/AkModal.vue'
import StatTile from '@/components/ui/StatTile.vue'
import PointsPanel from '@/components/ui/PointsPanel.vue'
import StreamStrip from '@/components/ui/StreamStrip.vue'
import EventLog from '@/components/ui/EventLog.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, catAxis, fade, itemTooltip, legend, ring, tooltip, valAxis } from '@/components/charts/theme'
import AgvMap from './AgvMap.vue'
import { AGV_ROUTES } from '@/data/sim/constants'
import { agvResponseRate, avgTransportSeconds } from '@/data/sim/selectors'
import { MODULES } from '@/data/modules'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const STATUS_TEXT = { running: '运行中', idle: '空闲', charging: '充电中', blocked: '阻塞' } as const
const LOW_BATTERY = 20
const WARN_BATTERY = 30

const meta = MODULES.agv
const plant = usePlantStore()
const ui = useUiStore()
const fleet = computed(() => plant.state.agv)

const selectedId = ref<string | null>(null)
const selected = computed(() => fleet.value.agvs.find((a) => a.id === selectedId.value) ?? null)
const modalOpen = computed({ get: () => selected.value !== null, set: (v) => { if (!v) selectedId.value = null } })

onMounted(() => {
  if (ui.focus && fleet.value.agvs.some((a) => a.id === ui.focus)) selectedId.value = ui.focus
  ui.clearFocus()
})

function routeName(id: string) {
  return AGV_ROUTES.find((r) => r.id === id)?.name ?? id
}

const routeCards = computed(() =>
  AGV_ROUTES.map((r) => {
    const length = r.points.slice(1).reduce((a, p, i) => a + Math.hypot(p.x - r.points[i].x, p.y - r.points[i].y), 0)
    return {
      ...r,
      start: r.points[0],
      end: r.points[r.points.length - 1],
      length: Math.round(length),
      onRoute: fleet.value.agvs.filter((a) => a.routeId === r.id && a.status !== 'charging').length,
    }
  }),
)

const responseRate = computed(() => agvResponseRate(plant.state))
const avgTransport = computed(() => avgTransportSeconds(plant.state))

const completionRing = computed(() => ring(plant.kpis.agvCompletion, C.room.agv, '任务完成率', 95))

const batteryOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 60, right: 36, top: 8, bottom: 8 },
  xAxis: { type: 'value', min: 0, max: 100, show: false },
  yAxis: catAxis(fleet.value.agvs.map((a) => a.id), { inverse: true, axisLine: { show: false }, axisLabel: { color: C.text, fontSize: 12 } }),
  series: [{
    type: 'bar', barWidth: 12, showBackground: true, backgroundStyle: { color: 'rgba(255,255,255,0.06)' },
    label: { show: true, position: 'right', color: C.text, formatter: '{c}%' },
    markLine: { symbol: 'none', silent: true, lineStyle: { color: C.risk, type: 'dashed' }, label: { show: false }, data: [{ xAxis: LOW_BATTERY }] },
    data: fleet.value.agvs.map((a) => ({
      value: Math.round(a.battery),
      itemStyle: { color: a.status === 'charging' ? C.warn : a.battery < LOW_BATTERY ? C.risk : a.battery < WARN_BATTERY ? C.warn : C.room.agv },
    })),
  }],
}))

const statusOption = computed<EChartsOption>(() => {
  const count = (s: string) => fleet.value.agvs.filter((a) => a.status === s).length
  return {
    tooltip: { ...itemTooltip, formatter: '{b}：{c} 台' },
    legend: { orient: 'vertical', right: 6, top: 'middle', textStyle: { color: C.text, fontSize: 12 }, itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie', radius: ['50%', '72%'], center: ['30%', '50%'], label: { show: false }, itemStyle: { borderColor: C.bg, borderWidth: 2 },
      data: [
        { name: STATUS_TEXT.running, value: count('running'), itemStyle: { color: C.room.agv } },
        { name: STATUS_TEXT.idle, value: count('idle'), itemStyle: { color: C.dim } },
        { name: STATUS_TEXT.charging, value: count('charging'), itemStyle: { color: C.warn } },
        { name: STATUS_TEXT.blocked, value: count('blocked'), itemStyle: { color: C.risk } },
      ],
    }],
  }
})

const trendOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis' }, legend,
  grid: { left: 32, right: 30, top: 32, bottom: 20 },
  xAxis: catAxis(fleet.value.history.map((_, i) => String(i + 1)), { axisLabel: { show: false } }),
  yAxis: [valAxis({ minInterval: 1 }), valAxis({ minInterval: 1, splitLine: { show: false } })],
  series: [
    { name: '完成任务', type: 'bar', data: fleet.value.history.map((h) => h.done), itemStyle: { color: fade(C.room.agv, 'cc', '30') } },
    { name: '阻塞台数', type: 'line', yAxisIndex: 1, step: 'end', showSymbol: false, data: fleet.value.history.map((h) => h.blocked), lineStyle: { color: C.risk, width: 2 }, areaStyle: { color: fade(C.risk, '55', '05') } },
  ],
}))
</script>

<template>
  <div class="module">
    <StreamStrip module="agv" />

    <div class="col rows-l">
      <AkPanel title="任务完成率" en="TASK COMPLETION" :color="meta.color">
        <div class="ring"><EChart :option="completionRing" /></div>
        <div class="grid3">
          <StatTile label="已完成" :value="fleet.tasksDone" />
          <StatTile label="任务总数" :value="fleet.tasksTotal" />
          <StatTile label="在途" :value="fleet.agvs.filter((a) => a.status === 'running').length" />
        </div>
      </AkPanel>
      <AkPanel title="车队与任务队列" en="FLEET · TASK QUEUE" :color="meta.color">
        <ul class="fleet scroll-y">
          <li v-for="a in fleet.agvs" :key="a.id" :class="{ 'is-selected': a.id === selectedId }">
            <button type="button" @click="selectedId = a.id">
              <b class="ak-num">{{ a.id }}</b>
              <span class="fleet__status" :class="`is-${a.status}`">{{ STATUS_TEXT[a.status] }}</span>
              <span class="fleet__batt ak-num" :class="{ 'tone-warn': a.battery < WARN_BATTERY }">{{ Math.round(a.battery) }}%</span>
              <span class="fleet__task">{{ a.task }}</span>
              <i class="fleet__bar"><em :class="`is-${a.status}`" :style="{ width: `${Math.round(Math.min(1, a.progress) * 100)}%` }"></em></i>
            </button>
          </li>
        </ul>
      </AkPanel>
      <AkPanel title="电量监控" en="BATTERY" :color="meta.color">
        <template #actions><span class="hint">红线 {{ LOW_BATTERY }}% 自动返回充电</span></template>
        <EChart :option="batteryOption" />
      </AkPanel>
    </div>

    <div class="col col--center center">
      <AkPanel title="产线地图 · AGV 实时位置" en="LINE MAP · LIVE POSITION" :color="meta.color" flush>
        <template #actions><span class="hint">悬浮 AGV 图标查看设备 ID 与当前任务，点击查看详情</span></template>
        <AgvMap :agvs="fleet.agvs" :selected="selectedId" @select="selectedId = $event" />
      </AkPanel>
      <AkPanel title="路径数据坐标" en="ROUTE COORDINATES" :color="meta.color">
        <div class="routes">
          <article v-for="r in routeCards" :key="r.id" class="route" :class="{ 'is-active': r.onRoute > 0 }">
            <header><b class="ak-num">{{ r.id }}</b><span>{{ r.name }}</span></header>
            <dl>
              <div><dt>起点 · {{ r.from }}</dt><dd class="ak-num">({{ r.start.x }}, {{ r.start.y }})</dd></div>
              <div><dt>终点 · {{ r.to }}</dt><dd class="ak-num">({{ r.end.x }}, {{ r.end.y }})</dd></div>
              <div><dt>途经点</dt><dd class="ak-num">{{ r.points.length }} 个</dd></div>
              <div><dt>路径长度</dt><dd class="ak-num">{{ r.length }} px</dd></div>
            </dl>
            <footer><span class="dot" :class="{ on: r.onRoute > 0 }"></span>{{ r.onRoute }} 台在途</footer>
          </article>
        </div>
      </AkPanel>
    </div>

    <div class="col rows-r">
      <AkPanel title="状态分布与调度指标" en="STATUS · DISPATCH" :color="meta.color">
        <div class="donut"><EChart :option="statusOption" /></div>
        <div class="grid3">
          <StatTile label="任务响应率" :value="responseRate" unit="%" :level="responseRate < 95 ? 'warn' : 'normal'" />
          <StatTile label="平均运输" :value="avgTransport" unit="s" />
          <StatTile label="阻塞" :value="fleet.agvs.filter((a) => a.status === 'blocked').length" :level="fleet.agvs.some((a) => a.status === 'blocked') ? 'risk' : 'normal'" />
        </div>
      </AkPanel>
      <AkPanel title="任务与阻塞趋势" en="THROUGHPUT · BLOCKED" :color="meta.color">
        <EChart :option="trendOption" />
      </AkPanel>
      <EventLog module="agv" :color="meta.color" />
      <PointsPanel unit="agv" :color="meta.color" />
    </div>

    <AkModal v-model:open="modalOpen" :title="selected?.id ?? ''" en="MOMA DETAIL" :width="720" :height="420" :color="meta.color">
      <dl v-if="selected" class="detail">
        <div><dt>状态</dt><dd>{{ STATUS_TEXT[selected.status] }}</dd></div>
        <div><dt>当前任务</dt><dd>{{ selected.task }}</dd></div>
        <div><dt>路径</dt><dd>{{ routeName(selected.routeId) }}</dd></div>
        <div><dt>路段进度</dt><dd class="ak-num">{{ Math.round(selected.progress * 100) }}%</dd></div>
        <div><dt>电量</dt><dd class="ak-num" :class="{ 'tone-warn': selected.battery < WARN_BATTERY }">{{ Math.round(selected.battery) }}%</dd></div>
        <div><dt>Y 轴位置</dt><dd class="ak-num">{{ selected.yAxis }} mm</dd></div>
      </dl>
    </AkModal>
  </div>
</template>

<style scoped>
.rows-l { grid-template-rows: 290px minmax(0, 1fr) 170px; }
.rows-r { grid-template-rows: 260px 170px minmax(0, 1fr) 222px; }
.center { grid-template-rows: minmax(0, 1fr) 276px; }
.ring { height: 150px; }
.donut { height: 130px; }
.hint { font-size: 12px; color: var(--text-muted); }

.fleet { flex: 1; list-style: none; margin: 0; padding: 0; }

.fleet button {
  width: 100%;
  display: grid;
  grid-template-columns: 76px 56px 44px 1fr;
  grid-template-rows: auto 5px;
  gap: 4px 8px;
  align-items: center;
  padding: 8px 10px 6px;
  margin-bottom: 6px;
  background: rgba(139, 220, 58, 0.06);
  border: 1px solid var(--border);
  border-left: 3px solid var(--room-agv);
  font-size: 12px;
  text-align: left;
}

.fleet li.is-selected button { border-color: var(--highlight); background: var(--highlight-soft); }
.fleet__status { font-size: 11px; color: var(--signal-pos); }
.fleet__status.is-blocked { color: var(--signal-risk); }
.fleet__status.is-charging { color: var(--signal-warn); }
.fleet__task { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.fleet__bar {
  grid-column: 1 / -1;
  height: 4px;
  background: rgba(255, 255, 255, 0.07);
}

.fleet__bar em { display: block; height: 100%; background: var(--room-agv); transition: width 0.4s linear; }
.fleet__bar em.is-blocked { background: var(--signal-risk); }
.fleet__bar em.is-charging { background: var(--signal-warn); }

.routes {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.route {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  font-size: 12px;
  background: var(--bg-panel-2);
  border-top: 2px solid var(--border-strong);
  color: var(--text-secondary);
}

.route.is-active { border-top-color: var(--room-agv); }
.route header { display: flex; flex-direction: column; gap: 2px; }
.route header b { font-size: 16px; color: var(--room-agv); }
.route header span { color: var(--text-primary); line-height: 1.3; }
.route dl { margin: 0; display: flex; flex-direction: column; gap: 4px; }
.route dl div { display: flex; flex-direction: column; }
.route dt { font-size: 10px; color: var(--text-muted); }
.route dd { margin: 0; color: var(--text-primary); }
.route footer { margin-top: auto; display: flex; align-items: center; gap: 6px; color: var(--text-muted); }

.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border-strong); }
.dot.on { background: var(--room-agv); box-shadow: 0 0 6px var(--room-agv); }
</style>
