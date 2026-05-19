import React, { Component } from 'react';
import { browserHistory } from 'react-router';
import axios from 'axios';
import HeaderContainer from '../containers/header/HeaderContainer';
import MiniBoardSvg from '../components/infinite/MiniBoardSvg';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

const PRESETS = [
	{ label: '3+0', minutes: 3, increment: 0 },
	{ label: '5+0', minutes: 5, increment: 0 },
	{ label: '5+3', minutes: 5, increment: 3 },
	{ label: '10+0', minutes: 10, increment: 0 },
];

// maps a numeric Elo to a chess-title label for the strength dropdown
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

export default class InfiniteSetupPage extends Component {
	constructor(props) {
		super(props);
		this.state = {
			numBoards: 4,
			humanColor: 'white',
			minutes: 5,
			increment: 0,
			engineElo: 1500,
			creating: false,
			error: '',
		};
	}

	componentDidMount() {
		if (!this.props.currentUser || !this.props.currentUser.token) {
			browserHistory.push('/auth');
		}
	}

	// POSTs the chosen setup to /api/infinite/create then routes to the game page on the returned gameId
	create() {
		const { currentUser } = this.props;
		if (!currentUser || !currentUser.token) return browserHistory.push('/auth');
		const { numBoards, humanColor, minutes, increment, engineElo } = this.state;
		this.setState({ creating: true, error: '' });
		axios.post(`${BACKEND}/api/infinite/create`, {
			token: currentUser.token,
			numBoards,
			humanColor,
			minutes,
			increment,
			engineElo,
		})
		.then(res => {
			browserHistory.push(`/infinite/game/${res.data.gameId}`);
		})
		.catch(err => {
			const msg = (err.response && err.response.data && err.response.data.error) || 'Failed to create game';
			this.setState({ creating: false, error: msg });
		});
	}

