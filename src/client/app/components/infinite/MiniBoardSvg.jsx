import React from 'react';

const PIECE_UNICODE = {
	K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
	k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const LIGHT_SQ = '#f0d9b5';
const DARK_SQ  = '#b58863';

// parses the placement field of a FEN into a flat 64-cell array of pieces or null
function parseFen(fen) {
	const rows = fen.split(' ')[0].split('/');
	const board = [];
	for (const row of rows) {
		const cells = [];
		for (const ch of row) {
			if (!isNaN(ch)) {
				for (let i = 0; i < parseInt(ch); i++) cells.push(null);
			} else {
				cells.push(ch);
			}
		}
		board.push(cells);
	}
	return board;
}

// renders an SVG mini-board for a sibling board in infinite mode, with optional eval bar and grey-out on terminated
export default function MiniBoardSvg({ fen, evalPercent = 50, size = 120, flipped = false, terminated = false, fill = false, showEval = true }) {
	const sq = Math.floor(size / 8);
	const boardSize = sq * 8;
	const evalBarHeight = 6;
	const totalH = showEval ? boardSize + evalBarHeight + 2 : boardSize;

	const board = parseFen(fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

	const squares = [];
	for (let r = 0; r < 8; r++) {
		for (let f = 0; f < 8; f++) {
			const dispR = flipped ? 7 - r : r;
			const dispF = flipped ? 7 - f : f;
			const piece = board[r][f];
			const isLight = (r + f) % 2 === 0;
			const x = dispF * sq;
			const y = dispR * sq;

			squares.push(
				<rect key={`sq-${r}-${f}`} x={x} y={y} width={sq} height={sq}
					fill={isLight ? LIGHT_SQ : DARK_SQ} />
			);

			if (piece) {
				squares.push(
					<text key={`pc-${r}-${f}`} x={x + sq / 2} y={y + sq / 2 + 1}
						textAnchor="middle" dominantBaseline="central"
						fontSize={sq * 0.72} fill={piece === piece.toUpperCase() ? '#fff' : '#1a1a1a'}
						stroke={piece === piece.toUpperCase() ? '#333' : '#ccc'}
						strokeWidth="0.4"
						style={{ userSelect: 'none', pointerEvents: 'none' }}
					>
						{PIECE_UNICODE[piece] || ''}
					</text>
				);
			}
		}
	}

	const whiteBarW = Math.round((evalPercent / 100) * boardSize);

	return (
		<svg width={fill ? '100%' : size} height={fill ? undefined : totalH}
			viewBox={`0 0 ${boardSize} ${totalH}`}
			style={{ display: 'block', borderRadius: 4, overflow: 'hidden', opacity: terminated ? 0.5 : 1, ...(fill ? { aspectRatio: `${boardSize} / ${totalH}` } : {}) }}>
			{squares}
			{showEval && (
				<g>
					<rect x={0} y={boardSize + 2} width={boardSize} height={evalBarHeight} fill="#333" rx={2} />
					<rect x={0} y={boardSize + 2} width={whiteBarW} height={evalBarHeight} fill="#f0f0f0" rx={2} />
					<rect x={boardSize / 2 - 0.5} y={boardSize + 2} width={1} height={evalBarHeight} fill="#888" />
				</g>
			)}
		</svg>
	);
}