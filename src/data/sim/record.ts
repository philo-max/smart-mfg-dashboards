import { type Rng, clockText } from './rng'
import { DEFECT_TYPES, INSPECTION_STATIONS, NOMINAL, TOLERANCE, TOLERANCE_SD } from './constants'
import type { InspectionRecord } from './types'

/** 检测位 → 该位置判 NG 时对应的缺陷类型 */
const POSITION_DEFECT = ['孔位偏移', '孔径超差', '外观划痕', '贴合间隙超标', 'RFID异常'] as const
const OTHER_DEFECT_CHANCE = 0.1
const DIAMETER_POSITION = 1

export interface RecordOptions {
  now: Date
  failRate: number
  serial: number
  rfid: string
  /** 强制判 NG（用于生成初始 NG 历史） */
  forceFail?: boolean
}

/** 生成一条检测记录：5 个检测位各自 OK/NG，NG 时决定缺陷类型与孔径读数 */
export function makeInspectionRecord(rng: Rng, opts: RecordOptions): InspectionRecord {
  const failed = opts.forceFail === true || rng.chance(opts.failRate)
  const ngIndex = failed ? rng.int(0, INSPECTION_STATIONS.length - 1) : -1
  const positions = INSPECTION_STATIONS.map((_, i) => i !== ngIndex)
  const diameter = ngIndex === DIAMETER_POSITION
    ? NOMINAL + (rng.chance(0.5) ? 1 : -1) * (TOLERANCE + rng.next() * 0.01)
    : rng.gaussian(NOMINAL + 0.002, TOLERANCE_SD)
  const defect = failed ? (rng.chance(OTHER_DEFECT_CHANCE) ? DEFECT_TYPES[5] : POSITION_DEFECT[ngIndex]) : null
  return {
    time: clockText(opts.now),
    id: `WP${opts.now.getFullYear()}${String(opts.serial).padStart(6, '0')}`,
    rfid: opts.rfid,
    positions,
    result: defect ?? `孔径 Φ${diameter.toFixed(3)} mm`,
    pass: !failed,
    defect,
  }
}
