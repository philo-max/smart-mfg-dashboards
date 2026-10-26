import { computed } from 'vue'
import { processSnapshot } from './processSim'
import { usePlantStore } from '@/stores/plant'

export function useProcess() {
  const plant = usePlantStore()
  return computed(() => {
    const ins = plant.state.inspection
    const okTotal = ins.hourly.reduce((s, h) => s + h.pass, 0)
    const ngTotal = ins.hourly.reduce((s, h) => s + h.fail, 0)
    return processSnapshot(plant.state.tick, ins.records[0] ?? null, okTotal, ngTotal)
  })
}
