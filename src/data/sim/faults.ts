import type { PlantState } from './types'

export interface FaultType {
  key: string
  name: string
  color: string
  codes: readonly string[]
}

/** 8 类故障与其 PLC 故障码；顺序、名称与《数据准备》一致 */
export const FAULT_TYPES: readonly FaultType[] = [
  { key: 'estop', name: '急停报警', color: '#ff4655', codes: ['Alarm_EmergencyStop'] },
  { key: 'sensor', name: '物料感应故障', color: '#ffb020', codes: ['Alarm_ItemsSensor'] },
  { key: 'pressure', name: '气压故障', color: '#23c8ff', codes: ['Alarm_Pressure'] },
  { key: 'print', name: '打印故障', color: '#9b7bff', codes: ['Alarm_Print'] },
  { key: 'rfid', name: 'RFID 故障', color: '#3a8dff', codes: ['Alarm_RFID'] },
  { key: 'servo', name: '伺服故障', color: '#ff6f3c', codes: ['Alarm_Servo'] },
  { key: 'storage', name: '仓库故障', color: '#8bdc3a', codes: ['Alarm_Storage'] },
  { key: 'transport', name: '传输故障', color: '#ff7ac8', codes: ['Alarm_Transport'] },
]

export const OTHER_FAULT: FaultType = { key: 'other', name: '其他故障', color: '#8fa8c4', codes: [] }

/** 当日基线：取自《数据准备.txt》 */
export const FAULT_BASELINE: Record<string, number> = {
  estop: 1, sensor: 2, pressure: 3, print: 4, rfid: 5, servo: 6, storage: 7, transport: 8,
}

export const FAULT_DAY_LABELS = ['4 日前', '3 日前', '2 日前', '昨日', '今日'] as const

const HISTORY_DAYS = FAULT_DAY_LABELS.length - 1
const HISTORY_SWING = 0.7

export interface FaultShare {
  key: string
  name: string
  color: string
  baseline: number
  live: number
  total: number
  percent: number
}

export function typeOfCode(code: string): FaultType {
  return FAULT_TYPES.find((t) => t.codes.includes(code)) ?? OTHER_FAULT
}

export function tallyFault(state: PlantState, code: string) {
  state.faultTally[code] = (state.faultTally[code] ?? 0) + 1
}

export function faultDistribution(state: PlantState): FaultShare[] {
  const live: Record<string, number> = {}
  for (const [code, n] of Object.entries(state.faultTally)) {
    const key = typeOfCode(code).key
    live[key] = (live[key] ?? 0) + n
  }
  const rows = [...FAULT_TYPES, OTHER_FAULT]
    .map((t) => {
      const baseline = FAULT_BASELINE[t.key] ?? 0
      const l = live[t.key] ?? 0
      return { key: t.key, name: t.name, color: t.color, baseline, live: l, total: baseline + l, percent: 0 }
    })
    .filter((r) => r.key !== OTHER_FAULT.key || r.total > 0)
  const sum = rows.reduce((s, r) => s + r.total, 0)
  return rows.map((r) => ({ ...r, percent: sum > 0 ? Math.round((r.total / sum) * 1000) / 10 : 0 }))
}

function wave(typeIndex: number, day: number) {
  return (Math.sin((typeIndex + 1) * 12.9898 + (day + 1) * 78.233) + 1) / 2
}

/** 近 5 日各类故障次数：前 4 日为按基线派生的模拟历史，「今日」为实时值 */
export function faultWeekly(state: PlantState): { key: string; name: string; color: string; values: number[] }[] {
  return faultDistribution(state).map((r, i) => {
    const history = Array.from({ length: HISTORY_DAYS }, (_, d) =>
      Math.max(0, Math.round(r.baseline * (1 - HISTORY_SWING / 2 + HISTORY_SWING * wave(i, d)))),
    )
    return { key: r.key, name: r.name, color: r.color, values: [...history, r.total] }
  })
}
