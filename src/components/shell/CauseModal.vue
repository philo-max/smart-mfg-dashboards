<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Crosshair } from '@lucide/vue'
import AkModal from '@/components/ui/AkModal.vue'
import { MODULES } from '@/data/modules'
import { causalChains, chainIdForAlarm } from '@/data/sim/chains'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

/** 告警根因溯源：定位告警所属因果链，标出疑似根因环节，给出证据与处置建议 */
const plant = usePlantStore()
const ui = useUiStore()

const open = computed({ get: () => ui.causeAlarmId !== null, set: (v) => { if (!v) ui.closeCause() } })
const alarm = computed(() => plant.alarms.find((a) => a.id === ui.causeAlarmId) ?? null)
const chain = computed(() => {
  if (!alarm.value) return null
  const id = chainIdForAlarm(alarm.value)
  return causalChains(plant.state).find((c) => c.id === id) ?? null
})
const rootIndex = computed(() => chain.value?.steps.findIndex((s) => s.active) ?? -1)
const activeCount = computed(() => chain.value?.steps.filter((s) => s.active).length ?? 0)
const LEVEL_TEXT = { risk: '紧急', warn: '重要' } as const

function jump(module: keyof typeof MODULES, focus: string | null = null) {
  ui.closeCause()
  ui.navigate(module, focus)
}
</script>

<template>
  <AkModal v-model:open="open" title="告警根因溯源" en="ROOT CAUSE ANALYSIS" :width="1040" :height="640" color="var(--signal-risk)">
    <template v-if="alarm && chain">
      <header class="head" :class="`is-${alarm.level}`">
        <span class="head__lvl">{{ LEVEL_TEXT[alarm.level] }}</span>
        <span class="ak-num head__time">{{ alarm.time }}</span>
        <span class="head__mod" :style="{ background: MODULES[alarm.module].color }">{{ MODULES[alarm.module].name }}</span>
        <p>{{ alarm.text }}</p>
      </header>

      <section class="chain">
        <h3><Crosshair :size="16" />所属因果链：{{ chain.name }}<small>{{ chain.summary }}</small></h3>
        <ol>
          <template v-for="(s, i) in chain.steps" :key="s.id">
            <li v-if="i > 0" class="conn" :class="{ 'is-hot': s.active && chain.steps[i - 1].active }" aria-hidden="true"><ArrowRight :size="20" /></li>
            <li class="node" :class="{ 'is-active': s.active, 'is-root': i === rootIndex }">
              <span v-if="i === rootIndex" class="node__root">疑似根因</span>
              <b>{{ s.label }}</b>
              <span class="node__mod" :style="{ color: MODULES[s.module].color }">{{ MODULES[s.module].name }}</span>
              <p>{{ s.evidence }}</p>
              <button type="button" @click="jump(s.module)">查看模块 ›</button>
            </li>
          </template>
        </ol>
      </section>

      <section class="advice">
        <h3>诊断与处置建议</h3>
        <p v-if="rootIndex < 0" class="advice__ok">该链路当前所有环节均已恢复正常，此告警可标记为已解决。</p>
        <p v-else class="advice__diag">
          链路中 <b>{{ activeCount }}</b> 个环节处于异常，最上游的异常环节是「<b>{{ chain.steps[rootIndex].label }}</b>」，
          建议先从这里处理，下游环节会随之恢复。
        </p>
        <ul>
          <li v-for="a in chain.advice" :key="a">{{ a }}</li>
        </ul>
      </section>
    </template>
    <p v-else class="gone">该告警已不在告警列表中。</p>
  </AkModal>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-panel-2);
  border-left: 4px solid var(--signal-warn);
}

.head.is-risk { border-left-color: var(--signal-risk); background: var(--signal-risk-soft); }
.head__lvl { font-size: 12px; font-weight: 700; padding: 2px 8px; color: #0a0c0f; background: var(--signal-warn); }
.head.is-risk .head__lvl { color: #fff; background: var(--signal-risk); }
.head__time { color: var(--text-muted); }
.head__mod { font-size: 12px; font-weight: 700; padding: 2px 8px; color: #0a0c0f; }
.head p { margin: 0; font-size: 15px; }

.chain h3, .advice h3 { display: flex; align-items: baseline; gap: 8px; margin: 0 0 12px; font-size: 15px; }
.chain h3 svg { align-self: center; color: var(--signal-risk); }
.chain h3 small { font-size: 12px; font-weight: 400; color: var(--text-muted); margin-left: 8px; }

.chain ol { display: flex; align-items: stretch; gap: 8px; margin: 0; padding: 0; list-style: none; }

.node {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 14px 12px;
  background: rgba(233, 237, 241, 0.04);
  border: 1px solid var(--border);
  border-top: 3px solid var(--signal-pos);
}

.node b { font-size: 16px; }
.node__mod { font-size: 12px; }
.node p { margin: 0; flex: 1; font-size: 13px; line-height: 1.6; color: var(--text-secondary); }
.node.is-active { border-top-color: var(--signal-risk); background: var(--signal-risk-soft); }
.node.is-root { outline: 2px solid var(--highlight); outline-offset: -2px; }

.node__root {
  position: absolute;
  top: -12px;
  left: 10px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #0a0c0f;
  background: var(--highlight);
}

.node button { align-self: flex-start; padding: 0; font-size: 12px; color: var(--accent); background: none; border: 0; }
.node button:hover { color: var(--highlight); }

.conn { display: grid; place-items: center; color: var(--text-muted); }
.conn.is-hot { color: var(--signal-risk); animation: ak-blink 0.9s steps(2) infinite; }

.advice { flex: 1; }
.advice p { margin: 0 0 10px; font-size: 14px; line-height: 1.8; color: var(--text-secondary); }
.advice b { color: var(--highlight); }
.advice__ok { color: var(--signal-pos) !important; }
.advice ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: var(--text-primary); }
.gone { margin: 60px 0; text-align: center; color: var(--text-muted); }
</style>
