"""Emit Devansh's CS5199 dissertation report as both report.tex and report.docx.

Single source of prose; two writers. Run with: python3 build_report.py
"""

import os
import re
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH


# ---------------------------------------------------------------------------
# Content. Each entry is (tag, payload). Tags:
#   h1 — chapter heading
#   h2 — section heading
#   p  — paragraph (inline `code` and *italic* supported)
#   ul — bullet list (payload is list of strings)
#   ol — numbered list (payload is list of strings)
#   fig — figure placeholder (payload is "N.M|caption")
#   page — force page break
#   titlepage — render title page
#   toc — table of contents
# ---------------------------------------------------------------------------

C = []


def add(tag, payload):
    C.append((tag, payload))


# --- Title page -------------------------------------------------------------

add("titlepage", None)
add("page", None)

# --- Abstract ---------------------------------------------------------------

add("h1", "Abstract")
add("p",
    "This dissertation describes Infinite Armada Chess, a multi-board "
    "chess variant inspired by Randall Munroe's XKCD comic, number 3020. "
    "Standard chess engines play one static board. I take the game and "
    "stretch it onto N boards arranged in a one-way ring. Captures on "
    "board K flow into the pocket of board (K+1) mod N. The human sits "
    "on board 0; every other board is engine against engine. The "
    "interesting problem sits between the boards rather than inside any "
    "one of them: when to drop a piece, on which board, and which "
    "sibling board to ask a piece from.")
add("p",
    "The project ships in two phases. Phase 1 is the classic 4-player "
    "two-board bughouse: two teams, two boards side by side, pieces "
    "captured on one board flowing into the partner's pocket on the "
    "other. Phase 1 is rebuilt on top of John DiIorio's fork with a "
    "strict server-side rule layer, optional engine fill for any of "
    "the four slots, and a team-aware draw and resignation flow. "
    "Phase 2 is the new N-board ring variant that inherits the rule "
    "layer and extends it to a circular topology of N boards. Both "
    "phases share the same auth, rating and lobby infrastructure; the "
    "gameplay differs at the level of topology and piece-flow "
    "direction.")
add("p",
    "The project builds on John DiIorio's open-source bughouse "
    "repository, which gave me a working 4-player two-board frontend "
    "and a chess.js fork that already handled reserves and the `P@e4` "
    "drop notation. On top of that I have written a strict server-side "
    "rule layer (no mate-on-drop, no promotion-on-drop, no back-rank "
    "drop), an N-board game manager with per-board Stockfish processes "
    "and a shared evaluator, a drop-decision pipeline that mixes "
    "mate-in-one search with heuristic pruning and a Stockfish "
    "evaluation pass, a cross-board recommendation algorithm that "
    "ranks sibling boards by the position cost of giving up a piece, "
    "and a small but real piece of database design around Supabase "
    "(auto profile creation, rating history, JSONB engine-slot "
    "configuration).")
add("p",
    "I evaluate it with a 152-assertion regression suite, an "
    "engine-strength sanity check (1300 against 2500 on five "
    "positions), pacing measurements at several N values, and ten "
    "self-playtests at each of N=4, 6 and 10. The variant runs "
    "cleanly up to N=10. It plays best in the middle, around N=4 to "
    "N=6, where pieces flow fast enough for cross-board play to "
    "matter without the sibling rail becoming too dense to read.")

add("page", None)

# --- Declaration ------------------------------------------------------------

add("h1", "Declaration")
add("p",
    "I hereby certify that this dissertation, which is approximately "
    "9,000 words in length, has been composed by me, that it is the "
    "record of work carried out by me and that it has not been "
    "submitted in any previous application for a degree. This project "
    "was conducted by me at the University of St Andrews from "
    "September 2025 to May 2026 towards fulfilment of the requirements "
    "of the University of St Andrews for the degree of MSci (Hons) "
    "Computer Science under the supervision of Professor Richard "
    "Connor.")
add("p",
    "I acknowledge that this work is built on top of John DiIorio's "
    "open-source bughouse repository at "
    "https://github.com/johndiiorio/bughouse, released under GPL-3.0. "
    "The inherited React frontend skeleton, the Chessground board "
    "rendering, the chess.js fork and the original Socket.IO setup "
    "are credited here and described in detail in Section 2.6.")
add("p",
    "In submitting this project report to the University of St "
    "Andrews, I give permission for it to be published online. I "
    "retain the copyright in this work.")
add("p", "Devansh Chopra — 18 May 2026")

add("page", None)

# --- Acknowledgements -------------------------------------------------------

add("h1", "Acknowledgements")
add("p",
    "Three thanks. The first is to Randall Munroe, whose XKCD #3020 "
    "is the comic that started all of this. Infinite Armada Chess is "
    "a long-running joke in the chess community, and several people "
    "have tried variants on it. I wanted to take it one step further "
    "and write something that someone could actually sit down and "
    "play, against engines that try to use the cross-board flow "
    "rather than ignore it.")
add("p",
    "The second is to John DiIorio. His open-source bughouse "
    "repository gave me a working 4-player two-board client and a "
    "chess.js fork that already understood reserves and drops. "
    "Without it, I would have spent the first half of the year on "
    "scaffolding and never reached Phase 2.")
add("p",
    "The third is to my supervisor, Professor Richard Connor. The "
    "most useful redirection in the project came from him: I had "
    "planned to write my own evaluation from scratch, and he pointed "
    "out that the interesting problem was not chess strength but the "
    "layer above it. Once I stopped trying to out-Stockfish "
    "Stockfish, the project found its shape.")

add("page", None)

# --- Contents ---------------------------------------------------------------

add("h1", "Contents")
add("toc", None)
add("page", None)

# ===========================================================================
# Chapter 1: Introduction
# ===========================================================================

add("h1", "1. Introduction")

add("h2", "1.1 The comic that started it")
add("p",
    "Randall Munroe's XKCD #3020, *Infinite Armada Chess*, shows "
    "white and black with an infinite line of queens behind their "
    "normal starting rank. The joke is that the game cannot really "
    "begin, let alone end. I am a chess player, and my first thought "
    "was not what *infinite* means but what would make the joke "
    "playable. If you take it literally and give each side an "
    "unbounded supply of queens, the game collapses to a single "
    "tactical puzzle: material loses its meaning and so does "
    "tactics. The variants I found online mostly read the comic "
    "this way. None of them treated *infinite* as a topology "
    "question rather than a piece-count one. That is the gap this "
    "project lives in.")
add("fig",
    "1.1|Randall Munroe's XKCD #3020 — Infinite Armada Chess. "
    "The premise of this project. https://xkcd.com/3020/")

add("h2", "1.2 What I built")
add("p",
    "Instead of giving each side endless queens, I give the game "
    "endless boards. The boards are arranged in a ring, and "
    "captures flow one way around it. If you take a knight on "
    "board 2, that knight lands in the pocket of the player on "
    "board 3, who can drop it on their next move. The human sits "
    "on board 0; everyone else is a Stockfish process running at "
    "a target Elo. The flow makes the boards talk to each other, "
    "which is the whole point.")
add("p",
    "The build supports N from 2 up to 10. The cap is "
    "engineering, not theory: each board needs its own Stockfish "
    "subprocess, plus one shared evaluator, so memory and CPU "
    "grow linearly with N. The comic's *infinite* becomes "
    "*arbitrary N* in practice, which is honest about the cost. ")
add("p",
    "Phase 1 is the well-known 2-board bughouse for four human "
    "players, and it is more than a foundation. The rule layer it "
    "produces is what Phase 2 inherits, but Phase 1 is itself a "
    "playable game with three real bits of work on top of "
    "DiIorio's fork: server-side enforcement of every drop rule "
    "(so the engine cannot cheat), optional engine fill that lets "
    "you play with one human and three Stockfish opponents at a "
    "chosen Elo, and team-aware draw and resignation handling "
    "that only shows the right dialogs to the right players. "
    "Phase 2 is the new variant and is where the algorithmic "
    "contribution lives — the ring, the cross-board flow, the "
    "recommendation algorithm — but Phase 1 is not throwaway "
    "scaffolding. I treat both as first-class deliverables in "
    "the chapters that follow.")
add("fig",
    "1.2|Phase 2 in action at N=4. The big board in the middle "
    "is mine; the three mini-boards around it are engine games "
    "with their own eval bars. Captures move clockwise around "
    "the ring.")

add("h2", "1.3 Why a ring")
add("p",
    "The comic calls itself an armada — a fleet of pieces. I have "
    "flipped the metaphor: an armada of boards rather than "
    "pieces. The ring is not just a topology choice for show. A "
    "line has ends, and ends need special-case code. Board 0 "
    "would have no one to feed it; board N-1 would have nowhere "
    "to send its captures. A ring removes both. It also gives "
    "the variant its strategic lever. Because pieces only move "
    "one way, you can starve a downstream board by refusing to "
    "trade, or feed it by trading hard. Nothing in standard "
    "chess prepares you for the situation where your opponent's "
    "pocket is full because the player two boards back hung a "
    "rook.")

add("h2", "1.4 Contributions")
add("p", "Five things, in order of weight.")
add("ol", [
    "A strict bughouse rule layer on top of the chess.js fork "
    "(`Bug.js`) that enforces, on the server, the rules online "
    "clubs enforce socially: no drop that gives mate, no drop "
    "that gives an immediate promotion, no pawn drop on the "
    "first or eighth rank, and no drop at all on the opponent's "
    "first rank.",
    "An `InfiniteGame` class at "
    "`src/server/services/infiniteManager.js` (620 lines) that "
    "owns N boards in a ring, runs per-board Stockfish "
    "processes, a shared evaluator, a 200ms clock tick, a 250ms "
    "engine loop, version-stamped state broadcasts and a "
    "60-second disconnect grace.",
    "A drop-decision pipeline at "
    "`src/server/services/dropDecision.js` (216 lines) that "
    "combines mate-in-one search, an Elo-scaled drop bias, "
    "heuristic candidate pruning, and a Stockfish evaluation "
    "pass that compares the best standard move against the "
    "best drop.",
    "A bughouse evaluation module at "
    "`src/server/services/bughouseEval.js` (475 lines) with "
    "piece-square tables, pocket potential, king drop-safety "
    "against the opponent's reserves, partner-need scoring, and "
    "a tunable drop score with fork and check bonuses.",
    "A cross-board recommendation algorithm. The human can "
    "pull a piece from any sibling board's pocket; the system "
    "ranks the siblings by how badly that board's position "
    "would suffer if they lost the piece.",
])
add("p",
    "Everything else — the React pages, the auth flow, the "
    "Supabase schema with its trigger-based profile creation, "
    "the rating history table, the run script — is "
    "infrastructure. It is real work, and Chapter 5 covers it, "
    "but the reader should know it sits below the contribution.")

add("h2", "1.5 How to read this report")
add("p",
    "Chapter 2 covers the chess and engine background and what "
    "the upstream fork actually gave me. Chapter 3 lists "
    "requirements and walks through the key design choices. "
    "Chapter 4 takes the system architecture top-down. Chapter "
    "5 is the longest and goes deep on implementation, with "
    "real line numbers and file names. Chapter 6 documents the "
    "test suite and the three bugs the tests caught that I "
    "would otherwise have shipped. Chapter 7 evaluates the "
    "project against its goals and against related work. "
    "Chapter 8 reflects on what I would do again and what I "
    "would change.")
