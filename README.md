# Infinite Armada Chess

By **Devansh Chopra**. MSci Computer Science dissertation, University of St Andrews, 2025/26.

An N-board chess variant inspired by Randall Munroe's XKCD #3020. One human plays the centre board and Stockfish engines play the surrounding boards. Captured pieces flow unidirectionally around a ring of N boards, so material is always in motion between the games. Project is shipped in two phases-  Phase 1 is a rule based 4 player two board bughouse and Phase 2 is the N-board ring variant.

## Acknowledgements

- **John DiIorio** — original [bughouse repository](https://github.com/johndiiorio/bughouse) that this project is built on.
- **Stockfish** — engine moves and evaluation.
- **Lichess** — [Chessground](https://github.com/lichess-org/chessground) for board rendering.
- **Supabase** — managed Postgres and authentication.
- **Professor Richard Connor** — supervision throughout the project.

## How to run?

```bash
./run.sh
```

Then open http://localhost:1000. `run.sh` works on macOS and Linux.

## Build it

```bash
npm install
npm run build
```

## Run the tests

```bash
npm test
```

Five regression files, 150 assertions across rule layer, drop pipeline, team Elo, engine sanity and infinite mode integration.
