"""chart-lab 运行环境与渲染支持模块

解决 pyecharts 默认官方资源源 (assets.pyecharts.org) 的 SSL 证书过期
导致的浏览器加载资源失败 (net::ERR_CERT_DATE_INVALID) 及白屏 ReferenceError 问题。

特性：
1. 离线优先：自动从本地 node_modules 同步 echarts.min.js 到 output/ 目录，零延迟、断网可用。
2. 容灾 Fallback：HTML 内自动注入双保险机制，若文件单独复制到外部，自动回退到阿里云 npmmirror 高速镜像源。
"""
from __future__ import annotations

from pathlib import Path
import shutil
from typing import Any

from pyecharts.globals import CurrentConfig

LAB_DIR = Path(__file__).resolve().parent
OUT_DIR = LAB_DIR / "output"
REPO_ROOT = LAB_DIR.parents[1]
NODE_MODULES_ECHARTS = LAB_DIR.parent / "node_modules" / "echarts" / "dist" / "echarts.min.js"

# 国内高速稳定 CDN 镜像（阿里云 npmmirror）
CDN_ECHARTS = "https://registry.npmmirror.com/echarts/5.5.0/files/dist/echarts.min.js"

# 默认设置相对路径，优先匹配同目录下的本地 echarts.min.js
CurrentConfig.ONLINE_HOST = "./"


def ensure_local_assets(out_dir: Path | None = None) -> Path:
    """确保目标输出目录下存在本地 echarts.min.js 资源"""
    target_dir = out_dir or OUT_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    dst = target_dir / "echarts.min.js"
    if not dst.exists() and NODE_MODULES_ECHARTS.exists():
        shutil.copyfile(NODE_MODULES_ECHARTS, dst)
    return dst


def render_chart(chart: Any, out_path: Path) -> Path:
    """渲染图表并注入离线优先 + CDN 容灾 fallback 脚本"""
    ensure_local_assets(out_path.parent)
    chart.render(str(out_path))

    html = out_path.read_text(encoding="utf-8")
    fallback_script = (
        '<script type="text/javascript" src="./echarts.min.js"></script>\n'
        '    <script type="text/javascript">\n'
        '        if (typeof echarts === "undefined") {\n'
        f'            document.write(\'<script type="text/javascript" src="{CDN_ECHARTS}"><\\/script>\');\n'
        '        }\n'
        '    </script>'
    )
    target_tag = '<script type="text/javascript" src="./echarts.min.js"></script>'
    if target_tag in html:
        html = html.replace(target_tag, fallback_script, 1)
        out_path.write_text(html, encoding="utf-8")

    return out_path


# 模块导入时自动确保 output 目录下有本地资源
ensure_local_assets(OUT_DIR)
