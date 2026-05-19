import React, { Component } from 'react';
import { browserHistory } from 'react-router';
import io from 'socket.io-client';
import { Chessground } from 'chessground';
import MiniBoardSvg from '../components/infinite/MiniBoardSvg';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

const PIECE_LABELS = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen' };
const PIECE_SYMBOLS = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' };

function eloLabel(elo) {
	if (elo < 1400) return 'Club Beginner';
	if (elo < 1600) return 'Intermediate';
	if (elo < 1800) return 'Advanced';
	if (elo < 2000) return 'Expert';
	if (elo < 2200) return 'Candidate Master';
	if (elo < 2400) return 'FIDE Master';
	if (elo < 2600) return 'International Master';
	return 'Grandmaster';
}

function formatClock(ms) {
	if (ms <= 0) return '0:00';
	const totalSec = Math.ceil(ms / 1000);
	const m = Math.floor(totalSec / 60);
	const s = totalSec % 60;
	if (m === 0 && totalSec < 10) {
		const ds = Math.floor((ms % 1000) / 100);
		return `0:0${s}.${ds}`;
	}
	return `${m}:${s < 10 ? '0' + s : s}`;
}

function reserveToArray(counts) {
	const arr = [];
	for (const [type, count] of Object.entries(counts)) {
		for (let i = 0; i < (count || 0); i++) arr.push(type);
	}
	return arr;
}

export default class InfiniteGamePage extends Component {
	constructor(props) {
		super(props);
		this.state = {
			gameState: null,
			boards: [],
			clocks: [],
			selectedBoard: 0,
			requestingPiece: null,
			recommendations: null,
			gameOver: false,
			termination: null,
			showAllBoards: false,
			dropModeActive: null,
			connected: false,
			error: null,
		};
		this.socket = null;
		this.cg = null;
		this.boardDomRef = null;
		this.clockInterval = null;
		this.connectTimeout = null;
		this.mounted = false;
		this._lastVersion = 0;
	}

	// setState that no-ops after unmount, avoids the "setState on unmounted component" warning
	_safeSetState(updater, cb) {
		if (!this.mounted) return;
		this.setState(updater, cb);
	}

	// rejects events whose version stamp is older than the last one we applied, prevents flickering on out-of-order arrival
	_isStale(data) {
		if (!data || data.version === undefined || data.version === null) return false;
		if (data.version < this._lastVersion) return true;
		this._lastVersion = data.version;
		return false;
	}

	get gameId() {
		return this.props.params && (this.props.params.splat || this.props.params.gameId);
	}

	get token() {
		return this.props.currentUser && this.props.currentUser.token;
	}

	// connects the /infinite socket, registers every listener, sets up the 10s connect-timeout error fallback
	componentDidMount() {
		this.mounted = true;
		if (!this.token) return browserHistory.push('/auth');

		const target = BACKEND || (typeof window !== 'undefined' ? window.location.origin : '');
		this.socket = io(target + '/infinite', { transports: ['polling', 'websocket'], reconnection: true, timeout: 20000, forceNew: true });

		this.connectTimeout = setTimeout(() => {
			if (!this.state.connected) this._safeSetState({ error: 'Could not connect to game server. Please refresh.' });
		}, 10000);

		this.socket.on('connect', () => {
			this._safeSetState({ connected: true });
			clearTimeout(this.connectTimeout);
			this.socket.emit('join', { gameId: this.gameId, token: this.token });
		});

		this.socket.on('connect_error', () => {
			this._safeSetState({ error: 'Connection failed. Check your network and refresh.' });
		});

		this.socket.on('state', state => {
			if (this._isStale(state)) return;
			const hadBoards = this.state.boards.length > 0;
			this._safeSetState({ gameState: state, boards: state.boards, clocks: state.boards.map(b => ({
				idx: b.idx, whiteClock: b.whiteClock, blackClock: b.blackClock,
				colorToPlay: b.colorToPlay, terminated: b.terminated
			}))}, () => {
				if (!hadBoards || !this.cg) this._initChessground();
				else this._syncChessground();
			});
		});

		this.socket.on('board_update', board => {
			if (this._isStale(board)) return;
			this._safeSetState(prev => {
				const boards = prev.boards.map(b => b.idx === board.idx ? board : b);
				return { boards };
			}, () => {
				if (board.idx === this.state.selectedBoard) this._syncChessground();
			});
		});

		this.socket.on('eval_update', payload => {
			if (this._isStale(payload)) return;
			const { idx, cp, percent } = payload;
			this._safeSetState(prev => ({
				boards: prev.boards.map(b => b.idx === idx ? { ...b, evalCp: cp, evalPercent: percent } : b)
			}));
		});

		this.socket.on('clocks', payload => {
			const clocksArr = Array.isArray(payload) ? payload : (payload && payload.clocks) || [];
			this._safeSetState({ clocks: clocksArr });
		});

		this.socket.on('recommendations', ({ pieceType, recommendations }) => {
			this._safeSetState({ recommendations, requestingPiece: pieceType });
		});

		this.socket.on('board_terminated', payload => {
			if (this._isStale(payload)) return;
			const { idx, termination } = payload;
			this._safeSetState(prev => ({
				boards: prev.boards.map(b => b.idx === idx ? { ...b, terminated: true, termination } : b)
			}));
		});

		this.socket.on('game_over', payload => {
			if (this._isStale(payload)) return;
			this._safeSetState({ gameOver: true, termination: payload.termination });
			if (this.cg) this.cg.stop();
		});

		this.socket.on('move_error', err => {
			this._syncChessground();
		});

		this.socket.on('error', msg => {
			this._safeSetState({ error: msg });
		});
	}

