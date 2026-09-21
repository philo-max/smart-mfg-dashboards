import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { MODULES, type ModuleId } from '@/data/modules'

export type ViewId = 'overview' | ModuleId

/**
 * 视图导航唯一状态源：基建总览 ↔ 模块房间。
 * focus 为下钻时携带的焦点对象（AGV 编号、库位、设备编号等），由目标模块读取并高亮。
 */
export const useUiStore = defineStore('ui', () => {
  const view = ref<ViewId>('overview')
  const focus = ref<string | null>(null)
  const reducedMotion = ref(false)

  const activeModule = computed(() => (view.value === 'overview' ? null : MODULES[view.value]))

  function navigate(next: ViewId, nextFocus: string | null = null) {
    focus.value = nextFocus
    view.value = next
  }

  function back() {
    navigate('overview')
  }

  function clearFocus() {
    focus.value = null
  }

  function setReducedMotion(value: boolean) {
    reducedMotion.value = value
  }

  return { view, focus, reducedMotion, activeModule, navigate, back, clearFocus, setReducedMotion }
})
