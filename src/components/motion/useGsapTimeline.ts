import gsap from 'gsap'
import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export interface GsapTimelineApi {
  /** 已创建的时间线（默认自动播放） */
  tl: gsap.core.Timeline
  /** 归属的根元素，供选择器限定作用域 */
  el: HTMLElement
}

export interface UseGsapTimelineOptions {
  /** 减少动效判定；返回 true 时不构建时间线 */
  reducedMotion?: () => boolean
  /** 挂载后是否自动播放，默认 true */
  autoPlay?: boolean
  /** 延迟构建（毫秒），用于与页面其它动效错峰，默认 0 */
  delay?: number
  /**
   * 依赖源；返回值变化时，先销毁旧时间线再从当前状态重建。
   * 用于场景切换：旧时间线被 kill（不 revert），使物料从当前位置平滑过渡，
   * 且不会残留、不会叠加。
   */
  rebuildOn?: () => unknown
}

/**
 * GSAP 时间线封装（仅用于主舞台动画）。
 * - 基于 gsap.context() 限定作用域，组件卸载（切页）时 revert() 销毁，避免残留；
 * - rebuildOn 变化时重建时间线，旧时间线先 kill 再重建（场景切换平滑过渡）；
 * - prefers-reduced-motion 时不构建动画。
 */
export function useGsapTimeline(
  build: (api: GsapTimelineApi) => void,
  options: UseGsapTimelineOptions = {},
): { el: Ref<HTMLElement | null> } {
  const el = ref<HTMLElement | null>(null)
  let ctx: gsap.Context | null = null
  let tl: gsap.core.Timeline | null = null
  let timer: number | null = null

  function buildInto() {
    const host = el.value
    if (!host) return
    tl = gsap.timeline({ paused: options.autoPlay === false })
    build({ tl, el: host })
  }

  function start() {
    if (!el.value || options.reducedMotion?.()) return
    ctx = gsap.context(buildInto, el.value)
  }

  function restart() {
    // 先销毁旧时间线（不 revert，保证物料从当前位置平滑过渡），再按当前状态重建。
    tl?.kill()
    tl = null
    if (!ctx) {
      start()
      return
    }
    ctx.add(buildInto)
  }

  onMounted(() => {
    const delay = options.delay ?? 0
    if (delay > 0) {
      timer = window.setTimeout(() => {
        timer = null
        start()
      }, delay)
    } else {
      start()
    }
  })

  if (options.rebuildOn) {
    watch(options.rebuildOn, () => restart())
  }

  onBeforeUnmount(() => {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
    ctx?.revert()
    ctx = null
    tl = null
  })

  return { el }
}
