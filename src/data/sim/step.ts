import { type Rng, pad2 } from './rng'
import { stepAgv, stepLogistics, stepWarehouse } from './step-flow'
import { stepAssembly, stepInspection } from './step-quality'
import type { AlarmDraft, PlantState } from './types'

/** 装配质量自发漂移（刀具磨损等），与设备故障触发的漂移叠加 */
const SPONTANEOUS_DRIFT_CHANCE = 0.003
const HOURLY_WINDOW = 24

function rollHour(state: PlantState, now: Date) {
  const label = `${pad2(now.getHours())}:00`
  const hourly = state.inspection.hourly
  if (hourly[hourly.length - 1].label === label) return
  hourly.push({ label, pass: 0, fail: 0, power: hourly[hourly.length - 1].power })
  if (hourly.length > HOURLY_WINDOW) hourly.shift()
}

/**
 * 推进一个 tick。五个单元按物料流向依次结算，上游结果作为下游输入：
 *  联动链 1：AGV 阻塞 → 装配缺料、节拍超时 → 物料运输超时 → 订单准时率下降
 *  联动链 2：装配机器人故障 → 装配质量漂移 → 检测 NG 增加 → 装配返工率超标
 *  联动链 3：订单拉料 → 仓库出库；入库未被消耗 → 工位呆滞
 */
export function stepPlant(state: PlantState, rng: Rng, now: Date = new Date()): AlarmDraft[] {
  state.tick += 1
  rollHour(state, now)

  const agv = stepAgv(state, rng)
  const blocked = state.agv.agvs.filter((a) => a.status === 'blocked').length
  const logistics = stepLogistics(state, rng, agv, now)
  if (logistics.driftTriggered || rng.chance(SPONTANEOUS_DRIFT_CHANCE)) {
    state.assembly.driftTicks = Math.max(state.assembly.driftTicks, rng.int(20, 30))
  }
  const warehouseAlarms = stepWarehouse(state, rng, agv.warehousePicks, now)
  const assembly = stepAssembly(state, rng, agv.deliveredToAssembly, blocked)
  const inspection = stepInspection(state, rng, assembly.units, now)

  return [...agv.alarms, ...logistics.alarms, ...warehouseAlarms, ...assembly.alarms, ...inspection.alarms]
}
