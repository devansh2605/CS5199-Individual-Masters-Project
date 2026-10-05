"""Phase 1 4-player team layout — boxes only, no chess board art."""

import os
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch
from _style import setup, title, box, BOX_EDGE, ARROW_COLOR


def main():
    fig, ax = setup((11, 7.5), (0, 14), (0, 9))
    title(ax, "Phase 1 — 4-player two-board layout",
          x=0.4, y_factor=0.97)

    # Four slot boxes — Team 1 (slots 0,3) and Team 2 (slots 1,2)
    box(ax, (3, 6.2), 4.2, 1.4, "Slot 1 (Black)", ["Board A"])
    box(ax, (11, 6.2), 4.2, 1.4, "Slot 3 (Black)", ["Board B"])
    box(ax, (3, 2.0), 4.2, 1.4, "Slot 0 (White)", ["Board A"])
    box(ax, (11, 2.0), 4.2, 1.4, "Slot 2 (White)", ["Board B"])

    # Team 1 connection: slot 0 ↔ slot 3
    a = FancyArrowPatch(
        (3, 1.3), (11, 6.9),
        arrowstyle="<->",
        mutation_scale=14, linewidth=1.4,
        color=ARROW_COLOR,
        connectionstyle="arc3,rad=-0.25",
        zorder=1,
    )
    ax.add_patch(a)
    ax.text(7, 5.0, "Team 1 (slot 0 + slot 3)",
            ha="center", va="center", fontsize=10.5)

    # Team 2 connection: slot 1 ↔ slot 2
    b = FancyArrowPatch(
        (3, 6.9), (11, 1.3),
        arrowstyle="<->",
        mutation_scale=14, linewidth=1.4,
        color=ARROW_COLOR,
        connectionstyle="arc3,rad=0.25",
        zorder=1,
    )
    ax.add_patch(b)
    ax.text(7, 3.5, "Team 2 (slot 1 + slot 2)",
            ha="center", va="center", fontsize=10.5)

    ax.text(7, 0.5,
            "Captures by a player flow into their teammate's pocket on the other board.",
            ha="center", va="center", fontsize=10, color="#555")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "fig_6_1_phase1_layout.png")
    plt.savefig(out, dpi=220, bbox_inches="tight", facecolor="white")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
