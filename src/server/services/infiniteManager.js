const StockfishEngine = require('./stockfishEngine');
const Bug = require('./bug');
const dropDecision = require('./dropDecision');
const dropRules = require('./dropRules');
const logger = require('../logger');

const games = {};

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const DISCONNECT_GRACE_MS = 60000;
const ENGINE_MIN_GAP_MS = 1500;
const LOW_TIME_THRESHOLD_MS = 10000;

// maps a centipawn score to a 0-100 eval-bar percentage clamped at ±800cp
function evalToPercent(cp) {
	const clamped = Math.max(-800, Math.min(800, cp));
	return Math.round(50 + (clamped / 800) * 50);
}

// counts each piece type in a reserve array, accepting strings or {type,color} objects
function parseReserve(arr) {
	const counts = { p: 0, n: 0, b: 0, r: 0, q: 0 };
	if (!Array.isArray(arr)) return counts;
	for (const piece of arr) {
		const t = typeof piece === 'string' ? piece.toLowerCase() : (piece.type || piece).toLowerCase();
		if (counts[t] !== undefined) counts[t]++;
	}
	return counts;
}

class InfiniteGame {
	// builds an N-board ring from the starting position with per-board clocks and engine slots
	constructor({ gameId, humanColor, numBoards, minutes, increment, engineElo, humanUserId }) {
		this.gameId = gameId;
		this.humanColor = humanColor;
		this.numBoards = numBoards;
		this.minutes = minutes;
		this.increment = increment;
		this.engineElo = engineElo;
		this.humanUserId = humanUserId || null;
		this.status = 'playing';
		this.termination = null;
		this.io = null;
		this.version = 0;
		this.humanDisconnectedAt = null;

		this.sharedEvalEngine = null;

		this.boards = Array.from({ length: numBoards }, (_, idx) => ({
			idx,
			fen: INITIAL_FEN,
			whiteReserve: [],
			blackReserve: [],
			colorToPlay: 'w',
			isHumanBoard: idx === 0,
			whiteClock: minutes * 60 * 1000,
			blackClock: minutes * 60 * 1000,
			lastTimestamp: null,
			lastMoveAt: 0,
			clockRunning: false,
			terminated: false,
			termination: null,
			evalCp: 0,
			evalPercent: 50,
			engineRunning: false,
			moveEngine: null,
			restartingMoveEngine: false,
		}));

		this.engineLoopRunning = false;
	}

	bumpVersion() {
		this.version += 1;
		return this.version;
	}

	// spawns the shared eval engine and N move engines in parallel, then starts the three driving intervals
	async init() {
		this.sharedEvalEngine = new StockfishEngine(1500);
		const tasks = [
			this.sharedEvalEngine.start().catch(e => {
				logger.error(`Infinite ${this.gameId}: eval engine failed to start: ${e}`);
				this.sharedEvalEngine = null;
			}),
		];
		for (const board of this.boards) {
			board.moveEngine = new StockfishEngine(this.engineElo);
			tasks.push(board.moveEngine.start().catch(e => {
				logger.error(`Infinite ${this.gameId}: move engine board ${board.idx} failed to start: ${e}`);
				board.moveEngine = null;
			}));
		}
		await Promise.all(tasks);

		for (const board of this.boards) {
			board.lastTimestamp = Date.now();
			board.clockRunning = true;
		}

		this.clockInterval = setInterval(() => this.tickClocks(), 200);
		this.engineInterval = setInterval(() => this.runEngineLoop(), 250);
		this.stateSyncInterval = setInterval(() => {
			if (this.io && this.status === 'playing') {
				this.io.to(this.gameId).emit('state', this.getFullState());
			}
			this.checkDisconnectGrace();
		}, 4000);
	}