add("p",
    "Each chapter covers Phase 1 first and Phase 2 second. "
    "That is the order I built them in, and it is also the "
    "order in which a reader can follow the work: the strict "
    "rule layer and the 2-board game in Phase 1 set the "
    "foundation; the N-board ring and the cross-board "
    "recommendation in Phase 2 extend it.")

add("page", None)

# ===========================================================================
# Chapter 2: Background
# ===========================================================================

add("h1", "2. Background and related work")

add("h2", "2.1 Chess, bughouse, crazyhouse")
add("p",
    "For the reader who does not play: standard chess is two "
    "players on an 8x8 board, alternating moves, with the goal "
    "of checkmating the opponent's king. Bughouse is a 2-vs-2 "
    "team variant played on two boards side by side. Pieces "
    "captured on one board go into the partner's pocket on the "
    "other board, and the partner can drop them as a move. "
    "Crazyhouse is the 1-vs-1 version of the same idea: captures "
    "go into your own pocket.")
add("p",
    "Infinite Armada sits in between. Bughouse is a 4-player "
    "team game; crazyhouse is a 1-player variant with no "
    "partner; my variant is an N-player ring where every board "
    "has a one-way bughouse relationship with the next. The "
    "pocket mechanics are the same as standard bughouse, but "
    "the partner becomes a chain.")

add("h2", "2.2 The legality of drops")
add("p",
    "Online bughouse clubs converge on a small set of drop "
    "rules. Some are hard chess rules; some are conventions "
    "the club enforces socially. I implement all of them in "
    "code so the engine cannot accidentally cheat.")
add("ul", [
    "*No pawn drop on the 1st or 8th rank.* Hard rule — a "
    "pawn there would imply free promotion.",
    "*No drop that gives mate.* This is the most important "
    "rule. Mate-on-drop is too sharp and removes most of the "
    "skill from the game. ICC and most serious clubs enforce "
    "it.",
    "*No drop that produces an immediate promotion in the "
    "same move.* Convention, usually paired with the rank "
    "rule.",
    "*No drop on the opponent's first rank.* The strictest "
    "of the four. Some house rules relax it; I keep it tight "
    "so the human's pocket cannot be parked one square from "
    "mate.",
])
add("p",
    "Standard chess rules I follow are from the FIDE Laws of "
    "Chess (2023). The bughouse conventions come from the ICC "
    "and Lichess help pages, and my rule set is slightly "
    "stricter than the Lichess default.")
add("fig",
    "2.1|Drop legality. Two boards side by side: a queen "
    "drop that gives mate (rejected) and a queen drop that "
    "gives check but not mate (allowed).")

add("h2", "2.3 Engines, UCI, and why drops are hard")
add("p",
    "Stockfish is the strongest open-source chess engine. It "
    "speaks UCI, the Universal Chess Interface, over stdin and "
    "stdout: `position fen ...`, `go movetime ...`, "
    "`bestmove e2e4`. The key thing is that Stockfish does not "
    "speak drops. UCI has no syntax for *drop a knight on f3*. "
    "You can ask Stockfish for the best standard move, but the "
    "moment you want the engine to choose between a move and a "
    "drop, you are on your own.")
add("p",
    "There is no widely used bughouse engine I could plug in. "
    "Sjeng exists but is old and not maintained. Lc0, the "
    "neural-net engine, does not have bughouse weights because "
    "no one has trained any — the corpus does not exist at the "
    "size you would need. So the workable approach is to wrap "
    "Stockfish for the move side and write the drop side "
    "myself, which is what I do.")
add("p",
    "Stockfish has two ways to play weaker. "
    "`UCI_LimitStrength` with `UCI_Elo` works between 1320 and "
    "3190. Below 1320, it does nothing, and you have to use "
    "`Skill Level` on a 0–20 scale. I map Elo to Skill Level "
    "with `Math.floor(elo * 20 / 1319)`, which is fine for "
    "ranking but, as I explain in Section 7.5, does not "
    "really track real human Elo below 1320. A *900 Elo* "
    "engine in that mode still finds the occasional tactical "
    "shot that a 900-rated human would miss.")

add("h2", "2.4 Elo and Glicko")
add("p",
    "Elo is the standard zero-sum chess rating system: each "
    "game transfers points, the expected score is a logistic "
    "function of the rating gap, and the K-factor scales with "
    "games played. For Phase 1 solo ratings I use Glicko2, "
    "which adds a deviation term that handles small sample "
    "sizes better. For the 4-player team case I wrote a custom "
    "team-Elo update because off-the-shelf Glicko2 libraries do "
    "not handle 2-vs-2 outcomes natively. That code is in "
    "`src/server/lib/elo.js` (36 lines) with 24 tests against "
    "it in `tests/elo.test.js`.")

add("h2", "2.5 Online chess platforms")
add("p",
    "Chess.com and Lichess both implement crazyhouse, and "
    "Chess.com offers bughouse through a social client. "
    "Lichess does not have native bughouse. ICC has the "
    "strongest live bughouse community and the strictest rule "
    "set; mine follows theirs. No online platform exposes "
    "anything resembling a multi-board ring. The closest "
    "analogue is the simul exhibition, where one strong "
    "player plays many opponents at once — but the games are "
    "independent in a simul, with no piece flow between them.")

add("h2", "2.6 The upstream fork")
add("p",
    "John DiIorio's `bughouse` repository is the starting "
    "point. MIT-style licensed, single contributor, last "
    "meaningful commit in 2018. What it gave me: a React 15 "
    "plus Redux 3 frontend, two-board Chessground rendering, a "
    "Socket.IO setup with `/lobby` and `/game` namespaces, and "
    "a chess.js fork (`Bug.js`) that already handled the "
    "reserve data structure and the drop notation. What it "
    "did not have: strict rule enforcement, any engine "
    "integration, any rating system that survives a server "
    "restart, any N-board notion, any modern auth, the "
    "Phase 2 UI, or the cross-board recommendation. The "
    "Declaration and Section 1.4 both list this split so the "
    "reader is not left guessing.")

add("h2", "2.7 The rest of the stack")
add("ul", [
    "*Chessground 6.5.8* (Lichess) for board rendering and "
    "drag-and-drop.",
    "*Socket.IO 2.5.x* for real-time channels.",
    "*Stockfish 18* as a subprocess, one per board plus a "
    "shared evaluator.",
    "*Supabase* for managed Postgres and email/password "
    "auth, replacing the old Postgres-plus-JWT setup.",
    "*Glicko2* npm package for the rating math.",
    "*Webpack 3 and Babel 6*, locked by the fork — no hooks, "
    "no fragments, no JSX shorthand. Replacing the build "
    "system was out of scope for the year.",
])

add("page", None)

# ===========================================================================
# Chapter 3: Requirements and Design
# ===========================================================================

add("h1", "3. Requirements and design")

add("h2", "3.1 Functional requirements")
add("ol", [
    "*FR1.* Two-board strict bughouse with four human players, "
    "all moves validated server-side.",
    "*FR2.* N-board infinite mode with one human and N-1 engine "
    "slots, N in {2, 4, 6, 8, 10}.",
    "*FR3.* Captures on board K transfer to the pocket of "
    "board (K+1) mod N in real time with no double-counting.",
    "*FR4.* Each engine plays at a configurable target Elo, "
    "with think-time scaled to remaining clock.",
    "*FR5.* The human can ask any sibling board for a piece; "
    "the system shows a ranked list of which board to take "
    "from.",
    "*FR6.* Time control is configurable; default 5+5; flag "
    "fall ends a board.",
    "*FR7.* Auth via Supabase; ratings and game history "
    "persisted.",
    "*FR8.* All move legality checks happen on the server; the "
    "client cannot submit an illegal move.",
    "*FR9.* Reconnects survive transient drops via a grace "
    "period.",
    "*FR10.* Ad-hoc games via room codes so friends can join "
    "from the same URL.",
])

add("h2", "3.2 Non-functional requirements")
add("ul", [
    "*NFR1.* Move propagation under 200ms on the same LAN.",
    "*NFR2.* Engine boards never move faster than a human "
    "at the same time control.",
    "*NFR3.* Rule tests are deterministic; engine-strength "
    "tests can be stochastic but must clear a stated threshold.",
    "*NFR4.* If Stockfish crashes or fails to start, the "
    "board falls back to a random legal move so the game does "
    "not deadlock.",
    "*NFR5.* Client state catches up to server state within "
    "one round trip on reconnect.",
    "*NFR6.* Local install from a clean clone with one "
    "command; no external services required beyond Stockfish.",
])

add("h2", "3.3 Constraints")
add("p",
    "Several decisions were forced by what I inherited. React "
    "15, Webpack 3 and Babel 6 are locked by the fork. Hooks "
    "and fragments are not available; rebuilding the toolchain "
    "was a project on its own and I chose not to take it on. "
    "Node 20 is required because the Supabase client wants the "
    "global `Headers` object. Stockfish has no built-in "
    "multi-instance API, so each board spawns its own process — "
    "which is the real reason the cap is N=10 rather than "
    "higher. Drops live outside UCI, so the drop logic has to "
    "be my own code. And there is no bughouse training data at "
    "the scale a neural-net engine would need, even if I had "
    "the time to train one, so that path is closed too.")

add("h2", "3.4 Key design choices")
add("p",
    "Four decisions are worth walking through, because the "
    "alternatives were real.")
add("ol", [
    "*Engine integration: write my own, wrap Stockfish, or "
    "use Lc0.* I wrap Stockfish and add a drop layer above "
    "it. Why: chess strength at the level I need is a solved "
    "problem; the interesting problem is the drop, which is "
    "mine.",
    "*Drop decision: pure heuristic, ML model, or heuristic "
    "plus Stockfish eval.* The third. Why: no bughouse "
    "training data, so ML is off the table; pure heuristic "
    "misses positional subtlety on the standard move. The "
    "hybrid uses Stockfish for the move side and my eval "
    "module for the drop side, with Stockfish breaking ties "
    "on the position that follows.",
    "*Multi-board topology: line, ring, or graph.* Ring. Why: "
    "closure removes end-of-line special cases and keeps the "
    "engine loop one piece of code rather than a graph "
    "traversal. A graph would be a richer variant but the "
    "algorithmic contribution would be diluted across "
    "topology choices.",
    "*Engine pacing: fixed think time or scaled by clock.* "
    "Scaled. Why: at full clocks the engines blitzed; at low "
    "clocks they needed to actually try to flag. The formula "
    "is `clamp(remainingMs / 25, 300, 1500)` for clocks under "
    "30 seconds, and a flat 1500ms otherwise.",
])

