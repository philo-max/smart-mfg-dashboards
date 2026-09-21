import gsap from 'gsap'
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useUiStore } from '@/stores/ui'

const DURATION_S = 0.6

function parse(value: string | number): number {
  return typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/,/g, ''))
}

/**
 * 数字滚动：数值变化时从旧值缓动到新值，保持原有小数位与千分位；
 * 非数字（如 "—"、"3/12"）和「减少动效」时直接切换。
 */
export function useCountUp(source: () => string | number): Ref<string> {
  const ui = useUiStore()
  const display = ref(String(source()))
  let current = parse(source())
  let tween: gsap.core.Tween | null = null

  watch(source, (next) => {
    const text = String(next)
    const target = parse(next)
    tween?.kill()
    if (!Number.isFinite(target) || !Number.isFinite(current) || ui.reducedMotion || /[^\d.,\-+]/.test(text)) {
      display.value = text
      current = target
      return
    }
    const decimals = (text.split('.')[1] ?? '').length
    const grouped = text.includes(',')
    const format = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped })
    const proxy = { v: current }
    tween = gsap.to(proxy, {
      v: target,
      duration: DURATION_S,
      ease: 'power2.out',
      onUpdate: () => {
        display.value = format(proxy.v)
        current = proxy.v
      },
      onComplete: () => {
        display.value = text
        current = target
      },
    })
  })

  onBeforeUnmount(() => tween?.kill())
  return display
}
