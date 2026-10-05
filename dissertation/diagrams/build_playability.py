"""Render the §8.3 Playability bar chart.

Grouped bar chart, 3 N values on the x-axis, 3 bars per group
(Lever, Meaningful, Clean), all out of 10 games.
"""

import os
import matplotlib.pyplot as plt
import numpy as np


def main():
    n_values = ['N = 4', 'N = 6', 'N = 10']
    lever = [7, 5, 3]
    meaningful = [9, 8, 4]
    clean = [10, 10, 10]

    x = np.arange(len(n_values))
    width = 0.26

    fig, ax = plt.subplots(figsize=(10, 6), dpi=220)
    b1 = ax.bar(x - width, lever, width,
                label='Cross-board lever mattered',
                color='#4C72B0', edgecolor='#222', linewidth=0.8)
    b2 = ax.bar(x,        meaningful, width,
                label='Sibling boards meaningful',
                color='#DD8452', edgecolor='#222', linewidth=0.8)
    b3 = ax.bar(x + width, clean, width,
                label='Cleanly ended',
                color='#55A868', edgecolor='#222', linewidth=0.8)

    for bars in (b1, b2, b3):
        for rect in bars:
            h = rect.get_height()
            ax.text(rect.get_x() + rect.get_width() / 2, h + 0.15,
                    f'{int(h)}/10',
                    ha='center', va='bottom', fontsize=10)

    ax.set_xlabel('Configuration', fontsize=12)
    ax.set_ylabel('Games out of 10', fontsize=12)
    ax.set_title('Playability scores across 30 self-play games at 5+5, Elo 1500',
                 fontsize=13, pad=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(n_values, fontsize=11)
    ax.set_yticks(range(0, 11, 2))
    ax.set_ylim(0, 11.5)
    ax.grid(axis='y', linestyle='--', alpha=0.3, zorder=0)
    ax.set_axisbelow(True)
    ax.legend(loc='lower left', frameon=True, fontsize=10, framealpha=0.95)

    for spine in ('top', 'right'):
        ax.spines[spine].set_visible(False)

    plt.tight_layout()
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       'fig_8_3_playability.png')
    plt.savefig(out, dpi=220, bbox_inches='tight', facecolor='white')
    print(f'Wrote {out}')


if __name__ == '__main__':
    main()
