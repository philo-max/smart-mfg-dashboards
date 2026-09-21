<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search } from '@lucide/vue'
import type { EChartsOption } from 'echarts'
import AkPanel from '@/components/ui/AkPanel.vue'
import AkModal from '@/components/ui/AkModal.vue'
import StatTile from '@/components/ui/StatTile.vue'
import PointsPanel from '@/components/ui/PointsPanel.vue'
import StreamStrip from '@/components/ui/StreamStrip.vue'
import EventLog from '@/components/ui/EventLog.vue'
import RfidLink from '@/components/ui/RfidLink.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, catAxis, fade, itemTooltip, legend, ring, tooltip, valAxis } from '@/components/charts/theme'
import WarehouseHeatmap from './WarehouseHeatmap.vue'
import { MODULES } from '@/data/modules'
import { DWELL_HOT_MIN, FAULT_CATALOG, MATERIAL_TYPES } from '@/data/sim/constants'
import { equipmentOf, faultCounts, oeeOf, statusHours } from '@/data/sim/selectors'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const meta = MODULES.warehouse
const plant = usePlantStore()
const ui = useUiStore()
const wh = computed(() => plant.state.warehouse)
const eq = computed(() => equipmentOf(plant.state, 'warehouse'))

const selectedId = ref<string | null>(null)
const selected = computed(() => wh.value.cells.find((c) => c.id === selectedId.value) ?? null)
const modalOpen = computed({ get: () => selected.value !== null, set: (v) => { if (!v) selectedId.value = null } })

const query = ref('')
/** 物料类型筛选：A/B/C 计数块 → 热力图与仓位清单同时聚焦 */
const materialFilter = ref<string | null>(null)

function toggleMaterial(m: string) {
  materialFilter.value = materialFilter.value === m ? null : m
}

const visibleCells = computed(() => {
  const q = query.value.trim()
  return wh.value.cells
    .filter((c) => !materialFilter.value || c.material === materialFilter.value)
    .filter((c) => !q || (c.item && (c.item.rfid.toUpperCase().includes(q.toUpperCase()) || c.item.name.includes(q))))
})

onMounted(() => {
  if (ui.focus && wh.value.cells.some((c) => c.id === ui.focus)) selectedId.value = ui.focus
  ui.clearFocus()
})

const hotCount = computed(() => wh.value.cells.filter((c) => c.dwellMin >= DWELL_HOT_MIN).length)
const accuracyRing = computed(() => ring(wh.value.accuracy, C.room.warehouse, '库存准确率', 99.5))

const FLOW_WINDOW = 5
function rolling(values: number[]) {
  return values.map((_, i) => values.slice(Math.max(0, i - FLOW_WINDOW + 1), i + 1).reduce((a, v) => a + v, 0))
}

const flowOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis' }, legend,
  grid: { left: 34, right: 12, top: 34, bottom: 22 },
  xAxis: catAxis(wh.value.flow.map((_, i) => String(i + 1)), { axisLabel: { show: false } }),
  yAxis: valAxis({ minInterval: 1, name: `近 ${FLOW_WINDOW} tick` }),
  series: [
    { name: '入库', type: 'line', smooth: true, showSymbol: false, data: rolling(wh.value.flow.map((f) => f.in)), lineStyle: { color: C.accent, width: 2 }, areaStyle: { color: fade(C.accent, '55', '05') } },
    { name: '出库', type: 'line', smooth: true, showSymbol: false, data: rolling(wh.value.flow.map((f) => f.out)), lineStyle: { color: C.highlight, width: 2 }, areaStyle: { color: fade(C.highlight, '55', '05') } },
  ],
}))

const alarmOption = computed<EChartsOption>(() => {
  const rows = faultCounts(eq.value, FAULT_CATALOG['EQ-CK'])
  return {
    tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 92, right: 30, top: 6, bottom: 6 },
    xAxis: { type: 'value', show: false, minInterval: 1, max: (v: { max: number }) => Math.max(3, v.max) },
    yAxis: catAxis(rows.map((r) => r.desc), { inverse: true, axisLine: { show: false }, axisLabel: { color: C.text, fontSize: 12 } }),
    series: [{
      type: 'bar', barWidth: 10, showBackground: true, backgroundStyle: { color: 'rgba(255,255,255,0.05)' },
      label: { show: true, position: 'right', color: C.text },
      data: rows.map((r) => ({ value: r.count, itemStyle: { color: r.count > 0 ? C.risk : C.pos, opacity: r.count > 0 ? 1 : 0.35 } })),
    }],
  }
})

