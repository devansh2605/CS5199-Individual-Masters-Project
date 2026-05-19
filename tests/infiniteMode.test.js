const infiniteManager = require('../src/server/services/infiniteManager');
const { assert, assertEqual, section, skip, summary, hasStockfishBinary, sleep } = require('./test-utils');

const STOCKFISH_AVAILABLE = !!hasStockfishBinary();

function makeGame(overrides = {}) {
	const opts = Object.assign({
		gameId: 'test-' + Math.random().toString(36).slice(2, 10),
		humanColor: 'white',
		numBoards: 3,
		minutes: 1,
		increment: 0,
		engineElo: 1500,
		humanUserId: 'test-user',
	}, overrides);
	return infiniteManager.createGame(opts);
}

async function destroyGame(game) {
	if (game && typeof game.destroy === 'function') {
		game.status = 'over';
		try { game.destroy(); } catch (e) {}
	}
	await sleep(50);
}

async function waitForInit(game, timeoutMs = 8000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const ready = game.boards.some(b => b.moveEngine && b.moveEngine.started);
		if (ready) return true;
		if (!STOCKFISH_AVAILABLE) return false;
		await sleep(100);
	}
	return false;
}

async function main() {
	section('infiniteMode: construction + init');

	if (!STOCKFISH_AVAILABLE) {
		skip('No Stockfish binary — all infinite-mode integration tests will be limited');
	}

	{
		const game = await makeGame({ numBoards: 3, minutes: 1 });
		assert(game !== null && game.boards.length === 3, 'createGame returns game with 3 boards');
		assertEqual(game.boards[0].isHumanBoard, true, 'board 0 is the human board');
		assertEqual(game.boards[1].isHumanBoard, false, 'board 1 is an engine board');
		assertEqual(game.version, 0, 'initial version is 0');
		assertEqual(game.status, 'playing', 'initial status is playing');
		await destroyGame(game);
	}

	section('infiniteMode: invariants under no activity');

	{
		const game = await makeGame({ numBoards: 2 });
		await sleep(200);
		assertEqual(game.version, 0, 'no activity → version remains 0 (briefly)');
		await destroyGame(game);
	}

	if (!STOCKFISH_AVAILABLE) {
		console.log('\n  Skipping live-engine tests (no Stockfish available)');
		return;
	}

	section('infiniteMode: engines run + version increases');

	{
		const game = await makeGame({ numBoards: 3, minutes: 1, engineElo: 1500 });
		await waitForInit(game);
		const v0 = game.version;
		await sleep(5000);
		assert(game.version > v0, `version increased after engine cycles (${v0} → ${game.version})`);
		const advancedBoards = game.boards.filter(b => b.fen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
		assert(advancedBoards.length >= 1, `at least one board advanced from initial FEN (got ${advancedBoards.length}/3)`);
		await destroyGame(game);
	}

	section('infiniteMode: 3-second pacing');

	{
		const game = await makeGame({ numBoards: 2, minutes: 1, engineElo: 1500 });
		await waitForInit(game);
		const start = Date.now();
		let lastSeen = 0;
		const moveTimes = [];
		while (Date.now() - start < 7000) {
			const b = game.boards[1];
			if (b.lastMoveAt > lastSeen) {
				moveTimes.push(b.lastMoveAt);
				lastSeen = b.lastMoveAt;
			}
			await sleep(100);
		}
		await destroyGame(game);
		let okPaced = true;
		for (let i = 1; i < moveTimes.length; i++) {
			const gap = moveTimes[i] - moveTimes[i - 1];
			if (gap < 1200) { okPaced = false; break; }
		}
		assert(moveTimes.length >= 1, `engine made at least 1 move on board 1 in 7s (got ${moveTimes.length})`);
		assert(okPaced, `consecutive moves on board 1 separated by ≥1.2s (gaps: ${moveTimes.slice(1).map((t,i)=>t-moveTimes[i]).join(',')})`);
	}

	section('infiniteMode: disconnect grace + reconnect');

	{
		const game = await makeGame({ numBoards: 2, minutes: 1 });
		await waitForInit(game);
		game.markHumanDisconnected();
		assert(game.humanDisconnectedAt !== null, 'disconnect timestamp recorded');
		game.markHumanReconnected();
		assertEqual(game.humanDisconnectedAt, null, 'reconnect clears disconnect timestamp');
		await destroyGame(game);
	}

	section('infiniteMode: human move applies + flips turn');

	{
		const game = await makeGame({ numBoards: 2, humanColor: 'white', minutes: 1 });
		await waitForInit(game);
		const startFen = game.boards[0].fen;
		const result = await game.humanMove({ from: 'e2', to: 'e4' });
		assert(result && result.ok, `human e2e4 succeeds (got ${JSON.stringify(result)})`);
		assert(game.boards[0].fen !== startFen, 'board 0 FEN changes after human move');
		assertEqual(game.boards[0].colorToPlay, 'b', 'side-to-move flips to black after white move');
		await destroyGame(game);
	}

	section('infiniteMode: engine drops eventually when reserve has pieces');

	{
		const game = await makeGame({ numBoards: 2, humanColor: 'white', minutes: 5, engineElo: 2500 });
		await waitForInit(game);
		const b1 = game.boards[1];
		b1.fen = '6k1/5ppp/8/8/8/8/3R4/4K3 w - - 0 1';
		b1.colorToPlay = 'w';
		b1.whiteReserve = [{ type: 'q', color: 'w' }];
		b1.lastTimestamp = Date.now();
		b1.lastMoveAt = 0;
		await sleep(5000);
		await destroyGame(game);
		assert(b1.terminated || b1.fen !== '6k1/5ppp/8/8/8/8/3R4/4K3 w - - 0 1',
			`board 1 engine acted on contrived mate position (terminated=${b1.terminated}, fen=${b1.fen})`);
	}

	section('infiniteMode: engine mates the human → game terminates');

	{
		const game = await makeGame({ numBoards: 2, humanColor: 'white', minutes: 5, engineElo: 2500 });
		await waitForInit(game);
		const b0 = game.boards[0];
		b0.fen = 'r6k/8/8/8/8/8/5PPP/6K1 b - - 0 1';
		b0.colorToPlay = 'b';
		b0.whiteReserve = [];
		b0.blackReserve = [];
		b0.lastTimestamp = Date.now();
		b0.lastMoveAt = 0;
		await sleep(6000);
		await destroyGame(game);
		assert(b0.terminated,
			`board 0 terminated after engine delivered mate (terminated=${b0.terminated}, fen=${b0.fen})`);
		assertEqual(game.status, 'over', 'game status flips to "over" when the human board is mated');
		assert(typeof b0.termination === 'string' && b0.termination.toLowerCase().includes('checkmate'),
			`board 0 termination message mentions checkmate (got: ${b0.termination})`);
	}
}

main()
	.catch(e => { console.error(`infiniteMode crashed: ${e.stack || e}`); })
	.finally(async () => {
		await sleep(200);
		const ok = summary();
		process.exit(ok ? 0 : 1);
	});
