"""Shared style for the box-and-arrow diagrams.

Light grey rounded boxes, black borders, black arrows with plain text
labels, bold title top-left. White background.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch


BOX_FACE = "#D9D9D9"
BOX_EDGE = "#222"
BOX_LINEWIDTH = 1.6
ARROW_COLOR = "#222"
ARROW_LINEWIDTH = 1.6


def setup(figsize, xlim, ylim):
    fig, ax = plt.subplots(figsize=figsize, dpi=220)
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.patch.set_facecolor("white")
    return fig, ax


def title(ax, text, x=0.5, y_factor=0.95):
    ylim = ax.get_ylim()
    ax.text(x, ylim[0] + (ylim[1] - ylim[0]) * y_factor,
            text, ha="left", va="top",
            fontsize=20, fontweight="bold")


def box(ax, xy, w, h, title_text, subtitle_lines=None):
    x, y = xy
    patch = FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle="round,pad=0.05,rounding_size=0.18",
        linewidth=BOX_LINEWIDTH,
        edgecolor=BOX_EDGE,
        facecolor=BOX_FACE,
        zorder=2,
    )
    ax.add_patch(patch)

    if subtitle_lines:
        ax.text(x, y + 0.25, title_text,
                ha="center", va="center",
                fontsize=12, fontweight="bold", zorder=3)
        for i, line in enumerate(subtitle_lines):
            ax.text(x, y - 0.05 - i * 0.32, line,
                    ha="center", va="center",
                    fontsize=10, zorder=3)
    else:
        ax.text(x, y, title_text,
                ha="center", va="center",
                fontsize=12, fontweight="bold", zorder=3)


def arrow(ax, start, end, label=None, label_offset=(0, 0),
          bidirectional=True, dashed=False):
    style = "<|-|>" if bidirectional else "-|>"
    a = FancyArrowPatch(
        start, end,
        arrowstyle=style,
        mutation_scale=15,
        linewidth=ARROW_LINEWIDTH,
        color=ARROW_COLOR,
        linestyle=":" if dashed else "-",
        zorder=1,
    )
    ax.add_patch(a)
    if label:
        mx = (start[0] + end[0]) / 2 + label_offset[0]
        my = (start[1] + end[1]) / 2 + label_offset[1]
        ax.text(mx, my, label, ha="center", va="center", fontsize=11)
