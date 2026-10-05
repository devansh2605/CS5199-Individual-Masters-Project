"""Render the §6.4 N-board ring topology at N=4.

Four rounded squares arranged in a ring (board 0 top), one-way arrows
between consecutive boards. Board 0 has a human icon; boards 1-3 have
engine icons.
"""

import os
import math
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch


def board_box(ax, x, y, w, h, title, sub, facecolor):
    patch = FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle="round,pad=0.06,rounding_size=0.2",
        linewidth=1.8, edgecolor="#222",
        facecolor=facecolor, zorder=2,
    )
    ax.add_patch(patch)
    ax.text(x, y + 0.18, title, ha="center", va="center",
            fontsize=12, fontweight="bold", zorder=3)
    ax.text(x, y - 0.25, sub, ha="center", va="center",
            fontsize=9.5, style="italic", zorder=3)


def arc_arrow(ax, c, r, theta_start, theta_end, label,
              color="#4C72B0", label_offset=0):
    n = 60
    thetas = [theta_start + (theta_end - theta_start) * i / (n - 1) for i in range(n)]
    xs = [c[0] + r * math.cos(t) for t in thetas]
    ys = [c[1] + r * math.sin(t) for t in thetas]
    ax.plot(xs, ys, color=color, linewidth=2, zorder=1)
    arrow = FancyArrowPatch(
        (xs[-2], ys[-2]), (xs[-1], ys[-1]),
        arrowstyle="-|>",
        mutation_scale=22,
        linewidth=2,
        color=color,
        zorder=2,
    )
    ax.add_patch(arrow)
    mid_theta = (theta_start + theta_end) / 2
    lx = c[0] + (r + 0.7 + label_offset) * math.cos(mid_theta)
    ly = c[1] + (r + 0.7 + label_offset) * math.sin(mid_theta)
    ax.text(lx, ly, label, ha="center", va="center",
            fontsize=9, style="italic", color="#333",
            bbox=dict(boxstyle="round,pad=0.2",
                      facecolor="white", edgecolor="none"),
            zorder=3)


def main():
    fig, ax = plt.subplots(figsize=(9, 9), dpi=220)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-6, 6)
    ax.set_aspect("equal")
    ax.axis("off")

    ax.text(0, 5.5, "N-board ring at N = 4",
            ha="center", va="center", fontsize=14, fontweight="bold")
    ax.text(0, 0, "captures flow\nclockwise",
            ha="center", va="center", fontsize=10,
            style="italic", color="#555")

    c = (0, 0)
    R = 3.2
    angles = [math.pi / 2,            # board 0 (top)
              0,                      # board 1 (right)
              -math.pi / 2,           # board 2 (bottom)
              math.pi]                # board 3 (left)
    positions = [(c[0] + R * math.cos(a), c[1] + R * math.sin(a))
                 for a in angles]

    titles = ["Board 0", "Board 1", "Board 2", "Board 3"]
    subs = ["Human", "Engine", "Engine", "Engine"]
    colours = ["#D7E3FA", "#D5EFD2", "#D5EFD2", "#D5EFD2"]

    for (px, py), t, s, col in zip(positions, titles, subs, colours):
        board_box(ax, px, py, 2.2, 1.4, t, s, col)

    # Arcs between consecutive boards (0→1, 1→2, 2→3, 3→0)
    inner_r = R - 0.05
    arc_arrow(ax, c, inner_r,  math.pi/2 - 0.35, 0 + 0.35,
              "0 → 1")
    arc_arrow(ax, c, inner_r,  0 - 0.35, -math.pi/2 + 0.35,
              "1 → 2")
    arc_arrow(ax, c, inner_r, -math.pi/2 - 0.35, math.pi + 0.35 - 2*math.pi,
              "2 → 3")
    # 3→0 wraps around top-left
    arc_arrow(ax, c, inner_r, math.pi - 0.35, math.pi/2 + 0.35,
              "3 → 0  (ring closure)")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "fig_6_4_ring.png")
    plt.savefig(out, dpi=220, bbox_inches="tight", facecolor="white")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
