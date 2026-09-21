"""chart-lab · 产品体验领域验证图 —— 体验要素 × 人群

用途：仅用于离线实验，验证矩阵/热力形态与配色。
本脚本生成的 HTML 不嵌入 Vue 应用，也不进入生产构建（正式图表统一使用 ECharts）。

运行：
    pip install pyecharts
    python chart-lab/product_insight.py

输出：
    chart-lab/output/product_insight.html
"""
from __future__ import annotations

from pathlib import Path

from pyecharts import options as opts
from pyecharts.charts import HeatMap

try:
    from lab_env import OUT_DIR, render_chart
except ImportError:
    from .lab_env import OUT_DIR, render_chart

# 行：人群；列：体验要素。数值为「该人群对该要素的负面反馈强度」（演示用合成值）。
CROWDS = ["学生", "职场新人", "资深用户", "家庭用户", "银发用户", "内容创作者"]
FACTORS = ["续航", "发热", "屏幕", "系统流畅", "手感", "售后"]
# 与 CROWDS 同序，每个子列表与 FACTORS 对齐
MATRIX = [
    [62, 71, 40, 28, 55, 22],   # 学生
    [58, 44, 66, 35, 30, 18],   # 职场新人
    [20, 26, 33, 46, 44, 74],   # 资深用户
    [48, 30, 52, 38, 24, 40],   # 家庭用户
    [72, 18, 80, 68, 60, 36],   # 银发用户
    [66, 58, 47, 72, 42, 30],   # 内容创作者
]

BG = "#f4f6f8"
FG = "#1a2027"
MUTE = "#8b96a1"
ACCENT = "#2b8fa3"
RISK = "#c9453f"


def build() -> HeatMap:
    data = []
    for row_index, row in enumerate(MATRIX):
        for col_index, value in enumerate(row):
            data.append([col_index, row_index, value])

    heat = (
        HeatMap(init_opts=opts.InitOpts(width="1120px", height="640px", bg_color=BG))
        .add_xaxis(FACTORS)
        .add_yaxis(
            "人群",
            CROWDS,
            data,
            label_opts=opts.LabelOpts(is_show=True, color=FG, font_size=11),
        )
        .set_global_opts(
            title_opts=opts.TitleOpts(
                title="体验要素 × 人群（验证图）",
                subtitle="数值越高 = 该人群对该要素的负面反馈越集中；数据为演示用合成值",
                pos_left="24px",
                pos_top="18px",
                title_textstyle_opts=opts.TextStyleOpts(color=FG, font_size=18),
                subtitle_textstyle_opts=opts.TextStyleOpts(color=MUTE, font_size=12),
            ),
            legend_opts=opts.LegendOpts(
                pos_right="24px",
                pos_top="24px",
                textstyle_opts=opts.TextStyleOpts(color=MUTE),
            ),
            tooltip_opts=opts.TooltipOpts(trigger="item", position="top"),
            xaxis_opts=opts.AxisOpts(
                name="体验要素",
                name_textstyle_opts=opts.TextStyleOpts(color=MUTE),
                axislabel_opts=opts.LabelOpts(color=FG),
                splitarea_opts=opts.SplitAreaOpts(is_show=True),
            ),
            yaxis_opts=opts.AxisOpts(
                name="人群",
                name_textstyle_opts=opts.TextStyleOpts(color=MUTE),
                axislabel_opts=opts.LabelOpts(color=FG),
                splitarea_opts=opts.SplitAreaOpts(is_show=True),
            ),
            visualmap_opts=opts.VisualMapOpts(
                min_=0,
                max_=100,
                is_calculable=True,
                pos_right="24px",
                pos_bottom="32px",
                range_color=["#eef1f4", "#9fc4cc", ACCENT, "#8a5a3c", RISK],
                textstyle_opts=opts.TextStyleOpts(color=MUTE),
            ),
        )
    )
    return heat


def main() -> None:
    out = OUT_DIR / "product_insight.html"
    render_chart(build(), out)
    print(f"[chart-lab] product_insight -> {out}")


if __name__ == "__main__":
    main()
