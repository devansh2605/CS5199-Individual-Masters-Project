const StockfishEngine = require('../src/server/services/stockfishEngine');
const { assert, section, skip, summary, hasStockfishBinary } = require('./test-utils');

async function main() {
	section('engineStrength: 1300 vs 2500 sanity');

	if (!hasStockfishBinary()) {
		skip('No Stockfish binary found — skipping engine-strength tests');
		return;
	}

	const positions = [
		{
			fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
			label: 'Italian Game development',
			goodMoves: ['c3', 'b1c3', 'd3', 'd2d3', 'd4', 'd2d4', 'O-O', 'e1g1'],
		},
		{
			fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
			label: 'King-pawn endgame',
			goodMoves: ['e2e4', 'e1d2', 'e1e2', 'e1f2', 'e2e3', 'e1d1', 'e1f1'],
		},
		{
			fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
			label: 'Develop knight',
			goodMoves: ['b1c3', 'd2d3', 'd2d4', 'c3', 'd3', 'd4'],
		},
		{
			fen: 'rnbqkbnr/pp2pppp/8/2pp4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
			label: 'Center pawn capture',
			goodMoves: ['e4d5', 'e4e5', 'd2d4'],
		},
		{
			fen: '4k3/8/8/8/2K5/4Q3/8/8 w - - 0 1',
			label: 'Endgame with overwhelming advantage',
			goodMoves: ['e3', 'c4d5', 'c4c5', 'c4b5', 'e3a3', 'e3a7'],
		},
	];

	const weak = new StockfishEngine(1300);
	const strong = new StockfishEngine(2500);

	try {
		await weak.start();
		await strong.start();
	} catch (e) {
		skip(`Stockfish failed to start: ${e.message}`);
		return;
	}

	let weakHits = 0;
	let strongHits = 0;
	for (const pos of positions) {
		const weakMove = await weak.getBestMove(pos.fen, 200).catch(() => null);
		const strongMove = await strong.getBestMove(pos.fen, 200).catch(() => null);
		const weakOk = weakMove && pos.goodMoves.some(g => weakMove.includes(g));
		const strongOk = strongMove && pos.goodMoves.some(g => strongMove.includes(g));
		if (weakOk) weakHits++;
		if (strongOk) strongHits++;
		console.log(`    ${pos.label}: weak=${weakMove || '?'} (${weakOk ? '✓' : '✗'}), strong=${strongMove || '?'} (${strongOk ? '✓' : '✗'})`);
	}

	weak.quit();
	strong.quit();

	assert(strongHits >= 3, `2500-Elo engine finds good moves in ≥3/5 positions (got ${strongHits}/5)`);
	assert(weakHits >= 1, `1300-Elo engine still finds at least 1 reasonable move (got ${weakHits}/5)`);
}

main()
	.catch(e => { console.error(`engineStrength crashed: ${e.stack || e}`); })
	.finally(() => { const ok = summary(); process.exit(ok ? 0 : 1); });
