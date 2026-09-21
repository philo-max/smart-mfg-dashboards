# 智能制造数据可视化综合实训 · Web Dashboard（V2）

Vue 3 + Vite + TypeScript 的大屏基建骨架。三个页签：

| 页签 | 定位 | 主题基调 |
| --- | --- | --- |
| 智能制造 | 生产 / 设备 / 物流 | 冷金属 + 信号青 |
| 产品体验 | 口碑 / 体验 / 人群 | 石墨冷白 + 克制青 |
| 健康市场 | 市场 / 用药 / 需求 | 暖深石墨 + 灰绿 + 药品琥珀 |

> **当前阶段说明**：本阶段只搭建 **应用壳 + 主题系统 + 动效基建 + 图表实验室**，
> **不包含任何业务内容**（无 KPI、无图表、无业务文案）。页面内为骨架占位块，
> 用于验证主题、布局与转场动效。

---

## 技术栈

- **Vue 3 + Vite + TypeScript** —— 应用框架与构建
- **Pinia** —— 跨页签唯一状态源（当前页签 / 主题 / 动效降级）
- **motion-v** —— 声明式 UI 动效（页签转场、分层入场）
- **GSAP** —— 仅用于主舞台动画，统一封装为 `useGsapTimeline`（自动销毁 + 减少动效降级）
- **ECharts** —— 正式业务图表（后续业务页使用，本阶段未接入）
- **@lucide/vue** —— 图标库
- **Python + pyecharts** —— 仅用于 `chart-lab/` 图表验证，**不进入 Vue 运行时**

---

## 目录结构

```
web_dashboard/
├── archive/
│   └── web_dashboard-static-v1/   # V1 静态版归档（保留，不删除）
├── chart-lab/                     # Python + pyecharts 图表实验室（离线验证）
│   ├── manufacturing.py           # 制造：订单流与工位瓶颈
│   ├── product_insight.py         # 3C：体验要素 × 人群
│   └── health_market.py           # 医药：疾病谱 -> 治疗 -> 人群/区域
├── public/
│   └── favicon.svg
├── src/
│   ├── app/                       # 应用入口与根组件
│   │   ├── main.ts
│   │   └── App.vue
│   ├── components/
│   │   ├── shell/                 # 应用壳：AppShell / TopBar / MainStage
│   │   ├── charts/                # ECharts 封装（预留）
│   │   └── motion/                # 动效基建：PageTransition / StaggerReveal
│   │       ├── PageTransition.vue
│   │       ├── StaggerReveal.vue
│   │       └── useGsapTimeline.ts
│   ├── features/                  # 三个业务页（当前为骨架占位）
│   │   ├── manufacturing/
│   │   ├── product-insight/
│   │   └── health-market/
│   ├── stores/                    # Pinia 状态
│   │   └── ui.ts
│   ├── data/                      # 业务数据（预留）
│   └── styles/                    # 主题变量与全局样式
│       ├── tokens.css             # 三套主题变量
│       ├── base.css
│       └── transitions.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 动效规范

- **PageTransition**（`src/components/motion/PageTransition.vue`）
  页签切换采用「内容退场 → 主题色过渡 → 新页分层进入」，**不是简单淡入淡出**。
  退场 + 入场合计约 **600ms**（未超出 450–650ms）。
- **StaggerReveal**（`src/components/motion/StaggerReveal.vue`）
  子元素按序分层入场，用于卡片 / 指标区块。
- **useGsapTimeline**（`src/components/motion/useGsapTimeline.ts`）
  GSAP 时间线封装：基于 `gsap.context()`，组件卸载（切页）时自动 `revert()` 销毁。
- **约束**
  - Motion 负责透明度 / 位移 / 布局类动效；GSAP 仅用于主舞台动画；
  - 禁止无限闪烁、无意义漂浮、满屏扫光；循环动画必须带业务隐喻；
  - `prefers-reduced-motion: reduce` 时禁用非必要动画（见 `transitions.css`）。

---

## 脚本

```bash
npm install        # 安装依赖
npm run dev        # 本地开发（默认 http://localhost:5173）
npm run build      # 类型检查 + 生产构建（vue-tsc --noEmit && vite build）
npm run preview    # 预览构建产物
npm run type-check # 仅类型检查
```

---

## 图表策略（重要）

- **`chart-lab/`（pyecharts）仅用于实验与验证**：快速试图形形态、配色与数据结构，
  输出 HTML 到 `chart-lab/output/`，**不嵌入 Vue 应用、不进入生产构建**。
- **正式页面统一使用 ECharts**（`echarts` 依赖 + `src/components/charts/` 封装），
  以保证交互能力、按需加载体积与长期可维护性。
- 原因：pyecharts 生成的是静态 HTML/JS，难以深度响应式与状态联动；ECharts 是运行时可编程图表库，适合与 Vue 组件、Pinia 状态深度集成。

```bash
# 运行某个实验（需先 pip install pyecharts）
python chart-lab/manufacturing.py
```

---

## 验收对照（本阶段）

- [x] 三个空页可切换
- [x] 三套主题清晰可辨
- [x] Motion 转场可见且不拖沓（450–650ms）
- [x] GSAP 时间线最小演示 + 切页正确销毁
- [x] `npm run build` 与类型检查通过
- [x] 1280×960 下 `scrollHeight <= innerHeight`（单屏不滚动）
- [x] README 说明 pyecharts 仅实验、正式用 ECharts

---

## 归档说明

V1 静态版（`index.html` / `app.js` / `styles.css` / `manufacturing.css` /
`threec.css` / `pharma.css` 及历史评审截图）已归档至
`archive/web_dashboard-static-v1/`，**保留不删除**，可作为视觉与交互参考。
