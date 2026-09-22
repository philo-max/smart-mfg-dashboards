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
  background:
    linear-gradient(180deg, rgba(35, 200, 255, 0.05), transparent 90px),
    linear-gradient(160deg, rgba(17, 30, 50, 0.86), rgba(8, 14, 24, 0.9));
  border: 1px solid var(--border);
  box-shadow: inset 0 1px 0 rgba(127, 227, 255, 0.14), inset 0 0 40px rgba(35, 200, 255, 0.03);
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
  backdrop-filter: blur(4px);
}

.ak-panel::before {
  content: '';
  position: absolute;
  left: -1px;
  bottom: -1px;
  width: 14px;
  height: 14px;
  border-left: 2px solid var(--panel-color);
  border-bottom: 2px solid var(--panel-color);
  opacity: 0.75;
  pointer-events: none;
  z-index: 1;
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
  background: linear-gradient(90deg, color-mix(in srgb, var(--panel-color) 14%, transparent), transparent 55%);
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
  font-style: italic;
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
