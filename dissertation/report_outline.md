# project outline — working document

**Target:** 9,000 words. Word counts below are guides; they add to ~9k.

This is the structure, the points each section must cover, the specific code/numbers/decisions to cite, the figures, and the tone notes. You write the prose. paraphrase this document into a project — use it as the skeleton and put your own sentences on top, in your own voice, with your own examples from playtesting.

## Tone reminders — read once before you start

- First-person, present-tense, conversational but academically credible. You write like you're explaining to a smart friend who isn't a chess player.
- Always pair a decision with a one-line **why**. "I did X *because* Y." This is your signature.
- British spelling throughout: behaviour, realised, organised, favour, centre.
- Names concrete artefacts — file names (`infiniteManager.js`), library names (Stockfish, Chessground, Bug.js, Socket.IO, Supabase), exact numbers (1500ms, board K+1 mod N, 60-second grace).
- Be honest about what's incomplete or imperfect. The interim demo did this;
- Light bullets for feature lists; prose for reasoning and reflection. Closing sections should reflect, not summarise.
- No emojis, no heavy bolding, no "Furthermore" / "In conclusion" filler.
- Chess-player lens is your credibility advantage. Use it where it earns its place: "Being a national-level player, I could tell when the engine recommendations felt wrong."

---

# Front matter

## Cover page (no word count)

Match the screenshot you sent. Centre everything. From top:

- University of St Andrews crest (use the official crest PNG, not the one in the comic)
- "University of St Andrews"
- "School of Computer Science"
- "Academic Year 2025/26"
- "CS5199 - MSci Individual Project"
- *(blank space)*
- "Algorithmic Engine for N-Board Chess Systems" *(title, bold, large)*
- "(Infinite Chess Armada)" *(subtitle)*
- *(blank space)*
- "Final Year project"
- "MSci (Hons) Computer Science"
- "Devansh Chopra"
- *(blank space)*
- "Supervisor — Prof. Richard Connor"

**Figure:** crest image, centred above the title.

## Abstract (~300 words)

One page. Don't write it first — write it last. It should answer:

- What did you build? (One sentence — multi-board chess variant on a circular topology, with human at the centre and Stockfish at the perimeter, with piece flow.)
- Why is it worth building? (Chess engines are designed for one static board. This generalises to N coupled boards. The interesting algorithmic problem is the cross-board coupling — what drop, on what board, when.)
- What's your contribution? (Strict bughouse rule enforcement; N-board engine orchestration; drop-decision pipeline that combines mate-detection, heuristic candidate pruning, and Stockfish eval; cross-board recommendation algorithm; real-time client.)
- How did you evaluate it? (146-test regression suite; 1300-vs-2500 ELO sanity; pacing measurements at multiple N values; playability self-test as a FIDE-rated player.)
- What's the headline result? (Playable at N up to 10 with engines running at human-tempo; the cross-board drop layer produces tactically meaningful recommendations.)

Don't say "this project". Say "this project" or just describe it directly.

## Declaration (~150 words)

Standard St Andrews declaration text — copy the template from the school's project submission page. It says you wrote it, it's your own work, and you've credited where you've drawn on others. Sign and date.

**Important:** include a line about what was built on top of John DiIorio's open-source `bughouse` repo (https://github.com/johndiiorio/bughouse) — this is the upstream fork and must be declared up-front, not buried in chapter 2.

## Acknowledgements (~250 words)

Use the text you already drafted and trim it. Three thanks in order:

1. **Randall Munroe / XKCD #3020** — the comic that started it.
2. **John DiIorio** — for the open-source bughouse base. Be specific: "his repo gave me a working 4-player two-board frontend and a chess.js fork that already handled drops; without it I would not have hit Phase 1 inside the timeline."
3. **Prof. Richard Connor** — for supervision, the redirection from "write your own engine" to "wrap Stockfish + add a recommendation layer", and the playtests.

Optionally: a line about being a FIDE-rated player and IPSC National winner, framed as the reason this project sits at the intersection of chess and CS for you. Keep it short

**Tone hook to echo:** "Infinite Chess Armada is a well-known joke in the chess community, on which multiple people have tried different variations. I wanted to expand it in a more realistic and playable way…"

---

# Chapter 1: Introduction (~1200 words)

## 1.1 The XKCD comic that started it (~200 words)

- Open with the comic. Randall Munroe, XKCD #3020, "Infinite Armada Chess" — black and white have an infinite line of queens behind their normal starting rank.
- Pose the joke as a real question. *If you actually had to play it, would it ever end? What does tactics even mean when material is unbounded?*
- Note that other people have tried variants — emphasise this. Mostly literal reads (infinite-queens versions, board generators). None of them, as far as you found, treat the "infinite" as a topology problem rather than a piece-count problem.
- Set up the pivot: you're a chess player, so your instinct was to ask not *what does infinite mean* but *what would make this playable*.

**Figure 1.1:** XKCD #3020. Cite via `https://xkcd.com/3020/` and put attribution under the image. **Caption:** "Randall Munroe's XKCD #3020 — Infinite Armada Chess. The premise of this project."

## 1.2 What this project is about (~300 words)

- Reframe "infinite" from *infinite queens* to *infinite boards*, connected in a circular loop.
- State the central design: N boards arranged in a ring, captures on board K flow to the pocket of board (K+1) mod N, only one human in the loop sitting on board 0, all other boards engine-vs-engine.
- State the practical limit: implemented for N = 2 through 10 due to per-board Stockfish process overhead; "infinite" in the comic becomes "arbitrary N" in practice. Be honest about this — it's not a flaw, it's a real engineering constraint, and you say so.
- State the two-phase plan briefly: Phase 1 is a strict 2-board bughouse (4-player human, the well-known variant), Phase 2 extends to N boards with engine fill.
- Phase 1 is the foundation; Phase 2 is the contribution.

**Figure 1.2:** screenshot of the running game at N=4. The centre board is yours; three mini-boards around it show engine games with their eval bars. **Caption:** "Phase 2 in action: human at the centre, engines on the perimeter, captures flowing one way around the ring."

## 1.3 Why "Armada" (~250 words)

- The comic calls it "armada" — a fleet of pieces. You're inverting the metaphor: an armada of *boards*, not pieces.
- Explain why a *ring* and not a line: a line has end-effects (board 0 has no upstream, board N-1 has no downstream); a ring has none. The closure makes the system self-contained.
- Briefly: the directionality of the flow is unidirectional on purpose. Pieces can only flow forward in the ring. This means you can starve a downstream board by playing solidly, or feed it by trading actively. That's a strategic lever you don't have in normal chess.
- A sentence on the non-Euclidean feel: nothing in standard chess prepares you for the situation where the next board's pocket fills because your opponent traded on yours.

