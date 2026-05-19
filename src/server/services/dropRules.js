// Server-side drop legality. Both the Phase 1 socket handler and the
// Phase 2 InfiniteGame humanMove path go through these predicates before
// any drop is applied. The engine's drop-decision pipeline must also
// respect them — it cannot propose a drop that would be refused here.

const Bug = require('./bug');

// Map the client-side piece "role" string to a chess.js piece-type letter.
function roleToType(role) {
	const lower = (role || '').toLowerCase();
	if (lower === 'pawn') return 'p';
	if (lower === 'knight') return 'n';
	if (lower === 'bishop') return 'b';
	if (lower === 'rook') return 'r';
	if (lower === 'queen') return 'q';
	if (lower === 'king') return 'k';
	return lower.charAt(0);
}

// Rule 1: refuse pawn drops on the 1st or 8th rank.
// (Bug.js also enforces this internally, but checking here lets us return
// a specific reason string for snapback.)
function isPawnRankDrop(pieceType, square) {
	return pieceType === 'p' && (square.charAt(1) === '1' || square.charAt(1) === '8');
}

// Rule 2: refuse any drop on the opponent's first rank, for any piece type.
// White drops cannot land on rank 8; black drops cannot land on rank 1.
function isBackRankDrop(pieceColor, square) {
	const rank = square.charAt(1);
	if (pieceColor === 'w' && rank === '8') return true;
	if (pieceColor === 'b' && rank === '1') return true;
	return false;
}

// Rule 3: refuse a drop that itself triggers promotion. The drop notation
// `P@e4` does not carry a promotion suffix, so we treat any incoming move
// object that has a non-null `promotion` field combined with `source: spare`
// as an illegal promotion-on-drop attempt.
function isPromotionOnDrop(moveSpec) {
	return moveSpec && moveSpec.source === 'spare' && moveSpec.promotion != null;
}

// Rule 4: refuse a drop that gives immediate checkmate. We test by cloning
// the position, applying the drop on the clone, and checking in_checkmate.
// The clone is short-lived so this stays cheap; pre-allocation in hot paths
// is the caller's responsibility (see infiniteManager / dropDecision).
function isCheckmateOnDrop(fen, reserveWhite, reserveBlack, pieceType, square) {
	try {
		const clone = new Bug(fen);
		clone.setReserves(
			(reserveWhite || []).slice(),
			(reserveBlack || []).slice(),
		);
		const result = clone.move(`${pieceType.toUpperCase()}@${square}`);
		if (!result) return false;
		return clone.in_checkmate();
	} catch (e) {
		return false;
	}
}

// Combined validator. Returns null if the drop is legal, or a string reason
// if it is refused. Reason strings: 'pawn-rank', 'back-rank', 'promotion-on-drop',
// 'mate-on-drop'.
function validateDrop({ fen, reserveWhite, reserveBlack, pieceType, pieceColor, square, moveSpec }) {
	if (isPawnRankDrop(pieceType, square)) return 'pawn-rank';
	if (isBackRankDrop(pieceColor, square)) return 'back-rank';
	if (isPromotionOnDrop(moveSpec)) return 'promotion-on-drop';
	if (isCheckmateOnDrop(fen, reserveWhite, reserveBlack, pieceType, square)) return 'mate-on-drop';
	return null;
}

module.exports = {
	roleToType,
	isPawnRankDrop,
	isBackRankDrop,
	isPromotionOnDrop,
	isCheckmateOnDrop,
	validateDrop,
};
