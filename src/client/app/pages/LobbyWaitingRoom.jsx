import React, { Component } from 'react';
import { browserHistory } from 'react-router';
import io from 'socket.io-client';
import HeaderContainer from '../containers/header/HeaderContainer';
import MiniBoardSvg from '../components/infinite/MiniBoardSvg';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

// maps a numeric Elo to a chess-title label for per-slot engine difficulty
function eloLabel(elo) {
	if (elo < 400) return 'Beginner';
	if (elo < 800) return 'Casual';
	if (elo < 1000) return 'Club Player';
	if (elo < 1320) return 'Pre-Intermediate';
	if (elo < 1600) return 'Intermediate';
	if (elo < 1800) return 'Advanced';
	if (elo < 2000) return 'Expert';
	if (elo < 2200) return 'Candidate Master';
	if (elo < 2400) return 'FIDE Master';
	if (elo < 2600) return 'International Master';
	return 'Grandmaster';
}

const TEAM_CONFIG = {
	1: { label: 'Player 1 (White)', team: 'Team 1', teamClass: 'text-accent', boardLabel: 'Left Board' },
	2: { label: 'Player 2 (Black)', team: 'Team 2', teamClass: 'text-accent-blue', boardLabel: 'Left Board' },
	3: { label: 'Player 3 (White)', team: 'Team 2', teamClass: 'text-accent-blue', boardLabel: 'Right Board' },
	4: { label: 'Player 4 (Black)', team: 'Team 1', teamClass: 'text-accent', boardLabel: 'Right Board' },
};

export default class LobbyWaitingRoom extends Component {
	constructor(props) {
		super(props);
		this.state = {
			lobbyState: null,
			error: '',
			starting: false,
			copied: false,
		};
		this.socket = null;
	}

	get gameId() { return (this.props.params && this.props.params.splat) || (this.props.params && this.props.params.gameId); }
	get token() { return this.props.currentUser && this.props.currentUser.token; }
	get userId() { return this.props.currentUser && this.props.currentUser.id; }

	// joins the /lobby socket room, registers slot/state listeners, routes away if the lobby is missing
	componentDidMount() {
		if (!this.token) { browserHistory.push('/auth'); return; }
		const target = BACKEND || (typeof window !== 'undefined' ? window.location.origin : '');
		this.socket = io(target + '/lobby', { transports: ['polling', 'websocket'], reconnection: true, timeout: 20000 });

		this.socket.on('lobby_state', state => this.setState({ lobbyState: state }));
		this.socket.on('slot_updated', state => this.setState({ lobbyState: state }));
		this.socket.on('game_started', ({ gameId }) => {
			browserHistory.push(`/game/${gameId}`);
		});
		this.socket.on('lobby_error', msg => {
			this.setState({ error: msg, starting: false });
		});
		this.socket.on('connect', () => {
			if (this.roomCode) {
				this.socket.emit('join_room', { roomCode: this.roomCode, gameId: this.gameId, token: this.token });
			}
		});

		fetch(`${BACKEND}/api/lobby/${this.gameId}`)
			.then(r => {
				if (r.status === 400) {
					browserHistory.push(`/game/${this.gameId}`);
					return null;
				}
				if (!r.ok) throw new Error('Failed to load game lobby');
				return r.json();
			})
			.then(state => {
				if (!state) return;
				this.setState({ lobbyState: state });
				this.roomCode = state.roomCode;
				if (this.socket.connected) {
					this.socket.emit('join_room', { roomCode: state.roomCode, gameId: this.gameId, token: this.token });
				}
			})
			.catch(() => this.setState({ error: 'Failed to load game lobby' }));
	}

	componentWillUnmount() {
		if (this.socket) this.socket.disconnect();
	}

	selectSlot(slot, isEngine = false, engineLevel = 1500) {
		if (!this.socket) return;
		this.socket.emit('select_slot', { gameId: this.gameId, slot, isEngine, engineLevel, token: this.token });
	}

