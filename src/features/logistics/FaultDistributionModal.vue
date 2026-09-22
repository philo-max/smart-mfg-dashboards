<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import AkModal from '@/components/ui/AkModal.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, catAxis, itemTooltip, tooltip, valAxis } from '@/components/charts/theme'
import { FAULT_DAY_LABELS, faultDistribution, faultWeekly, typeOfCode } from '@/data/sim/faults'
import { usePlantStore } from '@/stores/plant'

const open = defineModel<boolean>('open', { required: true })
const plant = usePlantStore()

const DIM_OPACITY = 0.22
const RECORD_LIMIT = 8

const selected = ref<string | null>(null)
watch(open, (v) => { if (v) selected.value = null })

const shares = computed(() => faultDistribution(plant.state))
const weekly = computed(() => faultWeekly(plant.state))
const total = computed(() => shares.value.reduce((s, r) => s + r.total, 0))
const liveTotal = computed(() => shares.value.reduce((s, r) => s + r.live, 0))
const picked = computed(() => shares.value.find((r) => r.key === selected.value) ?? null)

function toggle(key: string) {
  selected.value = selected.value === key ? null : key
}

const ringOption = computed<EChartsOption>(() => ({
  tooltip: { ...itemTooltip, formatter: '{b}：{c} 次（{d}%）' },
  title: {
    text: String(picked.value?.total ?? total.value),
    subtext: picked.value ? picked.value.name : '今日故障总次数',
    left: 'center', top: '38%', itemGap: 4,
    textStyle: { color: picked.value?.color ?? C.text, fontSize: 40, fontWeight: 700, fontFamily: 'Bahnschrift, sans-serif' },
    subtextStyle: { color: C.dim, fontSize: 13 },
  },
  series: [{
    type: 'pie', radius: ['56%', '80%'], avoidLabelOverlap: true, label: { show: false }, padAngle: 2,
    itemStyle: { borderColor: '#0a1220', borderWidth: 2 },
    data: shares.value.map((r) => ({
      name: r.name, value: r.total,
      itemStyle: { color: r.color, opacity: !picked.value || picked.value.key === r.key ? 1 : DIM_OPACITY, shadowBlur: picked.value?.key === r.key ? 18 : 0, shadowColor: r.color },
    })),
  }],
}))

const weeklyOption = computed<EChartsOption>(() => ({
  tooltip: { ...tooltip, trigger: 'axis' },
  grid: { left: 36, right: 16, top: 16, bottom: 26 },
  xAxis: catAxis([...FAULT_DAY_LABELS]),
  yAxis: valAxis({ name: '次', minInterval: 1 }),
  series: weekly.value.map((w) => {
    const on = !picked.value || picked.value.key === w.key
    return {
      name: w.name, type: 'line' as const, smooth: true, data: w.values, symbolSize: on ? 6 : 3,
      lineStyle: { color: w.color, width: picked.value?.key === w.key ? 4 : 2, opacity: on ? 1 : DIM_OPACITY },
      itemStyle: { color: w.color, opacity: on ? 1 : DIM_OPACITY },
      z: picked.value?.key === w.key ? 5 : 1,
    }
  }),
}))

const records = computed(() =>
  plant.state.logistics.equipment
    .flatMap((eq) => eq.faults.map((f) => ({ ...f, device: eq.name, key: typeOfCode(f.code).key, color: typeOfCode(f.code).color })))
    .filter((f) => !picked.value || f.key === picked.value.key)
    .slice(0, RECORD_LIMIT),
)
</script>

<template>
  <AkModal v-model:open="open" title="设备故障分布" en="FAULT DISTRIBUTION · 8 TYPES" :width="1320" :height="780" color="var(--room-logistics)">
    <div class="fd">
      <section class="fd__ring">
        <div class="fd__chart"><EChart :option="ringOption" @click="(p) => { const r = shares.find((s) => s.name === p.name); if (r) toggle(r.key) }" /></div>
        <ul class="fd__legend">
          <li v-for="r in shares" :key="r.key">
            <button type="button" :class="{ 'is-on': picked?.key === r.key, 'is-dim': picked && picked.key !== r.key }" @click="toggle(r.key)">
              <i :style="{ background: r.color }"></i>
              <span>{{ r.name }}</span>
              <b class="ak-num">{{ r.total }}</b>
              <em class="ak-num">{{ r.percent }}%</em>
              <small v-if="r.live" class="ak-num">+{{ r.live }} 新增</small>
            </button>
          </li>
        </ul>
      </section>

      <section class="fd__trend">
        <h3>近 5 日趋势 <span class="ak-en">LAST 5 DAYS · 前 4 日为模拟</span></h3>
        <div class="fd__line"><EChart :option="weeklyOption" /></div>
        <h3>{{ picked ? `${picked.name} · 最近记录` : '最近故障记录' }} <span class="ak-en">EQUIPMENT FAULT LOG</span></h3>
        <ul v-if="records.length" class="fd__records">
          <li v-for="(f, i) in records" :key="f.time + f.code + i">
            <i :style="{ background: f.color }"></i>
            <span class="ak-num">{{ f.time }}</span>
            <span>{{ f.device }}</span>
            <span>{{ f.desc }}</span>
            <code>{{ f.code }}</code>
            <em class="ak-num">停机 {{ f.minutes }} min</em>
          </li>
        </ul>
        <p v-else class="fd__empty">该类型暂无设备故障记录</p>
      </section>
    </div>
    <footer class="fd__note">
      今日基线取自《数据准备》共 {{ total - liveTotal }} 次；本次运行新增 {{ liveTotal }} 次，随演练台注入与模拟故障实时累计。点击扇区或图例可联动折线与记录。
    </footer>
  </AkModal>
</template>

<style scoped>
.fd { flex: 1; min-height: 0; display: grid; grid-template-columns: 520px minmax(0, 1fr); gap: 22px; padding: 6px 4px 0; }
.fd__ring { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.fd__chart { height: 320px; flex-shrink: 0; }

.fd__legend { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }

.fd__legend button {
  width: 100%;
  display: grid;
  grid-template-columns: 12px 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-size: 14px;
  text-align: left;
  background: var(--accent-soft);
  border: 1px solid var(--border);
}

.fd__legend button:hover, .fd__legend button.is-on { border-color: var(--accent); background: rgba(35, 200, 255, 0.2); }
.fd__legend button.is-dim { opacity: 0.45; }
.fd__legend i { width: 10px; height: 10px; }
.fd__legend b { font-size: 16px; }
.fd__legend em { font-style: normal; font-size: 12px; color: var(--text-muted); min-width: 42px; text-align: right; }
.fd__legend small { grid-column: 2 / -1; font-size: 11px; color: var(--signal-warn); }

.fd__trend { display: flex; flex-direction: column; min-height: 0; gap: 8px; }
.fd__trend h3 { font-size: 16px; display: flex; align-items: baseline; gap: 10px; }
.fd__line { height: 290px; flex-shrink: 0; }

.fd__records { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; overflow: hidden; }

.fd__records li {
  display: grid;
  grid-template-columns: 8px 70px 110px 1fr 160px 110px;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  font-size: 13px;
  background: rgba(160, 205, 255, 0.04);
}

.fd__records i { width: 4px; height: 16px; }
.fd__records code { font-size: 12px; color: var(--text-muted); }
.fd__records em { font-style: normal; text-align: right; color: var(--text-secondary); }
.fd__empty { margin: 0; font-size: 13px; color: var(--text-muted); }

.fd__note { padding: 10px 6px 2px; font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border); }
</style>
