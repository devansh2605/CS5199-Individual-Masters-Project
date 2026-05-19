const StockfishEngine = require('./stockfishEngine');
const Game = require('../models/Game');
const Bug = require('./bug');
const bughouseEval = require('./bughouseEval');
const dropDecision = require('./dropDecision');
const logger = require('../logger');

const generatePrunedDropCandidates = dropDecision.generatePrunedDropCandidates;

const gameStore = {};

const ROLE_MAP = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

// reads which piece sits on a square directly from a FEN string without instantiating a board
function getPieceFromFen(fen, square) {
	const ranks = fen.split(' ')[0].split('/');
	const file = square.charCodeAt(0) - 97;
	const rank = 8 - parseInt(square[1]);
	let col = 0;
	for (const char of ranks[rank]) {
		if (!isNaN(char)) {
			col += parseInt(char);
		} else {
			if (col === file) {
				const pieceMap = {
					p: { color: 'black', role: 'pawn' },
					n: { color: 'black', role: 'knight' },
					b: { color: 'black', role: 'bishop' },
					r: { color: 'black', role: 'rook' },
					q: { color: 'black', role: 'queen' },
					k: { color: 'black', role: 'king' },
					P: { color: 'white', role: 'pawn' },
					N: { color: 'white', role: 'knight' },
					B: { color: 'white', role: 'bishop' },
					R: { color: 'white', role: 'rook' },
					Q: { color: 'white', role: 'queen' },
					K: { color: 'white', role: 'king' },
				};
				return pieceMap[char];
			}
			col++;
		}
	}
	return null;
}

// maps a 4-player slot to its board, colour, and teammate's board and colour
function getTeamInfo(userPosition) {
	if (userPosition === 1) {
		return { board: 1, color: 'w', teammateBoardNum: 2, teammateColor: 'b', teammatePosition: 4 };
	} else if (userPosition === 2) {
		return { board: 1, color: 'b', teammateBoardNum: 2, teammateColor: 'w', teammatePosition: 3 };
	} else if (userPosition === 3) {
		return { board: 2, color: 'w', teammateBoardNum: 1, teammateColor: 'b', teammatePosition: 2 };
	} else {
		return { board: 2, color: 'b', teammateBoardNum: 1, teammateColor: 'w', teammatePosition: 1 };
	}
}

// adjusts a move's score to reflect how much the captured piece would help the partner board
function computeCaptureBonus(uciMove, fen, partnerNeed, oppPartnerDanger) {
	if (!uciMove || uciMove === '(none)' || !partnerNeed) return 0;
	const target = uciMove.substring(2, 4);
	const source = uciMove.substring(0, 2);
	const capturedPiece = getPieceFromFen(fen, target);
	const movedPiece = getPieceFromFen(fen, source);
	if (!capturedPiece || !movedPiece) return 0;

	const capturedType = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' }[capturedPiece.role];
	const movedType = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' }[movedPiece.role];
	if (!capturedType || capturedType === 'k') return 0;

	const g = new Bug(fen);
	const enemyColor = fen.split(' ')[1] === 'w' ? 'b' : 'w';
	const likelyRecaptured = g.isAttacked(target, enemyColor);

	return bughouseEval.teamCaptureAdjustment(capturedType, partnerNeed, movedType, oppPartnerDanger, likelyRecaptured);
}

