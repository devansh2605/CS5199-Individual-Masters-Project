# Infinite Armada — self-play field notes

A condensed log of observations taken during the 30 self-play sessions referenced in §8.3 of the dissertation. All games at 5+5 time control, engine Elo 1500, single human (myself). Dates are accurate to the playtest day; specific board positions are summarised rather than recorded in PGN.

## N = 4 sessions

**Game 2 (2026-03-12).** Board 1's engine traded a knight on move 16; the knight flowed into board 2's pocket and the recommendation panel flagged it as the best pull. Took it and dropped on f3 to break the kingside. Won on move 28. Lever decisive.

**Game 3 (2026-03-14).** Pulled a rook from board 2 on move 18 after the panel flagged it — board 2's eval was +3 and could spare it. Used the rook to plug an open f-file. Won 10 moves later. Lever decisive.

**Game 5 (2026-03-19).** First N=4 loss. Engine on board 3 forked my queen and rook on the centre boards, panel did not flag the resulting trade well — recommended the wrong source board. Lost on move 34 down to two pieces.

**Game 7 (2026-03-22).** Engine on board 1 traded a queen on move 22, queen flowed to board 2's pocket. I never needed to pull it — the win came from a kingside attack I started on move 14 on my own board. Sibling boards were tactically meaningful but lever did not bite.

## N = 6 sessions

**Game 1 (2026-04-02).** Six boards on screen comfortably readable. Pulled a bishop from board 3 on move 19 to defend my back rank against a rook drop. Lever mattered but the recommendation ranked board 5 above board 3 — I overrode it because board 5 was already losing and a piece there was about to be recaptured.

**Game 4 (2026-04-04).** No piece requests across the ring. Won purely by tactical play on board 0. Sibling boards drew my eye twice (board 4 mating threat, board 2 endgame trade) but neither needed me to intervene.

**Game 5 (2026-04-04).** Recommendation said board 4 had the best knight; I took it but the engine on board 4 collapsed two moves later and stopped feeding board 5. Knock-on effect — board 5 ran out of pieces and ended on flag fall. The chain of dependencies is real.

**Game 8 (2026-04-12).** Tactical drop won the game on move 24 — a knight pulled from board 2 and dropped on f6 to fork the king and queen. Best single-move use of the cross-board lever in the whole 30-game set.

## N = 10 sessions

**Game 1 (2026-04-19).** Ten boards visible but the mini-boards at this size are hard to track tactically — I had to scroll to keep all of them in view. Won on board 0 via a king-side mating attack I started on move 12; I made no piece requests. Sibling boards effectively noise.

**Game 2 (2026-04-23).** Eight boards visible, only board 1's tactic mattered to me. Board 7's eval was -8 by move 30 but the queen never reached my pocket in time before the game ended.

**Game 4 (2026-04-28).** Pulled a knight from board 3 on move 20 and dropped it on e6 — decisive. Only N=10 game where the lever made the difference. The piece had been sitting in board 3's pocket since move 9, which is the propagation lag I discuss in §8.3.

**Game 9 (2026-05-02).** First time I won at N=10. Did not request a single piece across the ring — pure board-0 chess. Confirms the §8.7 limitation: at N=10 the cross-board strategic loop becomes diluted enough that the game effectively reduces to a 1-vs-engine standard chess game.

---

## Aggregate observations

Three patterns stood out across the 30 games:

1. **Propagation lag scales roughly with N.** At N=4 the average time from a capture on board K to that piece appearing in board 0's pocket was ~6 moves; at N=10 the equivalent lag was 18+ moves, often outliving the game.

2. **The recommendation panel's eval-only ranking misses second-order effects.** Twice it ranked a board "best" where pulling the piece would push that board into a quick loss, ending its further contribution. Future work in §8.8 covers this.

3. **Sibling-board readability falls off a cliff at N=10.** At N=4 and N=6 I could track every board with a glance; at N=10 only the two boards visually adjacent to board 0 stayed in focus, and the rest faded into background noise. UI overload, not engine overload.
