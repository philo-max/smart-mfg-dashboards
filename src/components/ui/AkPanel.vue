<script setup lang="ts">
/** 方舟式面板：色块 + 中文标题 + 英文副标签，右上斜切角 */
withDefaults(defineProps<{ title: string; en?: string; color?: string; flush?: boolean }>(), {
  en: '',
  color: 'var(--accent)',
  flush: false,
})
</script>

<template>
  <section class="ak-panel" :style="{ '--panel-color': color }">
    <header class="ak-panel__head">
      <span class="ak-panel__mark" aria-hidden="true"></span>
      <h3 class="ak-panel__title">{{ title }}</h3>
      <span v-if="en" class="ak-en ak-panel__en">{{ en }}</span>
      <div class="ak-panel__actions"><slot name="actions" /></div>
    </header>
    <div class="ak-panel__body" :class="{ 'is-flush': flush }"><slot /></div>
  </section>
</template>

<style scoped>
.ak-panel {
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
}

.ak-panel::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 22px;
  height: 22px;
  background: linear-gradient(225deg, var(--panel-color) 0 30%, transparent 30%);
  opacity: 0.9;
}

.ak-panel__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  height: 40px;
  padding: 10px 16px 0;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
}

.ak-panel__mark {
  align-self: center;
  width: 4px;
  height: 16px;
  background: var(--panel-color);
  box-shadow: 0 0 8px var(--panel-color);
}

.ak-panel__title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.ak-panel__en {
  font-size: 11px;
}

.ak-panel__actions {
  margin-left: auto;
  align-self: center;
  display: flex;
  gap: 8px;
}

.ak-panel__body {
  flex: 1;
  min-height: 0;
  padding: 12px 16px 14px;
  display: flex;
  flex-direction: column;
}

.ak-panel__body.is-flush {
  padding: 0;
}
</style>
