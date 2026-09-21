<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Activity, Bell, ChevronLeft, Gauge, House, Package, ShieldCheck } from '@lucide/vue'
import { HUB_META } from '@/data/modules'
import { usePlantStore } from '@/stores/plant'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const plant = usePlantStore()
const now = ref(new Date())
let timer: number | null = null

onMounted(() => { timer = window.setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => { if (timer !== null) window.clearInterval(timer) })

const clock = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }))
const date = computed(() => `${now.value.toLocaleDateString('zh-CN')} 星期${'日一二三四五六'[now.value.getDay()]}`)
const title = computed(() => ui.activeModule ?? { name: HUB_META.name, en: HUB_META.en, code: HUB_META.code, color: HUB_META.color, room: '基建总览' })
</script>

<template>
  <header class="top">
    <div class="top__nav">
      <button type="button" class="top__back" :disabled="ui.view === 'overview'" aria-label="返回基建总览" @click="ui.back()">
        <ChevronLeft :size="26" /><span>返回</span>
      </button>
      <button type="button" class="top__home" aria-label="基建总览" @click="ui.back()"><House :size="20" /></button>
    </div>

    <div class="top__title" :style="{ '--title-color': title.color }">
      <span class="top__code ak-num">{{ title.code }}</span>
      <div>
        <h1>{{ title.name }}<small>{{ title.room }}</small></h1>
        <span class="ak-en">{{ title.en }} · LENOVO MINI LINE · RIIC</span>
      </div>
    </div>

    <div class="top__res">
      <div class="res"><Package :size="16" /><span class="res__label">今日产出</span><b class="ak-num">{{ plant.kpis.produced }}<i>/{{ plant.kpis.plan }}</i></b></div>
      <div class="res"><Gauge :size="16" /><span class="res__label">产线 OEE</span><b class="ak-num">{{ plant.kpis.lineOee }}%</b></div>
      <div class="res"><ShieldCheck :size="16" /><span class="res__label">FPY</span><b class="ak-num">{{ plant.kpis.fpy }}%</b></div>
      <div class="res" :class="{ 'is-risk': plant.unresolved.risk > 0 }">
        <Bell :size="16" /><span class="res__label">未处理告警</span><b class="ak-num">{{ plant.unresolved.total }}</b>
      </div>
      <div class="top__clock">
        <Activity :size="14" class="tone-pos" />
        <b class="ak-num">{{ clock }}</b>
        <span>{{ date }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top {
  position: relative;
  z-index: 5;
  height: 76px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 24px 0 0;
  background: linear-gradient(180deg, rgba(10, 12, 15, 0.98), rgba(10, 12, 15, 0.7));
  border-bottom: 1px solid var(--border);
}

.top::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: linear-gradient(90deg, var(--accent) 0 240px, transparent 240px 260px, var(--border-strong) 260px);
}

.top__nav { display: flex; height: 100%; }

.top__back,
.top__home {
  border: 0;
  background: #e9edf1;
  color: #0a0c0f;
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: 16px;
}

.top__back {
  padding: 0 22px 0 14px;
  clip-path: polygon(0 0, 100% 0, calc(100% - 16px) 100%, 0 100%);
}

.top__back:disabled {
  background: var(--bg-elevated);
  color: var(--text-muted);
  cursor: default;
}

.top__home {
  margin-left: -8px;
  padding: 0 22px 0 26px;
  background: #2b333d;
  color: var(--text-primary);
  clip-path: polygon(16px 0, 100% 0, calc(100% - 16px) 100%, 0 100%);
}

.top__home:hover { color: var(--highlight); }

.top__title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.top__code {
  font-size: 13px;
  padding: 4px 8px;
  color: #0a0c0f;
  background: var(--title-color);
  font-weight: 700;
}

.top__title h1 {
  font-size: 28px;
  letter-spacing: 0.12em;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.top__title small {
  font-size: 14px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  font-weight: 400;
}

.top__res {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.res {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  background: rgba(233, 237, 241, 0.06);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.res__label { font-size: 12px; }

.res b {
  font-size: 19px;
  color: var(--text-primary);
}

.res b i {
  font-style: normal;
  font-size: 13px;
  color: var(--text-muted);
}

.res.is-risk {
  border-color: var(--signal-risk);
  color: var(--signal-risk);
  animation: ak-alarm-pulse 1.4s ease-in-out infinite;
}

.res.is-risk b { color: var(--signal-risk); }

.top__clock {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  column-gap: 6px;
  margin-left: 8px;
  font-size: 11px;
  color: var(--text-muted);
}

.top__clock b {
  font-size: 22px;
  color: var(--text-primary);
}

.top__clock span { grid-column: 1 / -1; }
</style>
