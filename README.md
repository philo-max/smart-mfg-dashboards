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
| 仓库单元 | 仓储站 | 绩效监控（自动/手动存料）、存取料趋势、**8 类故障告警监控**、12 工位占用热力图、仓位监控 + RFID 实时过滤、机械手 XYZ / 输送线、**设备状态时长分布** |
| AGV 单元 | 调度站 | 产线地图（**悬浮显示设备 ID 与当前任务**）、任务完成率、车队与任务队列、电量监控、**路径数据坐标卡片**、状态分布与任务响应率、任务/阻塞趋势 |
| 装配单元 | 制造站 | 生产节拍计时器 + 工位阶段、人均产出、**拧紧扭矩-时间曲线（0.8–1.2 N·m 工艺窗口）**、缺陷 PPM 与设备 OEE 仪表、**返工率超标时组件变红并弹出告警** |
| 检测单元 | 检测站 | 质量趋势、缺陷分布、**5 个检测位实时 OK/NG + 三色灯 + TakeTime**、孔径公差直方图（Cpk）、能耗×质量联动、24h 明细弹窗、**质量日报（导出 Excel / 打印 PDF）** |
| 物流单元 | 贸易站 | 订单准时交付率、订单交付趋势、**设备 OEE 仪表盘（点击查看故障记录）**、物料运输时间、**物料流转 RFID 追踪表**、AGV 托盘完成率等调度指标 |

每个模块页顶部都有**上下游联动条**（点击可跳转到上/下游模块），底部栏有该模块的**异常事件日志**（可就地「处理 → 解决」）和 **PLC 点位监视**。

## 三条联动链（跨模块因果）

1. **物流链**：AGV 阻塞 → 装配缺料 / 节拍超时 → 物料运输超时 → 订单准时率下降
2. **质量链**：装配机器人故障 → 装配质量漂移 → 检测 NG 增加 → 装配返工率超标
3. **库存链**：入库堆积 → 工位停留超阈值 → 呆滞告警

## 互动、联动与可视化

**演练控制台**（顶栏「演练台」或按 `S`）：主动注入 AGV 阻塞 / 装配机器人故障 / 库存积压 / AGV 电量告急 / 检测能耗尖峰，
观察连锁反应逐级传导；「一键恢复」清除注入影响。同时提供暂停、单步、1×/2×/4× 倍速。

**键盘快捷键**：`0` 总览 · `1`–`5` 切换模块 · `空格` 暂停 · `S` 演练台 · `T` 自动巡视。输入框内与用户弹窗打开时不响应。

**图表交叉联动**：
- 检测：点缺陷饼图扇区 / 检测位柱 / 检测位卡片筛选检测记录（筛选走独立的 NG 历史，不会筛完为空）；点质量趋势的小时钻取到该小时明细
- 仓库：点 A/B/C 料计数块，热力图与仓位清单同时聚焦该物料
- AGV：点路径卡片，地图高亮该路径、其余车辆变暗
- 总览：中枢 KPI 可点击下钻；装配「返工」直达检测 NG 明细

**工件全链路追溯**：RFID 真实贯穿 仓库出库 → AGV 配送 → 装配 → 检测 → 合格回库，每一步写入履历。
点击任意 RFID（仓库工位、装配当前工件、检测记录、物流追踪表）或顶栏「追溯」输入 RFID，查看阶段进度与完整时间线；
会话之前的上游历史由 RFID 派生合成，并标注「历史归档」。

**告警根因溯源**：告警上的「溯源」按钮，定位它所属的因果链，标出最上游的异常环节（疑似根因），
每个环节附实时证据数据，并给出处置建议。总览「联动态势」与此共用同一份因果链数据。

**可视化动效**：总览物料流向带（仓库 → AGV → 装配 → 检测 → 回库）——粒子流动带业务含义：上下游正常时匀速，
预警时变慢变黄，异常时停滞变红；KPI 数字滚动；`T` 键自动巡视，总览与五个模块每 12 秒轮播（用户弹窗打开时暂缓）。

## 技术栈

- **Vue 3 + Vite + TypeScript** —— 应用框架与构建
- **Pinia** —— `stores/plant.ts`（模拟数据源，逐 tick 联动推进）+ `stores/ui.ts`（视图导航）
- **ECharts** —— 全部业务图表，封装于 `components/charts/`
- **motion-v** —— 总览 ↔ 模块的转场动效
- **@lucide/vue** —— 图标库
- **Vitest** —— `src/data/sim/sim.test.ts`（联动链、扭矩曲线、演练注入传导、工件履历、因果链与根因、历史序列上限）与 `src/stores/plant.test.ts`（告警自动恢复），共 33 个用例（`npm test`）

## 数据层

`src/data/sim/` 是唯一的模拟数据源，可复现（`createRng` 固定种子）：

- `constants.ts` / `types.ts` —— 产线常量与状态类型
- `init.ts` —— 初始状态生成
- `step-flow.ts` / `step-quality.ts` —— 物流链、质量链的逐 tick 推进
- `step.ts` —— 五个单元按物料流向依次结算的总调度
- `scenarios.ts` —— 演练场景注入；`lineage.ts` —— 工件履历与追溯；`chains.ts` —— 因果链与告警归因
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
