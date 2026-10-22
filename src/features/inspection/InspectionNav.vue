<script setup lang="ts">
import { FileText } from '@lucide/vue'
import { INSPECTION_PAGES } from './pages'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
defineEmits<{ report: [] }>()
</script>

<template>
  <nav class="nav" aria-label="检测单元子页面">
    <button
      v-for="(p, i) in INSPECTION_PAGES"
      :key="p.id"
      type="button"
      class="nav__btn"
      :class="{ 'is-active': ui.inspectionPage === p.id }"
      :aria-current="ui.inspectionPage === p.id ? 'page' : undefined"
      @click="ui.setInspectionPage(p.id)"
    >
      <b class="ak-num">{{ i + 1 }}</b>
      <span class="nav__name">{{ p.name }}</span>
      <span class="ak-en nav__en">{{ p.en }}</span>
    </button>
    <p class="nav__q">{{ INSPECTION_PAGES.find((p) => p.id === ui.inspectionPage)?.question }}</p>
    <button type="button" class="nav__report" @click="$emit('report')"><FileText :size="15" />检测报告</button>
  </nav>
</template>

<style scoped>
.nav {
  grid-column: 1 / -1;
  display: flex;
  align-items: stretch;
  gap: 8px;
  height: 46px;
}

.nav__btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 22px 0 14px;
  font-size: 16px;
  color: var(--text-secondary);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-bottom: 3px solid transparent;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%);
  transition: background-color var(--motion-fast), color var(--motion-fast);
}

.nav__btn b { font-size: 18px; color: var(--text-muted); }
.nav__en { font-size: 10px; letter-spacing: 0.12em; color: var(--text-muted); }
.nav__btn:hover { background: var(--accent-soft); color: var(--text-primary); }

.nav__btn.is-active {
  color: #0a0c0f;
  font-weight: 700;
  background: linear-gradient(180deg, #ffb38f, var(--room-inspection));
  border-bottom-color: #fff;
}

.nav__btn.is-active b,
.nav__btn.is-active .nav__en { color: rgba(10, 12, 15, 0.7); }

.nav__q {
  margin: 0 0 0 auto;
  align-self: center;
  font-size: 14px;
  color: var(--text-muted);
}

.nav__report {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 700;
  color: #0a0c0f;
  background: var(--room-inspection);
  border: 0;
}
</style>