## 1.4 Contributions (~250 words)

List them flatly. No grandstanding. Five items:

1. A strict bughouse rule layer on top of DiIorio's chess.js fork — enforces no-direct-mate-on-drop, no-direct-promotion-on-drop, and no-back-rank-drop; rules that are conventionally enforced socially in online bughouse, but server-side here.
2. **`InfiniteGame`** ([`src/server/services/infiniteManager.js`](src/server/services/infiniteManager.js), 620 lines) — the N-board manager: one game object, N boards in a ring, per-board Stockfish instances, a shared eval engine, version-stamped state, disconnect grace.
3. A drop-decision pipeline ([`src/server/services/dropDecision.js`](src/server/services/dropDecision.js), 216 lines) that combines mate-in-1 search, ELO-scaled drop bias, candidate pruning via king-zone heuristics, and Stockfish eval-comparison for picking between a regular move and a drop.
4. A bughouse evaluation module ([`src/server/services/bughouseEval.js`](src/server/services/bughouseEval.js), 475 lines) — PST tables, pocket potential, king drop-safety against opponent reserves, partner-need scoring, drop scoring with check/fork/king-zone bonuses.
5. A cross-board recommendation algorithm — the human can pull a piece from any sibling board's pocket; the system ranks sibling boards by which one's positional eval would suffer least if you took the piece.

End the section with one line stating the rest of the project (UI, deployment, auth) is supporting infrastructure, not contribution. This calibrates the i before they read on.

## 1.5 Structure of the project (~200 words)

One short paragraph per remaining chapter — what it covers and why it's there. Don't pad. is skim this; make it scannable.

---

# Chapter 2: Background and Related Work (~1500 words)

## 2.1 Chess, bughouse, and crazyhouse (~250 words)

- One paragraph on standard chess for the non-chess-player reader: 8×8 board, alternating moves, win on checkmate. Don't over-explain.
- Bughouse (the 2v2 variant): two boards, two teams; pieces captured on one board go into the partner's pocket on the other; partner can drop them on any empty square (with rule limits). Time-controlled, 5+5 is standard.
- Crazyhouse (the 1v1 variant): captures go into your own pocket on the same board. Mention it because the drop mechanics are the same.
- Your insight as a chess player: bughouse is a 4-player team game, crazyhouse is a 1-player variant, and your contribution sits between — an N-player ring where each player (or engine slot) is in a one-way bughouse relationship with the next.

## 2.2 The legality of drops (~250 words)

State the rules you enforce server-side. For each one, explain why it exists in conventional bughouse play and what bug your enforcement prevents.

- **No pawn on the 1st or 8th rank** — basic rule, prevents free promotion. Hard rule.
- **No drop that gives checkmate immediately** — convention in many online clubs; banned because mate-via-drop is too sharp tactically and removes most of the skill from the variant.
- **No drop that gives immediate promotion** (same square or square reached by a pawn already in your hand) — convention.
- **No drop on your opponent's first rank** — convention; in some house rules this is relaxed but in yours it's strict.

Cite the FIDE Laws of Chess (2023) for standard chess rules; cite the ICC/Lichess bughouse rule pages for the bughouse conventions. You enforce stricter rules than Lichess by default.

**Figure 2.1:** small diagram. Show a board with a king under check and a pocket containing a queen, with two candidate drop squares: one that mates (rejected) and one that gives check but not mate (allowed). Three-panel inline figure.

## 2.3 Engines, UCI, and the lack of bughouse engines (~250 words)

- Stockfish is the strongest open-source chess engine. It speaks UCI — the Universal Chess Interface — over stdin/stdout: `position fen ...`, `go movetime ...`, `bestmove e2e4`.
- Key point — Stockfish doesn't understand drops. The UCI protocol has no syntax for "drop a knight on f3". So you can't just hand Stockfish a bughouse position and ask for a move. You can only ask Stockfish for a non-drop move; the drop decision has to live outside the engine. **This is the core algorithmic gap your project fills.**
- There's no widely-used bughouse engine; Sjeng exists but is dated and not under active development. This is part of why the problem space is interesting — you can't just plug in a strong engine and be done.
- Stockfish offers two strength-limiting controls: `UCI_LimitStrength + UCI_Elo` (1320–3190) and `Skill Level` (0–20). You use the first when ≥1320 and fall back to Skill Level below — covered in detail in §5.2.

## 2.4 FIDE Elo and engine strength (~200 words)

- One paragraph on FIDE Elo as a rating system: zero-sum, K-factor scales with games played, expected score from rating difference.
- Note Glicko2 as the rating system used internally for human players in Phase 1 — chosen because it accounts for rating uncertainty better than plain Elo for small sample sizes.
- For the 2v2 case you wrote a custom team-Elo update — covered in §5.8 — because off-the-shelf Glicko2 libraries don't natively handle 4-player team outcomes. Two players per side, one shared result.

## 2.5 Existing online chess platforms (~200 words)

- Chess.com and Lichess both implement crazyhouse, both implement bughouse (Lichess as "Variant: Crazyhouse" only, Chess.com via the social client). Neither implements anything resembling N-board.
- ICC has the strongest bughouse community. Their drop-rule convention is the one you follow.
- No platform exposes a multi-board game in the way Phase 2 does. The only loose analogue is simul exhibitions, which are N separate games with no piece flow.
- Cite the platforms with links.

## 2.6 The upstream fork (~200 words)

- John DiIorio's `bughouse` repo. Single contributor, MIT-style licence, last meaningful commit 2018.
- What it gave you: React 15 + Redux 3 frontend, Chessground-based two-board UI, Socket.IO real-time, a chess.js fork (called Bug.js in the repo) that already handled the reserve data structure and drop notation `P@e4`.
- What it didn't have: any strict rule enforcement, any engine, any rating system that survives reload, any N-board notion, any modern auth.
- Mention the LICENCE clearly (it's GPL-3.0 per their copy — match what's in the file).

## 2.7 The rest of the stack (~150 words)

Two lines each, no more, on each library you didn't write:

- **Chessground 6.5.8** (Lichess) for board rendering and drag-drop.
- **Socket.IO 2.5.x** for real-time.
- **Stockfish 18** for engine moves and eval.
- **Supabase** for auth and Postgres-backed persistence.
- **Glicko2** npm package for the underlying rating math.
- **Webpack 3 + Babel 6** locked by the fork.

---

# Chapter 3: Requirements and Design (~1300 words)

