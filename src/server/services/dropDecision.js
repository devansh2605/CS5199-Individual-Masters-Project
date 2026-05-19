const Bug = require('./bug');
const bughouseEval = require('./bughouseEval');
const dropRules = require('./dropRules');

// scans the reserve for a piece that can be dropped for mate-in-1, tries king-zone candidates first then the full board
function findCheckmateDrop(fen, availablePieces, reserveWhite, reserveBlack) {
	if (!availablePieces || availablePieces.length === 0) return null;
	const sideToMove = fen.split(' ')[1];
	const uniqueTypes = [...new Set(availablePieces.map(p => p.type))];

	for (const type of uniqueTypes) {
		const candidates = bughouseEval.getCandidateDropSquares(
			(() => { const b = new Bug(fen); b.setReserves(reserveWhite.slice(), reserveBlack.slice()); return b; })(),
			type, sideToMove, 16
		);
		for (const candidate of candidates) {
			try {
				const g = new Bug(fen);
				g.setReserves(reserveWhite.slice(), reserveBlack.slice());
				const result = g.move(`${type.toUpperCase()}@${candidate.square}`);
				if (result && g.in_checkmate()) {
					return { type, square: candidate.square };
				}
			} catch (e) {}
		}
	}

	for (const type of uniqueTypes) {
		for (let f = 0; f < 8; f++) {
			for (let r = 1; r <= 8; r++) {
				const square = String.fromCharCode(97 + f) + r;
				try {
					const g = new Bug(fen);
					g.setReserves(reserveWhite.slice(), reserveBlack.slice());
					const result = g.move(`${type.toUpperCase()}@${square}`);
					if (result && g.in_checkmate()) {
						return { type, square };
					}
				} catch (e) {}
			}
		}
	}
	return null;
}

// returns ranked drop candidates per piece type, check-givers first, capped at 12 per type with the heuristic score attached
function generatePrunedDropCandidates(fen, availablePieces, reserveWhite, reserveBlack) {
	if (!availablePieces || availablePieces.length === 0) return [];
	const sideToMove = fen.split(' ')[1];
	const uniqueTypes = [...new Set(availablePieces.map(p => p.type))];
	const candidates = [];

	for (const type of uniqueTypes) {
		const bug = new Bug(fen);
		bug.setReserves(reserveWhite.slice(), reserveBlack.slice());
		const squares = bughouseEval.getCandidateDropSquares(bug, type, sideToMove, 12);
		for (const sq of squares) {
			try {
				// Drop the candidate if any of the four bughouse rules would refuse it.
				const refusal = dropRules.validateDrop({
					fen,
					reserveWhite,
					reserveBlack,
					pieceType: type,
					pieceColor: sideToMove,
					square: sq.square,
					moveSpec: { source: 'spare', promotion: null },
				});
				if (refusal) continue;

				const g = new Bug(fen);
				g.setReserves(reserveWhite.slice(), reserveBlack.slice());
				const result = g.move(`${type.toUpperCase()}@${sq.square}`);
				if (result) {
					candidates.push({
						drop: { type, square: sq.square },
						fen: g.fen(),
						heuristicScore: sq.score,
						givesCheck: g.in_check()
					});
				}
			} catch (e) {}
		}
	}

	candidates.sort((a, b) => {
		if (a.givesCheck && !b.givesCheck) return -1;
		if (!a.givesCheck && b.givesCheck) return 1;
		return b.heuristicScore - a.heuristicScore;
	});

	return candidates;
}

// applies a single drop to a position and returns the resulting FEN, or null if the drop is illegal
function applyDropToFen(fen, drop, reserveWhite, reserveBlack) {
	try {
		const g = new Bug(fen);
		g.setReserves(reserveWhite.slice(), reserveBlack.slice());
		const result = g.move(`${drop.type.toUpperCase()}@${drop.square}`);
		return result ? g.fen() : null;
	} catch (e) {
		return null;
	}
}

// the probability the engine takes its top heuristic drop without consulting stockfish, scaled by elo
function eloDropBias(elo) {
	const x = (elo - 1320) / 2000;
	return Math.max(0.05, Math.min(0.30, x));
}