	render() {
		const { numBoards, humanColor, minutes, increment, engineElo, creating, error } = this.state;

		return (
			<div className="bg-bg-base min-h-screen">
				<HeaderContainer />
				<div className="max-w-lg mx-auto px-6 py-10">
					<div className="mb-8">
						<h1 className="text-white text-3xl font-bold mb-1">Infinite Chess Armada</h1>
						<p className="text-text-dim text-sm">Play against an unlimited chain of engine boards. Captures flow forward, so your reserve builds up as you play.</p>
					</div>

					{error && (
						<div className="bg-red-900/20 border border-red-700/40 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
							{error}
						</div>
					)}

					<div className="bg-bg-card border border-border-dim rounded-2xl overflow-hidden">
						<div className="px-6 py-5 border-b border-border-dim">
							<div className="flex items-center justify-between mb-3">
								<div>
									<div className="text-text-main font-semibold">Number of Boards</div>
									<div className="text-text-dim text-xs mt-0.5">How many boards play simultaneously</div>
								</div>
								<span className="text-3xl font-bold text-text-main">{numBoards}</span>
							</div>
							<input
								type="range" min={2} max={10} step={1}
								value={numBoards}
								onChange={e => this.setState({ numBoards: parseInt(e.target.value) })}
								className="w-full accent-gray-400 cursor-pointer"
							/>
							<div className="flex justify-between text-xs text-text-dim mt-1">
								<span>2 boards</span><span>10 boards</span>
							</div>
						</div>
						<div className="px-6 py-5 border-b border-border-dim">
							<div className="text-text-main font-semibold mb-3">Your Color on Board 1</div>
							<div className="flex gap-3">
								{['white', 'black'].map(c => (
									<button
										key={c}
										onClick={() => this.setState({ humanColor: c })}
										className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
											humanColor === c
												? 'bg-white/10 border-white/20 text-white'
												: 'bg-bg-panel border-border-dim text-text-dim hover:border-border-dim'
										}`}
									>
										<span>{c === 'white' ? '♔' : '♚'}</span>
										<span className="capitalize">{c}</span>
									</button>
								))}
							</div>
							<div className="mt-3 rounded-lg overflow-hidden border border-border-dim">
								<MiniBoardSvg fill showEval={false} flipped={humanColor === 'black'} />
							</div>
						</div>
						<div className="px-6 py-5 border-b border-border-dim">
							<div className="text-text-main font-semibold mb-3">Time Control (per board)</div>
							<div className="grid grid-cols-4 gap-2 mb-4">
								{PRESETS.map(p => (
									<button
										key={p.label}
										onClick={() => this.setState({ minutes: p.minutes, increment: p.increment })}
										className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
											minutes === p.minutes && increment === p.increment
												? 'bg-white/15 text-white border-white/25'
												: 'bg-bg-panel border-border-dim text-text-dim hover:border-border-dim'
										}`}
									>
										{p.label}
									</button>
								))}
							</div>
							<div className="flex gap-3">
								<div className="flex-1">
									<label className="text-text-dim text-xs font-medium block mb-1">Minutes</label>
									<input
										type="number" min={1} max={60}
										value={minutes}
										onChange={e => this.setState({ minutes: Math.max(1, Math.min(60, parseInt(e.target.value) || 5)) })}
										className="w-full bg-bg-panel border border-border-dim rounded-lg px-3 py-2 text-text-main text-sm focus:outline-none focus:border-white/20"
									/>
								</div>
								<div className="flex-1">
									<label className="text-text-dim text-xs font-medium block mb-1">Increment (sec)</label>
									<input
										type="number" min={0} max={60}
										value={increment}
										onChange={e => this.setState({ increment: Math.max(0, Math.min(60, parseInt(e.target.value) || 0)) })}
										className="w-full bg-bg-panel border border-border-dim rounded-lg px-3 py-2 text-text-main text-sm focus:outline-none focus:border-white/20"
									/>
								</div>
							</div>
						</div>
						<div className="px-6 py-5">
							<div className="flex items-center justify-between mb-1">
								<div className="text-text-main font-semibold">Engine Rating</div>
								<div className="text-right">
									<span className="text-text-main font-bold text-lg">{engineElo}</span>
									<span className="text-text-dim text-xs ml-2">({eloLabel(engineElo)})</span>
								</div>
							</div>
							<div className="text-text-dim text-xs mb-3">FIDE rating scale, controls how strongly the engines play</div>
							<input
								type="range" min={1320} max={3190} step={50}
								value={engineElo}
								onChange={e => this.setState({ engineElo: parseInt(e.target.value) })}
								className="w-full accent-gray-400 cursor-pointer"
							/>
						</div>
					</div>
					<div className="mt-4 bg-bg-panel border border-border-dim rounded-xl px-5 py-4">
						<div className="text-text-dim text-xs uppercase font-semibold tracking-wide mb-2">Game Summary</div>
						<div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
							<div className="text-text-dim">Boards</div><div className="text-text-main font-medium">{numBoards}</div>
							<div className="text-text-dim">Your color</div><div className="text-text-main font-medium capitalize">{humanColor}</div>
							<div className="text-text-dim">Time control</div><div className="text-text-main font-medium">{minutes}+{increment}</div>
							<div className="text-text-dim">Engine rating</div><div className="text-text-main font-medium">{engineElo} ({eloLabel(engineElo)})</div>
						</div>
					</div>

					<button
						onClick={() => this.create()}
						disabled={creating}
						className={`w-full mt-6 py-3.5 rounded-xl font-bold text-base transition-colors ${
							creating ? 'bg-bg-panel text-text-dim cursor-not-allowed' : 'bg-white text-black hover:bg-white/90 cursor-pointer'
						}`}
					>
						{creating ? 'Starting engines…' : `Launch ${numBoards}-Board Game`}
					</button>

					<button
						onClick={() => browserHistory.push('/local')}
						className="w-full mt-3 py-2.5 rounded-xl font-semibold text-text-main text-sm bg-bg-panel hover:bg-bg-card transition-colors"
					>
						Back to Normal Mode
					</button>
				</div>
			</div>
		);
	}
}