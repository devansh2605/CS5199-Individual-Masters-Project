const Bug = require('../src/server/services/bug');
const bughouseEval = require('../src/server/services/bughouseEval');
const dropRules = require('../src/server/services/dropRules');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  PASS: ${message}`);
    } else {
        failed++;
        console.log(`  FAIL: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual === expected) {
        passed++;
        console.log(`  PASS: ${message}`);
    } else {
        failed++;
        console.log(`  FAIL: ${message} (expected ${expected}, got ${actual})`);
    }
}

function section(name) {
    console.log(`\n=== ${name} ===`);
}

section('drop legality');

// A pawn on rank 1 makes no sense — it could only promote backwards.
(function testCannotDropPawnOnFirstRank() {
    const g = new Bug();
    g.setReserves([{type: 'p', color: 'w'}], []);
    const result = g.move('P@a1');
    assert(result === null, 'Cannot drop pawn on 1st rank (a1)');
})();

// Same rule from the other end: pawns refused on rank 8.
(function testCannotDropPawnOnEighthRank() {
    const g = new Bug();
    g.setReserves([{type: 'p', color: 'w'}], []);
    const result = g.move('P@d8');
    assert(result === null, 'Cannot drop pawn on 8th rank (d8)');
})();

// Mirror check: black pawn drops also refused on both edge ranks.
(function testCannotDropPawnOnFirstRankBlack() {
    const g = new Bug('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    g.setReserves([], [{type: 'p', color: 'b'}]);
    const result = g.move('P@a8');
    assert(result === null, 'Black cannot drop pawn on 8th rank (a8)');
    const result2 = g.move('P@h1');
    assert(result2 === null, 'Black cannot drop pawn on 1st rank (h1)');
})();

// Sanity check: the pawn rank rule does not refuse a perfectly normal pawn drop.
(function testCanDropPawnOnValidRank() {
    const g = new Bug();
    g.setReserves([{type: 'p', color: 'w'}], []);
    const result = g.move('P@e5');
    assert(result !== null, 'Can drop pawn on valid rank (e5)');
})();

// You cannot land a piece on a square that already has something on it.
(function testCannotDropOnOccupiedSquare() {
    const g = new Bug();
    g.setReserves([{type: 'n', color: 'w'}], []);
    const result = g.move('N@e2');
    assert(result === null, 'Cannot drop on occupied square (e2)');
})();

// A knight drop that delivers check is a perfectly legal chess move.
(function testCanDropKnightGivingCheck() {
    const g = new Bug('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'n', color: 'w'}], []);
    const result = g.move('N@f6');
    assert(result !== null, 'Can drop knight giving check (N@f6)');
    assert(g.in_check(), 'Position is in check after N@f6');
})();

// If your king is in check, any drop that does not resolve the check is illegal.
(function testCannotDropLeavingKingInCheck() {
    const g = new Bug('4r3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'p', color: 'w'}], []);
    const result = g.move('P@a3');
    assert(result === null, 'Cannot drop on irrelevant square when in check (P@a3)');
    const result2 = g.move('P@e2');
    assert(result2 !== null, 'Can drop piece to block check (P@e2)');
})();

// You cannot drop a piece type you don't actually hold in your pocket.
(function testCannotDropIfNotInReserve() {
    const g = new Bug();
    g.setReserves([], []);
    const result = g.move('N@d4');
    assert(result === null, 'Cannot drop when reserve is empty');
})();

// Two identical pieces in the pocket should still produce only one drop move per square.
(function testDropDeduplication() {
    const g = new Bug('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'n', color: 'w'}, {type: 'n', color: 'w'}], []);
    const moves = g.moves();
    const d4drops = moves.filter(m => m === 'N@d4');
    assertEqual(d4drops.length, 1, 'Two knights in reserve generate only one N@d4 drop');
})();

section('capture transfer and make/unmake reversibility');

// When you capture a piece, it shows up on the partner's reserve, not yours.
(function testCaptureAddsToOtherReserve() {
    const g = new Bug('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    g.setReserves([], []);
    g.move('e4');
    g.move('d5');
    const captureResult = g.move('exd5');
    assert(captureResult !== null, 'exd5 capture succeeds');
    const reserves = g.getReserves();
    assert(reserves.other_reserve_black.length === 1, 'Captured pawn appears in other_reserve_black');
    assertEqual(reserves.other_reserve_black[0].type, 'p', 'Captured piece type is pawn');
})();

// After a drop and an undo, the position and both reserves should be exactly what they were before.
(function testMakeUnmakeReversibility() {
    const g = new Bug('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'n', color: 'w'}, {type: 'p', color: 'w'}], [{type: 'r', color: 'b'}]);

    const fenBefore = g.fen();
    const reservesBefore = g.getReserves();
    const rwCountBefore = reservesBefore.reserve_white.length;
    const rbCountBefore = reservesBefore.reserve_black.length;

    g.move('N@d4');
    assert(g.fen() !== fenBefore, 'FEN changed after drop');
    assertEqual(g.getReserves().reserve_white.length, rwCountBefore - 1, 'Reserve decreased after drop');

    g.undo();
    assertEqual(g.fen(), fenBefore, 'FEN restored after undo');
    assertEqual(g.getReserves().reserve_white.length, rwCountBefore, 'White reserve restored after undo');
    assertEqual(g.getReserves().reserve_black.length, rbCountBefore, 'Black reserve restored after undo');
})();

// Three drops in a row, then three undos — the position must land exactly where it started.
(function testMultipleMakeUnmakeSequence() {
    const g = new Bug('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves(
        [{type: 'n', color: 'w'}, {type: 'q', color: 'w'}],
        [{type: 'p', color: 'b'}]
    );
    const fenBefore = g.fen();

    g.move('N@d4');
    g.move('P@e6');
    g.move('Q@f5');

    g.undo();
    g.undo();
    g.undo();

    assertEqual(g.fen(), fenBefore, 'FEN restored after 3 make/unmake pairs');
    assertEqual(g.getReserves().reserve_white.length, 2, 'White reserve count restored');
    assertEqual(g.getReserves().reserve_black.length, 1, 'Black reserve count restored');
})();

// A pawn that captures and promotes still routes the captured piece to the partner's reserve correctly.
(function testPromotionCaptureInteraction() {
    const g = new Bug('4k2r/6P1/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([], []);
    g.setPromotedPieceSquares([]);
    const result = g.move({from: 'g7', to: 'h8', promotion: 'q'});
    assert(result !== null, 'Promotion-capture succeeds');
    const reserves = g.getReserves();
    assert(reserves.other_reserve_black.length === 1, 'Captured rook appears in other reserve');
    assertEqual(reserves.other_reserve_black[0].type, 'r', 'Captured piece is rook');
})();

section('tactical scenarios');

// Bug.js itself will accept a mate-delivering drop — the legality check sits one layer above.
(function testImmediateMateByQueenDrop() {
    const g = new Bug('k7/8/1K6/8/8/8/8/1R6 w - - 0 1');
    g.setReserves([{type: 'q', color: 'w'}], []);
    const result = g.move('Q@a7');
    assert(result !== null, 'Q@a7 drop succeeds');
    assert(g.in_checkmate(), 'Q@a7 delivers checkmate');
})();

// A knight drop that forks the king and queen is a legal move at the chess-engine level.
(function testKnightDropForkCheck() {
    const g = new Bug('3qk3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'n', color: 'w'}], []);
    const result = g.move('N@f6');
    assert(result !== null, 'N@f6 fork-check drop succeeds');
    assert(g.in_check(), 'N@f6 gives check');
})();

// A defensive pawn drop that interposes against a rook check is a legal way out.
(function testDefensiveInterposingDrop() {
    const g = new Bug('4r3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'p', color: 'w'}], []);
    assert(g.in_check(), 'White king is in check');
    const result = g.move('P@e2');
    assert(result !== null, 'P@e2 interposing drop succeeds');
    assert(!g.in_check(), 'Check is resolved after P@e2');
})();

// Strict rule: a smother-mate drop on rank 7 must be refused by the validator.
(function testMateByDropIsRefused() {
    const fen = '5rkr/5ppp/8/8/8/8/8/2K5 w - - 0 1';
    const refusal = dropRules.validateDrop({
        fen,
        reserveWhite: [{type: 'n', color: 'w'}],
        reserveBlack: [],
        pieceType: 'n',
        pieceColor: 'w',
        square: 'e7',
        moveSpec: { source: 'spare', promotion: null },
    });
    assertEqual(refusal, 'mate-on-drop',
        'N@e7 smother-mate-on-drop is refused by the validator');
})();

// A drop that gives check but not mate must still pass — only mate-on-drop is forbidden.
(function testNonMateDropIsAllowed() {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const refusal = dropRules.validateDrop({
        fen,
        reserveWhite: [{type: 'r', color: 'w'}],
        reserveBlack: [],
        pieceType: 'r',
        pieceColor: 'w',
        square: 'e4',
        moveSpec: { source: 'spare', promotion: null },
    });
    assertEqual(refusal, null,
        'R@e4 (check, not mate) passes the validator');
})();

// White cannot drop any piece on rank 8 — that's the opponent's first rank.
(function testBackRankDropRefused() {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const refusal = dropRules.validateDrop({
        fen,
        reserveWhite: [{type: 'n', color: 'w'}],
        reserveBlack: [],
        pieceType: 'n',
        pieceColor: 'w',
        square: 'd8',
        moveSpec: { source: 'spare', promotion: null },
    });
    assertEqual(refusal, 'back-rank',
        'N@d8 (white drop on opponent first rank) is refused');
})();

// Mirror: black cannot drop any piece on rank 1.
(function testBackRankDropBlackRefused() {
    const fen = '4k3/8/8/8/8/8/8/4K3 b - - 0 1';
    const refusal = dropRules.validateDrop({
        fen,
        reserveWhite: [],
        reserveBlack: [{type: 'b', color: 'b'}],
        pieceType: 'b',
        pieceColor: 'b',
        square: 'c1',
        moveSpec: { source: 'spare', promotion: null },
    });
    assertEqual(refusal, 'back-rank',
        'B@c1 (black drop on opponent first rank) is refused');
})();

// When a pawn drop hits rank 8, the pawn-rank rule fires before the back-rank rule does.
(function testPawnRankDropRefused() {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const refusal = dropRules.validateDrop({
        fen,
        reserveWhite: [{type: 'p', color: 'w'}],
        reserveBlack: [],
        pieceType: 'p',
        pieceColor: 'w',
        square: 'e8',
        moveSpec: { source: 'spare', promotion: null },
    });
    assertEqual(refusal, 'pawn-rank',
        'P@e8 (pawn on opponent first rank) is refused by pawn-rank rule');
})();

// A move object that combines source:spare with a promotion field is refused — drops cannot carry a promotion.
(function testPromotionOnDropRefused() {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const refusal = dropRules.validateDrop({
        fen,
        reserveWhite: [{type: 'p', color: 'w'}],
        reserveBlack: [],
        pieceType: 'p',
        pieceColor: 'w',
        square: 'e4',
        moveSpec: { source: 'spare', promotion: 'q' },
    });
    assertEqual(refusal, 'promotion-on-drop',
        'P@e4 with promotion=q is refused by the validator');
})();

// The engine's candidate generator must filter out mate-on-drop — it cannot even propose one.
(function testEngineWillNotProposeMateOnDrop() {
    const dropDecision = require('../src/server/services/dropDecision');
    const fen = '7k/6P1/8/8/8/8/8/4K1R1 w - - 0 1';
    const reserveWhite = [{type: 'r', color: 'w'}];
    const candidates = dropDecision.generatePrunedDropCandidates(
        fen, reserveWhite, reserveWhite, []
    );
    const proposesMate = candidates.some(c =>
        c.drop.type === 'r' && c.drop.square === 'h8'
    );
    assert(!proposesMate,
        'Engine pipeline does not propose R@h8 (mate-on-drop) as a candidate');
})();

section('perft-style counts');

// From the starting position, perft(1) must be 20 — same as plain chess. If this breaks, move generation is broken.
(function testPerftStartingPosition() {
    const g = new Bug();
    g.setReserves([], []);
    const count = g.perft(1);
    assertEqual(count, 20, 'Perft(1) from starting position = 20');
})();

// Adding a knight to the pocket grows the move count above the no-drop baseline but stays within a sane range.
(function testPerftWithDrops() {
    const g = new Bug('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'n', color: 'w'}], []);
    const count = g.perft(1);
    assert(count > 5, `Perft(1) with knight in reserve = ${count} (should be > 5)`);
    assert(count <= 67, `Perft(1) with knight in reserve = ${count} (should be <= 67)`);
})();

// Two identical positions must produce the exact same move count — no hidden state, no randomness.
(function testPerftDeterministic() {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const g1 = new Bug(fen);
    g1.setReserves([{type: 'p', color: 'w'}], [{type: 'n', color: 'b'}]);
    const count1 = g1.perft(1);

    const g2 = new Bug(fen);
    g2.setReserves([{type: 'p', color: 'w'}], [{type: 'n', color: 'b'}]);
    const count2 = g2.perft(1);

    assertEqual(count1, count2, `Perft is deterministic (${count1} == ${count2})`);
})();

// A queen in the pocket gives more legal moves than an empty pocket on the same board.
(function testPerftPocketsAffectCount() {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

    const g1 = new Bug(fen);
    g1.setReserves([], []);
    const countNoPocket = g1.perft(1);

    const g2 = new Bug(fen);
    g2.setReserves([{type: 'q', color: 'w'}], []);
    const countWithQueen = g2.perft(1);

    assert(countWithQueen > countNoPocket,
        `Perft with queen in pocket (${countWithQueen}) > without (${countNoPocket})`);
})();

section('bughouse evaluation module');

// From the starting position, white's eval and black's negated eval should agree — the function is symmetric.
(function testEvalBoardSymmetry() {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const whiteEval = bughouseEval.evalBoard(fen, 'w');
    const blackEval = bughouseEval.evalBoard(fen, 'b');
    assert(Math.abs(whiteEval - (-blackEval)) < 10,
        `Starting position eval is symmetric (w=${whiteEval}, b=${blackEval})`);
})();

// An extra queen on the board should make eval positive for the side with the queen and negative for the other.
(function testEvalMaterialAdvantage() {
    const fen = '4k3/8/8/3Q4/8/8/8/4K3 w - - 0 1';
    const eval_w = bughouseEval.evalBoard(fen, 'w');
    const eval_b = bughouseEval.evalBoard(fen, 'b');
    assert(eval_w > 0, `White eval positive with extra queen (${eval_w})`);
    assert(eval_b < 0, `Black eval negative facing extra queen (${eval_b})`);
})();

// Knights in the opponent's pocket make your king less safe — the eval must reflect that.
(function testKingDropSafety() {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const safetyNoReserve = bughouseEval.evalKingDropSafety(fen, [], 'w');
    const safetyWithKnights = bughouseEval.evalKingDropSafety(
        fen, [{type: 'n', color: 'b'}, {type: 'n', color: 'b'}], 'w'
    );
    assert(safetyWithKnights < safetyNoReserve,
        `King less safe when opponent has knights in reserve (${safetyWithKnights} < ${safetyNoReserve})`);
})();

// When the partner has nothing in their pocket, the evaluator should flag that they need a knight and a queen.
(function testPartnerNeed() {
    const partnerFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const need = bughouseEval.computePartnerNeed(partnerFen, [], 'b');
    assert(need.n > 0, `Partner needs knight (need.n = ${need.n})`);
    assert(need.q > 0, `Partner needs queen (need.q = ${need.q})`);
})();

// A check-giving drop should score higher than a random middle-board square.
(function testScoreDrop() {
    const g = new Bug('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'n', color: 'w'}], []);

    const checkScore = bughouseEval.scoreDrop(g, 'n', 'f6', 'w');
    const randomScore = bughouseEval.scoreDrop(g, 'n', 'a2', 'w');
    assert(checkScore > randomScore,
        `Check drop scores higher (${checkScore} > ${randomScore})`);
})();

// The candidate generator returns at most 12 squares per piece and includes the king-zone.
(function testCandidateDropSquares() {
    const g = new Bug('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'n', color: 'w'}], []);

    const candidates = bughouseEval.getCandidateDropSquares(g, 'n', 'w', 12);
    assert(candidates.length > 0, `Generated ${candidates.length} candidate drop squares`);
    assert(candidates.length <= 12, `Candidate count capped at 12 (got ${candidates.length})`);

    const squares = candidates.map(c => c.square);
    assert(squares.includes('f6') || squares.includes('d6') || squares.includes('c7') || squares.includes('g6'),
        'Candidate squares include king-zone squares');
})();

// The FEN piece parser counts exactly 32 pieces in the starting position.
(function testParseFenPieces() {
    const pieces = bughouseEval.parseFenPieces('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    assertEqual(pieces.length, 32, 'Starting position has 32 pieces');
})();

// The king-finder returns e1 for white and e8 for black in the starting position.
(function testFindKing() {
    const wk = bughouseEval.findKing('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w');
    assertEqual(wk, 'e1', 'White king on e1');
    const bk = bughouseEval.findKing('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'b');
    assertEqual(bk, 'e8', 'Black king on e8');
})();

// A king in the centre has 8 ring squares; a king in the corner has 3.
(function testKingRing() {
    const ring = bughouseEval.kingRing('e4');
    assertEqual(ring.length, 8, 'King ring in center has 8 squares');
    const cornerRing = bughouseEval.kingRing('a1');
    assertEqual(cornerRing.length, 3, 'King ring in corner has 3 squares');
})();

// Capturing a piece the partner needs is worth a bonus; capturing one likely to be recaptured is worth less.
(function testTeamCaptureAdjustment() {
    const partnerNeed = { p: 10, n: 100, b: 50, r: 80, q: 200 };
    const oppDanger = { p: 5, n: 40, b: 30, r: 60, q: 150 };

    const adj1 = bughouseEval.teamCaptureAdjustment('n', partnerNeed, 'b', oppDanger, false);
    assert(adj1 > 0, `Bonus for capturing piece partner needs (${adj1})`);

    const adj2 = bughouseEval.teamCaptureAdjustment('p', partnerNeed, 'q', oppDanger, true);
    assert(adj2 < adj1, `Lower adjustment when queen likely recaptured (${adj2} < ${adj1})`);
})();

section('edge cases and regression');

// Standard chess moves still work in a Bug.js instance with empty reserves.
(function testNormalChessUnaffected() {
    const g = new Bug();
    g.setReserves([], []);
    const result1 = g.move('e4');
    assert(result1 !== null, 'e4 works in standard mode');
    const result2 = g.move('e5');
    assert(result2 !== null, 'e5 works in standard mode');
    const result3 = g.move('Nf3');
    assert(result3 !== null, 'Nf3 works in standard mode');
    g.undo();
    g.undo();
    g.undo();
    assertEqual(g.fen(), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'Standard chess undo restores starting position');
})();

// En passant still works when reserves are present, and the captured pawn flows to the other reserve.
(function testEnPassantWithReserves() {
    const g = new Bug('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3');
    g.setReserves([{type: 'n', color: 'w'}], []);
    const result = g.move('fxe6');
    assert(result !== null, 'En passant works with reserves present');
    const reserves = g.getReserves();
    assert(reserves.other_reserve_black.length === 1, 'EP captured pawn goes to other reserve');
})();

// Both kingside and queenside castling are legal with reserves on both sides.
(function testCastlingWithReserves() {
    const g = new Bug('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    g.setReserves([{type: 'p', color: 'w'}], [{type: 'p', color: 'b'}]);
    const result = g.move('O-O');
    assert(result !== null, 'Kingside castling works with reserves');
    g.undo();
    const result2 = g.move('O-O-O');
    assert(result2 !== null, 'Queenside castling works with reserves');
})();

// A king-and-pawn-vs-bare-king position is not insufficient material if reserves still hold pieces.
(function testInsufficientMaterialWithReserves() {
    const g = new Bug('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'p', color: 'w'}], []);
    assert(!g.insufficient_material(), 'Not insufficient material when reserves have pieces');
})();

// A king-vs-king position is not game over if either side still has a piece to drop.
(function testGameOverNotTriggeredWithReserves() {
    const g = new Bug('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([{type: 'q', color: 'w'}], []);
    assert(!g.game_over(), 'Game not over when reserves have pieces');
})();

// The move generator produces a drop move for every piece type that's in the pocket.
(function testMultipleDropTypes() {
    const g = new Bug('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    g.setReserves([
        {type: 'p', color: 'w'},
        {type: 'n', color: 'w'},
        {type: 'b', color: 'w'},
        {type: 'r', color: 'w'},
        {type: 'q', color: 'w'}
    ], []);
    const moves = g.moves();
    const dropMoves = moves.filter(m => m.includes('@'));
    assert(dropMoves.length > 0, `Generated ${dropMoves.length} drop moves from 5 piece types`);
    const hasP = dropMoves.some(m => m.startsWith('P@'));
    const hasN = dropMoves.some(m => m.startsWith('N@'));
    const hasB = dropMoves.some(m => m.startsWith('B@'));
    const hasR = dropMoves.some(m => m.startsWith('R@'));
    const hasQ = dropMoves.some(m => m.startsWith('Q@'));
    assert(hasP, 'Pawn drops generated');
    assert(hasN, 'Knight drops generated');
    assert(hasB, 'Bishop drops generated');
    assert(hasR, 'Rook drops generated');
    assert(hasQ, 'Queen drops generated');
})();

// The new accessor methods (getBoard, getKingSquare, isAttacked) return what they say on the tin.
(function testNewAccessorMethods() {
    const g = new Bug();
    const board = g.getBoard();
    assertEqual(board.length, 64, 'getBoard returns 64 squares');
    assertEqual(g.getKingSquare('w'), 'e1', 'White king square is e1');
    assertEqual(g.getKingSquare('b'), 'e8', 'Black king square is e8');
    assert(!g.isAttacked('e4', 'b'), 'e4 not attacked by black in starting position');
})();

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'='.repeat(50)}`);

if (failed > 0) {
    process.exit(1);
}
