"""Drop-decision pipeline flowchart."""

import os
import matplotlib.pyplot as plt
from _style import setup, title, box, arrow


def main():
    fig, ax = setup((9, 13), (0, 10), (0, 14))
    title(ax, "Drop-decision pipeline", x=0.3, y_factor=0.97)

    cx = 5.0

    box(ax, (cx, 12.0), 6.0, 1.4,
        "1. Rule check",
        ["throw out illegal drops"])

    box(ax, (cx, 9.6), 6.0, 1.4,
        "2. Shortlist",
        ["keep top 12 drops"])

    box(ax, (cx, 7.2), 6.0, 1.4,
        "3. Weaker engines play worse",
        ["low Elo drops more freely"])

    box(ax, (cx, 4.8), 6.0, 1.4,
        "4. Compare with Stockfish",
        ["best move vs best drop"])

    box(ax, (cx, 2.4), 6.0, 1.4,
        "5. Pick winner",
        ["random legal move if engine dies"])

    arrow(ax, (cx, 11.3), (cx, 10.3), bidirectional=False)
    arrow(ax, (cx, 8.9), (cx, 7.9), bidirectional=False)
    arrow(ax, (cx, 6.5), (cx, 5.5), bidirectional=False)
    arrow(ax, (cx, 4.1), (cx, 3.1), bidirectional=False)

    ax.text(0.3, 0.6,
            "Mate-on-drop is illegal, so the engine never searches for one.",
            ha="left", va="center", fontsize=10, color="#555")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "fig_6_6_drop_pipeline.png")
    plt.savefig(out, dpi=220, bbox_inches="tight", facecolor="white")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
