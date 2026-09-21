"""chart-lab · 制造领域验证图 —— 订单流与工位瓶颈

用途：仅用于离线实验，验证图形形态 / 配色 / 数据结构是否合适。
本脚本生成的 HTML 不嵌入 Vue 应用，也不进入生产构建（正式图表统一使用 ECharts）。

运行：
    pip install pyecharts
    python chart-lab/manufacturing.py

输出：
    chart-lab/output/manufacturing.html
"""
from __future__ import annotations

from pathlib import Path

from pyecharts import options as opts
from pyecharts.charts import Bar
from pyecharts.commons.utils import JsCode

try:
    from lab_env import OUT_DIR, render_chart
except ImportError:
    from .lab_env import OUT_DIR, render_chart

# 各工位在制品（WIP）。装配工位负载显著偏高，视为瓶颈。
STATIONS = ["下料", "焊接", "装配", "喷涂", "检测", "包装"]
WIP = [42, 58, 96, 51, 37, 29]
BOTTLENECK = "装配"

BG = "#0c1116"
FG = "#e6eef2"
MUTE = "#6c7c86"
AXIS = "#9db0ba"
CYAN = "#38b6c8"
RISK = "#e05252"


def build() -> Bar:
    color_js = JsCode(
        "function(params){"
        f"return params.name === '{BOTTLENECK}' ? '{RISK}' : '{CYAN}';"
        "}"
    )
    bar = (
        Bar(init_opts=opts.InitOpts(width="1120px", height="620px", bg_color=BG))
        .add_xaxis(STATIONS)
        .add_yaxis(
            "在制品(WIP)",
            WIP,
            category_gap="42%",
            itemstyle_opts=opts.ItemStyleOpts(color=color_js),
            label_opts=opts.LabelOpts(color=AXIS),
        )
        .set_global_opts(
            title_opts=opts.TitleOpts(
                title="订单流 · 工位瓶颈（验证图）",
                subtitle="红色 = 瓶颈工位（在制品积压）；数据为演示用合成值",
                pos_left="24px",
                pos_top="18px",
                title_textstyle_opts=opts.TextStyleOpts(color=FG, font_size=18),
                subtitle_textstyle_opts=opts.TextStyleOpts(color=MUTE, font_size=12),
            ),
            legend_opts=opts.LegendOpts(
                pos_right="24px",
                pos_top="22px",
                textstyle_opts=opts.TextStyleOpts(color=AXIS),
            ),
            tooltip_opts=opts.TooltipOpts(trigger="axis", axis_pointer_type="shadow"),
            xaxis_opts=opts.AxisOpts(
                name="工位",
                name_textstyle_opts=opts.TextStyleOpts(color=MUTE),
                axislabel_opts=opts.LabelOpts(color=AXIS),
                axisline_opts=opts.AxisLineOpts(
                    linestyle_opts=opts.LineStyleOpts(color="#26333d")
                ),
            ),
            yaxis_opts=opts.AxisOpts(
                name="在制品",
                name_textstyle_opts=opts.TextStyleOpts(color=MUTE),
                axislabel_opts=opts.LabelOpts(color=AXIS),
                splitline_opts=opts.SplitLineOpts(
                    is_show=True,
                    linestyle_opts=opts.LineStyleOpts(color="rgba(56,182,200,0.08)"),
                ),
            ),
        )
    )
    return bar


def main() -> None:
    out = OUT_DIR / "manufacturing.html"
    render_chart(build(), out)
    print(f"[chart-lab] manufacturing -> {out}")


if __name__ == "__main__":
    main()