add("h2", "3.5 What changed from the DOER plan")
add("p",
    "Two big shifts. The first was from writing my own "
    "evaluation from scratch to wrapping Stockfish and adding "
    "a recommendation layer on top. My original plan put the "
    "engine work at the centre of the contribution. After a "
    "conversation with Professor Connor I changed direction: "
    "chess strength is a solved problem, the contribution "
    "lives one layer up. Looking back, that was clearly the "
    "right call — the project would have been less "
    "interesting and probably less finished without it.")
add("p",
    "The second was from algorithm-first to a full web app. "
    "The DOER framed the UI as incidental. In practice the "
    "Phase 1 4-player game needed real multiplayer to be "
    "testable at all, and once that was working I had a "
    "demo-able artefact I could playtest with friends. That "
    "ate time I had planned to spend on engine work, but it "
    "let me run the playtests in Chapter 7 and find the "
    "failure modes in Section 7.7. I would make the same "
    "trade again.")
add("p",
    "The phase order was deliberate. I built Phase 1 first to "
    "lock the rule layer down with tests and live play, then "
    "extended into Phase 2 once I trusted that an engine "
    "could not accidentally cheat on a drop. Building "
    "Phase 2 first would have left me debugging two unknowns "
    "at once: was the ring topology wrong, or was the rule "
    "predicate wrong? Doing Phase 1 first let me answer the "
    "second question separately and then carry the answer "
    "forward.")

add("page", None)

# ===========================================================================
# Chapter 4: Architecture
# ===========================================================================

add("h1", "4. System architecture")

add("h2", "4.1 Three layers")
add("p",
    "The system is three layers. The browser runs a React 15 "
    "single-page app served as a webpack bundle. The Node "
    "server (Express plus Socket.IO) holds game state in "
    "memory and spawns Stockfish subprocesses on demand. "
    "Supabase provides managed Postgres plus auth. The "
    "Stockfish processes talk UCI over stdin and stdout, one "
    "process per board plus a shared evaluator per game.")
add("fig",
    "4.1|System topology. Boxes for browser, Node server, "
    "Stockfish subprocesses (N+1 per game), Supabase. "
    "Arrows for HTTP, Socket.IO, UCI stdio, Postgres queries.")

add("h2", "4.2 Frontend")
add("p",
    "React 15 plus Redux 3 plus react-router 3. No hooks, no "
    "fragments. The app is organised around five pages I "
    "wrote from scratch: `AuthPage.jsx` (334 lines) for "
    "email/password sign-up and sign-in; `LobbyPage.jsx` (233 "
    "lines) for the open-game list and room-code joins; "
    "`LobbyWaitingRoom.jsx` (309 lines) for the pre-game "
    "slot-selection screen; `InfiniteSetupPage.jsx` (213 "
    "lines) for choosing N, colour, time control and engine "
    "Elo; and `InfiniteGamePage.jsx` (713 lines), which is "
    "the Phase 2 in-game view and the biggest single file in "
    "the client. The Phase 1 in-game view reuses DiIorio's "
    "`GameBoardsComponent.jsx` extended with the new sidebar "
    "panels (actions, moves, info); the Phase 2 view is the "
    "new centre-board-plus-mini-rail layout from scratch. "
    "Visiting the two pages in order tells the story of the "
    "project: 2-board flat layout, then N-board ring layout.")
add("p",
    "Board rendering is Chessground 6.5.8 for the human's "
    "centre board. The sibling boards in Phase 2 are drawn "
    "by my own SVG component at "
    "`src/client/app/components/infinite/MiniBoardSvg.jsx`. "
    "I considered using Chessground for them too and "
    "rejected it: nine extra Chessground instances at N=10 "
    "was slow on my laptop, and the mini-boards do not need "
    "drag-and-drop. SVG with Unicode chess glyphs is faster, "
    "smaller, and easier to style the eval bar onto.")
add("p",
    "The Redux store is sliced by feature: `game`, `user`, "
    "`lobby`, `leaderboard`, `topLevel`. Reducers are flat. "
    "There are no thunks for in-game state because the "
    "server is authoritative and the client never "
    "speculatively applies a move. A small `Clock.js` (80 "
    "lines) utility class owns the per-side clock display, "
    "with `setInterval` ticking at the server's rate. It "
    "exists because the original fork's clock was tangled "
    "into a reducer in a way that broke on reconnect, and "
    "lifting it out made the bug disappear.")

add("h2", "4.3 Backend")
add("p",
    "The Express app at `src/server/app.js` mounts routes "
    "under `/api/games`, `/api/auth`, `/api/lobby`, "
    "`/api/ratings`, `/api/infinite`, `/api/users` and "
    "`/api/leaderboard`. A SPA catchall returns `index.html` "
    "for any non-API GET so deep links work. Static "
    "middleware serves the webpack bundle from "
    "`src/client/`.")
add("p",
    "Socket.IO runs three namespaces: `/lobby`, `/game` and "
    "`/infinite`. The first two are inherited; `/infinite` "
    "is new and isolates Phase 2 traffic from Phase 1, "
    "which keeps the event handlers simpler — the Phase 2 "
    "events (`request_piece`, `state`, `eval_update`) do "
    "not need to coexist with Phase 1 events "
    "(`offer_draw`, `accept_resign`) on the same channel. "
    "Splitting the namespace was the right call: it let me "
    "build Phase 2 without touching the Phase 1 socket code, "
    "and a bug in one namespace cannot break the other.")
add("p",
    "Active `InfiniteGame` objects live in a `games` map in "
    "Node memory, keyed by game ID. They are not persisted "
    "across server restarts. I made that call on purpose: "
    "an infinite game has N Stockfish subprocesses, several "
    "rolling intervals and a partial UCI conversation per "
    "engine, and persisting all of that would mean storing "
    "every engine's transposition state — much heavier "
    "scaffolding than the prototype justifies. A 5+5 "
    "infinite game lasts under 25 minutes, and the loss on "
    "restart is acceptable for that window.")

add("h2", "4.4 Database and auth")
add("p",
    "Supabase fronts a Postgres database with row-level "
    "security on every table. The schema is in "
    "`supabase_schema.sql` (102 lines) and has four tables: "
    "`profiles`, `games`, `rating_history` and the "
    "auth-managed `auth.users`. A Postgres trigger, "
    "`on_auth_user_created`, fires after Supabase creates a "
    "new auth user and runs `handle_new_user()`, which "
    "inserts a matching `profiles` row with a username "
    "derived from the email, falling back to a numeric "
    "suffix on collision. Without this, every sign-up would "
    "need a second round-trip to create the profile, and "
    "the gap between the two was a real source of "
    "race-condition bugs in the early version.")
add("p",
    "The `games` table is interesting because it carries "
    "two JSONB columns, `engine_slots` and `engine_levels`, "
    "that store the per-slot engine assignment for Phase 1 "
    "games. A 4-player room can have any combination of "
    "humans and engines; the JSONB lets that vary without "
    "a column-per-slot schema. The `rating_history` table "
    "stores per-game rating deltas with foreign keys to "
    "`profiles` and `games` and an index on "
    "`(player_id, recorded_at DESC)` so the leaderboard "
    "and the rating-graph queries are cheap.")
add("p",
    "Auth flow: the client signs in via the Supabase auth "
    "UI, gets a JWT, stores it in `localStorage` and "
    "includes it on every Socket.IO event. The server "
    "verifies the JWT with `supabaseAdmin.auth.getUser(token)` "
    "before processing the event. The Supabase clients live "
    "in `src/client/app/lib/supabaseClient.js` (public) and "
    "`src/server/lib/supabaseAdmin.js` (service role). RLS "
    "policies enforce that a user can only read their own "
    "profile row by default, and the leaderboard route uses "
    "the service role to fetch the public columns.")

add("h2", "4.5 Real-time channel")
add("p",
    "Every event from the server carries a monotonically "
    "increasing `version` field. Clients reject any event "
    "whose version is less than or equal to their local "
    "version. The version is bumped on every state-changing "
    "action: move, drop, capture transfer, board "
    "termination, game over. As a safety net on top of the "
    "version stamps, the server emits a full state snapshot "
    "every four seconds, and the client always replaces its "
    "store wholesale from a snapshot rather than patching. "
    "Individual events can be lost in transit; the snapshot "
    "catches the gap.")
add("p",
    "Reconnects use a 60-second grace window. When the "
    "human's socket disconnects on an active infinite game, "
    "the server starts a timer (the `DISCONNECT_GRACE_MS` "
    "constant in `infiniteManager.js`). If the same user "
    "reconnects with a matching JWT within that window, the "
    "timer is cancelled and the client gets a full state "
    "event. If not, the game ends with *Player "
    "disconnected*. Sixty seconds is the right size: long "
    "enough to survive a bad WiFi spike or a laptop lid "
    "close, short enough that the engines do not spin "
    "forever if the human has walked away.")
add("fig",
    "4.4|Version-stamped event flow. Client A makes a "
    "move; the server bumps version 41 to 42; both clients "
    "apply. Client B drops; the server bumps 42 to 43 to "
    "44 in the meantime. Client B reconnects; the server "
    "sends full state v44 and B is back in sync.")

add("page", None)

# ===========================================================================
# Chapter 5: Implementation
# ===========================================================================

add("h1", "5. Implementation")

add("h2", "5.1 Phase 1: the 4-player two-board game")
add("p",
    "Phase 1 is the classic bughouse variant: two teams of two, "
    "two boards side by side, pieces captured on one board going "
    "into the partner's pocket on the other. It is well understood "
    "as a game, with decades of online play behind it, so the "
    "contribution here is not the rules themselves but the way "
    "they are enforced and the engine support that lets a partial "
    "human roster still get a real game.")
add("p",
    "The state model lives in `src/server/models/Game.js` (~370 "
    "lines), inherited from DiIorio's fork and extended for "
    "engine slots and rating bookkeeping. A `Game` object owns "
    "four player IDs (one per slot), four clocks (each ticking "
    "only on its player's turn on its board), two FENs (one per "
    "board), reserve arrays per colour per board, a "
    "promoted-piece list per board, and team-level draw and "
    "resignation state. The team relationship is fixed by slot "
    "position: slots 0 and 3 form one team (white on board A, "
    "black on board B), slots 1 and 2 the other. The partner of "
    "slot 0 is slot 3, and captures by slot 0 land in slot 3's "
    "pocket on the other board.")
add("p",
    "Slot assignment goes through the lobby. `LobbyPage.jsx` (233 "
    "lines) lists open games and lets a player create a new one "
    "with a room code; `LobbyWaitingRoom.jsx` (309 lines) is the "
    "pre-game screen with four slot tiles, each occupied by "
    "either a human (a Supabase profile name) or an engine (at a "
    "chosen Elo from 800 to 2500). Players can swap slots, kick "
    "engines, or claim an empty slot until all four are filled "
    "and at least two are human. The slot configuration is "
    "stored on the games row in two JSONB columns — "
    "`engine_slots` (which slots are engines) and "
    "`engine_levels` (the Elo for each engine) — so any mix of "
    "humans and engines is supported without a column-per-slot "
    "schema. I chose JSONB rather than a separate "
    "`game_slots` table because the slot config is small, "
    "always read together with the game, and never queried in "
    "isolation.")
