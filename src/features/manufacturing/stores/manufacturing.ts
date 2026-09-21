import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  SCENARIOS,
  SCENARIO_LIST,
  STATIONS,
  type Scenario,
  type StationId,
} from '../data/manufacturing'

/**
 * 制造页唯一状态源：当前场景 + 选中工位 + 已认领建议动作。
 * 所有组件（Ribbon / Stage / Decision / Metric / Chart）都从这里派生，不各自改 DOM。
 */
export const useManufacturingStore = defineStore('manufacturing', () => {
  const scenario = ref<Scenario>('normal')
  const selectedStation = ref<StationId>('assembly')
  /** 已认领动作，键为 `${scenario}:${action}`；切场景后历史键自然失效，不残留。 */
  const claimed = ref<Set<string>>(new Set())

  const config = computed(() => SCENARIOS[scenario.value])
  const scenarios = computed(() => SCENARIO_LIST)
  const stations = computed(() => STATIONS)

  const bottleneckName = computed(
    () => STATIONS.find((s) => s.id === config.value.bottleneck.node)?.name ?? '',
  )
  const currentNodeName = computed(
    () => STATIONS.find((s) => s.id === config.value.order.currentStation)?.name ?? '',
  )

  /** 切场景：同场景重复点击为 no-op（不叠加动画/计数）；切场景时选中工位回到当前节点。 */
  function setScenario(next: Scenario) {
    if (next === scenario.value) return
    scenario.value = next
    selectedStation.value = SCENARIOS[next].order.currentStation
  }

  function selectStation(id: StationId) {
    selectedStation.value = id
  }

  function isClaimed(action: string): boolean {
    return claimed.value.has(`${scenario.value}:${action}`)
  }

  function toggleClaim(action: string) {
    const key = `${scenario.value}:${action}`
    const next = new Set(claimed.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    claimed.value = next
  }

  return {
    scenario,
    selectedStation,
    config,
    scenarios,
    stations,
    bottleneckName,
    currentNodeName,
    setScenario,
    selectStation,
    isClaimed,
    toggleClaim,
  }
})
