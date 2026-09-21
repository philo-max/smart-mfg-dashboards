<script setup lang="ts" generic="T extends string">
defineProps<{ modelValue: T; options: { value: T; label: string }[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div class="ak-tabs" role="tablist">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="tab"
      class="ak-tabs__btn"
      :class="{ 'is-active': opt.value === modelValue }"
      :aria-selected="opt.value === modelValue"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.ak-tabs {
  display: inline-flex;
}

.ak-tabs__btn {
  font-size: 12px;
  padding: 4px 12px;
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-secondary);
  transition: background-color var(--motion-fast), color var(--motion-fast);
}

.ak-tabs__btn + .ak-tabs__btn {
  border-left: 0;
}

.ak-tabs__btn.is-active {
  background: var(--text-primary);
  color: #0a0c0f;
  font-weight: 700;
  border-color: var(--text-primary);
}
</style>