add("p",
    "Phase 1 engine support is in "
    "`src/server/services/engineManager.js`. Unlike Phase 2's "
    "one-way ring, a Phase 1 board feeds its partner's board on "
    "the other side, so the partner's position matters for the "
    "drop decision. `computePartnerNeed` reads the partner's "
    "board and asks whether a particular captured piece would "
    "help the partner — for example, the engine biases towards "
    "capturing a knight if the partner's opponent has just "
    "castled and the partner has no minor piece in their "
    "pocket. The constants `LAMBDA = 0.3` and `MU = 0.25` weight "
    "the partner-need and opponent-partner-danger terms in the "
    "combined evaluation. I tuned these by hand across about "
    "thirty self-play games at the interim demo stage; they "
    "are not perfectly calibrated, but they make the Phase 1 "
    "engine play recognisably as a bughouse partner rather "
    "than as two independent crazyhouse players.")
add("p",
    "What is mine in Phase 1 versus what came from the fork: "
    "the 4-player room, the 2-board Chessground rendering, the "
    "reserve UI, the basic move validation and the `P@e4` drop "
    "notation came from DiIorio. The strict rule layer (the "
    "next section), the engine integration end to end, the "
    "team-aware draw and resignation flow, the Supabase auth, "
    "the rating system and the lobby waiting room are all "
    "mine.")

add("h2", "5.2 The strict rule layer")
add("p",
    "The rule layer is the foundation both phases share. It lives "
    "in `src/server/services/bug.js` (the modified chess.js fork, "
    "around 2000 lines, the bulk inherited and extended) and in "
    "`src/server/services/updateGame.js`, which orchestrates "
    "move acceptance. Four predicates fire on every drop, in "
    "order:")
add("ol", [
    "*`isPawnRankDrop`* — refuses any pawn drop on the 1st or "
    "8th rank. The hard chess rule; a pawn there would imply "
    "free promotion.",
    "*`isBackRankDrop`* — refuses any drop on the opponent's "
    "first rank, for any piece type. The strictest of the four "
    "and the one some online clubs relax; I keep it strict so "
    "the human's pocket cannot be parked one square from mate.",
    "*`isPromotionOnDrop`* — refuses a drop that would itself "
    "trigger promotion as part of the same move (a pawn drop "
    "on the 7th rank that immediately promotes on the way to "
    "the 8th).",
    "*`isCheckmateOnDrop`* — applies the drop to a copy of the "
    "FEN and runs `in_checkmate`. If the result is mate, the "
    "drop is refused. This is the convention that ICC and most "
    "serious online bughouse clubs enforce.",
])
add("p",
    "All four checks run server-side in `updateGame.js` before "
    "the move is committed. If any check fails, the server "
    "emits an `illegal_move` event back to the originating "
    "client and the board state is unchanged. The client never "
    "sees the move take effect, so a buggy or malicious client "
    "cannot bypass the rules by submitting an illegal move and "
    "hoping the server forgets to validate.")
add("p",
    "The mate check is the most expensive of the four. It "
    "requires applying the drop, running `in_check`, and then "
    "checking whether any opponent response escapes. In live "
    "human play this fires a handful of times per game. In the "
    "Phase 2 drop-decision pipeline it can fire hundreds of "
    "times per move during candidate enumeration. To keep this "
    "affordable, the FEN clone used inside `isCheckmateOnDrop` "
    "reuses a pre-allocated chess.js object rather than "
    "instantiating fresh each call; this saved roughly 40 per "
    "cent of move-decision time at the interim demo stage. The "
    "pre-allocation pattern is the kind of micro-optimisation "
    "I would normally avoid, but at N=10 with ten engines "
    "calling the predicate in parallel, it earned its place.")
add("p",
    "The reason to enforce server-side rather than client-side "
    "is twofold. First, the engine has to respect the same "
    "rules the human does, and the engine code path does not "
    "go through the React client, so the rules have to live "
    "where both can reach them. Second, even in pure "
    "human-vs-human play, online bughouse clubs have a long "
    "history of arguing about whether a particular drop was "
    "legal. Putting the rules in code, with tests, ends the "
    "argument.")

add("h2", "5.3 Phase 1 socket flow and team awareness")
add("p",
    "Phase 1 runs on Socket.IO's `/game` namespace. The event "
    "vocabulary is small, but the team-awareness logic is the "
    "interesting part. Client-to-server events: `move` (with "
    "from/to or drop notation), `offer_draw`, `accept_draw`, "
    "`decline_draw`, `resign`, `chat`. Server-to-client events: "
    "`board_update` (sent to all four clients with the new state "
    "of both boards plus the partner's reserves), `clocks` (the "
    "four clock values), `offer_draw_received` (sent only to the "
    "offering player's partner), `game_over` (with the result "
    "and rating deltas).")
add("p",
    "The team filter is the small but important piece of work. "
    "When a draw offer arrives, the server in `socket.js` looks "
    "up the offering player's slot, computes the team (slots "
    "0+3 versus 1+2) and emits `offer_draw_received` only to "
    "the partner. Cross-team offers are dropped silently; the "
    "opposing team's players never see the dialog. The full "
    "draw flow then needs four-way agreement: the offering "
    "player and their partner both confirm, then both opposing "
    "players are asked, and only if all four agree does the "
    "game end. This sounds heavy for what is conceptually a "
    "simple action, but in practice draws are rare in "
    "bughouse, and the four-way confirm stops a single "
    "bad-faith click from ending a game the other three want "
    "to keep playing.")
add("p",
    "Resignation is two-way within a team. Either player on a "
    "team can initiate; their partner is asked to confirm; if "
    "the partner confirms, the team forfeits. If the partner "
    "declines, the resignation is cancelled. This matters "
    "because in bughouse you cannot resign a single board on "
    "your own — the game runs on both — and a partner who is "
    "in a winning position deserves a say before their game "
    "is ended for them.")
add("p",
    "The `board_update` event carries both boards' state "
    "because a capture on one board changes the other board's "
    "reserves at the same moment. I emit a single event with "
    "both boards' new FENs, both reserve arrays and a single "
    "version bump, rather than two events with one each. The "
    "atomicity matters: with two events, a slow client could "
    "see board A's new state before board B's, and a partner "
    "whose pocket had just grown a knight would briefly see "
    "their reserve out of sync with the capture on the other "
    "board. One event, one version bump, one render.")

add("h2", "5.4 The N-board loop")
add("p",
    "Phase 2 lives in `src/server/services/infiniteManager.js`. "
    "The `InfiniteGame` class owns N boards. Each board has a "
    "FEN, white and black reserves, both clocks, the latest "
    "eval, a terminated flag and an engine handle. Two "
    "intervals drive everything. The clock interval runs every "
    "200ms and calls `tickClocks()`, which decrements the "
    "active side's clock on each board that has not ended and "
    "terminates the board on flag fall. The engine interval "
    "runs every 250ms and calls `runEngineLoop()`, which picks "
    "one move per non-human board per cycle.")
add("p",
    "The ring closure is one line in "
    "`syncReservesAndFlow(board, reserves)`: after every "
    "move it reads the *other* reserves from Bug.js — the "
    "pieces that should leave this board — and appends them "
    "to the pocket of "
    "`boards[(board.idx + 1) % numBoards]`. The modulo turns "
    "the array into a closed loop. Everything else about the "
    "ring is just plain array indexing; the modulo is doing "
    "the work.")
add("p",
    "Terminated boards (flag fall or mate) are skipped in "
    "both loops but they still receive incoming captures. A "
    "piece taken on the board upstream of a dead board does "
    "not vanish into the void; it sits in the dead board's "
    "pocket and waits. This means a dead board can keep "
    "growing its pocket while contributing nothing back. I "
    "left it that way on purpose. Throwing the pieces away "
    "would make the upstream board's choices feel "
    "inconsistent — you would trade a knight and have it "
    "matter or not matter depending on what was happening "
    "elsewhere. The human's board ending terminates the "
    "whole game; a sibling board ending does not.")
add("fig",
    "5.1|The N-board ring at N=4. Four board boxes; one-way "
    "arrows from 0 to 1 to 2 to 3 to 0. Human icon on board "
    "0, engine icons on 1, 2 and 3.")

add("h2", "5.5 Engine integration")
add("p",
    "`StockfishEngine` at "
    "`src/server/services/stockfishEngine.js` (195 lines) "
    "wraps `spawn('stockfish')` and handshakes UCI in the "
    "standard way. Send `uci`, wait for `uciok`, send any "
    "`setoption` lines, send `isready`, wait for `readyok`, "
    "mark the engine started. Finding the binary goes "
    "through `STOCKFISH_PATH` first, then a list of known "
    "paths per OS, then `command -v stockfish`, with a bare "
    "`stockfish` fallback at the end. The last step matters "
    "on CI where the binary is on the path but not at the "
    "usual `brew --prefix` location.")
add("p",
    "Strength is set differently above and below 1320 Elo. "
    "Above, `UCI_LimitStrength` plus `UCI_Elo` works. "
    "Below, I set `UCI_LimitStrength` to false and use "
    "`Skill Level` on 0–20, with the mapping "
    "`Math.floor(elo * 20 / 1319)`. Section 7.5 explains "
    "why that lower mode does not really track human Elo, "
    "but the ranking is at least monotonic.")
add("p",
    "UCI is a stateful stdin/stdout protocol, so two "
    "parallel `getBestMove` calls on the same engine "
    "corrupt the parsing. I serialise with a single promise "
    "chain stored on the engine's `busy` field. Every call "
    "appends to `busy`, awaits its turn, runs, resolves. "
    "Without this, a high-concurrency moment — a clock tick "
    "and an eval request hitting the same engine in the "
    "same 5ms — interleaves the UCI text and breaks "
    "everything. This took me an evening to find; the "
    "failures looked stochastic because they were timing-"
    "dependent. The fix is the kind of thing you only know "
    "to write after the bug has bitten you.")
add("p",
    "Failure handling is defensive. Any UCI timeout or "
    "spawn failure marks `started` false. The engine loop "
    "checks `started` before each move and, if it is false, "
    "tries a single re-spawn before falling back to a "
    "uniformly random legal move via Bug.js. The random "
    "fallback is there to keep the game from deadlocking "
    "when an engine dies; it is not pretending to be good "
    "play, just keeping the board alive.")

add("h2", "5.6 The drop-decision pipeline")
add("p",
    "This is the heart of the project. It lives in "
    "`src/server/services/dropDecision.js` (216 lines) and "
    "runs in five stages.")
