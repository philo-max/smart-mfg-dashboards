<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search } from '@lucide/vue'
import type { EChartsOption } from 'echarts'
import AkPanel from '@/components/ui/AkPanel.vue'
import AkModal from '@/components/ui/AkModal.vue'
import StatTile from '@/components/ui/StatTile.vue'
import PointsPanel from '@/components/ui/PointsPanel.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, catAxis, ring, tooltip, valAxis } from '@/components/charts/theme'
import WarehouseHeatmap from './WarehouseHeatmap.vue'
import { MODULES } from '@/data/modules'
import { DWELL_HOT_MIN, MATERIAL_TYPES } from '@/data/sim/constants'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const meta = MODULES.warehouse
const plant = usePlantStore()
const ui = useUiStore()
const wh = computed(() => plant.state.warehouse)

const selectedId = ref<string | null>(null)
const selected = computed(() => wh.value.cells.find((c) => c.id === selectedId.value) ?? null)
const modalOpen = computed({ get: () => selected.value !== null, set: (v) => { if (!v) selectedId.value = null } })

const query = ref('')
const results = computed(() => {
  const q = query.value.trim().toUpperCase()
  if (!q) return []
  return wh.value.cells.filter((c) => c.item && (c.item.rfid.includes(q) || c.item.name.includes(query.value.trim())))
})

onMounted(() => {
  if (ui.focus && wh.value.cells.some((c) => c.id === ui.focus)) selectedId.value = ui.focus
  ui.clearFocus()
})

const accuracyRing = computed(() => ring(wh.value.accuracy, C.room.warehouse, '库存准确率', 99.5))
const materialOption = computed<EChartsOption>(() => ({
  tooltip,
  grid: { left: 40, right: 16, top: 16, bottom: 26 },
  xAxis: catAxis(MATERIAL_TYPES.map((m) => `${m} 料`)),
  yAxis: valAxis({ minInterval: 1 }),
  series: [{
    type: 'bar', barWidth: 34,
    data: MATERIAL_TYPES.map((m, i) => ({
      value: wh.value.cells.filter((c) => c.material === m).length,
      itemStyle: { color: [C.room.warehouse, C.accent, C.highlight][i] },
    })),
    label: { show: true, position: 'top', color: C.text },
  }],
}))
const hotCount = computed(() => wh.value.cells.filter((c) => c.dwellMin >= DWELL_HOT_MIN).length)
</script>

<template>
  <div class="module">
    <div class="col">
      <AkPanel title="库存准确率" en="INVENTORY ACCURACY" :color="meta.color">
        <EChart :option="accuracyRing" />
      </AkPanel>
      <AkPanel title="物料构成与存取" en="MATERIAL · THROUGHPUT" :color="meta.color">
        <div class="mat"><EChart :option="materialOption" /></div>
        <div class="grid3">
          <StatTile label="自动存料" :value="wh.autoStore" />
          <StatTile label="自动取料" :value="wh.autoPick" />
          <StatTile label="手动存料" :value="wh.manualStore" />
          <StatTile label="今日入库" :value="wh.inboundToday" />
          <StatTile label="今日出库" :value="wh.outboundToday" />
          <StatTile label="呆滞工位" :value="hotCount" :level="hotCount > 0 ? 'warn' : 'normal'" />
        </div>
      </AkPanel>
    </div>

    <div class="col col--center">
      <AkPanel title="库位占用热力图" en="SLOT HEATMAP · DWELL TIME" :color="meta.color">
        <template #actions><span class="hint">颜色 = 停留时长，红色为呆滞（≥{{ DWELL_HOT_MIN }} min），点击工位查看工件</span></template>
        <WarehouseHeatmap :cells="wh.cells" :selected="selectedId" @select="selectedId = $event" />
      </AkPanel>
      <AkPanel title="工件 RFID 搜索" en="RFID LOOKUP" :color="meta.color">
        <label class="search">
          <Search :size="18" />
          <input v-model="query" type="search" placeholder="输入 RFID（如 RF01012）或工件名称" aria-label="搜索工件 RFID" />
        </label>
        <ul class="results scroll-y">
          <li v-for="c in results" :key="c.id">
            <button type="button" @click="selectedId = c.id">
              <b class="ak-num">{{ c.item?.rfid }}</b><span>{{ c.item?.name }}</span>
              <span>{{ c.id }}工位 · {{ c.material }} 料</span><span class="ak-num">停留 {{ c.dwellMin }} min</span>
            </button>
          </li>
          <li v-if="query && results.length === 0" class="results__empty">线上仓库中未找到匹配工件</li>
          <li v-if="!query" class="results__empty">当前在库 RFID：{{ wh.cells.filter((c) => c.item).map((c) => c.item?.rfid).join('、') }}</li>
        </ul>
      </AkPanel>
    </div>

    <div class="col">
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
      <PointsPanel unit="warehouse" :color="meta.color" />
    </div>

    <AkModal v-model:open="modalOpen" :title="selected ? `${selected.id}工位 · 工件信息` : ''" en="SLOT DETAIL" :width="720" :height="440" :color="meta.color">
      <dl v-if="selected" class="detail">
        <div><dt>工位</dt><dd>{{ selected.id }}（{{ selected.row + 1 }} 层 第 {{ selected.col + 1 }} 列）</dd></div>
        <div><dt>物料类型</dt><dd>{{ selected.material ?? '—' }}</dd></div>
        <div><dt>工件</dt><dd>{{ selected.item?.name ?? '空闲' }}</dd></div>
        <div><dt>RFID</dt><dd class="ak-num">{{ selected.item?.rfid ?? '—' }}</dd></div>
        <div><dt>批次</dt><dd class="ak-num">{{ selected.item?.batch ?? '—' }}</dd></div>
        <div><dt>入库时间</dt><dd class="ak-num">{{ selected.item?.inAt ?? '—' }}</dd></div>
        <div><dt>停留时长</dt><dd class="ak-num" :class="{ 'tone-risk': selected.dwellMin >= DWELL_HOT_MIN }">{{ selected.dwellMin }} min</dd></div>
        <div><dt>状态</dt><dd :class="selected.dwellMin >= DWELL_HOT_MIN ? 'tone-risk' : 'tone-pos'">{{ !selected.item ? '空闲' : selected.dwellMin >= DWELL_HOT_MIN ? '呆滞，建议优先出库' : '正常周转' }}</dd></div>
      </dl>
    </AkModal>
  </div>
</template>

<style scoped>
.mat { height: 170px; }
.hint { font-size: 12px; color: var(--text-muted); }

.search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  height: 42px;
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
  font-size: 15px;
}

.results {
  flex: 1;
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}

.results button {
  width: 100%;
  display: grid;
  grid-template-columns: 120px 1fr 1fr 110px;
  gap: 10px;
  padding: 8px 10px;
  text-align: left;
  background: rgba(155, 123, 255, 0.08);
  border: 0;
  border-left: 3px solid var(--room-warehouse);
  margin-bottom: 6px;
  font-size: 13px;
}

.results button:hover { background: rgba(155, 123, 255, 0.18); }
.results__empty { font-size: 13px; color: var(--text-muted); line-height: 1.7; }

.belts {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

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