const statusOption = computed<EChartsOption>(() => {
  const h = statusHours(eq.value)
  return {
    tooltip: { ...itemTooltip, formatter: '{b}<br/>{c} h（{d}%）' },
    legend: { orient: 'vertical', right: 6, top: 'middle', textStyle: { color: C.text, fontSize: 12 }, itemWidth: 10, itemHeight: 10 },
    title: { text: `${oeeOf(eq.value)}%`, subtext: '设备 OEE', left: '27%', top: '36%', textAlign: 'center', textStyle: { color: C.text, fontSize: 22, fontFamily: 'Bahnschrift, sans-serif' }, subtextStyle: { color: C.dim, fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['52%', '72%'], center: ['27%', '50%'], label: { show: false }, itemStyle: { borderColor: C.bg, borderWidth: 2 },
      data: [
        { name: '运行', value: h.running, itemStyle: { color: C.pos } },
        { name: '待机', value: h.idle, itemStyle: { color: C.dim } },
        { name: '故障', value: h.fault, itemStyle: { color: C.risk } },
      ],
    }],
  }
})
</script>

<template>
  <div class="module">
    <StreamStrip module="warehouse" />

    <div class="col rows-a">
      <AkPanel title="绩效监控" en="PERFORMANCE" :color="meta.color">
        <div class="ring"><EChart :option="accuracyRing" /></div>
        <div class="grid3">
          <StatTile label="自动存料" :value="wh.autoStore" />
          <StatTile label="自动取料" :value="wh.autoPick" />
          <StatTile label="手动存料" :value="wh.manualStore" />
        </div>
      </AkPanel>
      <AkPanel title="存取料趋势" en="IN / OUT · LAST 30 TICKS" :color="meta.color">
        <div class="grow"><EChart :option="flowOption" /></div>
        <div class="grid3 grid3--tight">
          <StatTile
            v-for="m in MATERIAL_TYPES"
            :key="m"
            :label="`${m} 料库存`"
            :en="`Num_${m}`"
            :value="wh.cells.filter((c) => c.material === m).length"
            clickable
            :class="{ 'is-picked': materialFilter === m }"
            @activate="toggleMaterial(m)"
          />
        </div>
      </AkPanel>
      <AkPanel title="告警监控" en="8 类故障 · ALARM MONITOR" :color="meta.color">
        <template #actions><span class="hint">红色 = 已发生</span></template>
        <EChart :option="alarmOption" />
      </AkPanel>
    </div>

    <div class="col col--center center">
      <AkPanel title="库位占用热力图" en="SLOT HEATMAP · DWELL TIME" :color="meta.color">
        <template #actions>
          <span v-if="materialFilter" class="hint">仅显示 {{ materialFilter }} 料 · 再次点击计数块取消</span>
          <span v-else class="hint">颜色 = 停留时长，红色为呆滞（≥{{ DWELL_HOT_MIN }} min），点击工位查看工件</span>
        </template>
        <WarehouseHeatmap :cells="wh.cells" :selected="selectedId" :material="materialFilter" @select="selectedId = $event" />
      </AkPanel>
      <AkPanel title="仓位监控 · 工件 RFID 搜索" en="SLOT MONITOR · RFID LOOKUP" :color="meta.color">
        <template #actions><span class="hint ak-num">在库 {{ plant.kpis.inventory }} / 12 · 呆滞 {{ hotCount }}</span></template>
        <label class="search">
          <Search :size="18" />
          <input v-model="query" type="search" placeholder="输入 RFID（如 RF01012）或工件名称，实时过滤仓位" aria-label="搜索工件 RFID" />
        </label>
        <div class="slots">
          <div
            v-for="c in visibleCells"
            :key="c.id"
            role="button"
            tabindex="0"
            class="slot"
            :class="{ 'is-empty': !c.item, 'is-hot': c.dwellMin >= DWELL_HOT_MIN, 'is-selected': c.id === selectedId }"
            @click="selectedId = c.id"
            @keydown.enter="selectedId = c.id"
          >
            <b class="ak-num">{{ c.id }}</b>
            <span class="slot__mat" :class="{ off: !c.material }">{{ c.material ?? '空' }}</span>
            <i class="slot__sensor" :class="{ on: !!c.item }" :title="c.item ? '工件检测：有料' : '工件检测：无料'"></i>
            <span class="slot__rfid"><RfidLink v-if="c.item" :rfid="c.item.rfid" bare /><template v-else>—</template></span>
            <span class="slot__name">{{ c.item?.name ?? '空闲' }}</span>
            <span class="ak-num slot__dwell">{{ c.item ? `${c.dwellMin} min` : '' }}</span>
          </div>
          <p v-if="visibleCells.length === 0" class="slots__empty">线上仓库中未找到匹配工件</p>
        </div>
      </AkPanel>
    </div>

    <div class="col rows-r">
      <AkPanel title="三轴机械手 · 输送线" en="ROBOT · CONVEYOR" :color="meta.color">
        <div class="grid3">
          <StatTile label="X 轴" en="Robot_X" :value="wh.robot.x" unit="mm" />
          <StatTile label="Y 轴" en="Robot_Y" :value="wh.robot.y" unit="mm" />
          <StatTile label="Z 轴" en="Robot_Z" :value="wh.robot.z" unit="mm" />
        </div>
        <div class="belts">
          <span :class="{ on: wh.upperBelt }">上输送线 {{ wh.upperBelt ? '运行' : '停止' }}</span>
          <span :class="{ on: wh.lowerBelt }">下输送线 {{ wh.lowerBelt ? '运行' : '停止' }}</span>
        </div>
      </AkPanel>
      <AkPanel title="设备状态时长分布" en="STATUS HOURS · 24H" :color="meta.color">
        <EChart :option="statusOption" />
      </AkPanel>
      <EventLog module="warehouse" :color="meta.color" />
      <PointsPanel unit="warehouse" :color="meta.color" />
    </div>

    <AkModal v-model:open="modalOpen" :title="selected ? `${selected.id}工位 · 工件信息` : ''" en="SLOT DETAIL" :width="720" :height="440" :color="meta.color">
      <dl v-if="selected" class="detail">
        <div><dt>工位</dt><dd>{{ selected.id }}（{{ selected.row + 1 }} 层 第 {{ selected.col + 1 }} 列）</dd></div>
        <div><dt>物料类型</dt><dd>{{ selected.material ?? '—' }}</dd></div>
        <div><dt>工件</dt><dd>{{ selected.item?.name ?? '空闲' }}</dd></div>
        <div><dt>RFID · 点击追溯全链路</dt><dd><RfidLink v-if="selected.item" :rfid="selected.item.rfid" /><template v-else>—</template></dd></div>
        <div><dt>批次</dt><dd class="ak-num">{{ selected.item?.batch ?? '—' }}</dd></div>
        <div><dt>入库时间</dt><dd class="ak-num">{{ selected.item?.inAt ?? '—' }}</dd></div>
        <div><dt>停留时长</dt><dd class="ak-num" :class="{ 'tone-risk': selected.dwellMin >= DWELL_HOT_MIN }">{{ selected.dwellMin }} min</dd></div>
        <div><dt>状态</dt><dd :class="selected.dwellMin >= DWELL_HOT_MIN ? 'tone-risk' : 'tone-pos'">{{ !selected.item ? '空闲' : selected.dwellMin >= DWELL_HOT_MIN ? '呆滞，建议优先出库' : '正常周转' }}</dd></div>
      </dl>
    </AkModal>
  </div>