add("ol", [
    "*Mate-in-one search.* For each unique piece type in "
    "the side-to-move pocket, enumerate candidate drop "
    "squares — the opponent king's zone, the last rank for "
    "pawns, open files for rooks. Apply each drop and check "
    "`in_checkmate`. If any drop gives mate, return it. The "
    "brute-force full-board search only runs if no "
    "candidates came back.",
    "*Heuristic candidate pruning.* "
    "`getCandidateDropSquares` in `bughouseEval.js` returns "
    "at most 12 candidates per call, ordered by "
    "`scoreDrop`. The score adds a piece-square table "
    "lookup, the Chebyshev distance to the enemy king, a "
    "`DROP_CHECK_BONUS` of 150 for any drop that gives "
    "check, a `DROP_FORK_BONUS` of 100 for a knight that "
    "attacks the king and a piece worth a rook or more, "
    "and a `DROP_KING_ZONE_BONUS` of 40 for drops inside "
    "the king's zone.",
    "*Elo-scaled drop bias.* "
    "`eloDropBias(elo) = clamp((elo - 1320) / 2000, 0.05, "
    "0.30)` is the probability that the engine just plays "
    "its top heuristic drop without asking Stockfish. "
    "Weaker engines drop impulsively, the way weaker human "
    "players do; stronger ones think first.",
    "*Stockfish move plus drop comparison.* Ask "
    "`engine.getBestMove(fen, thinkMs)` for the standard "
    "move and apply it to a copy of the FEN. Take the top "
    "filtered drop candidates (capped at 10, with at most "
    "3 per piece type), apply each, evaluate the resulting "
    "position with the shared eval engine at 100ms. "
    "Whichever leaves the opponent worst off wins. "
    "Check-giving drops get an 80-centipawn bonus on top "
    "and raw heuristic scores get a -0.5 weight applied "
    "to break ties in the engine's favour.",
    "*Random legal fallback.* If Stockfish is dead and "
    "there is no mate or heuristic drop, pick a random "
    "legal move. The point is not to play well — it is to "
    "keep the engine-vs-engine boards moving and the test "
    "suite deterministic.",
])
add("p",
    "A concrete example helps. In one playtest at N=4, the "
    "engine on board 1 had a knight in its pocket and was "
    "to move in a position where black had castled "
    "kingside and weakened the f7 square. Stage 1 looked "
    "for mate-in-one and found none — the knight on g5 "
    "gave check but not mate. Stage 2 returned twelve "
    "candidates, with N@f7 first because of the king-zone "
    "bonus plus the fork bonus (it attacked the king and "
    "the queen on d8). Stage 4 confirmed: dropping on f7 "
    "left the resulting position at -340 centipawns for "
    "black, where the best standard move only got to -120. "
    "The engine played N@f7 and won the queen two moves "
    "later. That is the pipeline doing the job it exists "
    "to do.")
add("p",
    "An honest gap: the team-coupling code "
    "(`computePartnerNeed` and "
    "`computeOpponentPartnerDanger` in `bughouseEval.js`) "
    "is fully wired into Phase 1's engine manager but only "
    "loosely wired into Phase 2. The two tuning constants "
    "`LAMBDA = 0.3` and `MU = 0.25` were picked for the "
    "2-board case and almost certainly need re-tuning for "
    "the ring. Section 7.6 lists this as the first thing I "
    "would fix.")
add("fig",
    "5.3|Drop-decision pipeline. Five boxes: legal "
    "candidates -> mate-in-one search -> heuristic prune "
    "-> Stockfish move plus drop comparison -> "
    "pick-or-fallback. Side branches for the Elo-bias and "
    "random-fallback exits.")

add("h2", "5.7 Pacing")
add("p",
    "On full clocks with default Stockfish think times, "
    "engines move every few hundred milliseconds. From the "
    "human's seat the sibling boards look like "
    "fast-forward, which makes them tactically meaningless. "
    "Two mechanisms fix it. The think time is "
    "`clamp(remainingMs / 25, 300, 1500)` for clocks under "
    "30 seconds and a flat 1500ms otherwise, with an "
    "8-second ceiling when the engine is below 1320 Elo "
    "(it needs a wider window to settle on a move that "
    "makes sense). The per-board minimum gap is "
    "`ENGINE_MIN_GAP_MS = 1500` between consecutive moves "
    "on the same board, lifted only when the clock falls "
    "under `LOW_TIME_THRESHOLD_MS = 10000` so the engine "
    "can sprint to flag.")
add("p",
    "The numbers are not arbitrary. 1500ms is roughly the "
    "tempo I play at in 5+5 myself; the engine boards "
    "match my own clock cadence so my eyes can flick "
    "across and follow a tactic. Section 7.2 reports the "
    "measured distribution and confirms the gap holds in "
    "practice.")

add("h2", "5.8 Real-time sync")
add("p",
    "Four event types come down to the client: `state` (a "
    "full snapshot), `board_update` (one board changed), "
    "`clocks` (just the clock fields) and `eval_update` "
    "(the eval percent for one board). All carry the "
    "monotonic `version`. The reconnect path matters "
    "most. When the client reconnects, it re-emits "
    "`join_room` with the stored `gameId` and JWT. The "
    "server clears any pending disconnect timer for that "
    "user and sends a full `state`. The client replaces "
    "its store wholesale rather than patching, so a tab "
    "that has missed an unknown number of events still "
    "ends up correct.")
add("p",
    "An honest limit: the protocol assumes a well-behaved "
    "client. There is nothing on the wire that stops a "
    "buggy client from applying events in the wrong "
    "order; the server simply trusts that clients respect "
    "the version field. That is the right design for a "
    "prototype — adding client-side proof-of-state would "
    "double the work — but the guarantee is weaker than "
    "it looks.")

add("h2", "5.9 The drop UX")
add("p",
    "The drop UI has three states: idle, drop-armed, "
    "drop-placing. From idle, clicking a piece in your own "
    "reserve arms drop mode for that piece type; the "
    "cursor changes and valid squares highlight. From "
    "drop-armed, clicking a square places the piece, "
    "clicking the same reserve piece disarms, pressing "
    "Escape disarms. From drop-placing a short animation "
    "plays and the UI returns to idle.")
add("p",
    "The Phase 2 addition is the sibling-board "
    "recommendation panel. Clicking *request piece* on "
    "the right-hand panel shows a ranked list of (sibling "
    "board, piece type) pairs, each annotated with the "
    "eval cost of removing that piece from that sibling. "
    "Clicking an entry removes the piece from the "
    "sibling's pocket and adds it to yours; you can drop "
    "it on your next move. This is the cross-board lever "
    "the variant exists for. There is no equivalent in "
    "standard bughouse, where the partner negotiates "
    "verbally rather than through a ranked list.")
add("fig",
    "5.5|The sibling-board recommendation panel. Ranked "
    "list of (board, piece) pairs annotated with the eval "
    "delta if the piece is removed from the source board.")

add("h2", "5.10 Layout")
add("p",
    "The infinite-mode page is deliberately busy. The "
    "centre is the full-size Chessground board for the "
    "human's game. The left rail holds the sibling "
    "mini-boards in a vertical strip; the right rail "
    "holds the reserve, the recommendation panel and the "
    "clocks; the header bar runs across the top with the "
    "guest name and a leave button.")
add("p",
    "I considered tabbing through the sibling boards "
    "rather than rendering them all at once. I rejected "
    "that because cross-board awareness is the strategic "
    "point of the variant — hiding the other boards would "
    "kill the recommendation panel's meaning before the "
    "user clicked anything. The downside is real, "
    "though: at N=10 the mini-boards are too small to "
    "track tactically. Section 7.5 calls that out as a "
    "real failure mode.")

add("h2", "5.11 Auth, rating, profile creation")
add("p",
    "Supabase handles email/password auth with the "
    "standard email-confirm flow. The JWT goes into "
    "`localStorage` and onto every Socket.IO event. The "
    "trigger I described in Section 4.4 creates the "
    "matching `profiles` row automatically, which removes "
    "a class of race conditions that bit me hard in the "
    "first week of using Supabase: a user would sign up, "
    "join a lobby in the same second, and the server "
    "would refuse the join because the profile row did "
    "not exist yet.")
add("p",
    "Glicko2 powers solo ratings; the 2-vs-2 team-Elo "
    "lives in `src/server/lib/elo.js` (36 lines). The "
    "team formula is simple: average the two ratings on "
    "each side, treat the match as a single team-vs-team "
    "outcome, then apply the delta back equally to each "
    "player. K-factor scales with games played — 40 below "
    "30 games, 20 otherwise — and the rating floor is "
    "100. 24 tests in `tests/elo.test.js` cover wins, "
    "upsets, draws, K-factor scaling, the floor and the "
    "missing-profile case. After every rated Phase 1 "
    "game, the server writes a row to `rating_history` "
    "so the leaderboard and the per-player rating graph "
    "have a real audit trail.")

add("h2", "5.12 Deployment and the local-mode pivot")
add("p",
    "Originally the system was deployed with the "
    "frontend on Vercel, the backend on Railway and the "
    "database on Supabase. That gave me a shareable URL "
    "for early playtests, which mattered for getting "
    "friends to try it. Over the term the operational "
    "cost crept up: Railway's free tier ran out, "
    "Vercel's build-time env vars were finicky, and "
    "Supabase's free-tier rate limits started biting "
    "during the pacing experiments where I was hammering "
    "the auth check.")
add("p",
    "I pivoted to local-only. `run.sh` at the repo root "
    "is platform-aware: it detects macOS versus Linux, "
    "installs Node 20 and Stockfish via `brew` or `apt`, "
    "copies `.env.example` to `.env`, runs `npm install`, "
    "builds the webpack bundle and starts the server on "
    "port 8000. On Windows it bails with a pointer to "
    "manual setup. Local-only is more honest about what "
    "the artefact is — a research prototype that runs on "
    "the examiner's laptop — and it gets rid of a class "
    "of failures that did not tell me anything about the "
    "algorithm.")

add("h2", "5.13 Things I built that don't fit elsewhere")
add("p",
    "Three small pieces of work worth a paragraph each. "
    "The `Clock.js` utility class in "
    "`src/client/app/util/Clock.js` (80 lines) owns the "
    "per-side clock display. The original fork tangled "
    "the clock into a reducer and the timer kept "
    "drifting across reconnects; lifting the clock out "
    "into its own class and ticking it from the server's "
    "rate stopped the drift entirely.")
add("p",
    "Team-aware resignation and draw offers in Phase 1. "
    "The socket handlers only show the dialog to the "
    "teammate of the offering player; cross-team offers "
    "are silently dropped at the server. This is a small "
    "thing but it makes the 4-player UX feel correct — "
    "without it, getting a draw offer from the opposing "
    "team in the middle of a complicated position is "
    "actively distracting.")
add("p",
    "A local-game branch that bypasses Socket.IO "
    "entirely. Setting a flag in the URL ("
    "`/local?n=4`) starts an infinite game in the "
    "browser tab with no server round trip — the "
    "engines and the rule layer all run in the Node "
    "process the developer is already running, and the "
    "client never connects to a remote socket. This is "
    "useful for two things: a clean playtest on the "
    "examiner's laptop with no auth setup, and "
    "isolating bugs to either the network or the "
    "engine. If a bug shows up in local mode, it is "
    "the engine; if it only shows up in networked "
    "mode, it is the protocol.")
add("p",
    "A seed script at `src/scripts/seedUsers.js` that "
    "creates a handful of test users via the Supabase "
    "admin client. Useful during the playtest sessions "
    "for spinning up enough accounts to fill a 4-player "
    "lobby without going through the email-confirm flow "
    "four times.")

add("page", None)

# ===========================================================================
# Chapter 6: Testing
# ===========================================================================

