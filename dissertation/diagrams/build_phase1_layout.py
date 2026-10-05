"""Render the Phase 1 4-player team layout — supports §6.1 / §6.3.

Two chess boards side by side. Each board has two slots (white, black).
Slot 0 (white on Board A) is teamed with Slot 3 (black on Board B).
Slot 1 (black on Board A) is teamed with Slot 2 (white on Board B).

Arrows show piece flow between teammates' boards.
"""

import os
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch, FancyArrowPatch


def chess_board(ax, x, y, size, label):
    n = 8
    sq = size / n
    for r in range(n):
        for c in range(n):
            colour = "#F0D9B5" if (r + c) % 2 == 0 else "#B58863"
            ax.add_patch(Rectangle((x + c * sq, y + r * sq), sq, sq,
                                   facecolor=colour, edgecolor="none",
                                   zorder=1))
    ax.add_patch(Rectangle((x, y), size, size,
                           facecolor="none", edgecolor="#222",
                           linewidth=2, zorder=2))
    ax.text(x + size / 2, y + size + 0.18, label,
            ha="center", va="bottom",
            fontsize=12, fontweight="bold", zorder=3)


def slot_label(ax, x, y, text, colour, facecolor):
    box = FancyBboxPatch(
        (x - 0.85, y - 0.22), 1.7, 0.44,
        boxstyle="round,pad=0.04,rounding_size=0.08",
        linewidth=1.4, edgecolor=colour,
        facecolor=facecolor, zorder=3,
    )
    ax.add_patch(box)
    ax.text(x, y, text, ha="center", va="center",
            fontsize=9.5, zorder=4)


def main():
    fig, ax = plt.subplots(figsize=(11, 7.5), dpi=220)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 9.5)
    ax.set_aspect("equal")
    ax.axis("off")

    ax.text(7, 9.0, "Phase 1 — 4-player two-board layout",
            ha="center", va="center",
            fontsize=14, fontweight="bold")

    # Board A on the left
    board_size = 3.6
    bx_a, by_a = 1.0, 3.4
    chess_board(ax, bx_a, by_a, board_size, "Board A")

    # Board B on the right
    bx_b, by_b = 9.4, 3.4
    chess_board(ax, bx_b, by_b, board_size, "Board B")

    # Slot labels — top = black, bottom = white
    slot_label(ax, bx_a + board_size / 2, by_a + board_size + 0.7,
               "Slot 1  (Black)", "#333", "#FFF6E6")
    slot_label(ax, bx_a + board_size / 2, by_a - 0.5,
               "Slot 0  (White)", "#333", "#FFF6E6")

    slot_label(ax, bx_b + board_size / 2, by_b + board_size + 0.7,
               "Slot 3  (Black)", "#333", "#E6F4FF")
    slot_label(ax, bx_b + board_size / 2, by_b - 0.5,
               "Slot 2  (White)", "#333", "#E6F4FF")

    # Team annotations on the outer edges
    ax.text(0.4, by_a + board_size / 2, "Team\n  1",
            ha="center", va="center",
            fontsize=11, fontweight="bold", color="#C44E52",
            bbox=dict(boxstyle="round,pad=0.3",
                      facecolor="#FFE0E0", edgecolor="#C44E52"))
    ax.text(13.6, by_b + board_size / 2, "Team\n  2",
            ha="center", va="center",
            fontsize=11, fontweight="bold", color="#4C72B0",
            bbox=dict(boxstyle="round,pad=0.3",
                      facecolor="#E0E8FF", edgecolor="#4C72B0"))

    # Cross-board team pairings
    # Team 1: slot 0 (white on A) <-> slot 3 (black on B)
    ax.annotate(
        "", xy=(bx_b + board_size / 2, by_b + board_size + 0.5),
        xytext=(bx_a + board_size / 2, by_a - 0.3),
        arrowprops=dict(arrowstyle="<->", color="#C44E52",
                        linewidth=2, connectionstyle="arc3,rad=-0.3"),
        zorder=2,
    )
    ax.text(7, 7.4, "Team 1 pair\n(slot 0  ↔  slot 3)",
            ha="center", va="center",
            fontsize=10, color="#C44E52", fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.3",
                      facecolor="white", edgecolor="#C44E52"))

    # Team 2: slot 1 (black on A) <-> slot 2 (white on B)
    ax.annotate(
        "", xy=(bx_b + board_size / 2, by_b - 0.3),
        xytext=(bx_a + board_size / 2, by_a + board_size + 0.5),
        arrowprops=dict(arrowstyle="<->", color="#4C72B0",
                        linewidth=2, connectionstyle="arc3,rad=-0.3"),
        zorder=2,
    )
    ax.text(7, 2.6, "Team 2 pair\n(slot 1  ↔  slot 2)",
            ha="center", va="center",
            fontsize=10, color="#4C72B0", fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.3",
                      facecolor="white", edgecolor="#4C72B0"))

    # Bottom note
    ax.text(7, 0.6,
            "Pieces captured by a player flow into their teammate's pocket on the other board.\n"
            "A draw needs all four to agree; resignation needs both teammates.",
            ha="center", va="center",
            fontsize=9, style="italic", color="#555")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "fig_6_1_phase1_layout.png")
    plt.savefig(out, dpi=220, bbox_inches="tight", facecolor="white")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