// the full drop-decision pipeline: mate scan, elo-biased heuristic short-circuit, stockfish move vs scored drops
async function chooseEngineMove(opts) {
	const {
		fen,
		reserveWhite,
		reserveBlack,
		availablePieces,
		moveEngine,
		evalEngine,
		thinkMs = 3000,
		elo = 1500,
		captureBonusFn = null,
	} = opts;

	const reserves = {
		white: Array.isArray(reserveWhite) ? reserveWhite : [],
		black: Array.isArray(reserveBlack) ? reserveBlack : [],
	};
	const avail = Array.isArray(availablePieces) ? availablePieces : [];

	// Note: mate-on-drop is illegal under the project's bughouse rules
	// (see src/server/services/dropRules.js, isCheckmateOnDrop). The engine
	// is not permitted to propose such a move, so findCheckmateDrop is kept
	// for use elsewhere but is NOT called as a short-circuit here.

	if (avail.length > 0 && Math.random() < eloDropBias(elo)) {
		const list = generatePrunedDropCandidates(fen, avail, reserves.white, reserves.black);
		if (list.length > 0) {
			return { kind: 'drop', drop: list[0].drop, reason: 'heuristic-pick' };
		}
	}

	let uciMove = null;
	if (moveEngine && moveEngine.started) {
		try {
			uciMove = await moveEngine.getBestMove(fen, thinkMs);
		} catch (e) {
			uciMove = null;
		}
	}

	if (!uciMove || uciMove === '(none)') {
		try {
			const g = new Bug(fen);
			g.setReserves(reserves.white.slice(), reserves.black.slice());
			const moves = g.moves();
			if (!moves || moves.length === 0) return { kind: 'none' };
			const san = moves[Math.floor(Math.random() * moves.length)];
			return { kind: 'random', sanMove: san };
		} catch (e) {
			return { kind: 'none' };
		}
	}

	if (avail.length === 0) {
		return { kind: 'move', uciMove };
	}

	if (!evalEngine || !evalEngine.started) {
		return { kind: 'move', uciMove };
	}

	let normalFen = null;
	try {
		const g = new Bug(fen);
		const result = g.move({
			from: uciMove.substring(0, 2),
			to: uciMove.substring(2, 4),
			promotion: uciMove.length >= 5 ? uciMove[4] : undefined,
		});
		if (result) normalFen = g.fen();
	} catch (e) {}

	const drops = generatePrunedDropCandidates(fen, avail, reserves.white, reserves.black);
	const perTypeLimit = 3;
	const typeCount = {};
	const filteredDrops = [];
	for (const c of drops) {
		const t = c.drop.type;
		typeCount[t] = (typeCount[t] || 0) + 1;
		if (typeCount[t] <= perTypeLimit) filteredDrops.push(c);
		if (filteredDrops.length >= 10) break;
	}

	if (filteredDrops.length === 0) return { kind: 'move', uciMove };

	let bestScore = Infinity;
	let bestDrop = null;

	if (normalFen) {
		let score = await evalEngine.evaluatePosition(normalFen, 100);
		if (score !== null && score !== undefined) {
			if (typeof captureBonusFn === 'function') {
				try { score -= captureBonusFn(uciMove, fen); } catch (e) {}
			}
			bestScore = score;
		}
	}

	for (const candidate of filteredDrops) {
		const score = await evalEngine.evaluatePosition(candidate.fen, 100);
		if (score !== null && score !== undefined) {
			let adjusted = score;
			if (candidate.givesCheck) adjusted -= 80;
			adjusted -= candidate.heuristicScore * 0.5;
			if (adjusted < bestScore) {
				bestScore = adjusted;
				bestDrop = candidate.drop;
			}
		}
	}

	if (bestDrop) return { kind: 'drop', drop: bestDrop, reason: 'eval-pick' };
	return { kind: 'move', uciMove };
}

module.exports = {
	findCheckmateDrop,
	generatePrunedDropCandidates,
	applyDropToFen,
	chooseEngineMove,
};
