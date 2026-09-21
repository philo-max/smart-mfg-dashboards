<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from '@lucide/vue'

/** 弹窗挂到舞台内的 #ak-overlay，跟随舞台等比缩放 */
const props = withDefaults(
  defineProps<{ open: boolean; title: string; en?: string; width?: number; height?: number; color?: string }>(),
  { en: '', width: 1180, height: 700, color: 'var(--accent)' },
)
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const dialog = ref<HTMLDivElement | null>(null)

function close() {
  emit('update:open', false)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      window.addEventListener('keydown', onKey)
      await nextTick()
      dialog.value?.focus()
    } else {
      window.removeEventListener('keydown', onKey)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport defer to="#ak-overlay">
    <div v-if="open" class="ak-modal-mask" @click.self="close">
      <div
        ref="dialog"
        class="ak-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        :style="{ width: `${width}px`, height: `${height}px`, '--modal-color': color }"
      >
        <header class="ak-modal__head">
          <span class="ak-modal__bar ak-hazard" aria-hidden="true"></span>
          <div class="ak-modal__titles">
            <h2>{{ title }}</h2>
            <span v-if="en" class="ak-en">{{ en }}</span>
          </div>
          <div class="ak-modal__actions"><slot name="actions" /></div>
          <button type="button" class="ak-modal__close" aria-label="关闭" @click="close"><X :size="22" /></button>
        </header>
        <div class="ak-modal__body"><slot /></div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ak-modal-mask {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 6, 9, 0.78);
  backdrop-filter: blur(3px);
}

.ak-modal {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #151b23, #0d1117);
  border: 1px solid var(--border-strong);
  border-top: 3px solid var(--modal-color);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7), 0 0 30px rgba(35, 200, 255, 0.12);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%);
  outline: none;
}

.ak-modal__head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.ak-modal__bar {
  width: 40px;
  height: 26px;
}

.ak-modal__titles h2 {
  font-size: 22px;
  letter-spacing: 0.06em;
}

.ak-modal__actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

.ak-modal__close {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
}

.ak-modal__close:hover {
  color: var(--highlight);
  border-color: var(--highlight);
}

.ak-modal__body {
  flex: 1;
  min-height: 0;
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
