<script lang="ts">
import { Comment, Fragment, Text, defineComponent, h, type Component, type VNode } from 'vue'
import { Motion } from 'motion-v'

// motion-v 的 Motion 组件类型较窄，直接传入 h() 会与 Vue 的 h() 重载不兼容；
// 这里统一收敛为通用 Component 类型，行为不变。
const MotionComponent = Motion as unknown as Component

/** 展平 slot（含 Fragment）并去掉注释/纯文本节点，保证每个真实子元素独占一个 Motion。 */
function flatten(nodes: VNode[]): VNode[] {
  const out: VNode[] = []
  for (const node of nodes) {
    if (node.type === Fragment && Array.isArray(node.children)) {
      out.push(...(node.children as VNode[]))
    } else if (node.type === Comment || node.type === Text) {
      continue
    } else {
      out.push(node)
    }
  }
  return out
}

/**
 * 分层入场：把默认插槽的每个直接子元素拆成独立 Motion，按序错峰入场。
 * 仅使用 opacity / transform（不触发布局抖动），减少动效时为瞬时。
 */
export default defineComponent({
  name: 'StaggerReveal',
  props: {
    stagger: { type: Number, default: 0.07 },
    distance: { type: Number, default: 18 },
    duration: { type: Number, default: 0.45 },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const children = flatten(slots.default?.() ?? [])
      return h(
        'div',
        { ...attrs, class: ['stagger-reveal', attrs.class] },
        children.map((child, index) =>
          h(
            MotionComponent,
            {
              key: child.key ?? index,
              initial: { opacity: 0, y: props.distance },
              animate: { opacity: 1, y: 0 },
              transition: {
                duration: props.duration,
                delay: index * props.stagger,
                ease: [0.22, 1, 0.36, 1],
              },
            },
            () => [child],
          ),
        ),
      )
    }
  },
})
</script>
