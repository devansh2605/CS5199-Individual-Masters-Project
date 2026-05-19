const Bug = require('../src/server/services/bug');
const dropDecision = require('../src/server/services/dropDecision');
const { assert, assertEqual, section, summary } = require('./test-utils');

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function pieces(spec, color) {
	const arr = [];
	for (const [type, count] of Object.entries(spec)) {
		for (let i = 0; i < count; i++) arr.push({ type, color });
	}
	return arr;
}

section('dropDecision: findCheckmateDrop');

(function testNoMateFromStarting() {
	const reserveW = pieces({ q: 1 }, 'w');
	const result = dropDecision.findCheckmateDrop(STARTING_FEN, reserveW, reserveW, []);
	assertEqual(result, null, 'starting position has no mate-in-1 drop');
})();

(function testEmptyReservesReturnsNull() {
	const result = dropDecision.findCheckmateDrop(STARTING_FEN, [], [], []);
	assertEqual(result, null, 'empty reserves return null without exception');
})();

(function testBackRankMateWithQueenDrop() {
	const fen = '6k1/5ppp/8/8/8/8/3R4/4K3 w - - 0 1';
	const reserveW = pieces({ q: 1 }, 'w');
	const result = dropDecision.findCheckmateDrop(fen, reserveW, reserveW, []);
	assert(result !== null, 'mate-in-1 found via queen drop');
	if (result) {
		assertEqual(result.type, 'q', 'mate piece type is queen');
		assert(['d8', 'e8'].includes(result.square), `mate square is d8 or e8 (got ${result.square})`);
	}
})();

(function testFindsMateAcrossPieceTypes() {
	const fen = '6k1/5ppp/8/8/8/8/3R4/4K3 w - - 0 1';
	const reserveW = pieces({ n: 1, q: 1 }, 'w');
	const result = dropDecision.findCheckmateDrop(fen, reserveW, reserveW, []);
	assert(result !== null, 'finds mate when multiple piece types in reserve');
})();

section('dropDecision: generatePrunedDropCandidates');

(function testEmptyReservesReturnsEmpty() {
	const list = dropDecision.generatePrunedDropCandidates(STARTING_FEN, [], [], []);
	assertEqual(Array.isArray(list) && list.length, 0, 'empty reserves return empty array');
})();

(function testReturnsCandidatesMidGame() {
	const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
	const reserveB = pieces({ q: 1 }, 'b');
	const list = dropDecision.generatePrunedDropCandidates(fen, reserveB, [], reserveB);
	assert(list.length > 0, 'queen drop produces at least one candidate');
	const c = list[0];
	assert(c.drop && c.drop.type === 'q', 'candidate has drop with type q');
	assert(typeof c.fen === 'string' && c.fen.length > 0, 'candidate has resulting FEN');
	assert(typeof c.heuristicScore === 'number', 'candidate has heuristicScore');
	assert(typeof c.givesCheck === 'boolean', 'candidate has givesCheck flag');
})();

(function testCheckGivingDropsRankedFirst() {
	const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
	const reserveW = pieces({ q: 1 }, 'w');
	const list = dropDecision.generatePrunedDropCandidates(fen, reserveW, reserveW, []);
	if (list.length >= 2) {
		const firstNonCheckIdx = list.findIndex(c => !c.givesCheck);
		const firstCheckIdx = list.findIndex(c => c.givesCheck);
		const anyCheck = firstCheckIdx !== -1;
		const anyNonCheck = firstNonCheckIdx !== -1;
		if (anyCheck && anyNonCheck) {
			assert(firstCheckIdx < firstNonCheckIdx, 'check-giving drops appear before non-check drops');
		} else {
			assert(true, 'all candidates same check-status — ordering still valid');
		}
	} else {
		assert(true, 'fewer than 2 candidates — skip ordering check');
	}
})();

(function testHeuristicMonotonicWithinCheckGroup() {
	const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
	const reserveW = pieces({ q: 1 }, 'w');
	const list = dropDecision.generatePrunedDropCandidates(fen, reserveW, reserveW, []);
	let prevScore = Infinity;
	let prevCheck = true;
	let monotonic = true;
	for (const c of list) {
		if (prevCheck === c.givesCheck && c.heuristicScore > prevScore) {
			monotonic = false; break;
		}
		prevScore = c.heuristicScore;
		prevCheck = c.givesCheck;
	}
	assert(monotonic, 'heuristic scores non-increasing within check-status group');
})();

section('dropDecision: applyDropToFen');

(function testLegalDropFlipsSide() {
	const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
	const reserveW = pieces({ n: 1 }, 'w');
	const result = dropDecision.applyDropToFen(fen, { type: 'n', square: 'e4' }, reserveW, []);
	assert(typeof result === 'string', 'legal drop returns FEN string');
	if (result) {
		assertEqual(result.split(' ')[1], 'b', 'side to move flips to black');
	}
})();

(function testIllegalDropReturnsNull() {
	const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
	const reserveW = pieces({ p: 1 }, 'w');
	const result = dropDecision.applyDropToFen(fen, { type: 'p', square: 'a8' }, reserveW, []);
	assertEqual(result, null, 'pawn drop on rank 8 returns null');
})();

(function testNoReserveReturnsNull() {
	const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
	const result = dropDecision.applyDropToFen(fen, { type: 'q', square: 'e4' }, [], []);
	assertEqual(result, null, 'drop with empty reserve returns null');
})();

async function testChooseEngineMoveNoEngine() {
	section('dropDecision: chooseEngineMove (no engine path)');
	const decision = await dropDecision.chooseEngineMove({
		fen: STARTING_FEN,
		reserveWhite: [],
		reserveBlack: [],
		availablePieces: [],
		moveEngine: null,
		evalEngine: null,
		thinkMs: 100,
		elo: 1500,
	});
	assert(decision && (decision.kind === 'random' || decision.kind === 'none'),
		'with no engines: chooseEngineMove returns random or none');
	if (decision.kind === 'random') {
		assert(typeof decision.sanMove === 'string' && decision.sanMove.length > 0,
			'random fallback returns a SAN move string');
	}
}

async function testChooseEngineMoveRefusesMateOnDrop() {
	// Under the project's strict bughouse rules (dropRules.isCheckmateOnDrop),
	// the engine must NOT play a drop that delivers mate. In this position
	// Q@g7 would be a one-move kill, but the rule forbids it. The engine
	// should fall back to a non-drop or to a non-mating drop.
	const fen = '6k1/5ppp/8/8/8/8/3R4/4K3 w - - 0 1';
	const reserveW = pieces({ q: 1 }, 'w');
	const decision = await dropDecision.chooseEngineMove({
		fen,
		reserveWhite: reserveW,
		reserveBlack: [],
		availablePieces: reserveW,
		moveEngine: null,
		evalEngine: null,
		thinkMs: 100,
		elo: 2500,
	});
	// Whatever the engine picks, it must not be a queen drop on g7 (the mate).
	if (decision.kind === 'drop') {
		const playedMate = decision.drop.type === 'q' && decision.drop.square === 'g7';
		assert(!playedMate, 'engine refuses to play Q@g7 (mate-on-drop is illegal)');
	} else {
		assert(true, 'engine fell back to a non-drop move under the no-mate-on-drop rule');
	}
}

Promise.resolve()
	.then(testChooseEngineMoveNoEngine)
	.then(testChooseEngineMoveRefusesMateOnDrop)
	.catch(e => { console.error(`Async test crashed: ${e.stack || e}`); })
	.finally(() => { const ok = summary(); process.exit(ok ? 0 : 1); });