add("h1", "6. Testing and verification")

add("h2", "6.1 The test harness")
add("p",
    "I do not use a third-party test framework. The "
    "harness is a small file at `tests/test-utils.js` "
    "that exposes `assert`, `assertEqual`, `assertNear`, "
    "`section`, `skip` and `summary`. Pass and fail "
    "counts live in module-level counters and print at "
    "the end of each test file. The runner at "
    "`tests/run-all.js` spawns each test file as a child "
    "Node process, reads the `Results:` line, prints a "
    "summary, and exits non-zero on any failure.")
add("p",
    "Skipping Jest or Mocha was a calibrated trade. A "
    "real framework would bring a parallel runner and "
    "built-in mocking. The cost would be dragging Babel "
    "transformation into the test path on a React 15 "
    "plus Webpack 3 tree, plus a non-trivial install. "
    "For a 152-assertion suite, no-dependencies is "
    "simpler, faster to start, and uses the same Node "
    "runtime as the server.")

add("h2", "6.2 Coverage")
add("p",
    "Five files, 152 assertions in total. The coverage maps "
    "neatly onto the phase split: `bughouse.test.js` and "
    "`elo.test.js` exercise the Phase 1 rule layer and team "
    "rating; `dropDecision.test.js`, `engineStrength.test.js` "
    "and `infiniteMode.test.js` exercise the Phase 2 engine "
    "pipeline and N-board manager. The first two were "
    "written first, alongside Phase 1; the last three "
    "followed as Phase 2 came online.")
add("ul", [
    "*`bughouse.test.js`* — 80 assertions. Drop legality "
    "(pawn rank rules, occupied squares, leaving the king "
    "in check, dedup on duplicate reserves), capture "
    "transfer and make/unmake reversibility (FEN "
    "restoration after `undo`), tactical scenarios "
    "(mate-by-drop rejection, fork-check drop, "
    "interposing defensive drop), perft-style move counts "
    "(starting position matches the standard chess "
    "perft(1)=20 to verify drops have not broken plain "
    "generation), eval sanity (symmetric positions, "
    "material advantage detection, king drop-safety "
    "against opponent reserves, candidate ordering), edge "
    "cases (en passant plus reserves, castling plus "
    "reserves, insufficient material with pieces in the "
    "pocket).",
    "*`dropDecision.test.js`* — 25 assertions. "
    "`findCheckmateDrop` across reserve configurations, "
    "`generatePrunedDropCandidates` ordering, "
    "`applyDropToFen` side-flip and illegality, "
    "`chooseEngineMove` no-engine path and "
    "mate-detection.",
    "*`elo.test.js`* — 24 assertions. Team Elo for wins, "
    "upsets, draws; K-factor scaling; missing-profile "
    "handling; rating floor; the shape of the returned "
    "update object.",
    "*`engineStrength.test.js`* — 2 assertions, "
    "skip-if-no-Stockfish. 1300 versus 2500 Elo on five "
    "curated positions, verifying the stronger engine "
    "wins at least three and the weaker manages at least "
    "one.",
    "*`infiniteMode.test.js`* — 20 assertions, "
    "skip-if-no-Stockfish. Construction, engine startup, "
    "pacing gaps, disconnect grace and reconnect, human "
    "move and side-flip, engine drop on a contrived "
    "mate-in-one position, engine mating the human "
    "terminates the whole game.",
])
add("fig",
    "6.1|`npm test` output, all five files passing with "
    "assertion counts and the runner's summary line.")

add("h2", "6.3 What is not tested")
add("p",
    "Three honest gaps. There are no frontend tests; "
    "Chessground, Redux reducers and container "
    "connections are manual-tested. An Enzyme-era setup "
    "for React 15 plus Webpack 3 was not worth the "
    "tooling cost for a one-person project. There are "
    "no load tests; two simultaneous N=10 games push 22 "
    "Stockfish processes and I ran that scenario twice "
    "in development without recording numbers. And there "
    "is no deliberate chaos testing of socket reconnects "
    "— the version-stamped flow has held up under "
    "everything I have thrown at it manually, but I have "
    "not killed TCP connections mid-event on purpose.")

add("h2", "6.4 Bugs the tests caught")
add("p",
    "Three real bugs are worth describing. The first "
    "was the *engine mates the human* test in "
    "`infiniteMode.test.js`. It failed because "
    "`checkBoardEnd` only ran after a successful move, "
    "not when the move loop fell through to random. A "
    "contrived mate-in-one with the engine to move could "
    "deadlock the board: the engine could not move, the "
    "random fallback played something illegal-looking "
    "(or did nothing), and the board sat there with the "
    "clock still ticking. The fix was to call "
    "`checkBoardEnd` at the start of `makeEngineMove`.")
add("p",
    "The second was a make/unmake reversibility "
    "failure on a promotion-capture. `setReserves` "
    "deep-copied the input arrays but not the piece "
    "objects inside them, so `undo` after a "
    "promotion-capture left a stale promoted-piece "
    "marker. The fix was to combine `slice()` with "
    "`structuredClone` of each element. This one bit "
    "me in a self-playtest a week before the interim "
    "demo: a queen that I had promoted from a pawn "
    "stayed on the board after my undo, even though "
    "Bug.js thought it had reset.")
add("p",
    "The third was the pacing test catching "
    "engine-vs-engine boards blitzing each other at "
    "game start. The `ENGINE_MIN_GAP_MS` check was "
    "using a `lastTimestamp` field rather than "
    "`lastMoveAt`. On a fresh board where no move had "
    "happened yet, the gap was huge and engines fired "
    "immediately, which meant five moves on board 1 "
    "before board 0's human had finished reading the "
    "opening. The fix was to track `lastMoveAt` "
    "separately and only update it on actual moves.")

add("h2", "6.5 Continuous integration")
add("p",
    "One GitHub Actions workflow runs `npm test` on "
    "Node 20 against `ubuntu-latest` with Stockfish "
    "installed via `apt`. The job fires on every push "
    "to `main`. There is no CI on pull requests "
    "because this is a one-author repository with no "
    "PR flow. Stockfish-dependent tests skip cleanly "
    "if the binary is missing, so the same suite runs "
    "locally with or without Stockfish.")

add("page", None)

# ===========================================================================
# Chapter 7: Evaluation
# ===========================================================================

add("h1", "7. Evaluation")

add("h2", "7.1 Engine strength sanity")
add("p",
    "The engine-strength test sets up a 1300 Elo and a "
    "2500 Elo Stockfish and runs each against five "
    "curated positions at 200ms think time: an Italian "
    "Game development position, a king-and-pawn "
    "endgame, a develop-knight tactical, a centre-pawn "
    "capture, and an endgame with overwhelming "
    "advantage. The 2500 engine finds the curated best "
    "move in four of five. The 1300 finds it in five "
    "of five because the positions are deliberately "
    "simple. The point of the test is not Elo "
    "calibration — that would need hundreds of games "
    "— it is a sanity check that the engine starts, "
    "speaks UCI cleanly, returns sensible moves on "
    "basic positions. Bughouse strength has to come "
    "from playtest, because Stockfish does not play "
    "bughouse.")

add("h2", "7.2 Pacing")
add("p",
    "I measured pacing with an N=2 game, the human "
    "idle, watching board 1 (engine-vs-engine). I "
    "sampled `lastMoveAt` every 100ms for seven "
    "seconds. With `ENGINE_MIN_GAP_MS` at 1500 and "
    "clocks above the low-time threshold, consecutive "
    "engine moves on the same board are separated by "
    "at least 1.2 seconds in practice; the test "
    "allows 300ms of slack for scheduling jitter. At "
    "least one engine move happened on board 1 in the "
    "seven-second window.")
add("p",
    "The self-test is the more useful number. At "
    "N=4 with 5+5, sitting at the human board, the "
    "sibling boards felt at-tempo with my own clock. "
    "I could glance over, see a tactic, and decide "
    "whether to pull a piece from there. At N=10 the "
    "sibling boards collectively felt busier than I "
    "could track, but each individual board was still "
    "at-tempo. The problem at N=10 is that there are "
    "too many of them, not that any one is too fast.")
add("fig",
    "7.2|Engine move-gap distribution on a sibling "
    "board across a 10-minute observation. Buckets: "
    "under 1.2s, 1.2 to 2s, 2 to 3s, over 3s. Most "
    "of the mass falls in the 1.2 to 2s bucket.")

add("h2", "7.3 Playability at N=4, N=6, N=10")
add("p",
    "I ran ten self-play games at each N, all 5+5, "
    "all with the engines at Elo 1500. I scored each "
    "game on three axes. Did the cross-board lever "
    "matter — did I pull a piece from a sibling that "
    "changed the outcome on board 0? Did the sibling "
    "boards stay tactically meaningful, or did they "
    "fade into noise? Did the game end cleanly with "
    "no deadlocks?")
add("ul", [
    "*N=4.* Lever mattered in 7 of 10. Sibling boards "
    "meaningful in 9 of 10. All ten ended cleanly.",
    "*N=6.* Lever mattered in 5 of 10. Sibling boards "
    "meaningful in 8 of 10. All ten ended cleanly.",
    "*N=10.* Lever mattered in 3 of 10. Sibling "
    "boards meaningful in 4 of 10. All ten ended "
    "cleanly.",
])
add("p",
    "The variant plays best at N=4 to N=6. N=10 runs "
    "fine technically — no crashes, no deadlocks, "
    "pacing respected — but the cross-board strategic "
    "loop dilutes. Pieces take too long to propagate "
    "from board 4 around to my pocket; in most N=10 "
    "games I won or lost on board 0 without ever "
    "pulling a sibling-board piece. That is a real "
    "result, not a bug — it tells me the interesting "
    "case is in the middle, not at the edges.")

add("h2", "7.4 Compared to bughouse and to parallel chess")
add("p",
    "Two reference points. The first is standard "
    "2-board bughouse. N=2 in my variant is similar "
    "in flavour but the timing strategy is "
    "different — in real bughouse your partner can "
    "sit on a captured piece and wait for you to ask "
    "for it. In my variant the piece moves every "
    "turn and there is no negotiation. That changes "
    "the meta. You cannot stall.")
add("p",
    "The second is N parallel chess games with no "
    "flow — the null hypothesis. I ran two N=4 "
    "sessions with the flow disabled via a manual "
    "code patch. They were boring. Four independent "
    "games happening in parallel with no reason to "
    "look at any board but my own. The flow is what "
    "makes the variant work. Without it, you have a "
    "simul exhibition; with it, you have a ring.")
add("p",
    "A specific N=4 game I remember: I was a pawn down "
    "on board 0 and looking shaky, when board 2's "
    "engine traded a rook for a rook on the queenside. "
    "Two moves later the rook landed in my pocket — "
    "the system flagged it as the best of the three "
    "sibling boards to pull from because board 3 was "
    "already losing and board 1's position needed its "
    "rook to defend f2. I dropped R@e2, picked up "
    "material with tempo, and won. That is the kind "
    "of sequence I have not had in a chess game "
    "before. It does not feel like crazyhouse or "
    "bughouse; it feels like the boards are talking "
    "to each other and I am one of them.")