	// ends the game if the human's socket has been gone past the 60s grace window
	checkDisconnectGrace() {
		if (this.status !== 'playing') return;
		if (!this.humanDisconnectedAt) return;
		if (Date.now() - this.humanDisconnectedAt > DISCONNECT_GRACE_MS) {
			logger.log(`Infinite ${this.gameId}: human disconnected for >${DISCONNECT_GRACE_MS}ms, ending game`);
			this.endGame('Player disconnected');
		}
	}

	// records the disconnect timestamp so checkDisconnectGrace can fire later
	markHumanDisconnected() {
		if (this.status !== 'playing') return;
		this.humanDisconnectedAt = Date.now();
		logger.log(`Infinite ${this.gameId}: human disconnect recorded`);
	}

	// clears the disconnect timestamp when the human's socket comes back inside the grace window
	markHumanReconnected() {
		if (this.humanDisconnectedAt) {
			logger.log(`Infinite ${this.gameId}: human reconnected, clearing disconnect timer`);
		}
		this.humanDisconnectedAt = null;
	}

	// tears down all intervals and quits every stockfish subprocess
	destroy() {
		clearInterval(this.clockInterval);
		clearInterval(this.engineInterval);
		clearInterval(this.stateSyncInterval);
		for (const board of this.boards) {
			if (board.moveEngine) { try { board.moveEngine.quit(); } catch (e) {} board.moveEngine = null; }
		}
		if (this.sharedEvalEngine) { try { this.sharedEvalEngine.quit(); } catch (e) {} this.sharedEvalEngine = null; }
		delete games[this.gameId];
	}

	// runs every 200ms, decrements the active side's clock per board, terminates boards that flag-fall
	tickClocks() {
		const now = Date.now();
		let anyTerminated = false;

		for (const board of this.boards) {
			if (board.terminated || !board.clockRunning) continue;
			const elapsed = now - board.lastTimestamp;
			board.lastTimestamp = now;

			if (board.colorToPlay === 'w') {
				board.whiteClock -= elapsed;
				if (board.whiteClock <= 0) {
					board.whiteClock = 0;
					this.terminateBoard(board, `Board ${board.idx + 1}: White ran out of time`);
					anyTerminated = true;
				}
			} else {
				board.blackClock -= elapsed;
				if (board.blackClock <= 0) {
					board.blackClock = 0;
					this.terminateBoard(board, `Board ${board.idx + 1}: Black ran out of time`);
					anyTerminated = true;
				}
			}
		}

		if (this.io) {
			this.io.to(this.gameId).emit('clocks', { version: this.version, clocks: this.clocksPayload() });
		}

		if (anyTerminated) this.checkGameOver();
	}

	// builds the per-board clock snapshot the client expects on every tick
	clocksPayload() {
		return this.boards.map(b => ({
			idx: b.idx,
			whiteClock: b.whiteClock,
			blackClock: b.blackClock,
			colorToPlay: b.colorToPlay,
			terminated: b.terminated,
		}));
	}

	// marks a board done, stops its clock, broadcasts the termination event
	terminateBoard(board, reason) {
		if (board.terminated) return;
		board.terminated = true;
		board.clockRunning = false;
		board.termination = reason;
		logger.log(`Infinite game ${this.gameId}: ${reason}`);
		this.bumpVersion();
		if (this.io) {
			this.io.to(this.gameId).emit('board_terminated', { idx: board.idx, termination: reason, version: this.version });
		}
	}

	// ends the whole game when the human's board ends, or when every board has terminated
	checkGameOver() {
		const humanBoard = this.boards[0];
		if (humanBoard.terminated) {
			this.endGame(humanBoard.termination || 'Game over');
			return;
		}
		if (this.boards.every(b => b.terminated)) {
			this.endGame('All boards finished');
		}
	}

	// flips status to over, broadcasts game_over, schedules destroy() after a 5s grace
	endGame(termination) {
		if (this.status === 'over') return;
		this.status = 'over';
		this.termination = termination;
		clearInterval(this.clockInterval);
		this.bumpVersion();
		if (this.io) {
			this.io.to(this.gameId).emit('game_over', { termination, version: this.version });
		}
		setTimeout(() => this.destroy(), 5000);
	}

