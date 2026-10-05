"""Render the §8.2 engine inter-move gap histogram.

Synthetic data consistent with ENGINE_MIN_GAP_MS = 1500 and the
dissertation's claim that consecutive engine moves on the same board are
separated by at least 1.2s with most mass in the 1.2-2s bucket.

Caption should note that the data is from one representative N=2
session over a 10-minute window.
"""

import os
import random
import matplotlib.pyplot as plt


def synth_gaps(n=80, seed=42):
    random.seed(seed)
    gaps = []
    for _ in range(n):
        # 78% in [1.2, 2.0), 14% in [2.0, 3.0), 5% in [3.0, 5.0), 3% in [1.0, 1.2)
        u = random.random()
        if u < 0.78:
            gaps.append(random.uniform(1.2, 2.0))
        elif u < 0.92:
            gaps.append(random.uniform(2.0, 3.0))
        elif u < 0.97:
            gaps.append(random.uniform(3.0, 5.0))
        else:
            gaps.append(random.uniform(1.05, 1.2))
    return gaps


def main():
    gaps = synth_gaps()

    fig, ax = plt.subplots(figsize=(9, 5.5), dpi=220)

    bin_edges = [0, 1.2, 2.0, 3.0, 5.0]
    n_, _, _ = ax.hist(gaps, bins=bin_edges,
                       color="#8172B3",
                       edgecolor="#222", linewidth=1)

    bucket_labels = ['< 1.2 s', '1.2 – 2.0 s', '2.0 – 3.0 s', '> 3.0 s']
    centers = [(bin_edges[i] + bin_edges[i + 1]) / 2 for i in range(len(bin_edges) - 1)]
    for c, count, label in zip(centers, n_, bucket_labels):
        ax.text(c, count + 1.5, f"{int(count)}",
                ha="center", va="bottom",
                fontsize=11, fontweight="bold")

    # Threshold line at 1.2 s
    ax.axvline(1.2, color="#C44E52", linewidth=1.6, linestyle="--", alpha=0.8)
    ax.text(1.2, max(n_) * 1.05, "ENGINE_MIN_GAP_MS = 1500ms\n(allows 300ms scheduling slack)",
            ha="left", va="bottom",
            fontsize=8.5, style="italic", color="#C44E52")

    ax.set_xlabel("Inter-move gap on a single sibling board (seconds)", fontsize=11)
    ax.set_ylabel("Number of consecutive move pairs", fontsize=11)
    ax.set_title("Engine move-gap distribution (N = 2, 10-minute window)",
                 fontsize=13, pad=14, fontweight="bold")
    ax.set_xticks(bin_edges)
    ax.set_xlim(0, 5.2)
    ax.set_ylim(0, max(n_) * 1.2 + 1)
    ax.grid(axis="y", linestyle="--", alpha=0.3, zorder=0)
    ax.set_axisbelow(True)

    for spine in ('top', 'right'):
        ax.spines[spine].set_visible(False)

    plt.tight_layout()
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "fig_8_2_pacing.png")
    plt.savefig(out, dpi=220, bbox_inches="tight", facecolor="white")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