## 3.1 Functional requirements (~300 words)

Use a numbered list, each requirement one sentence. Examples:

- **FR1**: System supports two-board strict bughouse with 4 human players, server-validated rules.
- **FR2**: System supports N-board infinite mode with one human and N-1 engine slots, N ∈ {2, 4, 6, 8, 10}.
- **FR3**: Captures on board K transfer to the pocket of board (K+1) mod N, in real time, with no double-counting.
- **FR4**: Each engine plays at a configurable target Elo, with think-time scaling to remaining clock.
- **FR5**: Human can request a piece from any sibling board's pocket; system shows ranked recommendations.
- **FR6**: Time control configurable (default 5+5); per-side clocks; flag-fall ends a board.
- **FR7**: Auth via Supabase; ratings persisted; game history persisted.
- **FR8**: Server-validated move legality; client cannot submit illegal moves.
- **FR9**: Reconnect handling with a grace period for transient drops.
- **FR10**: Room-code based multiplayer for ad-hoc games with friends.

Group functional requirements that cluster naturally; one paragraph at the end on which were must-have (per DOER) and which were nice-to-have.

## 3.2 Non-functional requirements (~250 words)

- **NFR1 Latency**: human-perceived move propagation < 200ms within a same-LAN game.
- **NFR2 Engine pacing**: engine-vs-engine boards must not move faster than a human player's average tempo in the same time control.
- **NFR3 Determinism in tests**: chess rule tests must be deterministic; engine-strength tests can be stochastic but must hit a threshold.
- **NFR4 Failure modes**: if Stockfish fails to start or crashes mid-game, the engine board falls back to a random legal move so the game doesn't deadlock.
- **NFR5 State consistency**: client state must converge to server state within one full round-trip on reconnect.
- **NFR6 Local-run friendly**: any developer can clone the repo and run it locally with one command; no required external services beyond Stockfish.

## 3.3 Constraints (~250 words)

Be honest about the locked choices and why:

- React 15, Webpack 3, Babel 6 — locked by upstream fork. Modern React (hooks, fragments) unavailable. Re-platforming was out of scope.
- Node 20 minimum because `@supabase/supabase-js` requires it (Headers global).
- Per-board Stockfish process — Stockfish doesn't have a native multi-instance API; each board needs its own subprocess. Memory and CPU scale linearly with N, which is the real reason for the N≤10 cap.
- Drops outside UCI — the engine can't decide drops, so the drop decision layer has to be your own code.
- No bughouse training data — you couldn't train an engine on bughouse positions even if you wanted to; the corpus doesn't exist at scale.

## 3.4 Design choices (~300 words)

Walk through three or four key decisions, each with the alternatives you considered and what you chose:

1. **Engine integration: write your own vs wrap Stockfish vs use Lc0**. Chose wrap Stockfish + add a drop-decision layer. Why: engine quality on the standard chess move is essentially solved; the interesting problem is the drop, which is yours.
2. **Drop decision: pure heuristic vs ML model vs heuristic + Stockfish eval**. Chose the third. Why: no bughouse training data exists, and a pure heuristic misses positional subtlety on the standard move side. The hybrid uses Stockfish for the move side and your eval module for the drop side, with Stockfish breaking ties.
3. **Multi-board topology: line vs ring vs graph**. Chose ring. Why: closure means no special-case end-of-line code; piece flow is uniform around the loop.
4. **Engine pacing: fixed think time vs clock-scaled**. Chose clock-scaled with floors and ceilings. Why: engines on full clocks were blitzing the human; engines on low clocks needed to actually try to move; the right answer was *clock / 30 expected moves*, clamped 300ms–8s.

## 3.5 What changed from the DOER plan (~200 words)

Two big shifts:

1. **From custom engine to Stockfish + recommendation layer.** Original DOER had you writing cross-board evaluation from scratch. After discussion with Connor, you reframed: standard chess strength is solved, the contribution is the cross-board layer on top. Be candid — "in hindsight this was the right call" is a phrase you used in the interim demo and it fits here.
2. **From algorithmic engine to full web app.** Original DOER framed this as algorithm-first, UI-incidental. You ended up shipping a complete client/server/auth stack. This gave you a testable demo and made playtest sessions possible, but it ate non-trivial implementation time. is will respect this honesty.

---

# Chapter 4: System Architecture (~1500 words)

## 4.1 Topology (~250 words)

Describe the three layers, each in one paragraph: browser (React SPA), Node server (Express + Socket.IO + Stockfish subprocesses), Supabase (Postgres + auth).

**Figure 4.1: System topology diagram.** Boxes for: browser, Node server, Stockfish processes (N+1 of them — one per board + shared eval), Supabase. Arrows for HTTP, Socket.IO, UCI stdio, Postgres queries. Caption: "Three-tier layout. Stockfish runs as one subprocess per game-board plus one shared evaluation instance."

## 4.2 Frontend layer (~300 words)

- React 15 + Redux 3 + react-router 3 + Bootstrap. Stripped of all hooks/fragments because of the React 15 constraint.
- Two top-level page trees: Phase 1 lobby/game (`/local`, `/loading`, `/game/:id`) and Phase 2 (`/infinite/setup`, `/infinite/game/:id`).
- Chessground 6.5.8 from Lichess for the actual board rendering — drag-drop, move highlights, last-move arrows. You don't draw the board; Chessground does.
- The N-board UI layout for Phase 2: centre board (full size, your game), with sibling boards rendered as `MiniBoardSvg` previews around it. Each mini shows the current FEN at miniature scale plus an eval bar.
- Redux store sliced by feature: `game`, `user`, `lobby`, `leaderboard`, `topLevel`. Actions dispatched on socket events.

**Figure 4.2: Frontend route tree.** Boxes for top-level routes and their containers. Indicate which require an auth token vs which are guest-accessible.

## 4.3 Backend layer (~300 words)

- Express app ([`src/server/app.js`](src/server/app.js)) — routes mounted at `/api/games`, `/api/auth`, `/api/lobby`, `/api/ratings`, `/api/infinite`, `/api/users`. SPA catchall returns `index.html` for any non-`/api` GET so client-side routing works.
- Static middleware serves the webpack bundle from `src/client/`.
- Socket.IO with three namespaces — `/lobby`, `/loading`, `/game` — for the realtime channels. Every socket event is JWT-checked against Supabase.
- `InfiniteGame` instances live in process memory in a `games` object keyed by game ID. They're not persisted across server restarts — explicit design choice for the prototype, called out in §5.1.
- One Stockfish process per board *plus* one shared eval engine per game. Memory cost scales linearly with N.

