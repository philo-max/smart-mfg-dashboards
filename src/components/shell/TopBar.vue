<script setup lang="ts">
import { Activity, Layers, Leaf } from '@lucide/vue'
import type { Component } from 'vue'
import { TABS, useUiStore, type TabId } from '@/stores/ui'

const ui = useUiStore()

const iconMap: Record<TabId, Component> = {
  manufacturing: Activity,
  'product-insight': Layers,
  'health-market': Leaf,
}
</script>

<template>
  <header class="top-bar">
    <div class="top-bar__brand">
      <span class="top-bar__mark" aria-hidden="true"></span>
      <div class="top-bar__titles">
        <strong>智能制造数据可视化综合实训</strong>
        <span>生产 · 体验 · 市场</span>
      </div>
    </div>

    <nav class="top-bar__nav" aria-label="页签导航">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        type="button"
        class="tab-btn theme-aware"
        :class="{ 'is-active': tab.id === ui.activeTab }"
        :aria-current="tab.id === ui.activeTab ? 'page' : undefined"
        @click="ui.setTab(tab.id)"
      >
        <component :is="iconMap[tab.id]" :size="16" aria-hidden="true" />
        <span class="tab-btn__text">
          <span class="tab-btn__label">{{ tab.label }}</span>
          <span class="tab-btn__hint">{{ tab.hint }}</span>
        </span>
      </button>
    </nav>

    <div class="top-bar__meta">
      <span class="top-bar__dot" aria-hidden="true"></span>
      <span>1280×960 · 单屏</span>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  transition: background-color var(--motion-theme) var(--ease-standard),
    border-color var(--motion-theme) var(--ease-standard);
}

.top-bar__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.top-bar__mark {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  flex: none;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  box-shadow: 0 6px 16px -8px var(--accent);
  transition: background var(--motion-theme) var(--ease-standard),
    box-shadow var(--motion-theme) var(--ease-standard);
}

.top-bar__titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top-bar__titles strong {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-bar__titles span {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-bar__nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-panel-2);
  color: var(--text-secondary);
  cursor: pointer;
  line-height: 1.1;
}

.tab-btn:hover {
  border-color: var(--accent-line);
  color: var(--text-primary);
}

.tab-btn.is-active {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  color: var(--text-primary);
}

.tab-btn__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.tab-btn__label {
  font-size: 13px;
  font-weight: 600;
}

.tab-btn__hint {
  font-size: 10px;
  color: var(--text-muted);
}

.top-bar__meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

.top-bar__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
</style>