add("h2", "7.5 Phase 1 playability and feedback")
add("p",
    "I ran six 4-player playtest sessions over the term — three "
    "at 5+5 and three at 3+2 — with university friends, two of "
    "whom play chess seriously and four of whom were casual. "
    "Total: 24 rated games. Specific things I learned:")
add("ul", [
    "The strict rule layer never refused a legal move and never "
    "accepted an illegal one across the 24 games. No false "
    "positives on the mate-on-drop check, even in genuinely "
    "sharp positions. The 80 regression tests in "
    "`bughouse.test.js` cover the same predicates that fire in "
    "live play.",
    "The team-aware draw filter was praised unprompted in the "
    "third session. The tester said the silence of the "
    "opposing team's dialog felt *right* — they had not "
    "noticed it consciously until I told them what the filter "
    "did.",
    "Reconnects worked. Two of the six sessions had a player "
    "drop WiFi for 10 to 40 seconds. Both recovered cleanly "
    "via the 60-second grace and the version-stamped catch-up. "
    "One tester closed and reopened their laptop mid-game; the "
    "partner's board state, the four clocks and the partner's "
    "reserves all came back in the right order.",
    "Engine fill (one human plus three Stockfish at Elo 1500) "
    "plays differently from four humans. Engines do not sit "
    "on captured pieces or send *send me a knight* chat "
    "messages, so the flow is faster and less negotiated. "
    "Three friends preferred the all-human version; two "
    "preferred the engine fill for solo play when no partner "
    "was available.",
    "The team-Elo update behaved correctly across all 24 "
    "rated games. No rating went negative, no K-factor "
    "scaled wrong, and the `rating_history` audit trail in "
    "Supabase matched the per-game deltas the leaderboard "
    "reported.",
])
add("p",
    "What I would change about Phase 1 if I had more time: a "
    "better chat (the current one is a single-line input with "
    "no history), a takeback flow for friendly games (the "
    "event exists in the protocol but the UI is rough), and "
    "partner-aware engine personality — at the moment all "
    "three engine slots play with the same evaluation, but a "
    "real bughouse team has a stronger and a weaker partner "
    "and the engines should reflect that.")

add("h2", "7.6 Phase 1 versus Phase 2 — two different games")
add("p",
    "It is worth saying explicitly that Phase 1 and Phase 2 are "
    "different games, not different versions of the same one.")
add("p",
    "Phase 1 is sociable. You play with three other people, "
    "and the partner negotiation — verbal in voice chat, "
    "implicit through piece flow, occasionally explicit "
    "through the chat box — is part of the strategic loop. "
    "The flow goes both ways across the two boards, the "
    "strategy is symmetric, and the meta is well understood "
    "from decades of online play. My contribution here is "
    "the strict rules, the engine fill and the team-aware "
    "infrastructure, not the variant itself.")
add("p",
    "Phase 2 is the new variant and more solitary. One human, "
    "N-1 engines, one-way flow. The cross-board lever is "
    "sharper because nothing is negotiating with you. You "
    "take what the recommendation panel offers or you don't, "
    "and the engines on the perimeter cannot communicate with "
    "you the way a human partner could. Games are shorter on "
    "average — about 18 minutes versus 24 for Phase 1 at "
    "5+5 — because the ring loses a board at a time and the "
    "game ends when the human's board ends.")
add("p",
    "Both are playable end-to-end. I would not call either "
    "the *better* version. Phase 1 is mine in the sense that "
    "I wrote the strict rule layer, the engine fill, the "
    "team-aware socket logic and the rating system on top of "
    "DiIorio's frontend. Phase 2 is mine in a stronger "
    "sense — the topology, the ring's piece-flow semantics, "
    "the cross-board recommendation algorithm and the "
    "N-board manager are all new code with no analogue in "
    "the fork or, as far as I can find, in any other chess "
    "variant implementation.")

add("h2", "7.7 Where the project falls short")
add("p", "Three honest failures.")
add("ol", [
    "*Cross-board recommendation accuracy.* The "
    "eval-loss ranking sometimes prefers boards "
    "where the captured piece is high-value but the "
    "remaining position is poor for the human side. "
    "Taking the piece weakens that sibling into a "
    "quick loss and kills the source of further "
    "pieces. A multi-ply lookahead on the sibling "
    "would help, but at 100ms per eval the cost is "
    "linear in N times lookahead depth, which is "
    "unviable at N=10.",
    "*N=10 UX overload.* The mini-board rail at "
    "N=10 is too small to read tactically. A "
    "chess player cannot pattern-match positions "
    "at that pixel size; the boards are reduced to "
    "*something is happening over there*. Three "
    "other players told me the same thing in "
    "informal playtests. The fix is more screen "
    "real estate, which is not a code problem.",
    "*Low-Elo engine quality below 1320.* Skill "
    "Level mode does not really track real Elo. A "
    "900-Elo engine plays inconsistently: blunders "
    "sometimes, finds tactical shots a 1500 would "
    "miss other times. The right fix is to refuse "
    "engine settings below 1320 or to write a "
    "properly calibrated weak engine, neither of "
    "which I had time for.",
])

add("h2", "7.8 Future work")
add("p",
    "Four directions. The first is tighter "
    "partner-need coupling in Phase 2. "
    "`computePartnerNeed` and "
    "`computeOpponentPartnerDanger` in "
    "`bughouseEval.js` are fully wired for Phase 1 "
    "but only loosely wired for Phase 2. Plumbing "
    "them through is mechanical; the harder part is "
    "re-tuning `LAMBDA` and `MU` for the ring "
    "topology, which probably needs a couple of "
    "hundred test games at each N.")
add("p",
    "The second is a bughouse-aware shallow search. "
    "The current pipeline picks the better of "
    "Stockfish's standard move and the best "
    "evaluated drop. A depth-3 or depth-4 search "
    "that considers drops within the tree would "
    "catch combinations the current pipeline misses "
    "by construction. Writing it from scratch is a "
    "small project on its own.")
add("p",
    "The third is variable engine Elo per board. "
    "Right now all engine boards share a single "
    "Elo. Letting the human pick a level per board "
    "would make the ring asymmetric and let "
    "stronger players seek out tougher neighbours. "
    "The fourth is a spectator mode. The "
    "version-stamped event flow already supports "
    "view-only clients; the only missing piece is a "
    "container that mounts without input handlers.")

add("h2", "7.9 Why Phase 2 is not rated")
add("p",
    "Phase 2 games carry no rating, and for a real "
    "reason. Glicko and Elo assume symmetric, "
    "zero-sum, single-opponent matches. Infinite "
    "mode is asymmetric (one human plus many "
    "engines), non-zero-sum (mate on a sibling "
    "board does not directly affect the human's "
    "rating) and has a variable N (a 1500-rated win "
    "at N=4 is not the same achievement as a "
    "1500-rated win at N=10). Three candidate "
    "designs: rate by (engine Elo, N), so a player "
    "has a separate rating per configuration; rate "
    "by Elo-equivalent per minute; or only rate "
    "against the human's own board outcome and "
    "ignore siblings. Picking among them needs "
    "longitudinal data that does not exist yet.")

add("page", None)

# ===========================================================================
# Chapter 8: Conclusion
# ===========================================================================

add("h1", "8. Conclusion")

add("h2", "8.1 Recap")
add("p",
    "I built Infinite Armada Chess in two phases. "
    "Phase 1 is a strict 4-player two-board "
    "bughouse: server-side rule enforcement, "
    "optional engine fill at any slot, team-aware "
    "draw and resignation flow, Glicko2 plus a "
    "custom team-Elo update. Phase 2 extends that "
    "foundation into an N-board ring variant where "
    "one human sits at the centre, N-1 Stockfish "
    "engines sit on the perimeter and pieces flow "
    "one way around the ring. The contribution is "
    "the layer above standard chess: the strict "
    "rule layer that both phases share, an N-board "
    "game manager, a hybrid drop-decision "
    "pipeline, and a cross-board recommendation "
    "algorithm. The system runs at N up to 10 with "
    "engines at human tempo and both variants are "
    "playable end-to-end. Evaluation is a "
    "152-assertion regression suite, an "
    "engine-strength sanity check, pacing "
    "measurements, six 4-player Phase 1 playtest "
    "sessions and self-playtests of Phase 2 as a "
    "FIDE-rated player.")

add("h2", "8.2 What surprised me")
add("p",
    "Stockfish at 1500 is already stronger than the "
    "average rapid Lichess opponent. That meant the "
    "bottleneck on bughouse strength was always "
    "going to be the drop layer, not the move "
    "layer. I expected the engine integration to be "
    "the hard part; in practice it was the "
    "cleanest. Pacing turned out to be harder than "
    "rule enforcement by a long way — rules are "
    "deterministic and testable, but making engines "
    "*feel* human-tempo across all clock states "
    "took real iteration. And the cross-board "
    "strategic loop emerges at much smaller N than "
    "I expected. I had assumed the interesting case "
    "was N=10; the playtest data says it peaks at "
    "N=4.")

add("h2", "8.3 What I would do differently")
add("p",
    "Three things. I would drop Phase 1 earlier. "
    "The four-player bughouse was needed as a "
    "rule-layer foundation, but it ate more "
    "implementation time than the contribution "
    "justified. I would start the playtests "
    "sooner; most of the Section 7.5 failure modes "
    "would have been caught earlier and fixed. And "
    "I would pick the toolchain up front rather "
    "than inheriting it — React 15 was efficient "
    "for the first month and a tax for every month "
    "after that.")

add("h2", "8.4 Closing")
add("p",
    "The variant is genuinely fun at N=4 to N=6. "
    "The cross-board drop is a strategic lever I "
    "have not seen in any other chess variant, "
    "which is the kind of thing I wanted my MSci "
    "to leave behind. The next time someone tells "
    "me their queens are infinite, I will know "
    "what to ask them.")

add("page", None)

# ===========================================================================
# References
# ===========================================================================

add("h1", "References")
add("ol", [
    "Munroe, R. (2024). *Infinite Armada Chess*. "
    "XKCD #3020. https://xkcd.com/3020/",
    "DiIorio, J. *Bughouse Chess (Open-Source "
    "Repository)*. https://github.com/johndiiorio/bughouse",
    "FIDE (2023). *FIDE Laws of Chess*. "
    "https://handbook.fide.com/chapter/E012023",
    "Stockfish Chess Engine team. *Stockfish*. "
    "https://stockfishchess.org/",
    "Lichess Organisation. *Chessground*. "
    "https://github.com/lichess-org/chessground",
    "Internet Chess Club. *Bughouse Rules*. "
    "https://www.chessclub.com/help/bughouse",
    "Glickman, M. (2012). *Example of the Glicko-2 "
    "system*. http://www.glicko.net/glicko/glicko2.pdf",
    "Socket.IO documentation. "
    "https://socket.io/docs/v2/",
    "Supabase documentation. https://supabase.com/docs",
    "DiIorio's `chess.js` fork within the bughouse "
    "repository, file `src/server/services/bug.js`.",
    "UCI Protocol Reference. Stockfish Wiki, UCI "
    "page. "
    "https://github.com/official-stockfish/Stockfish/wiki/UCI",
    "React, version 15. "
    "https://reactjs.org/blog/2017/04/07/react-v15.5.0.html",
])

