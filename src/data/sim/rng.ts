export interface Rng {
  next(): number
  int(min: number, max: number): number
  gaussian(mean: number, sd: number): number
  chance(p: number): boolean
  pick<T>(list: readonly T[]): T
}

/** mulberry32：可复现的伪随机数，便于演示与单测 */
export function createRng(seed: number): Rng {
  let s = seed >>> 0
  function next(): number {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    gaussian(mean, sd) {
      const u = 1 - next()
      const v = next()
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    },
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
  }
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function clockText(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export function round(v: number, digits = 2): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}
