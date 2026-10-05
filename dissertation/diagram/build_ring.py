"""N-board ring at N = 4."""

import os
import math
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch
from _style import setup, title, box, BOX_EDGE, ARROW_COLOR


def arc_arrow(ax, c, r, theta_start, theta_end, label, label_offset=0):
    n = 60
    thetas = [theta_start + (theta_end - theta_start) * i / (n - 1) for i in range(n)]
    xs = [c[0] + r * math.cos(t) for t in thetas]
    ys = [c[1] + r * math.sin(t) for t in thetas]
    ax.plot(xs, ys, color=ARROW_COLOR, linewidth=1.6, zorder=1)
    a = FancyArrowPatch(
        (xs[-2], ys[-2]), (xs[-1], ys[-1]),
        arrowstyle="-|>",
        mutation_scale=20,
        linewidth=1.6,
        color=ARROW_COLOR,
        zorder=2,
    )
    ax.add_patch(a)
    mid_theta = (theta_start + theta_end) / 2
    lx = c[0] + (r + 0.7 + label_offset) * math.cos(mid_theta)
    ly = c[1] + (r + 0.7 + label_offset) * math.sin(mid_theta)
    ax.text(lx, ly, label, ha="center", va="center", fontsize=11)


def main():
    fig, ax = setup((9, 9), (-6, 6), (-6, 6))
    title(ax, "N-board ring (N = 4)", x=-5.5, y_factor=0.97)

    c = (0, 0)
    R = 3.2
    angles = [math.pi / 2, 0, -math.pi / 2, math.pi]
    positions = [(c[0] + R * math.cos(a), c[1] + R * math.sin(a))
                 for a in angles]

    box(ax, positions[0], 2.4, 1.4, "Board 0", ["Human"])
    box(ax, positions[1], 2.4, 1.4, "Board 1", ["Engine"])
    box(ax, positions[2], 2.4, 1.4, "Board 2", ["Engine"])
    box(ax, positions[3], 2.4, 1.4, "Board 3", ["Engine"])

    inner_r = R - 0.05
    arc_arrow(ax, c, inner_r,  math.pi/2 - 0.35,  0 + 0.35, "0 → 1")
    arc_arrow(ax, c, inner_r,  0 - 0.35,         -math.pi/2 + 0.35, "1 → 2")
    arc_arrow(ax, c, inner_r, -math.pi/2 - 0.35,  math.pi + 0.35 - 2*math.pi, "2 → 3")
    arc_arrow(ax, c, inner_r,  math.pi - 0.35,    math.pi/2 + 0.35, "3 → 0")

    ax.text(0, 0, "captures\nflow one way",
            ha="center", va="center", fontsize=10, color="#555")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "fig_6_4_ring.png")
    plt.savefig(out, dpi=220, bbox_inches="tight", facecolor="white")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
