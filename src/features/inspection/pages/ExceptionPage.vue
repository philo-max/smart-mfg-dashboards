<script setup lang="ts">
import { computed } from 'vue'
import { FlaskConical } from '@lucide/vue'
import AkPanel from '@/components/ui/AkPanel.vue'
import StatTile from '@/components/ui/StatTile.vue'
import EventLog from '@/components/ui/EventLog.vue'
import EChart from '@/components/charts/EChart.vue'
import { C, ring } from '@/components/charts/theme'
import { mttrOf } from '../buildReport'
import { closureOption } from '../pageCharts'
import { targetText } from '../metricText'
import { MODULES } from '@/data/modules'
import { inspectionMetrics } from '@/data/sim/metrics'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const meta = MODULES.inspection
const plant = usePlantStore()
const ui = useUiStore()
const ins = computed(() => plant.state.inspection)
const m = computed(() => inspectionMetrics(plant.state, plant.alarms))
const mine = computed(() => plant.alarms.filter((a) => a.module === 'inspection'))
const count = (s: string) => mine.value.filter((a) => a.status === s).length
const mttr = computed(() => mttrOf(plant.state))

const closureRing = computed(() => ring(m.value.closure.value, m.value.closure.level === 'normal' ? C.pos : C.warn, '闭环率'))
const stack = computed(() => closureOption(ins.value.mttr))
const byCategory = computed(() => {
  const map = new Map<string, number>()
  for (const a of mine.value) map.set(a.category, (map.get(a.category) ?? 0) + 1)
  return [...map.entries()].sort((a, b) => b[1] - a[1])
})
const PLAYBOOK = [
  { symptom: '孔径超差（检测位2）', action: '复核激光测径标定与标准件，检查治具是否松动' },
  { symptom: '视觉误判（检测位3 / 4）', action: '清洁镜头，校准光源亮度，复测标准件' },
  { symptom: 'RFID 读取失败（检测位5）', action: '检查标签与天线距离，必要时重写标签' },
  { symptom: '气压不足', action: '检查气源与管路压力，必要时停线排查' },
  { symptom: '连续 NG', action: '先排查上游装配机器人，再回看检测位' },
]
const STEPS = computed(() => [
  { name: '发现', desc: '检测位 NG / 设备告警', value: '实时' },
  { name: '响应', desc: '发现 → 开始处理', value: `${m.value.response.value} min` },
  { name: '处理', desc: '开始处理 → 闭环', value: `${mttr.value} min` },
  { name: '闭环', desc: '问题彻底解决', value: `${m.value.closure.value}%` },
])
</script>

