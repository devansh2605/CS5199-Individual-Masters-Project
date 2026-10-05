"""Render the §6.6 drop-decision pipeline flowchart.

Four boxes top-to-bottom with arrows, plus side branches for the
Elo-bias short-circuit and the random fallback exit. Validator gate
sits to the left feeding into stage 1.
"""

import os
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch


def box(ax, xy, w, h, title, lines, facecolor):
    x, y = xy
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.04,rounding_size=0.15",
        linewidth=1.5,
        edgecolor="#222",
        facecolor=facecolor,
        zorder=2,
    )
    ax.add_patch(patch)
    ax.text(
        x + w / 2, y + h - 0.25,
        title,
        ha="center", va="top",
        fontsize=11, fontweight="bold",
        zorder=3,
    )
    for i, line in enumerate(lines):
        ax.text(
            x + w / 2, y + h - 0.55 - i * 0.28,
            line,
            ha="center", va="top",
            fontsize=8.5,
            zorder=3,
        )


def arrow(ax, start, end, label=None, label_offset=(0, 0), curve=0.0,
          style='->', color='#333'):
    a = FancyArrowPatch(
        start, end,
        arrowstyle=style,
        mutation_scale=18,
        linewidth=1.6,
        color=color,
        connectionstyle=f"arc3,rad={curve}",
        zorder=1,
    )
    ax.add_patch(a)
    if label:
        mx = (start[0] + end[0]) / 2 + label_offset[0]
        my = (start[1] + end[1]) / 2 + label_offset[1]
        ax.text(mx, my, label,
                ha="center", va="center",
                fontsize=8.5, style="italic",
                bbox=dict(boxstyle="round,pad=0.2", facecolor="white",
                          edgecolor="none"),
                zorder=5)


def main():
    fig, ax = plt.subplots(figsize=(10, 11), dpi=220)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 16)
    ax.set_aspect("equal")
    ax.axis("off")

    ax.text(7, 15.4,
            "Drop-decision pipeline",
            ha="center", va="center",
            fontsize=13, fontweight="bold")

    # Validator (gate, left side)
    box(ax, (0.2, 11.6), 3.6, 1.8,
        "Rule validator",
        ["dropRules.js",
         "filters mate-on-drop,",
         "back-rank, promotion-on-drop,",
         "pawn-rank"],
        "#FCE5C4")

    # Stage 1
    box(ax, (4.8, 11.6), 6.4, 1.8,
        "1.  Heuristic candidate pruning",
        ["bughouseEval.getCandidateDropSquares",
         "→ up to 12 candidates per piece type,",
         "ordered by PST + king-zone + check bonus"],
        "#D7E3FA")

    # Stage 2
    box(ax, (4.8, 8.6), 6.4, 1.8,
        "2.  Elo-scaled drop bias",
        ["eloDropBias(elo) = clamp((elo-1320)/2000, 0.05, 0.30)",
         "if Math.random() < bias, play top heuristic drop",
         "(weaker engines drop impulsively)"],
        "#D7E3FA")

    # Stage 3
    box(ax, (4.8, 5.6), 6.4, 1.8,
        "3.  Stockfish move  vs.  best drop",
        ["call engine.getBestMove for the standard move,",
         "evaluate each top drop candidate via shared eval,",
         "pick the option leaving opponent worst-placed"],
        "#D7E3FA")

    # Stage 4
    box(ax, (4.8, 2.6), 6.4, 1.8,
        "4.  Pick winner  /  random legal fallback",
        ["return the chosen move OR a random legal move",
         "if Stockfish is dead (keeps the board alive)"],
        "#D7E3FA")

    # Vertical arrows between stages
    arrow(ax, (8, 11.55), (8, 10.45))
    arrow(ax, (8, 8.55), (8, 7.45))
    arrow(ax, (8, 5.55), (8, 4.45))

    # Validator → stage 1 (left, into top-left of stage 1)
    arrow(ax, (3.85, 12.5), (4.75, 12.5),
          label="legal candidates",
          label_offset=(0, 0.4))

    # Side exit from stage 2: play heuristic drop early
    arrow(ax, (11.25, 9.5), (13.4, 9.5),
          label="play",
          label_offset=(0, 0.35))
    ax.text(13.4, 9.5, "↗ exit",
            ha="left", va="center", fontsize=9, style="italic")

    # Side exit from stage 4: fallback
    arrow(ax, (11.25, 3.5), (13.4, 3.5),
          label="fallback",
          label_offset=(0, 0.35))
    ax.text(13.4, 3.5, "↘ exit",
            ha="left", va="center", fontsize=9, style="italic")

    # Bottom note
    ax.text(7, 1.2,
            "Note: mate-on-drop search was removed — the rule validator refuses it,\n"
            "so the engine never proposes it (engineManager.js, dropDecision.js).",
            ha="center", va="center",
            fontsize=8.5, style="italic", color="#555")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "fig_6_6_drop_pipeline.png")
    plt.savefig(out, dpi=220, bbox_inches="tight", facecolor="white")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