	releaseSlot(slot) {
		if (!this.socket) return;
		this.socket.emit('release_slot', { gameId: this.gameId, slot, token: this.token });
	}

	toggleEngine(slot, currentSlot) {
		if (currentSlot.type === 'engine') {
			this.socket.emit('select_slot', { gameId: this.gameId, slot, isEngine: false, token: this.token });
		} else {
			this.selectSlot(slot, true, 1500);
		}
	}

	changeEngineLevel(slot, level) {
		this.socket.emit('select_slot', { gameId: this.gameId, slot, isEngine: true, engineLevel: level, token: this.token });
	}

	// emits the start-game signal once every slot is filled — server flips status to "playing" and broadcasts
	startGame() {
		if (!this.socket) return;
		this.setState({ starting: true, error: '' });
		this.socket.emit('start_game', { gameId: this.gameId, token: this.token });
	}

	copyCode() {
		const code = this.state.lobbyState && this.state.lobbyState.roomCode;
		if (code) { navigator.clipboard.writeText(code); this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 2000); }
	}

	get isCreator() { return !!(this.state.lobbyState && this.state.lobbyState.creatorId === this.userId); }

	get allSlotsFilled() {
		const slots = this.state.lobbyState && this.state.lobbyState.slots;
		if (!slots) return false;
		return [1, 2, 3, 4].every(s => slots[s] && (slots[s].type === 'human' || slots[s].type === 'engine'));
	}

	renderSlot(slotNum) {
		const { lobbyState } = this.state;
		if (!lobbyState) return null;
		const slot = (lobbyState.slots && lobbyState.slots[slotNum]) || { type: 'empty' };
		const cfg = TEAM_CONFIG[slotNum];
		const isMe = slot.type === 'human' && slot.id === this.userId;
		const mySlot = [1, 2, 3, 4].find(s => lobbyState.slots && lobbyState.slots[s] && lobbyState.slots[s].id === this.userId);
		const canTake = !mySlot || mySlot === slotNum;

		return (
			<div className={`bg-bg-panel border rounded-lg p-4 transition-all ${isMe ? 'border-accent' : 'border-border-dim'}`}>
				<div className="flex items-center justify-between mb-3">
					<div>
						<div className="text-text-dim text-xs font-medium">{cfg.label}</div>
						<div className="text-text-dim text-xs">{cfg.boardLabel}</div>
					</div>
					<span className={`text-xs px-2 py-0.5 rounded font-semibold ${cfg.teamClass}`}>{cfg.team}</span>
				</div>

				{slot.type === 'empty' && (
					<button
						onClick={() => canTake && this.selectSlot(slotNum)}
						disabled={!canTake}
						className={`w-full py-2 rounded-lg text-sm font-medium border border-dashed transition-colors ${
							canTake ? 'border-border-dim text-text-dim hover:border-accent hover:text-text-main cursor-pointer' : 'border-border-dim text-text-dim opacity-40 cursor-not-allowed'
						}`}
					>
						{canTake ? '+ Take this seat' : 'Seat taken by you elsewhere'}
					</button>
				)}

				{slot.type === 'human' && (
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className={`w-2 h-2 rounded-full ${isMe ? 'bg-accent' : 'bg-accent-blue'}`} />
							<span className="text-text-main font-medium text-sm">{slot.username}</span>
							<span className="text-text-dim text-xs">{slot.rating}</span>
						</div>
						{isMe && (
							<button
								onClick={() => this.releaseSlot(slotNum)}
								className="text-text-dim hover:text-red-400 text-xs transition-colors"
							>
								Leave
							</button>
						)}
					</div>
				)}

				{slot.type === 'engine' && (
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-text-main text-sm font-medium">Stockfish Engine</span>
							{this.isCreator && (
								<button
									onClick={() => this.toggleEngine(slotNum, slot)}
									className="text-text-dim hover:text-red-400 text-xs transition-colors"
								>
									Remove
								</button>
							)}
						</div>
						{this.isCreator && (
							<div>
								<div className="flex justify-between text-xs text-text-dim mb-1">
									<span>Engine Rating</span>
									<span className="text-text-main font-bold">{slot.level || 1500} <span className="text-text-dim font-normal">({eloLabel(slot.level || 1500)})</span></span>
								</div>
								<input
									type="range" min="0" max="3190" step="50"
									value={slot.level || 1500}
									onChange={e => this.changeEngineLevel(slotNum, parseInt(e.target.value))}
									className="w-full accent-gray-400 cursor-pointer"
								/>
							</div>
						)}
					</div>
				)}
				{slot.type === 'empty' && this.isCreator && (
					<button
						onClick={() => this.selectSlot(slotNum, true, 1500)}
						className="w-full mt-2 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-orange-400 transition-colors"
					>
						Set as Engine
					</button>
				)}
			</div>
		);
	}

	render() {
		const { lobbyState, error, starting, copied } = this.state;
		if (error && !lobbyState) {
			return (
				<div className="bg-bg-base min-h-screen">
					<HeaderContainer />
					<div className="max-w-2xl mx-auto px-6 py-12 text-center text-red-400">{error}</div>
				</div>
			);
		}

		return (
			<div className="bg-bg-base min-h-screen">
				<HeaderContainer />
				<div className="max-w-2xl mx-auto px-6 py-8">
					<div className="flex items-start justify-between mb-6">
						<div>
							<h1 className="text-text-main text-2xl font-bold mb-1">Game Lobby</h1>
							{lobbyState && (
								<p className="text-text-dim text-sm">
									{lobbyState.minutes}+{lobbyState.increment} · Rated
								</p>
							)}
						</div>
						{lobbyState && lobbyState.roomCode && (
							<div className="text-right">
								<div className="text-text-dim text-xs mb-1 font-medium">Room Code</div>
								<button onClick={() => this.copyCode()} className="group flex items-center gap-2">
									<span className="text-3xl font-mono font-bold tracking-widest text-accent">{lobbyState.roomCode}</span>
									<span className="text-text-dim text-xs group-hover:text-text-main transition-colors">
										{copied ? '✓ Copied' : 'Copy'}
									</span>
								</button>
								<div className="text-text-dim text-xs mt-1">Share this with friends</div>
							</div>
						)}
					</div>

					{error && (
						<div className="bg-red-900/20 border border-red-700/40 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
							{error}
						</div>
					)}

					{!lobbyState ? (
						<div className="text-center text-text-dim py-12">Loading lobby…</div>
					) : (
						<div>
							<div className="flex gap-4">
								<div className="flex-1 flex flex-col gap-2">
									<div className="text-center text-xs font-semibold text-text-dim uppercase tracking-wide">Board 1</div>
									{this.renderSlot(2)}
									<div className="rounded-lg overflow-hidden border border-border-dim">
										<MiniBoardSvg fill showEval={false} flipped={false} />
									</div>
									{this.renderSlot(1)}
								</div>
								<div className="flex-1 flex flex-col gap-2">
									<div className="text-center text-xs font-semibold text-text-dim uppercase tracking-wide">Board 2</div>
									{this.renderSlot(3)}
									<div className="rounded-lg overflow-hidden border border-border-dim">
										<MiniBoardSvg fill showEval={false} flipped={true} />
									</div>
									{this.renderSlot(4)}
								</div>
							</div>

							{this.isCreator && (
								<button
									onClick={() => this.startGame()}
									disabled={!this.allSlotsFilled || starting}
									className={`w-full mt-6 py-3 rounded-lg font-semibold text-white text-base transition-colors ${
										this.allSlotsFilled && !starting ? 'bg-accent hover:bg-orange-400 cursor-pointer' : 'bg-bg-panel text-text-dim cursor-not-allowed'
									}`}
								>
									{starting ? 'Starting…' : this.allSlotsFilled ? 'Start Game' : 'Fill all seats to start'}
								</button>
							)}

							{!this.isCreator && (
								<div className="mt-6 text-center text-text-dim text-sm py-3 border border-border-dim rounded-lg">
									Waiting for the host to start the game…
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		);
	}
}