"""Version-stamped event flow sequence diagram."""

import os
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
from _style import setup, title, BOX_FACE, BOX_EDGE, ARROW_COLOR


def lifeline(ax, x, label, top=11.5, bottom=0.6):
    ax.text(x, top + 0.3, label,
            ha="center", va="bottom",
            fontsize=14, fontweight="bold")
    ax.plot([x, x], [bottom, top],
            color=BOX_EDGE, linewidth=1, linestyle=":", alpha=0.6, zorder=1)


def event(ax, x1, x2, y, label, dashed=False):
    a = FancyArrowPatch(
        (x1, y), (x2, y),
        arrowstyle="->",
        mutation_scale=14,
        linewidth=1.4,
        color=ARROW_COLOR,
        linestyle=":" if dashed else "-",
        zorder=2,
    )
    ax.add_patch(a)
    mx = (x1 + x2) / 2
    ax.text(mx, y + 0.2, label, ha="center", va="bottom", fontsize=10.5)


def state_box(ax, x, y, text, w=2.6, h=0.55):
    patch = FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle="round,pad=0.04,rounding_size=0.12",
        linewidth=1.2, edgecolor=BOX_EDGE, facecolor=BOX_FACE,
        zorder=3,
    )
    ax.add_patch(patch)
    ax.text(x, y, text, ha="center", va="center", fontsize=10, zorder=4)


def main():
    fig, ax = setup((11.5, 9), (0, 15), (0, 13))
    title(ax, "Version-stamped event flow", x=0.4, y_factor=0.97)

    xa, xs, xb = 2.5, 7.5, 12.5
    lifeline(ax, xa, "Client A")
    lifeline(ax, xs, "Server")
    lifeline(ax, xb, "Client B")

    event(ax, xa, xs, 10.6, "move (e2e4)")
    state_box(ax, xs, 9.7, "v41 → v42")
    event(ax, xs, xa, 9.0, "board_update v42")
    event(ax, xs, xb, 9.0, "board_update v42")

    state_box(ax, xb, 8.0, "WiFi drop")
    event(ax, xa, xs, 7.0, "drop (N@f6)")
    state_box(ax, xs, 6.1, "v42 → v43 → v44")
    event(ax, xs, xa, 5.4, "board_update v44")
    event(ax, xs, xb, 5.4, "lost", dashed=True)

    state_box(ax, xb, 4.4, "reconnect")
    event(ax, xb, xs, 3.6, "join_room")
    state_box(ax, xs, 2.7, "clear grace timer", w=3.0)
    event(ax, xs, xb, 1.9, "state (full snapshot, v44)")

    state_box(ax, xa, 1.0, "at v44")
    state_box(ax, xb, 1.0, "at v44")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "fig_5_5_version_flow.png")
    plt.savefig(out, dpi=220, bbox_inches="tight", facecolor="white")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