module.exports = {
	// registers a new 2-board engine game, recording which slots are engines and their per-slot elo
	registerGame(gameId, enginePlayers, engineSkillLevels) {
		gameStore[gameId] = {
			enginePlayers,
			engineSkillLevels: engineSkillLevels || { 1: 1500, 2: 1500, 3: 1500, 4: 1500 },
			engines: {},
			drawnBoards: { 1: false, 2: false }
		};
	},

	// returns true if the slot is filled by an engine
	isEnginePlayer(gameId, userPosition) {
		const game = gameStore[gameId];
		if (!game) return false;
		return !!game.enginePlayers[userPosition];
	},

	// returns true if any engine slots are registered for this game
	hasEngines(gameId) {
		return !!gameStore[gameId];
	},

	setBoardDrawn(gameId, boardNum) {
		if (gameStore[gameId]) {
			gameStore[gameId].drawnBoards[boardNum] = true;
		}
	},

	isBoardDrawn(gameId, boardNum) {
		return gameStore[gameId] && gameStore[gameId].drawnBoards[boardNum];
	},

	// lazily spawns or returns the stockfish subprocess for the requested board
	async getEngine(gameId, boardNum) {
		const game = gameStore[gameId];
		if (!game) return null;
		if (!game.engines[boardNum] || !game.engines[boardNum].started) {
			if (game.engines[boardNum]) {
				try { game.engines[boardNum].quit(); } catch (e) {  }
			}
			const boardPlayers = boardNum === 1 ? [1, 2] : [3, 4];
			const enginePlayer = boardPlayers.find(p => game.enginePlayers[p]);
			const skillLevel = enginePlayer ? (game.engineSkillLevels[enginePlayer] || 1500) : 1500;
			game.engines[boardNum] = new StockfishEngine(skillLevel);
			try {
				await game.engines[boardNum].start();
			} catch (err) {
				logger.error(`Stockfish failed to start (board ${boardNum}): ${err}`);
				game.engines[boardNum] = null;
				return null;
			}
		}
		return game.engines[boardNum];
	},

	// quits every engine subprocess for this game and removes its registration
	cleanupGame(gameId) {
		const game = gameStore[gameId];
		if (game) {
			Object.values(game.engines).forEach(engine => { if (engine) engine.quit(); });
			delete gameStore[gameId];
		}
	},

	// drives the 2-board engine loop, walking left then right until no engine has a turn to play
	async triggerEngineMoves(gameId, socket, gameSocket, clearRoom, updateGame, playerTokens) {
		const game = gameStore[gameId];
		if (!game) return;
		if (game.triggerRunning) return;
		game.triggerRunning = true;

		try {
			while (true) {
				if (!gameStore[gameId]) break;
				let row = await Game.getByID(gameId);
				if (row.status !== 'playing') break;
				let didMove = false;

				if (!game.drawnBoards[1]) {
					const leftTurn = row.left_color_to_play;
					const leftPlayer = leftTurn === 'white' ? 1 : 2;
					if (game.enginePlayers[leftPlayer]) {
						const lrw = row.left_reserve_white  ? JSON.parse(row.left_reserve_white)  : [];
						const lrb = row.left_reserve_black  ? JSON.parse(row.left_reserve_black)  : [];
						const fen = row.left_fens.split(',').pop();
						const availablePieces = leftTurn === 'white' ? lrw : lrb;
						const engine = await this.getEngine(gameId, 1);

						const rrw = row.right_reserve_white ? JSON.parse(row.right_reserve_white) : [];
						const rrb = row.right_reserve_black ? JSON.parse(row.right_reserve_black) : [];
						const rightFen = row.right_fens.split(',').pop();

						const moveData = await this.pickMove(
							fen, availablePieces, lrw, lrb, engine, gameId, leftPlayer, playerTokens, row,
							{ otherBoardFen: rightFen, otherReserveWhite: rrw, otherReserveBlack: rrb }
						);
						if (moveData) {
							await updateGame(moveData, socket, gameSocket, clearRoom);
							didMove = true;
						}
					}
				}

				if (!gameStore[gameId]) break;
				row = await Game.getByID(gameId);
				if (row.status !== 'playing') break;

				if (!game.drawnBoards[2]) {
					const rightTurn = row.right_color_to_play;
					const rightPlayer = rightTurn === 'white' ? 3 : 4;
					if (game.enginePlayers[rightPlayer]) {
						const rrw = row.right_reserve_white ? JSON.parse(row.right_reserve_white) : [];
						const rrb = row.right_reserve_black ? JSON.parse(row.right_reserve_black) : [];
						const fen = row.right_fens.split(',').pop();
						const availablePieces = rightTurn === 'white' ? rrw : rrb;
						const engine = await this.getEngine(gameId, 2);

						const lrw2 = row.left_reserve_white ? JSON.parse(row.left_reserve_white) : [];
						const lrb2 = row.left_reserve_black ? JSON.parse(row.left_reserve_black) : [];
						const leftFen = row.left_fens.split(',').pop();

						const moveData = await this.pickMove(
							fen, availablePieces, rrw, rrb, engine, gameId, rightPlayer, playerTokens, row,
							{ otherBoardFen: leftFen, otherReserveWhite: lrw2, otherReserveBlack: lrb2 }
						);
						if (moveData) {
							await updateGame(moveData, socket, gameSocket, clearRoom);
							didMove = true;
						}
					}
				}

				if (!didMove) break;
				await new Promise(resolve => setTimeout(resolve, 200));
			}
		} catch (err) {
			logger.error(`Engine move error for game ${gameId}: ${err}`);
		} finally {
			if (gameStore[gameId]) gameStore[gameId].triggerRunning = false;
		}
	},

	// builds a uniformly random legal move (or drop) as the fallback when stockfish is unavailable
	randomLegalMove(fen, reserveWhite, reserveBlack, gameId, userPosition, playerTokens) {
		try {
			const g = new Bug(fen);
			g.setReserves(reserveWhite.slice(), reserveBlack.slice());
			const sanMoves = g.moves();
			if (!sanMoves || sanMoves.length === 0) return null;
			const san = sanMoves[Math.floor(Math.random() * sanMoves.length)];

			if (san.includes('@')) {
				const pieceType = san[0].toLowerCase();
				const square = san.slice(2, 4);
				const turnColor = fen.split(' ')[1] === 'w' ? 'white' : 'black';
				return {
					id: gameId, userPosition,
					move: { source: 'spare', target: square, piece: { color: turnColor, role: ROLE_MAP[pieceType] }, promotion: null },
					token: playerTokens[`player${userPosition}Token`]
				};
			}

			const g2 = new Bug(fen);
			g2.setReserves(reserveWhite.slice(), reserveBlack.slice());
			const result = g2.move(san);
			if (!result) return null;
			const toAlg = i => 'abcdefgh'[i & 7] + '87654321'[i >> 4];
			const source = toAlg(result.from);
			const target = toAlg(result.to);
			const piece = getPieceFromFen(fen, source);
			if (!piece) return null;
			return {
				id: gameId, userPosition,
				move: { source, target, piece, promotion: result.promotion || null },
				token: playerTokens[`player${userPosition}Token`]
			};
		} catch (e) {
			logger.error(`Random move fallback failed: ${e}`);
			return null;
		}
	},

	// picks the engine's move for one slot via the drop pipeline, with partner-need coupling across both boards
	async pickMove(fen, availablePieces, reserveWhite, reserveBlack, engine, gameId, userPosition, playerTokens, row, partnerBoardInfo) {
		const teamInfo = getTeamInfo(userPosition);

		let remainingMs = 999999;
		if (row && row.clocks) {
			const parts = String(row.clocks).split(',').map(n => parseInt(n, 10) || 0);
			remainingMs = parts[userPosition - 1] || remainingMs;
		}
		let moveTimeMs;
		if (remainingMs < 30000) {
			moveTimeMs = Math.max(300, Math.floor(remainingMs / 25));
		} else {
			moveTimeMs = 3000;
		}
		moveTimeMs = Math.min(8000, moveTimeMs);

		if (availablePieces && availablePieces.length > 0 && Math.random() < 0.10) {
			const forcedCandidates = generatePrunedDropCandidates(fen, availablePieces, reserveWhite, reserveBlack);
			if (forcedCandidates.length > 0) {
				return this.buildDropMove(forcedCandidates[0].drop, fen, gameId, userPosition, playerTokens);
			}
		}

		if (!engine) {
			logger.error(`No Stockfish engine for game ${gameId} pos ${userPosition}, using random move`);
			return this.randomLegalMove(fen, reserveWhite, reserveBlack, gameId, userPosition, playerTokens);
		}

		let partnerNeed = null;
		let oppPartnerDanger = null;
		if (partnerBoardInfo && partnerBoardInfo.otherBoardFen) {
			try {
				const teammateReserve = teamInfo.teammateColor === 'w'
					? partnerBoardInfo.otherReserveWhite
					: partnerBoardInfo.otherReserveBlack;
				partnerNeed = bughouseEval.computePartnerNeed(
					partnerBoardInfo.otherBoardFen, teammateReserve, teamInfo.teammateColor
				);

				const oppPartnerColor = teamInfo.teammateColor === 'w' ? 'b' : 'w';
				oppPartnerDanger = bughouseEval.computeOpponentPartnerDanger(
					partnerBoardInfo.otherBoardFen, oppPartnerColor
				);
			} catch (e) {
				logger.error(`Partner coupling error: ${e}`);
			}
		}

		let uciMove;
		try {
			uciMove = await engine.getBestMove(fen, moveTimeMs);
		} catch (e) {
			logger.error(`Stockfish getBestMove failed: ${e}, using random move`);
			return this.randomLegalMove(fen, reserveWhite, reserveBlack, gameId, userPosition, playerTokens);
		}
		const normalFen = uciMove && uciMove !== '(none)' ? this.applyUciMove(fen, uciMove) : null;

		if (!availablePieces || availablePieces.length === 0) {
			return this.buildMove(uciMove, fen, gameId, userPosition, playerTokens);
		}

		const topDrops = generatePrunedDropCandidates(fen, availablePieces, reserveWhite, reserveBlack);

		const perTypeLimit = 3;
		const typeCount = {};
		const filteredDrops = [];
		for (const candidate of topDrops) {
			const t = candidate.drop.type;
			typeCount[t] = (typeCount[t] || 0) + 1;
			if (typeCount[t] <= perTypeLimit) {
				filteredDrops.push(candidate);
			}
			if (filteredDrops.length >= 10) break;
		}

		if (filteredDrops.length === 0) {
			return this.buildMove(uciMove, fen, gameId, userPosition, playerTokens);
		}

		let bestScore = Infinity;
		let bestDrop = null;

		if (normalFen) {
			let boardScore = await engine.evaluatePosition(normalFen, 100);
			if (boardScore !== null) {
				const captureBonus = computeCaptureBonus(uciMove, fen, partnerNeed, oppPartnerDanger);
				boardScore -= captureBonus;
				bestScore = boardScore;
			}
		}

		for (const candidate of filteredDrops) {
			const score = await engine.evaluatePosition(candidate.fen, 100);
			if (score !== null) {
				let adjustedScore = score;
				if (candidate.givesCheck) adjustedScore -= 80;
				adjustedScore -= candidate.heuristicScore * 0.5;

				if (adjustedScore < bestScore) {
					bestScore = adjustedScore;
					bestDrop = candidate.drop;
				}
			}
		}

		if (bestDrop) {
			return this.buildDropMove(bestDrop, fen, gameId, userPosition, playerTokens);
		}
		return this.buildMove(uciMove, fen, gameId, userPosition, playerTokens);
	},

	// applies a UCI move to a FEN string and returns the resulting FEN
	applyUciMove(fen, uciMove) {
		if (!uciMove || uciMove === '(none)') return null;
		try {
			const g = new Bug(fen);
			const result = g.move({
				from: uciMove.substring(0, 2),
				to:   uciMove.substring(2, 4),
				promotion: uciMove.length > 4 ? uciMove[4] : undefined
			});
			return result ? g.fen() : null;
		} catch (e) {
			return null;
		}
	},

	// builds the socket move-data payload for a drop
	buildDropMove(drop, fen, gameId, userPosition, playerTokens) {
		const turnColor = fen.split(' ')[1] === 'w' ? 'white' : 'black';
		const tokenKey = `player${userPosition}Token`;
		return {
			id: gameId,
			userPosition,
			move: {
				source: 'spare',
				target: drop.square,
				piece: { color: turnColor, role: ROLE_MAP[drop.type] },
				promotion: null
			},
			token: playerTokens[tokenKey]
		};
	},

	// builds the socket move-data payload for a regular UCI move
	buildMove(uciMove, fen, gameId, userPosition, playerTokens) {
		if (!uciMove || uciMove === '(none)') return null;
		const source = uciMove.substring(0, 2);
		const target = uciMove.substring(2, 4);
		const promotion = uciMove.length > 4 ? uciMove[4] : null;
		const piece = getPieceFromFen(fen, source);
		if (!piece) return null;
		const tokenKey = `player${userPosition}Token`;
		return {
			id: gameId,
			userPosition,
			move: { source, target, piece, promotion },
			token: playerTokens[tokenKey]
		};
	}
};
