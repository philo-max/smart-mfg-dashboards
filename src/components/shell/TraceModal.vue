<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, Search } from '@lucide/vue'
import AkModal from '@/components/ui/AkModal.vue'
import { MODULES } from '@/data/modules'
import { buildTrace } from '@/data/sim/lineage'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

/** 工件全链路追溯：仓库 → AGV → 装配 → 检测 → 回库，随模拟实时更新 */
const plant = usePlantStore()
const ui = useUiStore()
const query = ref('')

const open = computed({ get: () => ui.traceRfid !== null, set: (v) => { if (!v) ui.closeTrace() } })
const trace = computed(() => (ui.traceRfid ? buildTrace(plant.state, ui.traceRfid) : null))
const RESULT_TEXT = { pass: '合格', ng: '不合格 · 返工中', wip: '流转中' } as const

watch(() => ui.traceRfid, (v) => { query.value = v ?? '' })

function lookup() {
  const q = query.value.trim()
  if (q) ui.openTrace(q)
}

function jump(module: (typeof MODULES)[keyof typeof MODULES]['id'], focus: string | null = null) {
  ui.closeTrace()
  ui.navigate(module, focus)
}
</script>

<template>
  <AkModal v-model:open="open" title="工件全链路追溯" en="WORKPIECE TRACEABILITY" :width="1040" :height="700" color="var(--accent)">
    <template #actions>
      <form class="search" @submit.prevent="lookup">
        <Search :size="15" />
        <input v-model="query" type="search" placeholder="输入 RFID，如 RF01012" aria-label="输入 RFID 追溯" />
      </form>
    </template>

    <p v-if="!trace" class="notfound">在右上角输入 RFID 回车追溯；或在仓库工位清单、物流追踪表、检测记录里直接点击带虚线下划线的 RFID。</p>
    <template v-else>
      <p v-if="!trace.found" class="notfound">未找到 RFID「{{ trace.rfid }}」。可在仓库、物流追踪表或检测记录中点击 RFID 直接追溯。</p>
      <template v-else>
        <header class="head">
          <div class="head__id">
            <span class="ak-en">RFID</span>
            <b class="ak-num">{{ trace.rfid }}</b>
          </div>
          <dl>
            <div><dt>工件</dt><dd>{{ trace.name }}</dd></div>
            <div><dt>批次</dt><dd class="ak-num">{{ trace.batch }}</dd></div>
            <div><dt>当前状态</dt><dd :class="{ 'tone-pos': trace.result === 'pass', 'tone-risk': trace.result === 'ng' }">{{ RESULT_TEXT[trace.result] }}</dd></div>
            <div class="head__loc"><dt>最新位置 / 结果</dt><dd>{{ trace.location }}</dd></div>
          </dl>
          <button v-if="trace.focus" type="button" class="go" @click="jump(trace.focus.module, trace.focus.focus)">
            前往 {{ MODULES[trace.focus.module].name }}<ArrowRight :size="15" />
          </button>
        </header>

        <ol class="stages" aria-label="流转阶段">
          <li v-for="s in trace.stages" :key="s.key" :class="`is-${s.status}`">
            <button type="button" @click="jump(s.module)">
              <i class="stages__dot"></i>
              <span class="stages__label">{{ s.label }}</span>
              <span class="ak-en">{{ MODULES[s.module].en }}</span>
            </button>
          </li>
        </ol>

        <ul class="events scroll-y">
          <li v-for="(e, i) in trace.events" :key="i" :class="`is-${e.level}`">
            <span class="events__time ak-num">{{ e.time }}</span>
            <button type="button" class="events__mod" :style="{ background: MODULES[e.module].color }" @click="jump(e.module)">
              {{ MODULES[e.module].name.replace('单元', '') }}
            </button>
            <span class="events__text">{{ e.text }}</span>
            <span v-if="e.synthetic" class="events__tag" title="该阶段的历史由 RFID 派生，非本次会话实时事件">历史归档</span>
          </li>
        </ul>
      </template>
    </template>
  </AkModal>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  height: 34px;
  color: var(--text-muted);
  background: var(--bg-panel-2);
  border: 1px solid var(--border-strong);
}

.search:focus-within { border-color: var(--accent); }
.search input { width: 180px; background: none; border: 0; outline: none; color: var(--text-primary); font-size: 13px; }

.notfound { margin: 40px 0; text-align: center; font-size: 15px; color: var(--text-muted); line-height: 1.8; }

.head { display: flex; align-items: center; gap: 22px; padding: 12px 16px; background: var(--bg-panel-2); border-left: 4px solid var(--accent); }
.head__id { display: flex; flex-direction: column; }
.head__id b { font-size: 26px; color: var(--accent); }
.head dl { flex: 1; margin: 0; display: flex; gap: 26px; }
.head dl div { display: flex; flex-direction: column; gap: 2px; }
.head dt { font-size: 11px; color: var(--text-muted); }
.head dd { margin: 0; font-size: 15px; }
.head__loc { flex: 1; }

.go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #0a0c0f;
  background: var(--text-primary);
  border: 0;
}

.go:hover { background: var(--highlight); }

.stages {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stages button {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 14px 10px 26px;
  position: relative;
  text-align: left;
  background: rgba(160, 205, 255, 0.04);
  border: 1px solid var(--border);
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%);
}

.stages button:hover { background: var(--accent-soft); }
.stages__dot { position: absolute; left: 10px; top: 16px; width: 9px; height: 9px; border-radius: 50%; background: var(--border-strong); }
.stages__label { font-size: 14px; color: var(--text-secondary); }
.stages li.is-done .stages__dot { background: var(--signal-pos); box-shadow: 0 0 6px var(--signal-pos); }
.stages li.is-done .stages__label { color: var(--text-primary); }
.stages li.is-current .stages__dot { background: var(--highlight); box-shadow: 0 0 8px var(--highlight); animation: ak-blink 1.2s steps(2) infinite; }
.stages li.is-current button { border-color: var(--highlight); }
.stages li.is-current .stages__label { color: var(--highlight); font-weight: 700; }
.stages li.is-fail .stages__dot { background: var(--signal-risk); box-shadow: 0 0 8px var(--signal-risk); }
.stages li.is-fail button { border-color: var(--signal-risk); background: var(--signal-risk-soft); }
.stages li.is-fail .stages__label { color: var(--signal-risk); font-weight: 700; }

.events { flex: 1; list-style: none; margin: 0; padding: 0 4px 0 0; display: flex; flex-direction: column; gap: 6px; }

.events li {
  display: grid;
  grid-template-columns: 74px 58px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 9px 12px;
  font-size: 14px;
  background: rgba(160, 205, 255, 0.03);
  border-left: 3px solid var(--signal-pos);
}

.events li.is-info { border-left-color: var(--accent); }
.events li.is-warn { border-left-color: var(--signal-warn); background: rgba(255, 176, 32, 0.06); }
.events li.is-risk { border-left-color: var(--signal-risk); background: var(--signal-risk-soft); }
.events__time { color: var(--text-muted); font-size: 13px; }
.events__mod { font-size: 12px; font-weight: 700; padding: 2px 0; color: #0a0c0f; border: 0; text-align: center; }
.events__text { color: var(--text-primary); }
.events__tag { font-size: 11px; padding: 1px 8px; color: var(--text-muted); border: 1px dashed var(--border-strong); }
</style>