<template>
  <div class="col col--left">
    <AkPanel title="异常处理核心指标" en="EXCEPTION KPI" :color="meta.color">
      <div class="kpis">
        <StatTile label="异常响应时间" :value="m.response.value" unit="min" :level="m.response.level" :hint="targetText(m.response)" />
        <StatTile label="异常闭环率" :value="m.closure.value" unit="%" :level="m.closure.level" :hint="targetText(m.closure)" />
        <StatTile label="异常闭环 MTTR" :value="mttr" unit="min" hint="平均处理时长" />
        <StatTile label="未处理" :value="count('open')" :level="count('open') > 0 ? 'warn' : 'normal'" />
        <StatTile label="处理中" :value="count('handling')" />
        <StatTile label="本次已解决" :value="count('resolved')" />
      </div>
    </AkPanel>
    <AkPanel title="异常闭环率" en="CLOSURE" :color="meta.color">
      <div class="ring"><EChart :option="closureRing" /></div>
      <p class="sub">24h 异常 {{ ins.ops.exceptions.total + mine.length }} 起，已闭环 {{ ins.ops.exceptions.closed + count('resolved') }} 起</p>
    </AkPanel>
    <AkPanel title="异常处理流程" en="WORKFLOW" :color="meta.color">
      <ol class="flow">
        <li v-for="(s, i) in STEPS" :key="s.name">
          <b class="ak-num">{{ i + 1 }}</b>
          <span class="flow__name">{{ s.name }}<small>{{ s.desc }}</small></span>
          <em class="ak-num">{{ s.value }}</em>
        </li>
      </ol>
    </AkPanel>
  </div>

  <div class="col col--center centerX">
    <AkPanel title="历史异常的响应与处理耗时" en="RESPONSE × HANDLING" :color="meta.color">
      <template #actions><span class="hint">叠加高度 = 闭环总时长</span></template>
      <EChart :option="stack" />
    </AkPanel>
    <EventLog module="inspection" :color="meta.color" />
  </div>

  <div class="col col--right colX">
    <AkPanel title="异常类别" en="CATEGORY" :color="meta.color">
      <ul class="cat">
        <li v-for="[name, n] in byCategory" :key="name"><span>{{ name }}</span><b class="ak-num">{{ n }}</b></li>
        <li v-if="byCategory.length === 0" class="cat__empty">本次运行暂无检测异常</li>
      </ul>
    </AkPanel>
    <AkPanel title="历史闭环记录" en="CLOSED CASES" :color="meta.color">
      <table class="tbl">
        <tr><th>时间</th><th>位置</th><th>现象</th><th>响应</th><th>处理</th></tr>
        <tr v-for="r in ins.mttr" :key="r.time + r.desc">
          <td class="ak-num">{{ r.time }}</td><td>{{ r.station }}</td><td>{{ r.desc }}</td>
          <td class="ak-num">{{ r.respondMin }}</td><td class="ak-num">{{ r.minutes }}</td>
        </tr>
      </table>
    </AkPanel>
    <AkPanel title="典型异常处置建议" en="PLAYBOOK" :color="meta.color">
      <ul class="play">
        <li v-for="p in PLAYBOOK" :key="p.symptom"><b>{{ p.symptom }}</b><span>{{ p.action }}</span></li>
      </ul>
    </AkPanel>
    <AkPanel title="演练" en="DRILL" :color="meta.color">
      <p class="drill">注入“装配机器人故障”后，在事件日志点“处理 → 解决”，响应时间与闭环率会随之更新。</p>
      <button type="button" class="drill__btn" @click="ui.toggleConsole()"><FlaskConical :size="16" />打开演练台</button>
    </AkPanel>
  </div>
</template>

<style scoped>
.col--left { grid-template-rows: 250px minmax(0, 1fr) 292px; }
.centerX { grid-template-rows: minmax(0, 1fr) 360px; }
.colX { grid-template-rows: 130px 220px minmax(0, 1fr) 150px; }

.kpis { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; gap: 8px; }
.kpis :deep(.stat__value) { font-size: 22px; }
.kpis :deep(.stat) { padding: 6px 10px; }
.kpis :deep(.stat__label) { font-size: 11px; white-space: normal; line-height: 1.2; }
.hint { font-size: 12px; color: var(--text-muted); }

.ring { flex: 1; min-height: 0; }
.sub { margin: 0; text-align: center; font-size: 12px; color: var(--text-muted); }

.flow { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.flow li { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 10px; padding: 6px 10px; background: var(--bg-panel-2); border-left: 2px solid var(--room-inspection); }
.flow b { font-size: 20px; color: var(--room-inspection); }
.flow__name { font-size: 14px; }
.flow__name small { display: block; font-size: 11px; color: var(--text-muted); }
.flow em { font-style: normal; font-size: 16px; }

.cat { list-style: none; margin: 0; padding: 0; display: grid; gap: 5px; font-size: 13px; }
.cat li { display: flex; justify-content: space-between; padding: 5px 10px; background: var(--bg-panel-2); }
.cat__empty { justify-content: center !important; color: var(--text-muted); }

.tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.tbl th { text-align: left; font-weight: 400; color: var(--text-muted); padding: 4px 4px; border-bottom: 1px solid var(--border); }
.tbl td { padding: 7px 4px; border-bottom: 1px solid var(--border); line-height: 1.3; }

.play { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.play li { display: grid; gap: 2px; padding: 6px 10px; background: var(--bg-panel-2); border-left: 2px solid var(--room-inspection); font-size: 12px; color: var(--text-secondary); }
.play b { font-size: 13px; color: var(--text-primary); }
.drill { margin: 0 0 8px; font-size: 13px; line-height: 1.6; color: var(--text-secondary); }
.drill__btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; font-weight: 700; font-size: 13px; color: #0a0c0f; background: var(--highlight); border: 0; }
</style>