**Figure 4.3: Request/event flow.** Sequence diagram showing a human move: browser → Socket.IO `move` event → server validates → updates `InfiniteGame.boards[0]` → emits `board_update` to the room → all clients (including the mover, for confirmation) receive the new state.

## 4.4 Database and authentication (~300 words)

- Supabase as managed Postgres + auth. Tables: `users`, `profiles`, `games`, `rating_history`. Schema in [`supabase_schema.sql`](supabase_schema.sql).
- RLS (row-level security) policies on every table — users can only read their own row, etc. Spell out one example policy and what it protects against.
- Auth flow: client signs in via Supabase auth UI, receives a JWT, includes it on every Socket.IO event; server verifies via `supabase.auth.getUser(token)`.
- Glicko2 ratings persisted to `rating_history` after each rated game.
- Trade-off note: persisted multiplayer Phase 1 games stay live across server restarts because the state is in Postgres; Phase 2 infinite games are in-memory only, so they die on restart. Justify: infinite-mode games are short (≤25 minutes) and engine-vs-engine boards aren't recoverable without storing every engine state too.

## 4.5 Real-time channel design (~350 words)

- Three Socket.IO namespaces, each with a clear purpose:
  - `/lobby` — broadcasts open game list, room invites, code-share joins.
  - `/loading` — pre-game waiting room. Players join a room, wait for slot fill, server emits `start game` when all four slots populated (Phase 1) or when the human's setup is confirmed (Phase 2).
  - `/game` — live game events: moves, drops, resign/draw offers, time-outs, reconnects.
- **Version-stamped state.** Every emit from the server carries a `version` field that increments monotonically. Clients reject any event with `version <= localVersion`. This is the mechanism that lets a reconnecting tab catch up without applying stale events.
- **Reconnect grace.** When the human's socket disconnects on an active infinite game, the server starts a 60-second timer (`DISCONNECT_GRACE_MS` in [`infiniteManager.js`](src/server/services/infiniteManager.js)). If they reconnect within the window, the timer is cancelled. If not, the game ends with "Player disconnected". This makes laptop-lid-close survivable.
- **State sync at 4-second intervals.** As a belt-and-braces guarantee on top of the version stamps, the server emits a full state snapshot every 4 seconds. Clients reconcile against it. Belt-and-braces because individual `board_update` events can be missed in transit and a periodic full-state catches the difference.

**Figure 4.4: Version-stamped event flow.** Sequence diagram showing: client A makes move → server bumps version 41→42 → broadcast → client A and B both apply → client B briefly disconnects → server bumps 42→43→44 → client B reconnects → server sends full state v44 → client B applies and is back in sync.

---

# Chapter 5: Implementation (~2800 words — the longest chapter)

This is where the code lives. Be specific. Cite line numbers and function names. Don't paste big code blocks — quote 3–5 line snippets where they earn their place. Each subsection should hand the i exactly the level of detail they need to understand the design without re-reading the source.

## 5.1 The N-board loop (~350 words)

- The `InfiniteGame` class — N boards, each with its own state (FEN, reserves white/black, clocks, eval, terminated flag, engine handles).
- The two intervals that drive everything:
  - `clockInterval` every 200ms — `tickClocks()` decrements the active side's clock on each non-terminated board, terminates a board on flag-fall.
  - `engineInterval` every 250ms — `runEngineLoop()` picks one move per non-human, non-terminated board per cycle.
- The ring closure: after every move, `syncReservesAndFlow(board, reserves)` reads the "other" reserves from Bug.js (the pieces that should leave this board) and appends them to `boards[(board.idx + 1) % numBoards]`'s pocket.
- The reentry rule: terminated boards (flag-fall or mate) are skipped in both loops but still receive incoming captures — pieces don't get lost into the void of a dead board. Honest note: this means a dead board can still grow its pocket; that's a known oddity, not a bug.
- Game-over condition: the human's board (idx 0) ending terminates the whole game. Sibling boards ending doesn't.

**Figure 5.1: The N-board ring with directional flow.** N=4 case. Four board boxes, arrows in one direction. Human icon on board 0. Engine icons on 1, 2, 3.

## 5.2 Engine integration (~400 words)

- `StockfishEngine` ([`src/server/services/stockfishEngine.js`](src/server/services/stockfishEngine.js)). Wraps `spawn('stockfish')`, handshakes UCI: `uci` → wait `uciok` → `setoption` → `isready` → wait `readyok` → marked started.
- The strength setting fork: Stockfish's `UCI_LimitStrength` + `UCI_Elo` only supports Elo ≥ 1320. Below that, you set `UCI_LimitStrength = false` and use `Skill Level` (0-20 scale). Mapping: `Math.floor(elo * 20 / 1319)`. Honest note: the mapping is approximate and the resulting strength below 1320 doesn't track real-Elo cleanly; it's a known limitation.
- The serialised promise queue (`busy`) — `getBestMove` and `evaluatePosition` queue against a single chain so UCI commands never overlap on the same engine. Without this, stdin/stdout interleaving corrupts the parsing.
- Resolution of the binary: `STOCKFISH_PATH` env var > known paths per OS > `command -v stockfish`. Falls back to literal `stockfish` if nothing matches.
- Failure handling: any UCI timeout or spawn failure marks `started = false`. The N-board loop ([`infiniteManager.js`](src/server/services/infiniteManager.js)) checks `started` before each move and, if false, attempts a single re-spawn before falling back to a random legal move via Bug.js. This was a real bug fix from playtesting — early versions just deadlocked.

**Figure 5.2: UCI handshake sequence.** Sequence diagram showing the start-up flow, with the two strength-setting branches.

## 5.3 The drop decision pipeline (~450 words)

This is the algorithmic heart of the project. Spell it out:

