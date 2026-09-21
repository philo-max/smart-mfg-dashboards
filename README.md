# 智能制造数据可视化综合实训 · Web Dashboard（V3）

Vue 3 + Vite + TypeScript 的智能制造基建大屏，视觉语言参照《明日方舟》基建界面（RIIC）：
斜切边角、警示斜纹、三色信号灯、中英双语标签、科技蓝发光。1920×1080 设计稿，等比缩放铺满任意视口。

业务与数据模型对齐《联想笔记本 Mini 产线》实训资料与 PLC 点位表（`BC_*数据表.csv`）：
物料流向为 **线上仓库 → 物流 → AGV(MOMA) → 装配 → 检测 → 物流出库**。

## 基建总览 → 模块下钻

顶层是「基建总览」：五个模块渲染成基建房间（仓库 / 物流 / AGV / 装配 / 检测）+ 中央控制中枢，
点击房间下钻进入模块详情，返回按钮或点击 Logo 回到总览。AGV 走廊实时显示车队在产线地图上的位置。

| 模块 | 房间 | 核心内容 |
| --- | --- | --- |
| 仓库单元 | 仓储站 | 12 工位占用热力图（停留时长着色）、RFID 搜索、三轴机械手位置 |
| AGV 单元 | 调度站 | 产线地图 + 车队实时位置、任务完成率、低电量预警 |
| 装配单元 | 制造站 | 生产节拍计时器、人均产出、节拍趋势、返工率超标告警 |
| 检测单元 | 检测站 | 质量趋势、缺陷分布、孔径公差直方图（Cpk）、能耗×质量联动、**质量日报（导出 Excel / 打印 PDF）** |
| 物流单元 | 贸易站 | 订单准时交付率、设备 OEE 排行（点击查看故障记录）、运输时间趋势 |

## 三条联动链（跨模块因果）

1. **物流链**：AGV 阻塞 → 装配缺料 / 节拍超时 → 物料运输超时 → 订单准时率下降
2. **质量链**：装配机器人故障 → 装配质量漂移 → 检测 NG 增加 → 装配返工率超标
3. **库存链**：入库堆积 → 工位停留超阈值 → 呆滞告警

总览页的「联动态势」面板把三条链画成节点，当前异常环节高亮；告警中心支持按分类筛选、
点击直达对应模块并带上焦点对象（AGV 编号 / 库位 / 设备）。

## 技术栈

- **Vue 3 + Vite + TypeScript** —— 应用框架与构建
- **Pinia** —— `stores/plant.ts`（模拟数据源，逐 tick 联动推进）+ `stores/ui.ts`（视图导航）
- **ECharts** —— 全部业务图表，封装于 `components/charts/`
- **motion-v** —— 总览 ↔ 模块的转场动效
- **@lucide/vue** —— 图标库
- **Vitest** —— `src/data/sim/sim.test.ts` 覆盖三条联动链与状态不变量（`npm test`）

## 数据层

`src/data/sim/` 是唯一的模拟数据源，可复现（`createRng` 固定种子）：

- `constants.ts` / `types.ts` —— 产线常量与状态类型
- `init.ts` —— 初始状态生成
- `step-flow.ts` / `step-quality.ts` —— 物流链、质量链的逐 tick 推进
- `step.ts` —— 五个单元按物料流向依次结算的总调度
- `selectors.ts` —— 派生指标（OEE、模块告警等级、房间摘要卡片数据）

`src/data/points.ts` 把模拟状态映射为 PLC 点位快照（点位名/地址取自 `BC_*数据表.csv`），
各模块的「PLC 点位监视」面板据此渲染；接入 leapiot 平台后，只需替换这一层的取值来源，
视图与 store 结构不变。

## 目录结构

```
web_dashboard/
├── archive/
│   ├── web_dashboard-static-v1/   # V1 静态版归档
│   └── vue-v2-*/                  # V2 三页签骨架归档（产品体验/健康市场页签、旧 TopBar/MainStage）
├── chart-lab/                     # Python + pyecharts 图表实验室（离线验证，不进入 Vue 运行时）
├── src/
│   ├── app/                       # 入口与根组件
│   ├── components/
│   │   ├── charts/                # EChart 封装 + 主题令牌（theme.ts）
│   │   ├── motion/                # PageTransition / StaggerReveal
│   │   ├── shell/                 # AppShell（缩放舞台）/ TopBar / AlarmToast
│   │   └── ui/                    # AkPanel / AkModal / AkTabs / StatTile / SignalLight / Sparkline / PointsPanel / EquipmentModal
│   ├── data/
│   │   ├── modules.ts             # 五个模块的房间元数据
│   │   ├── points.ts              # PLC 点位快照
│   │   └── sim/                   # 模拟数据源（见上）
│   ├── features/
│   │   ├── overview/              # 基建总览：RoomCard / HubCard / AgvCorridor / AlarmCenter / LinkagePanel
│   │   ├── warehouse/ agv/ assembly/ inspection/ logistics/
│   │   └── module-layout.css      # 五个模块详情页共用的三栏骨架
│   └── stores/                    # plant.ts（数据）/ ui.ts（导航）
├── index.html
├── package.json
└── vite.config.ts
```

## 脚本

```bash
npm install        # 安装依赖
npm run dev        # 本地开发（默认 http://localhost:5173）
npm test           # Vitest：联动链与状态不变量
npm run build      # 类型检查 + 生产构建
npm run type-check # 仅类型检查
```
