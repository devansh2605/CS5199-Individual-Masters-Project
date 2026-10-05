"""Render the §8.3 supplementary chart — mean game duration by N with range.

Bar chart with error bars showing min-max range.
"""

import os
import matplotlib.pyplot as plt
import numpy as np


def main():
    n_values = ['N = 4', 'N = 6', 'N = 10']
    means = [18, 17, 16]
    mins = [14, 12, 11]
    maxs = [22, 21, 22]

    err_lower = [m - mn for m, mn in zip(means, mins)]
    err_upper = [mx - m for mx, m in zip(maxs, means)]

    fig, ax = plt.subplots(figsize=(9, 5.5), dpi=220)
    x = np.arange(len(n_values))
    bars = ax.bar(x, means, width=0.45,
                  color='#8172B3', edgecolor='#222', linewidth=0.8,
                  yerr=[err_lower, err_upper],
                  capsize=10, ecolor='#333',
                  error_kw={'linewidth': 1.4})

    for bar, mean, mn, mx in zip(bars, means, mins, maxs):
        ax.text(bar.get_x() + bar.get_width() / 2, mean + 0.4,
                f'{mean} min',
                ha='center', va='bottom', fontsize=11, fontweight='bold')
        ax.text(bar.get_x() + bar.get_width() / 2, mn - 0.8,
                f'({mn}–{mx})',
                ha='center', va='top', fontsize=9, color='#555')

    ax.set_xlabel('Configuration', fontsize=12)
    ax.set_ylabel('Game length (minutes)', fontsize=12)
    ax.set_title('Mean game length across 30 self-play games (5+5, Elo 1500)',
                 fontsize=13, pad=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(n_values, fontsize=11)
    ax.set_ylim(0, 26)
    ax.grid(axis='y', linestyle='--', alpha=0.3, zorder=0)
    ax.set_axisbelow(True)

    for spine in ('top', 'right'):
        ax.spines[spine].set_visible(False)

    plt.tight_layout()
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       'fig_8_3b_duration.png')
    plt.savefig(out, dpi=220, bbox_inches='tight', facecolor='white')
    print(f'Wrote {out}')


if __name__ == '__main__':
    main()