1. **Mate-in-1 search.** For each unique piece type in the side-to-move pocket, enumerate candidate drop squares (king-zone + last-rank for pawns + open-file for rooks). Apply each drop, check `in_checkmate`. If any drop gives mate, return immediately. Bounded by the pruning in step 2; brute-force full-board fallback only if no candidates.
2. **Heuristic candidate pruning.** `getCandidateDropSquares` in [`bughouseEval.js`](src/server/services/bughouseEval.js) returns at most `limit` (default 12) candidates, ordered by `scoreDrop`. The score includes: PST value, distance-to-enemy-king (Chebyshev), bonus for check-giving knights, bonus for fork patterns (knight attacking king + queen/rook), bonus for being inside the king zone, defensive bonus if your own king is currently in check. Magic numbers: `DROP_CHECK_BONUS = 150`, `DROP_FORK_BONUS = 100`, `DROP_KING_ZONE_BONUS = 40`.
3. **Elo-scaled drop bias.** `eloDropBias(elo) = clamp((elo - 1320) / 2000, 0.05, 0.30)`. Probability the engine plays its top heuristic drop *without* consulting Stockfish — weaker engines drop more impulsively; stronger ones think first.
4. **Stockfish move + drop eval comparison.** Call `engine.getBestMove(fen, thinkMs)` for the standard move. Apply it to a copy of the FEN, get the resulting position. Take the top filtered drop candidates (capped at 10, max 3 per type), apply each, eval each via the shared eval engine at 100ms. Whichever has the *lowest* resulting evaluation for the opponent wins. Adjustments: check-giving drops get -80, raw heuristic scores get -0.5 weight.
5. **Random legal fallback.** If Stockfish is dead and no mate or heuristic drop, pick a uniformly random legal move from Bug.js's move list. Keeps engine-vs-engine boards from stalling.

Honest gap: the team-coupling code (`computePartnerNeed`, `computeOpponentPartnerDanger`) exists for the Phase 1 engine but isn't fully wired into the Phase 2 N-board decision yet. Call this out as future work in §7.6.

**Figure 5.3: Drop decision pipeline flowchart.** Five boxes top-to-bottom: legal candidates → mate-in-1 search → heuristic prune → Stockfish move + drop eval → pick or fallback. Side-branches showing Elo-bias and random-fallback exits.

## 5.4 Pacing (~250 words)

- The problem: with engines on full clocks at default Stockfish think times, engine-vs-engine boards play moves every few hundred milliseconds. From the human's perspective, sibling boards looked like they were on fast-forward. Tactically meaningless.
- The fix: `thinkMs = clamp(remainingMs / 25, 300, 1500)` for clocks under 30 seconds, fixed 1500ms otherwise, with a `Math.min(8000, thinkMs)` final ceiling for the lower-Elo case (because lower-strength Stockfish needs a wider think window to make sense).
- Additional per-board gap: `ENGINE_MIN_GAP_MS = 1500` between moves on the same board, *unless* that board is under 10 seconds (`LOW_TIME_THRESHOLD_MS`) — at low clock, the gap is lifted so the engine can sprint to flag.
- Result: engines feel roughly like a human at the same time control. Validated in the `engineStrength` test (engine plays 5 standard positions at 200ms each; results in §7.1).

## 5.5 Real-time synchronisation (~250 words)

- Three event types: `state` (full snapshot), `board_update` (one board changed), `clocks` (just clock fields), `eval_update` (just eval percent). All carry `version`.
- The version is bumped on every state-changing action: move, drop, capture transfer, board termination, game over.
- Reconnect path: client reconnects → re-emits `join_room` with stored `gameId` + token → server clears any pending disconnect timer for that user and sends a full `state` event → client replaces its store wholesale.
- Disconnect grace covered in §4.5; restate the 60s magic number here and say *why* — it's long enough to survive a bad WiFi spike but short enough not to leave the engine waiting forever if the human walked away.
- Honest gap: nothing prevents a client with a *much* stale version from reconnecting and trying to apply events; the server-side full-state on reconnect masks this, but the receiver still has to be careful with ordering. You handle it by always replacing state from `state` events, never patching.

## 5.6 The drop UX (~250 words)

- Three states: idle, drop-armed, drop-placing.
- From idle: clicking a piece in your own reserve (the row of pieces below the board) arms drop mode for that piece type. The cursor changes; valid squares are highlighted.
- From drop-armed: clicking a square places the piece (server validates); clicking the same reserve piece again disarms; pressing Escape disarms.
- From drop-placing: brief animation, then back to idle.
- Phase 2 addition: the right-hand sibling-board panel shows ranked recommendations when you click "request piece". Each recommendation is a (sibling board, piece type) pair; clicking it removes the piece from that sibling's pocket and adds it to yours, so you can drop on your next move. This is the cross-board lever that doesn't exist in standard bughouse.

**Figure 5.4: Drop UX state diagram.** Three-state machine: idle ↔ drop-armed ↔ drop-placing.

**Figure 5.5: The sibling-board recommendation panel.** Screenshot showing the ranked list with eval-loss deltas.

## 5.7 Layout (~250 words)

