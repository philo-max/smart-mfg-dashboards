"""chart-lab · 健康市场领域验证图 —— 疾病谱 -> 治疗 -> 人群 / 区域

用途：仅用于离线实验，验证桑基流向形态与配色。
本脚本生成的 HTML 不嵌入 Vue 应用，也不进入生产构建（正式图表统一使用 ECharts）。

注意：全部为品类级聚合数据，不含任何可识别患者信息；仅用于验证图形。

运行：
    pip install pyecharts
    python chart-lab/health_market.py

输出：
    chart-lab/output/health_market.html
"""
from __future__ import annotations

from pathlib import Path

from pyecharts import options as opts
from pyecharts.charts import Sankey

try:
    from lab_env import OUT_DIR, render_chart
except ImportError:
    from .lab_env import OUT_DIR, render_chart

BG = "#15140f"
FG = "#f0ece1"
MUTE = "#8a8269"
GREEN = "#8a9c6b"
AMBER = "#d8a441"
RISK = "#cf6a4f"

# 疾病谱 -> 治疗领域 -> 人群 / 区域（演示用合成值，单位：万元）
LINKS = [
    # 疾病谱 -> 治疗领域
    {"source": "心脑血管", "target": "降压类", "value": 620},
    {"source": "心脑血管", "target": "调脂类", "value": 380},
    {"source": "呼吸慢病", "target": "吸入制剂", "value": 460},
    {"source": "呼吸慢病", "target": "抗过敏", "value": 210},
    {"source": "代谢慢病", "target": "降糖类", "value": 540},
    {"source": "骨关节", "target": "镇痛抗炎", "value": 190},
    # 治疗领域 -> 人群
    {"source": "降压类", "target": "中老年慢病", "value": 430},
    {"source": "降压类", "target": "家庭常备", "value": 190},
    {"source": "调脂类", "target": "中老年慢病", "value": 250},
    {"source": "调脂类", "target": "职场人群", "value": 130},
    {"source": "吸入制剂", "target": "儿童/青少年", "value": 300},
    {"source": "吸入制剂", "target": "中老年慢病", "value": 160},
    {"source": "抗过敏", "target": "儿童/青少年", "value": 120},
    {"source": "抗过敏", "target": "职场人群", "value": 90},
    {"source": "降糖类", "target": "中老年慢病", "value": 360},
    {"source": "降糖类", "target": "家庭常备", "value": 180},
    {"source": "镇痛抗炎", "target": "银发人群", "value": 110},
    {"source": "镇痛抗炎", "target": "职场人群", "value": 80},
]

NODES = [
    # 疾病谱
    {"name": "心脑血管", "itemStyle": {"color": GREEN}},
    {"name": "呼吸慢病", "itemStyle": {"color": GREEN}},
    {"name": "代谢慢病", "itemStyle": {"color": GREEN}},
    {"name": "骨关节", "itemStyle": {"color": GREEN}},
    # 治疗领域
    {"name": "降压类", "itemStyle": {"color": AMBER}},
    {"name": "调脂类", "itemStyle": {"color": AMBER}},
    {"name": "吸入制剂", "itemStyle": {"color": AMBER}},
    {"name": "抗过敏", "itemStyle": {"color": AMBER}},
    {"name": "降糖类", "itemStyle": {"color": AMBER}},
    {"name": "镇痛抗炎", "itemStyle": {"color": AMBER}},
    # 人群
    {"name": "中老年慢病", "itemStyle": {"color": "#b6ab92"}},
    {"name": "家庭常备", "itemStyle": {"color": "#b6ab92"}},
    {"name": "职场人群", "itemStyle": {"color": "#b6ab92"}},
    {"name": "儿童/青少年", "itemStyle": {"color": "#b6ab92"}},
    {"name": "银发人群", "itemStyle": {"color": RISK}},
]


def build() -> Sankey:
    sankey = (
        Sankey(init_opts=opts.InitOpts(width="1180px", height="680px", bg_color=BG))
        .add(
            series_name="用药需求流向",
            nodes=NODES,
            links=LINKS,
            node_gap=12,
            pos_left="4%",
            pos_right="8%",
            pos_top="12%",
            pos_bottom="6%",
            linestyle_opt=opts.LineStyleOpts(opacity=0.28, curve=0.5, color="source"),
            label_opts=opts.LabelOpts(position="right", color=FG, font_size=11),
        )
        .set_global_opts(
            title_opts=opts.TitleOpts(
                title="疾病谱 → 治疗领域 → 人群（验证图）",
                subtitle="品类级聚合演示数据，不含患者信息；红色仅标注需重点关注人群",
                pos_left="24px",
                pos_top="18px",
                title_textstyle_opts=opts.TextStyleOpts(color=FG, font_size=18),
                subtitle_textstyle_opts=opts.TextStyleOpts(color=MUTE, font_size=12),
            ),
            tooltip_opts=opts.TooltipOpts(trigger="item"),
        )
    )
    return sankey


def main() -> None:
    out = OUT_DIR / "health_market.html"
    render_chart(build(), out)
    print(f"[chart-lab] health_market -> {out}")


if __name__ == "__main__":
    main()