</template>

<style scoped>
.rows-r { grid-template-rows: auto 210px minmax(0, 1fr) 236px; }
.center { grid-template-rows: minmax(0, 1fr) 306px; }
.ring { height: 150px; }
.grow { flex: 1; min-height: 0; }
.grid3--tight { margin-top: 6px; }
.grid3--tight :deep(.stat) { padding: 5px 10px; }
.grid3--tight :deep(.stat__value) { font-size: 20px; }
.hint { font-size: 12px; color: var(--text-muted); }

.search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  height: 36px;
  background: var(--bg-panel-2);
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.search:focus-within { border-color: var(--room-warehouse); }

.search input {
  flex: 1;
  background: none;
  border: 0;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
}

.slots {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 30px;
  grid-auto-flow: column;
  grid-template-rows: repeat(6, 30px);
  gap: 4px 12px;
  margin-top: 8px;
}

.slot {
  display: grid;
  grid-template-columns: 36px 26px 14px 78px 1fr 62px;
  gap: 8px;
  align-items: center;
  padding: 0 8px;
  font-size: 12px;
  text-align: left;
  color: var(--text-secondary);
  background: rgba(155, 123, 255, 0.07);
  border: 0;
  border-left: 3px solid var(--room-warehouse);
}

.slot:hover, .slot.is-selected { background: rgba(155, 123, 255, 0.2); }
.slot.is-empty { opacity: 0.55; border-left-color: var(--border-strong); }
.slot.is-hot { border-left-color: var(--signal-risk); background: var(--signal-risk-soft); }
.slot b { color: var(--text-primary); }

.slot__mat {
  text-align: center;
  font-weight: 700;
  font-size: 11px;
  color: #0a0c0f;
  background: var(--highlight);
}

.slot__mat.off { background: var(--border-strong); color: var(--text-muted); }

.slot__sensor {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--border-strong);
}

.slot__sensor.on { background: var(--signal-pos); box-shadow: 0 0 6px var(--signal-pos); }
.slot__rfid { color: var(--text-primary); }
.slot__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slot__dwell { text-align: right; }
.slot.is-hot .slot__dwell { color: var(--signal-risk); font-weight: 700; }
.slots__empty { grid-column: 1 / -1; font-size: 13px; color: var(--text-muted); }

.belts { display: flex; gap: 10px; margin-top: 12px; }

.belts span {
  flex: 1;
  padding: 8px;
  text-align: center;
  font-size: 13px;
  background: var(--bg-panel-2);
  border-bottom: 3px solid var(--text-muted);
}

.belts span.on { border-bottom-color: var(--signal-pos); }
</style>