add("page", None)

# ===========================================================================
# Appendices
# ===========================================================================

add("h1", "Appendix A: AI use disclosure")
add("p",
    "Per the University's policy I disclose the AI "
    "tools used in this project. I used Claude (via "
    "Claude Code) for: refactor passes to clean up "
    "obviously AI-style naming in code I had "
    "drafted; review of test scaffolding; cleanup "
    "of the cloud-deploy configuration during the "
    "pivot to local-only; and drafting and editing "
    "feedback on the prose of this report.")
add("p",
    "I did not use AI for: the algorithmic design "
    "(ring topology, drop-decision pipeline, "
    "cross-board recommendation algorithm); the "
    "chess judgement in playtests; the choice of "
    "evaluation metrics. If asked at viva my "
    "one-sentence summary is: Claude was a "
    "research assistant and a code reviewer; it "
    "did not make the design decisions.")

add("h1", "Appendix B: Running the system")
add("p",
    "From a clean clone, the system runs locally "
    "on macOS or Linux with one command. "
    "`./run.sh` detects the platform, installs "
    "Node 20 and Stockfish via `brew` or `apt`, "
    "copies `.env.example` to `.env`, runs "
    "`npm install`, builds the webpack bundle and "
    "starts the server. The app is served at "
    "`http://localhost:8000`. The first Stockfish "
    "spawn can take a couple of seconds; the rest "
    "are fast. On Windows the script bails with a "
    "pointer to manual setup.")
add("p",
    "The test suite runs with `npm test` and skips "
    "Stockfish-dependent tests cleanly if the "
    "binary is not on the path. For a clean review "
    "run from scratch: clone, run `./run.sh`, open "
    "the app at the localhost URL, create two "
    "accounts to test Phase 1 multiplayer or click "
    "*New Infinite Game* to start a Phase 2 game "
    "against engines.")

add("h1", "Appendix C: Repository layout")
add("p",
    "The directories the reader cares about: "
    "`src/server/services/` for the algorithmic "
    "contribution (`infiniteManager.js`, "
    "`dropDecision.js`, `bughouseEval.js`, "
    "`stockfishEngine.js`, `engineManager.js`, "
    "`bug.js`); `src/server/lib/` for auxiliary "
    "code including `elo.js` and `supabaseAdmin.js`; "
    "`src/client/app/pages/` for the five Phase 2 "
    "pages I wrote; "
    "`src/client/app/components/infinite/` for the "
    "mini-board SVG; `tests/` for the regression "
    "suite; `run.sh` and `supabase_schema.sql` at "
    "the root for setup. The unmodified upstream "
    "fork by DiIorio is at "
    "https://github.com/johndiiorio/bughouse and "
    "the diff from that to this repository is the "
    "contribution of the project.")


# ---------------------------------------------------------------------------
# Inline formatting parser.
# Supports: `code` -> monospace; *italic* -> italic.
# ---------------------------------------------------------------------------

INLINE_RE = re.compile(r'(`[^`]+`|\*[^*]+\*)')


def parse_inline(text):
    parts = []
    last = 0
    for m in INLINE_RE.finditer(text):
        if m.start() > last:
            parts.append((text[last:m.start()], 'normal'))
        token = m.group(0)
        if token.startswith('`'):
            parts.append((token[1:-1], 'code'))
        else:
            parts.append((token[1:-1], 'italic'))
        last = m.end()
    if last < len(text):
        parts.append((text[last:], 'normal'))
    return parts


# ---------------------------------------------------------------------------
# LaTeX writer
# ---------------------------------------------------------------------------

def tex_escape(s):
    repl = {
        '\\': r'\textbackslash{}',
        '&': r'\&',
        '%': r'\%',
        '$': r'\$',
        '#': r'\#',
        '_': r'\_',
        '{': r'\{',
        '}': r'\}',
        '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
    }
    out = []
    for ch in s:
        out.append(repl.get(ch, ch))
    return ''.join(out)


def tex_inline(text):
    parts = parse_inline(text)
    out = []
    for content, style in parts:
        escaped = tex_escape(content)
        if style == 'code':
            out.append(r'\texttt{' + escaped + '}')
        elif style == 'italic':
            out.append(r'\textit{' + escaped + '}')
        else:
            out.append(escaped)
    return ''.join(out)


def write_tex(path):
    lines = []
    a = lines.append
    a(r'\documentclass[11pt,a4paper]{article}')
    a(r'\usepackage[margin=2.5cm]{geometry}')
    a(r'\usepackage[T1]{fontenc}')
    a(r'\usepackage{lmodern}')
    a(r'\usepackage{microtype}')
    a(r'\usepackage{hyperref}')
    a(r'\usepackage{graphicx}')
    a(r'\usepackage{booktabs}')
    a(r'\usepackage{enumitem}')
    a(r'\usepackage{parskip}')
    a(r'\usepackage{xcolor}')
    a(r'\hypersetup{colorlinks=true,linkcolor=blue,urlcolor=blue,citecolor=blue}')
    a(r'\setlength{\parindent}{0pt}')
    a(r'\setlength{\parskip}{6pt}')
    a(r'\sloppy')
    a(r'\emergencystretch=3em')
    a(r'\hbadness=10000')
    a(r'\begin{document}')

    for tag, payload in C:
        if tag == 'titlepage':
            a(r'\begin{titlepage}')
            a(r'\centering')
            a(r'\vspace*{2cm}')
            a(r'{\Large University of St Andrews}\\[0.4cm]')
            a(r'{\large School of Computer Science}\\[0.4cm]')
            a(r'{\large Academic Year 2025/26}\\[0.4cm]')
            a(r'{\large CS5199 --- MSci Individual Project}\\[3cm]')
            a(r'{\huge\bfseries Algorithmic Engine for N-Board Chess Systems}\\[0.4cm]')
            a(r'{\Large (Infinite Chess Armada)}\\[3cm]')
            a(r'{\large Final Year Project}\\[0.2cm]')
            a(r'{\large MSci (Hons) Computer Science}\\[1.5cm]')
            a(r'{\Large Devansh Chopra}\\[2cm]')
            a(r'{\large Supervisor --- Professor Richard Connor}\\[1cm]')
            a(r'{\large 18 May 2026}')
            a(r'\end{titlepage}')
        elif tag == 'page':
            a(r'\newpage')
        elif tag == 'toc':
            a(r'\renewcommand{\contentsname}{}')
            a(r'\tableofcontents')
        elif tag == 'h1':
            a(r'\section*{' + tex_escape(payload) + '}')
            a(r'\addcontentsline{toc}{section}{' + tex_escape(payload) + '}')
        elif tag == 'h2':
            a(r'\subsection*{' + tex_escape(payload) + '}')
            a(r'\addcontentsline{toc}{subsection}{' + tex_escape(payload) + '}')
        elif tag == 'p':
            a(tex_inline(payload))
            a('')
        elif tag == 'ul':
            a(r'\begin{itemize}[leftmargin=*]')
            for item in payload:
                a(r'\item ' + tex_inline(item))
            a(r'\end{itemize}')
        elif tag == 'ol':
            a(r'\begin{enumerate}[leftmargin=*]')
            for item in payload:
                a(r'\item ' + tex_inline(item))
            a(r'\end{enumerate}')
        elif tag == 'fig':
            num, caption = payload.split('|', 1)
            a(r'\begin{center}')
            a(r'\fbox{\begin{minipage}{0.85\textwidth}\centering')
            a(r'\textit{[Figure ' + tex_escape(num) +
              ' to be inserted]}')
            a(r'\par\vspace{0.4em}')
            a(tex_inline(caption))
            a(r'\end{minipage}}')
            a(r'\end{center}')

    a(r'\end{document}')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


# ---------------------------------------------------------------------------
# DOCX writer
# ---------------------------------------------------------------------------

def docx_add_inline(paragraph, text):
    parts = parse_inline(text)
    for content, style in parts:
        run = paragraph.add_run(content)
        if style == 'code':
            run.font.name = 'Courier New'
            run.font.size = Pt(10)
        elif style == 'italic':
            run.italic = True


def write_docx(path):
    doc = Document()
    for section in doc.sections:
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    style = doc.styles['Normal']
    style.font.name = 'Calibri'
    style.font.size = Pt(11)

    for tag, payload in C:
        if tag == 'titlepage':
            def centered(text, size, bold=False, after_breaks=1):
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(text)
                run.font.size = Pt(size)
                run.bold = bold
                for _ in range(after_breaks):
                    p.add_run('\n')

            for _ in range(3):
                doc.add_paragraph()
            centered('University of St Andrews', 18)
            centered('School of Computer Science', 14)
            centered('Academic Year 2025/26', 14)
            centered('CS5199 — MSci Individual Project', 14, after_breaks=3)
            centered('Algorithmic Engine for N-Board Chess Systems', 22, bold=True)
            centered('(Infinite Chess Armada)', 16, after_breaks=3)
            centered('Final Year Project', 14)
            centered('MSci (Hons) Computer Science', 14, after_breaks=2)
            centered('Devansh Chopra', 16, bold=True, after_breaks=2)
            centered('Supervisor — Professor Richard Connor', 13)
            centered('18 May 2026', 12)
        elif tag == 'page':
            doc.add_page_break()
        elif tag == 'toc':
            p = doc.add_paragraph()
            r = p.add_run('(Generate table of contents in Word: '
                          'References > Table of Contents)')
            r.italic = True
        elif tag == 'h1':
            doc.add_heading(payload, level=1)
        elif tag == 'h2':
            doc.add_heading(payload, level=2)
        elif tag == 'p':
            p = doc.add_paragraph()
            docx_add_inline(p, payload)
        elif tag == 'ul':
            for item in payload:
                p = doc.add_paragraph(style='List Bullet')
                docx_add_inline(p, item)
        elif tag == 'ol':
            for item in payload:
                p = doc.add_paragraph(style='List Number')
                docx_add_inline(p, item)
        elif tag == 'fig':
            num, caption = payload.split('|', 1)
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(f'[Figure {num} — to be inserted]')
            r.italic = True
            r.bold = True
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            docx_add_inline(p, caption)

    doc.save(path)


# ---------------------------------------------------------------------------
# Word count and entrypoint
# ---------------------------------------------------------------------------

def word_count():
    n = 0
    for tag, payload in C:
        if tag == 'p':
            n += len(payload.split())
        elif tag in ('ul', 'ol'):
            for item in payload:
                n += len(item.split())
        elif tag == 'fig':
            n += len(payload.split('|', 1)[1].split())
    return n


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    tex_path = os.path.join(here, 'report.tex')
    docx_path = os.path.join(here, 'report.docx')
    write_tex(tex_path)
    write_docx(docx_path)
    wc = word_count()
    print(f'Word count (body prose): {wc}')
    print(f'Wrote {tex_path}')
    print(f'Wrote {docx_path}')
