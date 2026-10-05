"""Render the §7.1 test coverage chart.

Horizontal bar chart, one row per test file, length = number of passing
assertions. Total annotated above the bars.
"""

import os
import matplotlib.pyplot as plt


def main():
    files = [
        ('bughouse.test.js', 82, 'Phase 1 rule layer'),
        ('dropDecision.test.js', 21, 'Drop pipeline'),
        ('elo.test.js', 26, 'Team-Elo updates'),
        ('engineStrength.test.js', 2, 'Stockfish sanity'),
        ('infiniteMode.test.js', 19, 'Phase 2 integration'),
    ]
    files.sort(key=lambda x: x[1], reverse=False)

    labels = [f[0] for f in files]
    counts = [f[1] for f in files]
    covers = [f[2] for f in files]

    fig, ax = plt.subplots(figsize=(10, 5), dpi=220)
    bars = ax.barh(labels, counts,
                   color='#4C72B0', edgecolor='#222', linewidth=0.8)

    for bar, cover, count in zip(bars, covers, counts):
        w = bar.get_width()
        ax.text(w + 1.5, bar.get_y() + bar.get_height() / 2,
                f'{count}  ({cover})',
                va='center', ha='left', fontsize=10)

    ax.set_xlabel('Passing assertions', fontsize=12)
    ax.set_title('Test coverage by file — 150 passing assertions across 5 files',
                 fontsize=13, pad=14, fontweight='bold')
    ax.set_xlim(0, max(counts) * 1.45)
    ax.grid(axis='x', linestyle='--', alpha=0.3, zorder=0)
    ax.set_axisbelow(True)

    for spine in ('top', 'right'):
        ax.spines[spine].set_visible(False)

    plt.tight_layout()
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       'fig_7_1_test_coverage.png')
    plt.savefig(out, dpi=220, bbox_inches='tight', facecolor='white')
    print(f'Wrote {out}')


if __name__ == '__main__':
    main()