	// re-entrancy guard for processEngineBoards, bails if a cycle is already running
	runEngineLoop() {
		if (this.engineLoopRunning) return;
		if (this.status === 'over') return;
		this.engineLoopRunning = true;
		this.processEngineBoards()
			.catch(e => logger.error(`Infinite engine loop error: ${e}`))
			.finally(() => { this.engineLoopRunning = false; });
	}

	// runs a single engine tick across every non-human board in parallel, gated by clock and pacing
	async processEngineBoards() {
		if (this.status === 'over') return;

		if (!this.sharedEvalEngine || !this.sharedEvalEngine.started) {
			if (!this.restartingEvalEngine) {
				this.restartingEvalEngine = true;
				if (this.sharedEvalEngine) { try { this.sharedEvalEngine.quit(); } catch (e) {} }
				this.sharedEvalEngine = new StockfishEngine(1500);
				this.sharedEvalEngine.start()
					.catch(e => logger.error(`Eval engine start failed: ${e}`))
					.finally(() => { this.restartingEvalEngine = false; });
			}
		}

		const humanSide = this.humanColor === 'white' ? 'w' : 'b';
		const tasks = [];
		const now = Date.now();

		for (const board of this.boards) {
			if (this.status === 'over') break;
			if (board.terminated) continue;
			if (board.engineRunning) continue;
			if (board.isHumanBoard && board.colorToPlay === humanSide) continue;

			const minClock = Math.min(board.whiteClock, board.blackClock);
			const gap = now - board.lastMoveAt;
			if (minClock > LOW_TIME_THRESHOLD_MS && board.lastMoveAt > 0 && gap < ENGINE_MIN_GAP_MS) continue;

			if (!board.moveEngine || !board.moveEngine.started) {
				if (!board.restartingMoveEngine) {
					board.restartingMoveEngine = true;
					logger.error(`Infinite ${this.gameId}: move engine board ${board.idx} not running, (re)starting`);
					if (board.moveEngine) { try { board.moveEngine.quit(); } catch (e) {} }
					board.moveEngine = new StockfishEngine(this.engineElo);
					board.moveEngine.start()
						.catch(e => logger.error(`Move engine board ${board.idx} start failed: ${e}`))
						.finally(() => { board.restartingMoveEngine = false; });
				}
				continue;
			}

			board.engineRunning = true;
			const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('engine timeout')), 15000));
			tasks.push(
				Promise.race([this.makeEngineMove(board), timeout])
					.catch(e => logger.error(`Infinite: engine move error board ${board.idx}: ${e}`))
					.finally(() => { board.engineRunning = false; })
			);
		}

		if (tasks.length > 0) await Promise.all(tasks);
	}

	// picks and applies the engine's move on one board via the drop-decision pipeline
	async makeEngineMove(board) {
		if (board.terminated) return;

		const fen = board.fen;
		const bug = new Bug(fen);
		bug.setReserves(board.whiteReserve.slice(), board.blackReserve.slice());

		if (bug.in_checkmate()) {
			const loser = fen.split(' ')[1] === 'w' ? 'White' : 'Black';
			this.terminateBoard(board, `Board ${board.idx + 1}: ${loser} is in checkmate`);
			this.checkGameOver();
			return;
		}
		if (bug.in_stalemate()) {
			this.terminateBoard(board, `Board ${board.idx + 1}: Drawn by stalemate`);
			this.checkGameOver();
			return;
		}

		const remainingMs = board.colorToPlay === 'w' ? board.whiteClock : board.blackClock;
		let thinkMs;
		if (remainingMs < 30000) {
			thinkMs = Math.max(300, Math.floor(remainingMs / 25));
		} else {
			thinkMs = 1500;
		}
		thinkMs = Math.min(8000, thinkMs);

		const sideToMove = fen.split(' ')[1];
		const availablePieces = (sideToMove === 'w' ? board.whiteReserve : board.blackReserve).map(p => {
			const t = typeof p === 'string' ? p.toLowerCase() : (p.type || p).toLowerCase();
			return { type: t };
		});

		let decision;
		try {
			decision = await dropDecision.chooseEngineMove({
				fen,
				reserveWhite: board.whiteReserve,
				reserveBlack: board.blackReserve,
				availablePieces,
				moveEngine: board.moveEngine,
				evalEngine: this.sharedEvalEngine,
				thinkMs,
				elo: this.engineElo,
			});
		} catch (e) {
			logger.error(`Infinite: chooseEngineMove failed board ${board.idx}: ${e}`);
			decision = { kind: 'none' };
		}

		if (decision.kind === 'drop') {
			const san = `${decision.drop.type.toUpperCase()}@${decision.drop.square}`;
			try {
				const result = bug.move(san);
				if (result) {
					this.applyMove(board, bug, result);
					return;
				}
			} catch (e) {}
		}

		if (decision.kind === 'move' && decision.uciMove) {
			this.applyUciMove(board, bug, decision.uciMove);
			return;
		}

		if (decision.kind === 'random' && decision.sanMove) {
			try {
				const result = bug.move(decision.sanMove);
				if (result) {
					this.applyMove(board, bug, result);
					return;
				}
			} catch (e) {}
		}

		const moves = bug.moves();
		if (!moves || moves.length === 0) {
			this.terminateBoard(board, `Board ${board.idx + 1}: No legal moves`);
			this.checkGameOver();
			return;
		}
		const sanMove = moves[Math.floor(Math.random() * moves.length)];
		const result = bug.move(sanMove);
		if (result) this.applyMove(board, bug, result);
	}

	// applies a stockfish UCI move with optional promotion, falling back to a random legal move on parse failure
	applyUciMove(board, bug, uciMove) {
		const promotion = uciMove.length >= 5 ? uciMove[4] : undefined;
		const fromSq = uciMove.slice(0, 2);
		const toSq = uciMove.slice(2, 4);

		let result = null;
		try {
			if (promotion) {
				result = bug.move({ from: fromSq, to: toSq, promotion });
			} else {
				result = bug.move({ from: fromSq, to: toSq });
			}
		} catch (e) {
			const moves = bug.moves();
			if (moves && moves.length > 0) {
				result = bug.move(moves[Math.floor(Math.random() * moves.length)]);
			}
		}

		if (result) this.applyMove(board, bug, result);
	}

	// commits a move to a board: updates FEN, clock, reserves, broadcasts the update, schedules eval
	applyMove(board, bug, moveResult) {
		const newFen = bug.fen();
		board.fen = newFen;
		board.colorToPlay = newFen.split(' ')[1];

		const justMoved = board.colorToPlay === 'w' ? 'black' : 'white';
		if (justMoved === 'white') board.whiteClock += this.increment * 1000;
		else board.blackClock += this.increment * 1000;
		board.lastTimestamp = Date.now();
		board.lastMoveAt = board.lastTimestamp;

		const reserves = bug.getReserves();
		this.syncReservesAndFlow(board, reserves);

		this.bumpVersion();
		if (this.io) {
			this.io.to(this.gameId).emit('board_update', { ...this.boardPayload(board), version: this.version });
		}

		this.checkBoardEnd(board);

		this.scheduleEval(board);
	}

	// checks for checkmate or stalemate after a move and terminates the board if either has happened
	checkBoardEnd(board) {
		if (board.terminated) return;
		const bug = new Bug(board.fen);
		bug.setReserves(board.whiteReserve.slice(), board.blackReserve.slice());
		if (bug.in_checkmate()) {
			const loser = board.fen.split(' ')[1] === 'w' ? 'White' : 'Black';
			this.terminateBoard(board, `Board ${board.idx + 1}: ${loser} is in checkmate`);
			this.checkGameOver();
		} else if (bug.in_stalemate()) {
			this.terminateBoard(board, `Board ${board.idx + 1}: Drawn by stalemate`);
			this.checkGameOver();
		}
	}

	// captures flow downstream — pieces taken on board K land in board (K+1) mod N's reserve
	syncReservesAndFlow(board, reserves) {
		const rw = reserves.reserve_white || [];
		const rb = reserves.reserve_black || [];
		const orw = reserves.other_reserve_white || [];
		const orb = reserves.other_reserve_black || [];

		board.whiteReserve = rw;
		board.blackReserve = rb;

		const nextIdx = (board.idx + 1) % this.numBoards;
		const nextBoard = this.boards[nextIdx];
		if (nextBoard && !nextBoard.terminated && (orw.length > 0 || orb.length > 0)) {
			nextBoard.whiteReserve = [...nextBoard.whiteReserve, ...orw];
			nextBoard.blackReserve = [...nextBoard.blackReserve, ...orb];
			this.bumpVersion();
			if (this.io) {
				this.io.to(this.gameId).emit('board_update', { ...this.boardPayload(nextBoard), version: this.version });
			}
		}
	}

	// asks the shared eval engine for the new position's centipawn score and broadcasts the eval-bar update
	async scheduleEval(board) {
		if (!this.sharedEvalEngine || board.terminated) return;
		if (!this.sharedEvalEngine.started) return;
		try {
			const cp = await this.sharedEvalEngine.evaluatePosition(board.fen, 100);
			if (board.terminated || this.status === 'over') return;
			if (cp !== null) {
				board.evalCp = cp;
				board.evalPercent = evalToPercent(cp);
				this.bumpVersion();
				if (this.io) {
					this.io.to(this.gameId).emit('eval_update', { idx: board.idx, cp, percent: board.evalPercent, version: this.version });
				}
			}
		} catch (e) {
			logger.error(`Infinite ${this.gameId}: eval failed board ${board.idx}: ${e}`);
		}
	}

	// applies the human's move on board 0 after rule validation, then nudges the engine loop
	async humanMove({ from, to, promotion, drop }) {
		const board = this.boards[0];
		if (board.terminated || this.status === 'over') return { error: 'Game over' };

		const sideToMove = board.fen.split(' ')[1];
		const humanSide = this.humanColor === 'white' ? 'w' : 'b';
		if (sideToMove !== humanSide) return { error: 'Not your turn' };

		const bug = new Bug(board.fen);
		bug.setReserves(board.whiteReserve.slice(), board.blackReserve.slice());

		if (drop) {
			const pieceType = drop.piece.toLowerCase();
			const refusal = dropRules.validateDrop({
				fen: board.fen,
				reserveWhite: board.whiteReserve,
				reserveBlack: board.blackReserve,
				pieceType,
				pieceColor: humanSide,
				square: to,
				moveSpec: { source: 'spare', promotion: promotion || null },
			});
			if (refusal) return { error: `Illegal drop: ${refusal}` };
		}

		let result = null;
		try {
			if (drop) {
				result = bug.move(`${drop.piece.toUpperCase()}@${to}`);
			} else if (promotion) {
				result = bug.move({ from, to, promotion: promotion.toLowerCase() });
			} else {
				result = bug.move({ from, to });
			}
		} catch (e) {
			return { error: `Illegal move: ${e.message}` };
		}

		if (!result) return { error: 'Illegal move' };

		this.applyMove(board, bug, result);

		if (this.status === 'playing') this.runEngineLoop();

		return { ok: true, board: this.boardPayload(board) };
	}

	// ranks sibling boards by which one's eval suffers least if the human pulls this piece type
	async getRecommendations(pieceType) {
		const humanSide = this.humanColor;
		const results = [];

		for (const board of this.boards) {
			if (board.terminated) continue;

			const reserve = humanSide === 'white' ? board.whiteReserve : board.blackReserve;
			const reserveCounts = parseReserve(reserve);

			if (!reserveCounts[pieceType] || reserveCounts[pieceType] < 1) continue;

			const currentCp = board.evalCp;
			const pieceCp = PIECE_VALUES[pieceType] || 100;
			const adjustedCp = humanSide === 'white' ? currentCp - pieceCp : currentCp + pieceCp;
			const adjustedPercent = evalToPercent(adjustedCp);

			results.push({
				boardIdx: board.idx,
				boardLabel: `Board ${board.idx + 1}`,
				pieceType,
				currentEvalPercent: board.evalPercent,
				adjustedEvalPercent: adjustedPercent,
				reserveCounts,
				fen: board.fen,
			});
		}

		results.sort((a, b) => {
			if (humanSide === 'white') return b.adjustedEvalPercent - a.adjustedEvalPercent;
			return a.adjustedEvalPercent - b.adjustedEvalPercent;
		});

		return results.slice(0, 5);
	}

	// moves a piece from a sibling board's reserve into the human's reserve, broadcasts both boards
	transferPiece(sourceBoardIdx, pieceType) {
		if (sourceBoardIdx < 0 || sourceBoardIdx >= this.numBoards) return { error: 'Invalid board' };
		if (sourceBoardIdx === 0) return { error: 'Cannot transfer from your own board' };

		const sourceBoard = this.boards[sourceBoardIdx];
		const humanBoard = this.boards[0];

		if (sourceBoard.terminated) return { error: 'Source board has ended' };

		const humanSide = this.humanColor;
		const sourceReserve = humanSide === 'white' ? sourceBoard.whiteReserve : sourceBoard.blackReserve;
		const idx = sourceReserve.findIndex(p => {
			const t = typeof p === 'string' ? p.toLowerCase() : (p.type || p).toLowerCase();
			return t === pieceType;
		});

		if (idx === -1) return { error: `No ${pieceType} in board ${sourceBoardIdx + 1} reserve` };

		sourceReserve.splice(idx, 1);

		const humanReserve = humanSide === 'white' ? humanBoard.whiteReserve : humanBoard.blackReserve;
		humanReserve.push(pieceType);

		if (this.io) {
			this.bumpVersion();
			this.io.to(this.gameId).emit('board_update', { ...this.boardPayload(sourceBoard), version: this.version });
			this.bumpVersion();
			this.io.to(this.gameId).emit('board_update', { ...this.boardPayload(humanBoard), version: this.version });
		}

		return { ok: true };
	}

	// builds the per-board snapshot the client renders from
	boardPayload(board) {
		return {
			idx: board.idx,
			fen: board.fen,
			whiteReserve: parseReserve(board.whiteReserve),
			blackReserve: parseReserve(board.blackReserve),
			colorToPlay: board.colorToPlay,
			whiteClock: board.whiteClock,
			blackClock: board.blackClock,
			terminated: board.terminated,
			termination: board.termination,
			evalCp: board.evalCp,
			evalPercent: board.evalPercent,
			isHumanBoard: board.isHumanBoard,
		};
	}

	// builds the full-game snapshot the server emits on join and every 4s heartbeat
	getFullState() {
		return {
			gameId: this.gameId,
			humanColor: this.humanColor,
			numBoards: this.numBoards,
			minutes: this.minutes,
			increment: this.increment,
			engineElo: this.engineElo,
			status: this.status,
			termination: this.termination,
			version: this.version,
			boards: this.boards.map(b => this.boardPayload(b)),
		};
	}
}

// creates and registers a new infinite game, kicks off init() in the background
async function createGame({ gameId, humanColor, numBoards, minutes, increment, engineElo, humanUserId }) {
	if (games[gameId]) return games[gameId];
	const game = new InfiniteGame({ gameId, humanColor, numBoards, minutes, increment, engineElo, humanUserId });
	games[gameId] = game;
	game.init().catch(e => logger.error(`Infinite init error ${gameId}: ${e}`));
	return game;
}

function getGame(gameId) {
	return games[gameId] || null;
}

function setIo(gameId, io) {
	const game = games[gameId];
	if (game) game.io = io;
}

module.exports = { createGame, getGame, setIo };
