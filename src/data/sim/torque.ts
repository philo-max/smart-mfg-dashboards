import type { Rng } from './rng'
import { TORQUE_POINTS } from './constants'

const RAMP_END = 0.8
const NOISE_SD = 0.012
const NORMAL_PEAK = { mean: 1.0, sd: 0.06 }
const DRIFT_HIGH = { mean: 1.36, sd: 0.05 }
const DRIFT_LOW = { mean: 0.62, sd: 0.05 }

/** 螺丝拧紧扭矩-时间曲线：线性爬升至峰值后回落；质量漂移时峰值偏离 0.8–1.2 N·m 工艺窗口 */
export function torqueCurve(rng: Rng, drifting: boolean): number[] {
  const spec = !drifting ? NORMAL_PEAK : rng.chance(0.5) ? DRIFT_HIGH : DRIFT_LOW
  const peak = rng.gaussian(spec.mean, spec.sd)
  return Array.from({ length: TORQUE_POINTS }, (_, i) => {
    const t = i / (TORQUE_POINTS - 1)
    const base = t < RAMP_END ? peak * (t / RAMP_END) ** 1.6 : peak * (1 - ((t - RAMP_END) / (1 - RAMP_END)) * 0.9)
    return Math.max(0, Math.round((base + rng.gaussian(0, NOISE_SD)) * 1000) / 1000)
  })
}

export function torquePeak(curve: number[]): number {
  return Math.max(...curve)
}