	componentWillReceiveProps(nextProps) {
		const newId = nextProps.params && (nextProps.params.splat || nextProps.params.gameId);
		const oldId = this.gameId;
		if (newId && newId !== oldId) {
			window.location.reload();
		}
	}

	componentWillUnmount() {
		this.mounted = false;
		clearTimeout(this.connectTimeout);
		if (this.socket) {
			if (!this.state.gameOver && this.state.connected && this.gameId && this.token) {
				try { this.socket.emit('resign', { gameId: this.gameId, token: this.token }); } catch (e) {}
			}
			try { this.socket.removeAllListeners(); } catch (e) {}
			this.socket.disconnect();
		}
		if (this.cg) { this.cg.destroy(); this.cg = null; }
		clearInterval(this.clockInterval);
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevState.selectedBoard !== this.state.selectedBoard) {
			this._syncChessground();
		}
	}

	_initChessground() {
		if (!this.boardDomRef) return;
		const { gameState, boards } = this.state;
		if (!gameState || !boards.length) return;

		const humanBoard = boards[0];
		const humanColor = gameState.humanColor;
		const flipped = humanColor === 'black';

		if (this.cg) { this.cg.destroy(); this.cg = null; }

		this.cg = Chessground(this.boardDomRef, {
			fen: humanBoard.fen,
			orientation: humanColor,
			turnColor: humanBoard.colorToPlay === 'w' ? 'white' : 'black',
			movable: {
				free: true,
				color: humanColor,
				dests: undefined,
				events: {
					after: (from, to) => this._onMove(from, to),
					afterNewPiece: (role, to) => this._onDrop(role, to),
				},
			},
			draggable: { enabled: true, showGhost: true },
			predroppable: { enabled: true },
			highlight: { lastMove: true, check: true },
			animation: { enabled: true, duration: 150 },
			events: {
				select: (key) => this._onBoardSelect(key),
			},
		});
	}

	_syncChessground() {
		const { boards, selectedBoard, gameState } = this.state;
		if (!this.cg || !gameState) return;
		const board = boards[selectedBoard];
		if (!board) return;

		const turnColor = board.colorToPlay === 'w' ? 'white' : 'black';
		const humanColor = gameState.humanColor;
		const isHumanBoard = selectedBoard === 0;

		this.cg.set({
			fen: board.fen,
			turnColor,
			movable: {
				color: isHumanBoard && !board.terminated ? humanColor : 'none',
				free: true,
				events: {
					after: (from, to) => this._onMove(from, to),
					afterNewPiece: (role, to) => this._onDrop(role, to),
				},
			},
			draggable: { enabled: isHumanBoard && !board.terminated, showGhost: isHumanBoard },
			events: {
				select: (key) => this._onBoardSelect(key),
			},
		});
	}

	_onMove(from, to) {
		const { gameState } = this.state;
		if (!gameState) return;

		const board = this.state.boards[0];
		if (!board) return;

		const isPawnPromo = this._isPawnPromotion(board.fen, from, to, gameState.humanColor);
		if (isPawnPromo) {
			this.socket.emit('human_move', { gameId: this.gameId, token: this.token, from, to, promotion: 'q' });
		} else {
			this.socket.emit('human_move', { gameId: this.gameId, token: this.token, from, to });
		}
	}

	_onDrop(role, to) {
		const { gameState } = this.state;
		if (!gameState) return;
		this.setState({ dropModeActive: null });

		const typeMap = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
		const type = typeMap[role] || role[0].toLowerCase();

		this.socket.emit('human_move', {
			gameId: this.gameId,
			token: this.token,
			to,
			drop: { piece: type },
		});
	}

	_onBoardSelect(key) {
		const { dropModeActive, gameState, boards, selectedBoard } = this.state;
		if (!dropModeActive || !gameState) return;
		if (selectedBoard !== 0) return;
		const humanBoard = boards[0];
		if (!humanBoard || humanBoard.terminated) return;
		const isHumanTurn = humanBoard.colorToPlay === (gameState.humanColor === 'white' ? 'w' : 'b');
		if (!isHumanTurn) return;

		this.setState({ dropModeActive: null });
		this.socket.emit('human_move', {
			gameId: this.gameId,
			token: this.token,
			to: key,
			drop: { piece: dropModeActive },
		});
	}

	_toggleDropPiece(pieceType) {
		const { gameState, boards } = this.state;
		if (!gameState) return;
		const humanBoard = boards[0];
		if (!humanBoard || humanBoard.terminated) return;
		const isHumanTurn = humanBoard.colorToPlay === (gameState.humanColor === 'white' ? 'w' : 'b');
		if (!isHumanTurn) return;
		const reserve = gameState.humanColor === 'white' ? (humanBoard.whiteReserve || {}) : (humanBoard.blackReserve || {});
		if (!reserve[pieceType] || reserve[pieceType] < 1) return;
		this.setState({ dropModeActive: this.state.dropModeActive === pieceType ? null : pieceType });
	}

	_cancelDropMode() {
		this.setState({ dropModeActive: null });
	}

	_isPawnPromotion(fen, from, to, humanColor) {
		const fenParts = fen.split(' ');
		const rows = fenParts[0].split('/');
		const toRank = parseInt(to[1]);
		const fromFile = from.charCodeAt(0) - 97;
		const fromRank = 8 - parseInt(from[1]);

		let col = 0;
		const row = rows[fromRank];
		for (const ch of row) {
			if (!isNaN(ch)) {
				col += parseInt(ch);
			} else {
				if (col === fromFile) {
					const isPawn = ch.toLowerCase() === 'p';
					const isWhite = ch === 'P';
					if (isPawn && ((isWhite && toRank === 8) || (!isWhite && toRank === 1))) return true;
					return false;
				}
				col++;
			}
		}
		return false;
	}

	requestPiece(pieceType) {
		this.setState({ requestingPiece: pieceType, recommendations: null });
		this.socket.emit('request_piece', { gameId: this.gameId, token: this.token, pieceType });
	}

	executePieceTransfer(sourceBoardIdx) {
		const { requestingPiece } = this.state;
		if (!requestingPiece) return;
		this.socket.emit('transfer_piece', {
			gameId: this.gameId, token: this.token,
			sourceBoardIdx, pieceType: requestingPiece
		});
		this.setState({ requestingPiece: null, recommendations: null });
	}

	cancelRequest() {
		this.setState({ requestingPiece: null, recommendations: null });
	}

	getHumanBoard() {
		return this.state.boards.find(b => b.isHumanBoard) || this.state.boards[0];
	}

	getClock(boardIdx) {
		return this.state.clocks.find(c => c.idx === boardIdx) || null;
	}

	render() {
		const { gameState, boards, clocks, selectedBoard, requestingPiece, recommendations, gameOver, termination, showAllBoards, dropModeActive, connected, error } = this.state;

		if (error) return (
			<div className="bg-bg-base min-h-screen flex items-center justify-center flex-col gap-4">
				<div className="text-red-400 text-sm">{error}</div>
				<button onClick={() => window.location.reload()} className="bg-accent text-white text-xs rounded px-3 py-1.5 hover:bg-orange-400 transition-colors font-medium">Refresh</button>
			</div>
		);

		if (!gameState) return (
			<div className="bg-bg-base min-h-screen flex items-center justify-center">
				<div className="text-text-dim text-sm">{connected ? 'Loading game…' : 'Connecting…'}</div>
			</div>
		);

		const humanColor = gameState.humanColor;
		const humanBoard = this.getHumanBoard();
		const humanClock = this.getClock(0);
		const humanTurnColor = humanBoard ? (humanBoard.colorToPlay === 'w' ? 'white' : 'black') : 'white';
		const isHumanTurn = humanTurnColor === humanColor;

		return (
			<div className="bg-bg-base min-h-screen flex flex-col">
				<div className="bg-bg-card border-b border-border-dim px-4 py-2 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<span className="text-white font-semibold text-sm">Infinite Chess Armada</span>
						<span className="text-text-dim text-xs">{gameState.numBoards} boards · {gameState.minutes}+{gameState.increment}</span>
					{gameState.engineElo && (
						<span className="text-text-dim text-xs border-l border-border-dim pl-3">Engine {gameState.engineElo} - {eloLabel(gameState.engineElo)}</span>
					)}
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => this.setState({ showAllBoards: !showAllBoards })}
							className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${showAllBoards ? 'bg-accent text-white hover:bg-orange-400' : 'bg-bg-panel text-text-main hover:bg-bg-card'}`}
						>
							{showAllBoards ? 'Game View' : 'All Boards'}
						</button>
						<button
							onClick={() => {
								if (window.confirm('Resign this game?')) {
									this.socket.emit('resign', { gameId: this.gameId, token: this.token });
								}
							}}
							className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors font-medium"
						>
							Resign
						</button>
					</div>
				</div>
				{gameOver && (
					<div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70">
						<div className="bg-bg-card border border-border-dim rounded-xl shadow-xl w-full max-w-sm mx-4 p-7 text-center">
							<h2 className="text-xl font-bold text-text-main mb-2">Game Over</h2>
							<p className="text-text-dim text-sm mb-6">{termination}</p>
							<div className="flex flex-col gap-2">
								<button
									onClick={() => browserHistory.push('/infinite/setup')}
									className="bg-white hover:bg-white/90 text-black font-semibold py-2.5 rounded-lg transition-colors"
								>
									New Game
								</button>
								<button
									onClick={() => browserHistory.push('/local')}
									className="bg-bg-panel text-text-main hover:bg-bg-card font-medium py-2.5 rounded-lg transition-colors text-sm"
								>
									Normal Mode
								</button>
							</div>
						</div>
					</div>
				)}
				{showAllBoards ? (
					<div className="flex-1 p-4 overflow-auto">
						<div className="max-w-5xl mx-auto">
							<div className="text-text-dim text-xs uppercase font-semibold tracking-wide mb-4">All {gameState.numBoards} Boards</div>
							<div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
								{boards.map(board => {
									const clock = clocks.find(c => c.idx === board.idx);
									return (
										<div key={board.idx}
											className={`bg-bg-card border rounded-xl p-3 cursor-pointer transition-all ${board.isHumanBoard ? 'border-white/25' : 'border-border-dim hover:border-white/20'} ${board.terminated ? 'opacity-50' : ''}`}
											onClick={() => this.setState({ showAllBoards: false })}
										>
											<div className="flex items-center justify-between mb-2">
												<span className="text-text-dim text-xs font-semibold">Board {board.idx + 1}</span>
												{board.isHumanBoard && <span className="text-white text-xs font-semibold">You</span>}
												{board.terminated && <span className="text-red-400 text-xs">Ended</span>}
											</div>
											<MiniBoardSvg fen={board.fen} evalPercent={board.evalPercent} size={140} terminated={board.terminated} />
											{clock && !board.terminated && (
												<div className="mt-2 flex justify-between text-xs text-text-dim">
													<span className={clock.colorToPlay === 'b' ? 'text-text-main font-bold' : ''}>{formatClock(clock.blackClock)}</span>
													<span className={clock.colorToPlay === 'w' ? 'text-text-main font-bold' : ''}>{formatClock(clock.whiteClock)}</span>
												</div>
											)}
											<div className="mt-1.5 h-1 rounded-full bg-border-dim overflow-hidden">
												<div className="h-full bg-white/35 transition-all" style={{ width: `${board.evalPercent}%` }} />
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				) : (

					<div className="flex flex-col flex-1 overflow-hidden">
						<div className="border-b border-border-dim bg-bg-card flex flex-row overflow-x-auto py-3 px-3 gap-3 shrink-0">
							{boards.map(board => {
								const clock = clocks.find(c => c.idx === board.idx);
								const wReserve = board.whiteReserve || {};
								const bReserve = board.blackReserve || {};
								const myReserve = humanColor === 'white' ? wReserve : bReserve;
								const totalPieces = Object.values(myReserve).reduce((a, b) => a + b, 0);
								return (
									<div key={board.idx}
										style={{ width: `calc((100% - 4 * 0.75rem) / 5)`, minWidth: '180px' }}
										className={`shrink-0 rounded-lg p-2 cursor-pointer border transition-all ${selectedBoard === board.idx ? 'border-white/40 bg-white/10' : board.isHumanBoard ? 'border-white/20 bg-white/5' : 'border-border-dim hover:border-white/20'} ${board.terminated ? 'opacity-40' : ''}`}
										onClick={() => this.setState({ selectedBoard: board.idx })}
									>
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-text-dim text-xs font-medium">Board {board.idx + 1}</span>
											{board.isHumanBoard && <span className="text-white text-xs font-semibold">You</span>}
											{totalPieces > 0 && !board.isHumanBoard && (
												<span className="text-green-400 text-xs font-semibold">+{totalPieces}</span>
											)}
										</div>
										<div className="w-full aspect-square">
											<MiniBoardSvg fen={board.fen} evalPercent={board.evalPercent} size={160} terminated={board.terminated} showEval={false} fill />
										</div>
										{clock && !board.terminated && (
											<div className="mt-1.5 flex justify-between text-xs text-text-dim">
												<span className={clock.colorToPlay === 'b' ? 'text-text-main font-bold' : ''}>{formatClock(clock.blackClock)}</span>
												<span className={clock.colorToPlay === 'w' ? 'text-text-main font-bold' : ''}>{formatClock(clock.whiteClock)}</span>
											</div>
										)}
										<div className="mt-1.5 h-1 rounded-full bg-border-dim overflow-hidden">
											<div className="h-full bg-white/35 transition-all duration-500" style={{ width: `${board.evalPercent}%` }} />
										</div>
									</div>
								);
							})}
						</div>
						<div className="flex flex-1 overflow-hidden">
						<div className="flex-1 flex flex-col items-center justify-center bg-bg-base p-4 min-w-0">
							{selectedBoard !== 0 && (
								<div className="mb-3 flex items-center gap-2 bg-bg-panel border border-white/20 rounded-lg px-3 py-1.5">
									<span className="text-text-dim text-xs">Spectating Board {selectedBoard + 1}</span>
									<button
										onClick={() => this.setState({ selectedBoard: 0 })}
										className="text-white text-xs font-medium hover:underline"
									>
										Back to your board
									</button>
								</div>
							)}
							{selectedBoard === 0 && humanBoard && (
								<div className="mb-2 flex items-center gap-3">
									<div className="flex gap-1 bg-bg-panel border border-border-dim rounded-lg px-2 py-1">
										{(() => {
											const oppColor = humanColor === 'white' ? 'black' : 'white';
											const oppColorChar = oppColor === 'white' ? 'w' : 'b';
											const oppReserve = oppColor === 'white' ? (humanBoard.whiteReserve || {}) : (humanBoard.blackReserve || {});
											const totalOpp = Object.values(oppReserve).reduce((a, b) => a + b, 0);
											if (totalOpp === 0) return <span className="text-text-dim text-xs px-1">Opponent reserve: empty</span>;
											return ['p','n','b','r','q'].map(type => {
												const count = oppReserve[type] || 0;
												if (count === 0) return null;
												return (
													<div key={type} className="relative w-8 h-8" title={`Opponent ${PIECE_LABELS[type]} ×${count}`}>
														<img src={`/app/static/img/pieces/${oppColorChar}${type.toUpperCase()}.svg`}
															style={{ width: '100%', height: '100%' }} alt="" />
														{count > 1 && <span className="absolute bottom-0 right-0 text-[10px] font-bold text-white bg-black/60 rounded px-0.5">×{count}</span>}
													</div>
												);
											});
										})()}
									</div>
									{humanClock && (
										<div className={`px-4 py-1.5 rounded-xl font-mono text-xl font-bold border ${humanTurnColor !== humanColor ? 'bg-bg-panel border-white/20 text-text-main' : 'bg-bg-panel border-border-dim text-text-dim'}`}>
											{formatClock(humanColor === 'white' ? (humanClock.blackClock || 0) : (humanClock.whiteClock || 0))}
										</div>
									)}
								</div>
							)}
							<div
								ref={el => { this.boardDomRef = el; if (el && !this.cg && this.state.gameState) this._initChessground(); }}
								style={{ width: 480, height: 480 }}
								className="rounded-lg overflow-hidden shadow-2xl"
							/>
							{humanBoard && selectedBoard === 0 && (
								<div className="mt-3 flex flex-col items-center gap-1">
									{dropModeActive && (
										<div className="flex items-center gap-2 text-xs text-text-dim mb-1">
											<span>Click a square to drop the {PIECE_LABELS[dropModeActive]}</span>
											<button onClick={() => this._cancelDropMode()} className="text-text-dim hover:text-text-main underline">Cancel</button>
										</div>
									)}
									<div className="flex gap-2 justify-center bg-bg-panel border border-border-dim rounded-lg px-3 py-2">
										{['p','n','b','r','q'].map(type => {
											const reserve = humanColor === 'white' ? (humanBoard.whiteReserve || {}) : (humanBoard.blackReserve || {});
											const count = reserve[type] || 0;
											const available = count > 0;
											const colorChar = humanColor === 'white' ? 'w' : 'b';
											const svg = `/app/static/img/pieces/${colorChar}${type.toUpperCase()}.svg`;
											const selected = dropModeActive === type;
											return (
												<button
													key={type}
													onClick={() => this._toggleDropPiece(type)}
													disabled={!available}
													className={`relative w-14 h-14 rounded border transition-all ${selected ? 'border-white/60 bg-white/10' : 'border-border-dim hover:border-white/30'} ${available ? 'cursor-pointer' : 'cursor-not-allowed'}`}
													title={available ? `Drop ${PIECE_LABELS[type]} (${count} available)` : `No ${PIECE_LABELS[type]} in reserve`}
												>
													<img
														src={svg}
														alt={PIECE_LABELS[type]}
														style={{ width: '100%', height: '100%', opacity: available ? 1 : 0.18, pointerEvents: 'none' }}
													/>
													{count > 1 && (
														<span className="absolute bottom-0 right-1 text-xs font-bold text-white bg-black/60 rounded px-1">×{count}</span>
													)}
												</button>
											);
										})}
									</div>
								</div>
							)}
							{selectedBoard === 0 && humanClock && (
								<div className={`mt-3 px-5 py-2 rounded-xl font-mono text-2xl font-bold border ${isHumanTurn ? 'bg-bg-panel border-white/20 text-text-main' : 'bg-bg-panel border-border-dim text-text-dim'}`}>
									{formatClock(humanColor === 'white' ? (humanClock.whiteClock || 0) : (humanClock.blackClock || 0))}
								</div>
							)}
							{humanBoard && humanBoard.terminated && (
								<div className="mt-3 text-red-400 text-sm font-medium">{humanBoard.termination}</div>
							)}
						</div>
						<div className="w-56 border-l border-border-dim bg-bg-card flex flex-col py-3 px-3 shrink-0 overflow-y-auto">
							<div className="text-text-dim text-xs uppercase font-semibold tracking-wide mb-3">Piece Transfer</div>
							{boards.filter(b => !b.terminated && !b.isHumanBoard).length === 0 ? (
								<p className="text-text-dim text-xs leading-relaxed">All engine boards have finished. No reserves available.</p>
							) : (<div>
							<p className="text-text-dim text-xs mb-4 leading-relaxed">Pick a piece type to receive from another board's reserve. The engine ranks the best boards to take from.</p>
							{!requestingPiece ? (
								<div className="grid grid-cols-3 gap-2 mb-4">
									{Object.entries(PIECE_SYMBOLS).map(([type, sym]) => {
										const totalAvail = boards
											.filter(b => !b.terminated && !b.isHumanBoard)
											.reduce((sum, b) => {
												const r = humanColor === 'white' ? b.whiteReserve : b.blackReserve;
												return sum + ((r && r[type]) || 0);
											}, 0);
										return (
											<button
												key={type}
												onClick={() => this.requestPiece(type)}
												disabled={totalAvail === 0}
												className={`flex flex-col items-center py-2.5 rounded-lg border text-center transition-colors ${totalAvail > 0 ? 'border-border-dim hover:border-border-dim hover:bg-bg-panel cursor-pointer' : 'border-border-dim opacity-30 cursor-not-allowed'}`}
											>
												<span className="text-2xl">{sym}</span>
												<span className="text-text-dim text-xs mt-0.5">{totalAvail > 0 ? `×${totalAvail}` : '-'}</span>
											</button>
										);
									})}
								</div>
							) : (
								<div className="mb-4">
									<div className="flex items-center justify-between mb-3">
										<span className="text-text-main text-sm font-semibold">
											{PIECE_SYMBOLS[requestingPiece]} {PIECE_LABELS[requestingPiece]}
										</span>
										<button onClick={() => this.cancelRequest()} className="text-text-dim hover:text-red-400 text-xs transition-colors">Cancel</button>
									</div>

									{!recommendations ? (
										<div className="text-text-dim text-xs text-center py-4">Analyzing boards…</div>
									) : recommendations.length === 0 ? (
										<div className="text-text-dim text-xs text-center py-4">No board has a {PIECE_LABELS[requestingPiece]} available.</div>
									) : (
										<div className="flex flex-col gap-2">
											{recommendations.map((rec, i) => (
												<button
													key={rec.boardIdx}
													onClick={() => this.executePieceTransfer(rec.boardIdx)}
													className={`w-full text-left p-2.5 rounded-lg border transition-colors ${i === 0 ? 'border-white/20 bg-white/5 hover:bg-white/10' : 'border-border-dim hover:border-white/20 hover:bg-bg-panel'}`}
												>
													<div className="flex items-center justify-between mb-1">
														<span className="text-text-main text-xs font-semibold">{rec.boardLabel}</span>
														{i === 0 && <span className="text-text-main text-xs font-bold">Best</span>}
													</div>
													<div className="h-1.5 rounded-full bg-border-dim overflow-hidden mb-1">
														<div className="h-full bg-white/35" style={{ width: `${rec.adjustedEvalPercent}%` }} />
													</div>
													<div className="text-text-dim text-xs">
														After: {rec.adjustedEvalPercent}% position
													</div>
												</button>
											))}
										</div>
									)}
								</div>
							)}
							<div className="mt-auto">
								<div className="text-text-dim text-xs uppercase font-semibold tracking-wide mb-2">Reserve Overview</div>
								{boards.filter(b => !b.isHumanBoard && !b.terminated).map(board => {
									const r = humanColor === 'white' ? board.whiteReserve : board.blackReserve;
									const pieces = r ? Object.entries(r).filter(([, c]) => c > 0) : [];
									return (
										<div key={board.idx} className="mb-2 bg-bg-panel border border-border-dim rounded-lg px-2.5 py-2">
											<div className="text-text-dim text-xs font-medium mb-1">Board {board.idx + 1}</div>
											{pieces.length === 0 ? (
												<span className="text-text-dim text-xs">Empty</span>
											) : (
												<div className="flex flex-wrap gap-1">
													{pieces.map(([type, count]) => (
														<span key={type} className="text-text-main text-sm" title={PIECE_LABELS[type]}>
															{PIECE_SYMBOLS[type]}{count > 1 ? <sup className="text-xs text-text-dim">{count}</sup> : ''}
														</span>
													))}
												</div>
											)}
										</div>
									);
								})}
							</div>
							</div>)}
						</div>
					</div>
					</div>
				)}
			</div>
		);
	}
}