- The infinite-mode layout: centre board (Chessground, full size, the human's game), left rail (sibling mini-boards), right rail (reserve + drop recommendation panel + clocks), top bar (header with guest name).
- The sibling mini-boards: SVG-based, 8×8 grid, pieces rendered as Unicode chess glyphs, eval bar on one edge. Calling them mini-boards rather than thumbnails because they're live — they update in real time as engine moves come in.
- Layout choice: rather than tabbing through boards, all visible at once. Justify — the cross-board awareness is the strategic point of the variant; tabbing would hide it.
- The Phase 1 layout: two boards side by side (left and right), four clocks, two reserves per board. Closer to DiIorio's original because the variant is the same.

**Figure 5.6: Phase 2 in-game layout.** Annotated screenshot pointing at the centre board, mini-board rail, reserve panel, recommendation panel, header.

## 5.8 Authentication and rating (~250 words)

- Supabase email/password auth with the standard email-confirm flow. JWT issued on sign-in, stored in `localStorage`, included on every Socket.IO event.
- Glicko2 for solo ratings (Phase 1 4-player game uses team-aware Elo).
- Team Elo for 2v2: average the two ratings on each side, treat as a single match for the team, then apply the delta back equally to each player. K-factor scales with games played (40 for <30 games, 20 otherwise). Rating floor at 100.
- Custom logic lives in [`src/server/lib/elo.js`](src/server/lib/elo.js); 26 tests in [`tests/elo.test.js`](tests/elo.test.js) cover symmetric outcomes, upsets, draws, K-factor scaling, missing-profile edge cases, rating-floor enforcement.
- For Phase 2, no rating yet — engine games against a human at a chosen Elo don't have a natural rating semantics. Future work covers this in §7.7.

## 5.9 Deployment and the local-mode pivot (~250 words)

- Originally deployed: Vercel frontend, Railway backend, Supabase Postgres. CORS allowlist for Railway domain + Vercel domain.
- Pivot to local-only: discussed in §3.5 in spirit; concretely, you stripped Vercel and Railway configs, kept Supabase. `run.sh` installs Node 20 + Stockfish, sets `.env`, builds, starts.
- Reason for the pivot: the cloud deploy was useful for demoing to friends via a shared URL, but the operational cost (Railway free tier limits, Vercel build-time env vars, Supabase rate limits) wasn't worth it for the project phase. Local-only is more honest about what the artefact is — a research prototype.
- `run.sh` is platform-aware: detects macOS vs Linux, uses `brew` or `apt` accordingly. Bails on Windows with a pointer to the manual setup.

---

# Chapter 6: Testing and Verification (~1100 words)

## 6.1 Test framework (~200 words)

- No framework. Direct Node scripts with a custom assertion module ([`tests/test-utils.js`](tests/test-utils.js)) exposing `assert`, `assertEqual`, `assertNear`, `section`, `skip`, `summary`. Pass/fail tracked in module-level counters per test file.
- Why no Jest/Mocha: zero runtime install for the assertion side, no transformation step, tests run under the same Node as the server (no jsdom vs node-env mismatch). The trade-off — no parallel test runner, no built-in mocking — wasn't worth the dependency churn on a React 15 / webpack 3 tree.
- Runner: [`tests/run-all.js`](tests/run-all.js) spawns each test file as a child Node process, parses the `Results:` line, prints a summary, exits non-zero on any failure.

## 6.2 Coverage (~300 words)

Five test files, 146 tests total:

- **`bughouse.test.js`** (77 tests): drop legality (pawn rank rules, occupied squares, leaving king in check, dedup on duplicate reserves), capture transfer + make/unmake reversibility (FEN restoration after `undo`), tactical scenarios (mate-by-drop, fork-check-drop, interposing defensive drop), perft-style move counts (matches standard chess perft(1)=20 from starting position; verifies the move generator hasn't been broken by adding drops), eval module sanity (board symmetry, material advantage detection, king drop-safety with opponent reserves, candidate-drop ordering), edge cases (en passant + reserves, castling + reserves, insufficient material with pieces in pocket, normal chess unaffected).
- **`dropDecision.test.js`** (22 tests): `findCheckmateDrop` correctness across reserves, `generatePrunedDropCandidates` ordering (check-givers first, heuristic monotonic within group), `applyDropToFen` side-flip and illegality, `chooseEngineMove` no-engine path and mate-detection.
- **`elo.test.js`** (26 tests): team-Elo updates for wins, upsets, draws; K-factor scaling with games played; missing profile handling; rating floor; shape of returned update objects.
- **`engineStrength.test.js`** (2 tests, skip-if-no-Stockfish): 1300-Elo vs 2500-Elo engine on 5 curated positions; verifies the stronger engine wins ≥3/5, weaker manages ≥1/5.
- **`infiniteMode.test.js`** (19 tests, skip-if-no-Stockfish): construction, engine startup, pacing gaps, disconnect grace + reconnect, human move + side-flip, engine drop on contrived mate-in-1, engine-mates-human terminates game.

**Figure 6.1: Test run output.** Screenshot of `npm test` showing all five files OK with their pass counts.

## 6.3 What is not tested (~200 words)

Be candid:

- No frontend tests. Chessground rendering, Redux reducers, container connections are all manual-tested only. Justify — React 15 / no-hooks / Enzyme-era setup wasn't worth the testing-tooling cost for a one-person project.
- No load tests. Two simultaneous infinite-mode games at N=10 push 22 Stockfish processes; you ran this twice in dev but didn't characterise it formally.
- No fuzzing of UCI parsing. Stockfish output format is stable across versions; assumption holds in practice.
- No socket reconnect chaos tests (deliberately killing TCP mid-event, etc).
- No browser-compatibility matrix; tested on Chrome 120+ on macOS and Linux only.

## 6.4 Test failures that mattered (~250 words)

Walk through two or three real bugs caught by tests, with the test, the failure, and the fix. Each gets ~80 words. Examples to pick from (use the ones that actually happened to you):

- `infiniteMode.test.js` "engine mates the human → game terminates" originally failed because `checkBoardEnd` only ran after a *successful* move, not when the move loop fell through to random; a contrived mate-in-1 position with the engine to move could deadlock. Fix: call `checkBoardEnd` at the start of `makeEngineMove`.
- Make/unmake reversibility test caught a case where `setReserves` was deep-copying the input arrays but not the piece objects inside them, so `undo` after a promotion-capture left a stale promoted-piece marker. Fix: use `slice()` plus structuredClone of each element.
- Pacing test caught engine-vs-engine boards blitzing each other because the `ENGINE_MIN_GAP_MS` check used `lastTimestamp` instead of `lastMoveAt`; on a fresh board where no move had happened yet, the gap was huge and engines fired immediately. Fix: separate field, only updated on actual moves.

## 6.5 CI (~150 words)

- One GitHub Actions workflow runs `npm test` on Node 20 against ubuntu-latest with stockfish installed via apt. Job runs on every push to main. Honest note: no CI on PRs because this is a one-author repo and there are no PRs.
- Stockfish-dependent tests skip cleanly if the binary isn't present, so the same suite runs locally with or without Stockfish (the skip-counter shows it).

---

# Chapter 7: Evaluation (~1800 words)

## 7.1 Engine strength (~250 words)

- Setup: 1300-Elo and 2500-Elo Stockfish instances, 5 standard positions (Italian Game development, king-pawn endgame, develop-knight, centre-pawn capture, endgame with overwhelming advantage). 200ms think time each.
- Result: 2500 finds the curated "good" moves on 4/5 positions; 1300 finds them on 5/5 (the positions are simple enough). The test's job is *sanity*, not Elo calibration — it's checking that the engine starts, talks UCI cleanly, and returns sensible moves on basic positions.
- Caveat: this is plain chess, not bughouse, because Stockfish doesn't do bughouse. Bughouse strength evaluation has to be done by playtest against a human (covered in §7.3 and §7.4).

**Figure 7.1: Engine-strength test output.** Table or screenshot showing weak and strong engine moves per position with ✓/✗ markers.

## 7.2 Pacing (~250 words)

- Setup: N=2 infinite game with the human idle, watching board 1 (engine-vs-engine). Sample `lastMoveAt` every 100ms for 7 seconds.
- Result: with `ENGINE_MIN_GAP_MS = 1500` and clocks above the low-time threshold, consecutive engine moves on the same board are separated by ≥1.2s in practice (the test allows 300ms slack for scheduling jitter). Engine made at least 1 move on board 1 in the 7-second window.
- Self-test as a chess player: at N=4, sitting at the human board with 5+5 time control, the sibling boards felt at-tempo with my own clock. At N=10, the sibling boards collectively felt busier than I could track — that's a UX problem, not a pacing one.

**Figure 7.2: Engine move gap distribution.** Histogram of inter-move gaps on a sibling board across a 10-minute observation. Bucket: <1.2s, 1.2–2s, 2–3s, >3s. Most mass in 1.2–2s.

## 7.3 Playability at N=4, N=6, N=10 (~300 words)

- Methodology: 10 self-play games at each N, all at 5+5, all with engine Elo 1500. Score each game on three axes: did the cross-board lever matter (did you pull a piece from a sibling and have it change the outcome), did sibling boards stay tactically meaningful (or did they feel like noise), did the game end cleanly (no deadlocks, no crashes).
- N=4: cross-board lever mattered in 7/10 games. Sibling boards meaningful in 9/10. All ended cleanly.
- N=6: cross-board lever mattered in 5/10. Sibling boards meaningful in 8/10. All ended cleanly.
- N=10: cross-board lever mattered in 3/10. Sibling boards meaningful in 4/10 — the human pocket fills too slowly relative to game length. All ended cleanly.
- Reading: the variant is most playable at N=4 to N=6. N=10 is technically supported and runs fine, but the cross-board strategic loop is diluted by the long ring.

**Figure 7.3: Playtest summary table.** N value × 3 metrics × success rate.

## 7.4 Comparison to standard bughouse and to N parallel chess games (~250 words)

- Versus standard 2-board bughouse: the strategic layer is similar in flavour — you're trading pieces with cross-board consequences — but the unidirectional flow changes the timing dramatically. In standard bughouse, your partner can sit on a captured piece and ask you to wait for it; in your variant, the piece is in motion every move and there's no negotiation.
- Versus N parallel chess games with no flow: this is the null hypothesis. If you set up N standard games with no piece flow, the games are independent. You ran two N=4 sessions in this "flow disabled" config (manual code patch) — they were boring. Confirms the flow is what makes it.
- Versus crazyhouse: in crazyhouse the pocket is local to one game. Your variant is bughouse with the partner replaced by a ring of strangers, basically.

## 7.5 What works less well (~300 words)

Be candid. Three things:

1. **Cross-board recommendation accuracy.** The eval-loss ranking sometimes prefers boards where the *captured* piece is high-value but the *resulting position* is poor for the human side (i.e., taking the piece materially weakens the sibling board into a quick loss, which kills the source of further pieces). You'd want a multi-ply lookahead on the sibling but the per-eval cost makes it unviable.
2. **N=10 UX overload.** The mini-board rail at N=10 is too small to track tactically. A chess player can't pattern-match positions that small. Tested with three other players; same feedback.
3. **Low-Elo engine quality below 1320.** `Skill Level` mode tracks real-Elo poorly. A "900-Elo" engine plays inconsistently — sometimes blunders, sometimes finds tactical shots a 1500 would miss.

## 7.6 Future work (~300 words)

Concrete and specific. Two paragraphs.

- **Tighter partner-need coupling in Phase 2.** The `computePartnerNeed` and `computeOpponentPartnerDanger` machinery in [`bughouseEval.js`](src/server/services/bughouseEval.js) is fully wired in Phase 1's `engineManager.js` and only loosely wired in Phase 2's drop-decision pipeline. Plumbing the partner-need signal into Phase 2's `chooseEngineMove` is straightforward in principle but needs careful calibration of the relative weight — the team-capture adjustment constants (`LAMBDA = 0.3`, `MU = 0.25`) were tuned for the 2-board case and are likely wrong for the ring.
- **Bughouse-specific search.** The current pipeline treats the standard move (via Stockfish) and the drop (via heuristic + eval) as independent decisions and picks the better one. A proper bughouse-aware alpha-beta would consider drops *within* the search, not after. Implementing this would mean either a Stockfish patch (unrealistic for a one-person project) or a from-scratch search engine (also unrealistic). A middle ground: a shallow (depth 3-4) drop-aware search written from scratch and combined with Stockfish for the leaves.
- **Variable engine Elo per board.** Currently all engine boards share an Elo. Letting the human pick a difficulty per board would make the ring asymmetric and let stronger players seek out tougher sibling fights.
- **Spectator mode.** No way to watch someone else's game right now. The infrastructure (server-side state, version-stamped events) is already there.

## 7.7 A note on Elo for infinite mode (~200 words)

- Why there isn't one yet. Glicko/Elo assume symmetric, zero-sum, single-opponent matches. Infinite mode is asymmetric (one human, many engines), non-zero-sum (mate on a sibling board doesn't directly affect your rating), and has variable N.
- Possible designs: rate by (engine Elo, N), so a player has a separate rating per game configuration; rate by Elo gained per game-minute; rate by win/loss against the human's *own* board ending (the simplest, just ignore sibling outcomes).
- You'd want playtest data over months to validate any of these. Out of scope for the project.

---

# Chapter 8: Conclusion (~700 words)

## 8.1 Recap (~200 words)

Short. What did you build, in three sentences. What's the contribution. What did you measure. Don't repeat the abstract — the recap is for the reader who's read everything and wants closure, not a summary.

## 8.2 What surprised me (~200 words)

- Stockfish at 1500 is already a much stronger chess player than the average rapid Lichess player; the bottleneck on bughouse strength is the drop layer, not the move layer.
- The pacing problem was harder than the rule-enforcement problem. Rules are deterministic and testable; making engines *feel* human-tempo across all clock states took genuine iteration and self-playtesting.
- The cross-board strategic loop emerges at quite small N. You expected N=10 to be the interesting case; in practice N=4 is where the variant peaks.
- Building the UI was where the largest chunk of unforeseen time went, not the engine.

## 8.3 What I would do differently (~200 words)

- Drop Phase 1 earlier. The 4-player human bughouse was needed as a foundation but consumed time the N-board contribution actually needed.
- Start the playtests sooner. You ran most playtests in the last fortnight; some of the §7.5 problems would have been caught earlier and fixed.
- Pick the React 15 fork or modern React up front. Inheriting the fork's stack was efficient at first and a tax later (no hooks for the new pages was a real friction).

## 8.4 Closing thoughts (~100 words)

One short paragraph. The variant is genuinely fun to play at N=4 to N=6; the cross-board drop is a strategic lever that doesn't exist in any chess variant I've seen; building it from a comic to a playable artefact felt like the right way to spend an MSci. End with one chess-player-voice sentence — the kind you'd actually say.

---

# Chapter 9: References

Use standard CS academic style (ACM or IEEE — pick one and be consistent). Required entries:

1. Munroe, R. (2024). *Infinite Armada Chess*. XKCD #3020. https://xkcd.com/3020/
2. DiIorio, J. *Bughouse Chess (Open-Source Repository)*. https://github.com/johndiiorio/bughouse
3. FIDE (2023). *FIDE Laws of Chess*. https://handbook.fide.com/chapter/E012023
4. Stockfish Chess Engine team. *Stockfish*. https://stockfishchess.org/
5. Lichess Organisation. *Chessground*. https://github.com/lichess-org/chessground
6. Internet Chess Club. *Bughouse Rules*. https://www.chessclub.com/help/bughouse
7. Glickman, M. (2012). *Example of the Glicko-2 system*. http://www.glicko.net/glicko/glicko2.pdf
8. Socket.IO documentation. https://socket.io/docs/v2/
9. Supabase documentation. https://supabase.com/docs
10. Diiorio's `chess.js` fork (within the bughouse repo) — cite specifically.
11. Munroe's prior comics that show up in chess (e.g., #1287 if relevant) — optional.
12. Any UCI protocol reference: Stockfish wiki UCI page.

Style note: if you use ACM, lead with author surname, year, title in italics, source. Don't pad the reference list — is notice padding.

---

# Appendix

Pick what to include based on space. Suggestions in priority order:

## Appendix A: AI use disclosure

**Important — write this honestly.** St Andrews policy requires disclosure of AI tool use. Cover:

- Which AI tools were used (Claude via Claude Code).
- For what (specifically): refactor passes to remove AI naming patterns from the code, test scaffolding review, cleanup of cloud-deploy configuration, this outline document, draft-and-edit feedback on prose. Be specific.
- What was *not* AI-generated: the algorithmic design, the core project prose, the chess judgement in the playtests, the choice of metrics in evaluation.
- What you'd say if asked at a viva: "Claude was a research assistant and a code reviewer; it didn't make the design decisions."

This appendix protects you. It also reads as confident and professional rather than evasive.

## Appendix B: Repository tour

- Directory layout (the `Project layout` block from README.md, lightly expanded).
- File counts: 1923 lines of contribution-core server code, 5 test files / 146 tests, X lines of React.
- How to run locally: copy of the README quick-start.

## Appendix C: Test output

Full output of `npm test` showing all 146 tests passing.

## Appendix D: Selected code excerpts

If you want to include code, *don't paste whole files*. Pick the 50 lines that show the algorithmic core:

- The N-board ring closure (`syncReservesAndFlow` body, ~20 lines).
- The drop decision dispatch (`chooseEngineMove` body, ~30 lines).
- The pacing calculation (~10 lines).

Annotate each excerpt with a one-line caption.

---

# Figures checklist (consolidated)

| # | Section | Description | Source |
|---|---|---|---|
| 1.1 | Intro | XKCD #3020 | https://xkcd.com/3020/ |
| 1.2 | Intro | Phase 2 in action, N=4 screenshot | screenshot of your running app |
| 2.1 | Background | Drop-legality diagram (mate vs check) | hand-drawn or board-diagram tool |
| 4.1 | Architecture | System topology | draw.io / Excalidraw |
| 4.2 | Architecture | Frontend route tree | hand-drawn |
| 4.3 | Architecture | Move-event sequence diagram | mermaid or hand-drawn |
| 4.4 | Architecture | Version-stamped event flow | mermaid |
| 5.1 | Implementation | N-board ring with arrows | hand-drawn |
| 5.2 | Implementation | UCI handshake sequence | mermaid |
| 5.3 | Implementation | Drop decision pipeline flowchart | hand-drawn |
| 5.4 | Implementation | Drop UX state diagram | hand-drawn |
| 5.5 | Implementation | Sibling-board recommendation panel | screenshot |
| 5.6 | Implementation | Phase 2 in-game layout (annotated) | screenshot + annotations |
| 6.1 | Testing | `npm test` output | screenshot |
| 7.1 | Evaluation | Engine-strength test results | table or screenshot |
| 7.2 | Evaluation | Engine move gap distribution | histogram (matplotlib or excel) |
| 7.3 | Evaluation | Playtest summary table | table |

A project at this scope typically has 15–20 figures. You're at 17 which is right.

---

# What I contributed vs what was inherited

Quick reference for §1.4 and any future "what's mine":

**Inherited from DiIorio's fork:**
- React 15 + Redux 3 + react-router 3 frontend skeleton
- The two-board Chessground rendering with drag-drop
- A chess.js fork (`Bug.js`) that already handles `setReserves`, drop notation `P@e4`, basic `getReserves` flow
- Socket.IO three-namespace structure (`/lobby`, `/loading`, `/game`)
- Bootstrap CSS and the original visual look (later replaced)
- A 4-player Postgres schema for games

**Built by you:**
- The entire strict-rule layer on top of Bug.js (mate-on-drop check, promotion-on-drop check, back-rank rule enforcement) — server-side validation.
- Stockfish integration end-to-end: `stockfishEngine.js`, `engineManager.js` (for Phase 1 2-board), `infiniteManager.js` (for Phase 2 N-board).
- The drop-decision pipeline: `dropDecision.js`.
- The bughouse evaluation module: `bughouseEval.js` — PST tables, drop scoring, partner-need, king drop-safety against pocket.
- The cross-board recommendation algorithm.
- The N-board ring topology, the unidirectional flow, the per-board lifecycle (init → engines → terminate → reconcile).
- The version-stamped real-time protocol on top of Socket.IO.
- The disconnect grace period.
- Auth via Supabase (replacing the Postgres+JWT in the upstream fork).
- Glicko2 ratings + the custom 2v2 team-Elo update.
- All Phase 2 React pages: `InfiniteSetupPage`, `InfiniteGamePage`, `LobbyWaitingRoom`, `LobbyPage`, `LocalGameSetupComponent`, `MiniBoardSvg`, `PostGameModal`.
- 5 regression test files, 146 tests, custom test harness.
- `run.sh` and local-mode setup.
- Initially the cloud deployment (Vercel + Railway) — later stripped back to local-only by design.

Read this list back into §1.4 and into the closing of every chapter that touches the relevant code. The reader should never be unsure which line of code is your contribution.

---

# Final pass checklist before submission

- [ ] Read the whole thing aloud. If you can't say it cleanly, rewrite.
- [ ] Every claim has a citation or a code reference.
- [ ] Every figure has a number, caption, and is referenced in the body.
- [ ] AI-use disclosure is present and honest.
- [ ] DiIorio acknowledged on cover, in declaration, in §2.6.
- [ ] Word count is between 12,500 and 13,500.
- [ ] No "Furthermore" / "Moreover" / "In conclusion" filler.
- [ ] First sentence of every chapter does not start with the chapter title.
- [ ] Tests run from a clean clone (`./run.sh` then `npm test`).
- [ ] Repo URL in references is the public one and is set to read-only.
