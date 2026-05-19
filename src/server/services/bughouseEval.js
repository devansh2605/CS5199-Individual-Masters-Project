const Bug = require('./bug');

const PIECE_VALUE = { p: 80, n: 275, b: 275, r: 425, q: 800, k: 0 };

const PST = {
    p: [
        [  0,  0,  0,  0,  0,  0,  0,  0],
        [ 50, 50, 50, 50, 50, 50, 50, 50],
        [ 10, 10, 20, 30, 30, 20, 10, 10],
        [  5,  5, 10, 25, 25, 10,  5,  5],
        [  0,  0,  0, 20, 20,  0,  0,  0],
        [  5, -5,-10,  0,  0,-10, -5,  5],
        [  5, 10, 10,-20,-20, 10, 10,  5],
        [  0,  0,  0,  0,  0,  0,  0,  0]
    ],
    n: [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    b: [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    r: [
        [  0,  0,  0,  5,  5,  0,  0,  0],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [  5, 10, 10, 10, 10, 10, 10,  5],
        [  0,  0,  0,  0,  0,  0,  0,  0]
    ],
    q: [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [ -5,  0,  5,  5,  5,  5,  0, -5],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    k: [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20]
    ]
};

const DROP_CHECK_BONUS = 150;
const DROP_KING_ZONE_BONUS = 40;
const DROP_DEFENSE_BONUS = 30;
const DROP_FORK_BONUS = 100;

const FILES = 'abcdefgh';
const RANKS = '12345678';
const DROPPABLE = ['p', 'n', 'b', 'r', 'q'];

function squareToCoords(sq) {
    return { file: sq.charCodeAt(0) - 97, rank: parseInt(sq[1]) - 1 };
}

function coordsToSquare(f, r) {
    if (f < 0 || f > 7 || r < 0 || r > 7) return null;
    return FILES[f] + RANKS[r];
}

// looks up the piece-square-table value for a piece at a square, flipped for black
function pstLookup(type, square, color) {
    var c = squareToCoords(square);
    var row = color === 'w' ? (7 - c.rank) : c.rank;
    var table = PST[type];
    if (!table) return 0;
    return table[row][c.file];
}

// Chebyshev distance between two squares (max of file-diff and rank-diff)
function chebyshevDist(sq1, sq2) {
    var c1 = squareToCoords(sq1);
    var c2 = squareToCoords(sq2);
    return Math.max(Math.abs(c1.file - c2.file), Math.abs(c1.rank - c2.rank));
}

// returns the 8 squares immediately adjacent to a king
function kingRing(sq) {
    var c = squareToCoords(sq);
    var ring = [];
    for (var df = -1; df <= 1; df++) {
        for (var dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            var s = coordsToSquare(c.file + df, c.rank + dr);
            if (s) ring.push(s);
        }
    }
    return ring;
}

// returns the king-ring plus knight-attack squares — the area drops most want to land in
function kingZone(sq) {
    var c = squareToCoords(sq);
    var zone = {};
    for (var df = -2; df <= 2; df++) {
        for (var dr = -2; dr <= 2; dr++) {
            if (df === 0 && dr === 0) continue;
            var s = coordsToSquare(c.file + df, c.rank + dr);
            if (s) zone[s] = true;
        }
    }
    var knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (var i = 0; i < knightOffsets.length; i++) {
        var s = coordsToSquare(c.file + knightOffsets[i][0], c.rank + knightOffsets[i][1]);
        if (s) zone[s] = true;
    }
    return Object.keys(zone);
}

// parses a FEN string into a flat list of {square, piece} entries
function parseFenPieces(fen) {
    var parts = fen.split(' ');
    var rows = parts[0].split('/');
    var pieces = [];
    for (var r = 0; r < 8; r++) {
        var f = 0;
        for (var c = 0; c < rows[r].length; c++) {
            var ch = rows[r][c];
            if (ch >= '1' && ch <= '8') {
                f += parseInt(ch);
            } else {
                var color = ch === ch.toUpperCase() ? 'w' : 'b';
                var type = ch.toLowerCase();
                var sq = FILES[f] + RANKS[7 - r];
                pieces.push({ square: sq, piece: { type: type, color: color } });
                f++;
            }
        }
    }
    return pieces;
}

// finds the king's square for the given colour in a FEN
function findKing(fen, color) {
    var pieces = parseFenPieces(fen);
    for (var i = 0; i < pieces.length; i++) {
        if (pieces[i].piece.type === 'k' && pieces[i].piece.color === color) {
            return pieces[i].square;
        }
    }
    return null;
}

// sums material plus piece-square-table value from a side's perspective
function evalBoard(fen, sideToEval) {
    var pieces = parseFenPieces(fen);
    var score = 0;

    for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        var val = PIECE_VALUE[p.piece.type] + pstLookup(p.piece.type, p.square, p.piece.color);
        if (p.piece.color === sideToEval) {
            score += val;
        } else {
            score -= val;
        }
    }

    return score;
}

// estimates the latent value of pieces sitting in the reserve, weighted by best drop square in the enemy king-zone
function evalPocketPotential(bug, reserve, sideToEval) {
    if (!reserve || reserve.length === 0) return 0;
    var score = 0;
    var seen = {};
    var fen = bug.fen();
    var enemyColor = sideToEval === 'w' ? 'b' : 'w';
    var enemyKing = findKing(fen, enemyColor);

    for (var i = 0; i < reserve.length; i++) {
        var type = reserve[i].type;
        var bestDropVal = 0;
        if (enemyKing) {
            var zone = kingZone(enemyKing);
            for (var j = 0; j < zone.length; j++) {
                var sq = zone[j];
                if (bug.get(sq) === null) {
                    var rank = sq.charAt(1);
                    if (type === 'p' && (rank === '1' || rank === '8')) continue;
                    var val = pstLookup(type, sq, sideToEval) + DROP_KING_ZONE_BONUS;
                    if (val > bestDropVal) bestDropVal = val;
                }
            }
        }
        score += bestDropVal * 0.5;
    }

    return score;
}

// penalises positions where the opponent's reserve can attack our king through empty ring squares
function evalKingDropSafety(fen, opponentReserve, sideToEval) {
    var ourKing = findKing(fen, sideToEval);
    if (!ourKing) return 0;

    var ring = kingRing(ourKing);
    var emptyCount = 0;
    var pieces = parseFenPieces(fen);
    var occupied = {};
    for (var i = 0; i < pieces.length; i++) {
        occupied[pieces[i].square] = pieces[i].piece;
    }

    for (var i = 0; i < ring.length; i++) {
        if (!occupied[ring[i]]) emptyCount++;
    }

    var penalty = 0;
    penalty += emptyCount * 8;

    if (opponentReserve && opponentReserve.length > 0) {
        var typeCounts = {};
        for (var i = 0; i < opponentReserve.length; i++) {
            var t = opponentReserve[i].type;
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        }
        if (typeCounts['n']) penalty += typeCounts['n'] * emptyCount * 12;
        if (typeCounts['q']) penalty += typeCounts['q'] * emptyCount * 20;
        if (typeCounts['p']) penalty += typeCounts['p'] * emptyCount * 5;
        if (typeCounts['r']) penalty += typeCounts['r'] * emptyCount * 8;
        if (typeCounts['b']) penalty += typeCounts['b'] * emptyCount * 7;
    }

    return -penalty;
}

// scores how badly the partner board would benefit from each piece type, per the enemy king's exposure
function computePartnerNeed(partnerFen, partnerReserve, partnerColor) {
    var need = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    if (!partnerFen) return need;

    var enemyColor = partnerColor === 'w' ? 'b' : 'w';
    var enemyKing = findKing(partnerFen, enemyColor);
    if (!enemyKing) return need;

    var zone = kingZone(enemyKing);
    var pieces = parseFenPieces(partnerFen);
    var occupied = {};
    for (var i = 0; i < pieces.length; i++) {
        occupied[pieces[i].square] = true;
    }

    for (var ti = 0; ti < DROPPABLE.length; ti++) {
        var type = DROPPABLE[ti];

        var alreadyHas = false;
        if (partnerReserve) {
            for (var ri = 0; ri < partnerReserve.length; ri++) {
                if (partnerReserve[ri].type === type) { alreadyHas = true; break; }
            }
        }

        var bestVal = 0;
        for (var j = 0; j < zone.length; j++) {
            var sq = zone[j];
            if (occupied[sq]) continue;
            var rank = sq.charAt(1);
            if (type === 'p' && (rank === '1' || rank === '8')) continue;

            var val = pstLookup(type, sq, partnerColor);
            var dist = chebyshevDist(sq, enemyKing);
            if (dist <= 1 && type !== 'p') val += 50;
            if (type === 'n') {
                var kc = squareToCoords(enemyKing);
                var sc = squareToCoords(sq);
                var df = Math.abs(kc.file - sc.file);
                var dr = Math.abs(kc.rank - sc.rank);
                if ((df === 2 && dr === 1) || (df === 1 && dr === 2)) {
                    val += DROP_CHECK_BONUS;
                }
            }
            if (val > bestVal) bestVal = val;
        }

        need[type] = alreadyHas ? bestVal * 0.5 : bestVal;
    }

    return need;
}

// mirrors computePartnerNeed for the opposing partnership — how much pieces would help them
function computeOpponentPartnerDanger(partnerFen, oppPartnerColor) {
    return computePartnerNeed(partnerFen, [], oppPartnerColor);
}

// scores a single drop candidate by PST, king-zone proximity, check/mate threats and knight forks
function scoreDrop(bug, pieceType, square, sideToMove) {
    var score = 0;
    var enemyColor = sideToMove === 'w' ? 'b' : 'w';
    var fen = bug.fen();
    var enemyKing = findKing(fen, enemyColor);
    var ourKing = findKing(fen, sideToMove);

    score += pstLookup(pieceType, square, sideToMove);

    if (enemyKing) {
        var dist = chebyshevDist(square, enemyKing);

        try {
            var testBug = new Bug(fen);
            var reserves = bug.getReserves();
            testBug.setReserves(
                sideToMove === 'w' ? [{type: pieceType, color: 'w'}] : reserves.reserve_white,
                sideToMove === 'b' ? [{type: pieceType, color: 'b'}] : reserves.reserve_black
            );
            var result = testBug.move(pieceType.toUpperCase() + '@' + square);
            if (result) {
                if (testBug.in_checkmate()) {
                    score += 50000;
                } else if (testBug.in_check()) {
                    score += DROP_CHECK_BONUS;
                    var replies = testBug.moves();
                    if (replies.length <= 3) score += 80;
                    if (replies.length <= 1) score += 120;
                }
            }
        } catch (e) {  }

        if (dist <= 2) score += DROP_KING_ZONE_BONUS;
        if (dist <= 1) score += DROP_KING_ZONE_BONUS;

        if (pieceType === 'n') {
            var knightTargets = getKnightTargets(square);
            var attacksKing = false;
            var attacksHighValue = false;
            for (var i = 0; i < knightTargets.length; i++) {
                var tp = bug.get(knightTargets[i]);
                if (tp && tp.color === enemyColor) {
                    if (tp.type === 'k') attacksKing = true;
                    if (tp.type === 'q' || tp.type === 'r') attacksHighValue = true;
                }
            }
            if (attacksKing && attacksHighValue) score += DROP_FORK_BONUS;
        }
    }

    if (ourKing && bug.in_check()) {
        score += DROP_DEFENSE_BONUS;
    }

    return score;
}

// returns the 8 squares a knight on this square attacks
function getKnightTargets(sq) {
    var c = squareToCoords(sq);
    var offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    var targets = [];
    for (var i = 0; i < offsets.length; i++) {
        var s = coordsToSquare(c.file + offsets[i][0], c.rank + offsets[i][1]);
        if (s) targets.push(s);
    }
    return targets;
}

// gets a ranked list of candidate drop squares for a piece, prioritising the enemy king zone, then our king ring, then centre
function getCandidateDropSquares(bug, pieceType, sideToMove, limit) {
    limit = limit || 12;
    var fen = bug.fen();
    var enemyColor = sideToMove === 'w' ? 'b' : 'w';
    var enemyKing = findKing(fen, enemyColor);
    var ourKing = findKing(fen, sideToMove);
    var candidates = {};

    if (enemyKing) {
        var zone = kingZone(enemyKing);
        for (var i = 0; i < zone.length; i++) {
            if (bug.get(zone[i]) === null) {
                var rank = zone[i].charAt(1);
                if (pieceType === 'p' && (rank === '1' || rank === '8')) continue;
                candidates[zone[i]] = true;
            }
        }
    }

    if (ourKing) {
        var ourRing = kingRing(ourKing);
        for (var i = 0; i < ourRing.length; i++) {
            if (bug.get(ourRing[i]) === null) {
                var rank = ourRing[i].charAt(1);
                if (pieceType === 'p' && (rank === '1' || rank === '8')) continue;
                candidates[ourRing[i]] = true;
            }
        }
    }

    var centralSquares = ['d4','d5','e4','e5','c3','c6','f3','f6','d3','d6','e3','e6'];
    for (var i = 0; i < centralSquares.length; i++) {
        if (Object.keys(candidates).length >= limit * 2) break;
        var sq = centralSquares[i];
        if (bug.get(sq) === null) {
            var rank = sq.charAt(1);
            if (pieceType === 'p' && (rank === '1' || rank === '8')) continue;
            candidates[sq] = true;
        }
    }

    if (pieceType === 'p' && enemyKing) {
        var kc = squareToCoords(enemyKing);
        for (var df = -1; df <= 1; df++) {
            var f = kc.file + df;
            if (f < 0 || f > 7) continue;
            for (var r = 1; r <= 7; r++) {
                var sq = coordsToSquare(f, r);
                if (sq && bug.get(sq) === null) {
                    candidates[sq] = true;
                }
            }
        }
    }

    var scored = Object.keys(candidates).map(function(sq) {
        return { square: sq, score: scoreDrop(bug, pieceType, sq, sideToMove) };
    });
    scored.sort(function(a, b) { return b.score - a.score; });

    return scored.slice(0, limit);
}

// combined position score: board material+PST, pocket potential, opposing king drop-safety penalty
function evalPosition(fen, ourReserve, opponentReserve, sideToEval, partnerInfo) {
    var score = 0;

    score += evalBoard(fen, sideToEval);

    var bug = new Bug(fen);
    score += evalPocketPotential(bug, ourReserve, sideToEval);
    score += evalKingDropSafety(fen, opponentReserve, sideToEval);

    return score;
}

// adjusts a capture's score by partner-benefit and likely-recapture-into-opp-partner cost
function teamCaptureAdjustment(capturedType, partnerNeed, movedPieceType, oppPartnerDanger, likelyRecaptured) {
    var adjustment = 0;
    var LAMBDA = 0.3;
    var MU = 0.25;

    if (partnerNeed && partnerNeed[capturedType]) {
        adjustment += LAMBDA * partnerNeed[capturedType];
    }

    if (likelyRecaptured && oppPartnerDanger && oppPartnerDanger[movedPieceType]) {
        adjustment -= MU * oppPartnerDanger[movedPieceType];
    }

    return adjustment;
}

module.exports = {
    evalPosition: evalPosition,
    evalBoard: evalBoard,
    evalPocketPotential: evalPocketPotential,
    evalKingDropSafety: evalKingDropSafety,
    computePartnerNeed: computePartnerNeed,
    computeOpponentPartnerDanger: computeOpponentPartnerDanger,
    teamCaptureAdjustment: teamCaptureAdjustment,
    scoreDrop: scoreDrop,
    getCandidateDropSquares: getCandidateDropSquares,
    kingRing: kingRing,
    kingZone: kingZone,
    findKing: findKing,
    parseFenPieces: parseFenPieces,
    PIECE_VALUE: PIECE_VALUE,
    DROPPABLE: DROPPABLE
};
