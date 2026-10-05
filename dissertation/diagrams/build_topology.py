"""System topology — three layers + Stockfish subprocesses."""

import os
import matplotlib.pyplot as plt
from _style import setup, title, box, arrow


def main():
    fig, ax = setup((11, 7), (0, 14), (0, 9))
    title(ax, "System Topology", x=0.4, y_factor=0.97)

    box(ax, (7, 7.3), 4.4, 1.6, "Browser (Client)",
        ["React 15", "Webpack bundle"])
    box(ax, (7, 4.5), 3.6, 1.4, "Node Server")
    box(ax, (2.5, 1.5), 4, 1.6, "Stockfish (N + 1)",
        ["1 process per board", "+ shared evaluator"])
    box(ax, (11.5, 1.5), 3.6, 1.4, "Supabase",
        ["Postgres + Auth"])

    arrow(ax, (7, 6.5), (7, 5.2), "HTTP + Socket.io",
          label_offset=(0, 0.05))
    arrow(ax, (5.3, 3.95), (3.7, 2.3), "UCI",
          label_offset=(-0.4, 0.2))
    arrow(ax, (8.7, 3.95), (10.3, 2.3), "SQL",
          label_offset=(0.4, 0.2))

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "fig_4_1_topology.png")
    plt.savefig(out, dpi=220, bbox_inches="tight", facecolor="white")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
