import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type TabId = 'manufacturing' | 'product-insight' | 'health-market'

export interface TabMeta {
  id: TabId
  label: string
  theme: string
  hint: string
}

/** 三个页签及其主题映射，供顶部导航与主题容器共用。 */
export const TABS: readonly TabMeta[] = [
  { id: 'manufacturing', label: '智能制造', theme: 'manufacturing', hint: '生产 · 设备 · 物流' },
  { id: 'product-insight', label: '产品体验', theme: 'product-insight', hint: '口碑 · 体验 · 人群' },
  { id: 'health-market', label: '健康市场', theme: 'health-market', hint: '市场 · 用药 · 需求' },
] as const

/**
 * 跨页签唯一状态源：当前页签、主题、动效降级。
 * 三个业务页共享同一份状态，避免各自维护。
 */
export const useUiStore = defineStore('ui', () => {
  const activeTab = ref<TabId>('manufacturing')
  const transitioning = ref(false)
  const reducedMotion = ref(false)

  const activeMeta = computed<TabMeta>(
    () => TABS.find((tab) => tab.id === activeTab.value) ?? TABS[0],
  )
  const activeTheme = computed(() => activeMeta.value.theme)

  function setTab(id: TabId) {
    if (id === activeTab.value) return
    activeTab.value = id
  }

  function setReducedMotion(value: boolean) {
    reducedMotion.value = value
  }

  return {
    activeTab,
    transitioning,
    reducedMotion,
    activeMeta,
    activeTheme,
    setTab,
    setReducedMotion,
  }
})
