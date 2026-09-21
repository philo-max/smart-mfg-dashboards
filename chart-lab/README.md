# chart-lab · Python + pyecharts 图表实验室

**仅用于离线实验与验证**，用来快速试图形形态、配色与数据结构。

> 这些脚本生成的 HTML **不嵌入 Vue 应用，也不进入生产构建**。
> 正式页面统一使用 **ECharts**（运行时可编程、可深度响应式、可按需加载）。

## 三个领域各一张验证图

| 脚本 | 领域 | 验证内容 |
| --- | --- | --- |
| `manufacturing.py` | 智能制造 | 订单流与工位瓶颈（柱状 + 瓶颈高亮） |
| `product_insight.py` | 产品体验 | 体验要素 × 人群（热力矩阵） |
| `health_market.py` | 健康市场 | 疾病谱 → 治疗领域 → 人群（桑基流向） |

## 运行

```bash
pip install pyecharts
python chart-lab/manufacturing.py
python chart-lab/product_insight.py
python chart-lab/health_market.py
```

输出统一落在 `chart-lab/output/*.html`（已在 `.gitignore` 中忽略）。

### 资源加载与容灾说明 (`lab_env.py`)
- **根因修复**：pyecharts 官方默认静态源 `assets.pyecharts.org` 的 SSL 证书已过期，直接导致现代浏览器拦截并白屏报错（`ERR_CERT_DATE_INVALID` / `ReferenceError: echarts is not defined`）。
- **离线优先**：脚本会自动同步 `web_dashboard/node_modules/echarts/dist/echarts.min.js` 到 `output/` 目录，本地直接双击打开零延迟、无需联网。
- **容灾 Fallback**：若将 HTML 移出目录使用，页面内置 Fallback 会自动无缝回退至阿里云 npmmirror 高速镜像源。
