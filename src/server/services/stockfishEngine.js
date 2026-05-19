const { spawn, execSync } = require('child_process');
const fs = require('fs');
const logger = require('../logger');

// finds the stockfish binary on mac or linux by probing known paths then falling back to PATH
function resolveStockfishPath() {
	if (process.env.STOCKFISH_PATH) return process.env.STOCKFISH_PATH;
	const candidates = process.platform === 'darwin'
		? ['/opt/homebrew/bin/stockfish', '/usr/local/bin/stockfish', '/usr/bin/stockfish']
		: ['/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish', '/nix/var/nix/profiles/default/bin/stockfish'];
	for (const p of candidates) {
		try { if (fs.existsSync(p)) return p; } catch (e) {}
	}
	try {
		const which = execSync('command -v stockfish || which stockfish', { encoding: 'utf8' }).trim();
		if (which && fs.existsSync(which)) return which;
	} catch (e) {}
	return 'stockfish';
}

const STOCKFISH_PATH = resolveStockfishPath();
logger.log(`Stockfish path resolved to: ${STOCKFISH_PATH}`);
try {
	const raw = execSync(`"${STOCKFISH_PATH}" --help`, { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'pipe'] });
	const ver = (raw || '').split(/\r?\n/)[0].trim();
	logger.log(`Stockfish startup probe: ${ver.slice(0, 200)}`);
} catch (e) {
	logger.error(`Stockfish startup probe failed: ${e.message}`);
}

const SF_ELO_MIN = 1320;
const SF_ELO_MAX = 3190;

class StockfishEngine {
	// constructs a wrapper for a stockfish subprocess at the given target elo
	constructor(elo = 1500) {
		this.process = null;
		this.elo = Math.max(100, Math.min(SF_ELO_MAX, elo));
		this.outputBuffer = '';
		this.started = false;
		this.busy = Promise.resolve();
	}

	get useSkillLevel() { return this.elo < SF_ELO_MIN; }

	// translates a sub-1320 elo into stockfish's 0-20 Skill Level scale
	get skillLevel() { return Math.floor(this.elo * 20 / (SF_ELO_MIN - 1)); }

	// spawns stockfish, runs the UCI handshake, sets strength options, resolves once the engine is ready
	start() {
		return new Promise((resolve, reject) => {
			try {
				this.process = spawn(STOCKFISH_PATH);
			} catch (err) {
				logger.error(`Failed to spawn stockfish: ${err}`);
				return reject(err);
			}

			this.process.stdout.on('data', data => {
				this.outputBuffer += data.toString();
			});

			this.process.stderr.on('data', data => {
				logger.error(`Stockfish stderr: ${data.toString()}`);
			});

			this.process.on('error', err => {
				logger.error(`Stockfish process error: ${err}`);
				this.started = false;
				reject(err);
			});

			this.process.on('exit', () => {
				this.started = false;
			});

			this.send('uci');
			this.waitFor('uciok', 5000).then(() => {
				if (this.useSkillLevel) {
					this.send('setoption name UCI_LimitStrength value false');
					this.send(`setoption name Skill Level value ${this.skillLevel}`);
				} else {
					this.send('setoption name UCI_LimitStrength value true');
					this.send(`setoption name UCI_Elo value ${this.elo}`);
				}
				this.send('setoption name Threads value 1');
				this.send('isready');
				return this.waitFor('readyok', 5000);
			}).then(() => {
				this.started = true;
				resolve();
			}).catch(reject);
		});
	}

	send(command) {
		if (this.process && this.process.stdin.writable) {
			this.process.stdin.write(command + '\n');
		}
	}

	// polls the output buffer for a UCI token, rejects on timeout
	waitFor(token, timeoutMs = 5000) {
		return new Promise((resolve, reject) => {
			const startTime = Date.now();
			const check = () => {
				if (this.outputBuffer.includes(token)) {
					this.outputBuffer = '';
					resolve();
				} else if (Date.now() - startTime > timeoutMs) {
					reject(new Error(`Timeout waiting for ${token}`));
				} else {
					setTimeout(check, 10);
				}
			};
			check();
		});
	}

	// asks stockfish for a best move on a position, serialised against any in-flight call on this engine
	getBestMove(fen, moveTimeMs = 500) {
		const run = () => new Promise((resolve, reject) => {
			if (!this.started) {
				return reject(new Error('Engine not started'));
			}
			this.outputBuffer = '';
			this.send(`position fen ${fen}`);
			this.send(`go movetime ${moveTimeMs}`);

			const startTime = Date.now();
			let stopSent = false;
			const check = () => {
				const lines = this.outputBuffer.split('\n');
				for (const line of lines) {
					if (line.startsWith('bestmove')) {
						const parts = line.trim().split(' ');
						this.outputBuffer = '';
						resolve(parts[1]);
						return;
					}
				}
				const elapsed = Date.now() - startTime;
				if (elapsed > moveTimeMs + 8000) {
					this.outputBuffer = '';
					reject(new Error('Timeout waiting for bestmove'));
					return;
				}
				if (!stopSent && elapsed > moveTimeMs + 3000) {
					this.send('stop');
					stopSent = true;
				}
				setTimeout(check, 20);
			};
			check();
		});
		const next = this.busy.then(() => run().catch(e => { throw e; }), () => run());
		this.busy = next.catch(() => {});
		return next;
	}

	// asks stockfish for a centipawn evaluation of a position, serialised like getBestMove
	evaluatePosition(fen, moveTimeMs = 150) {
		const run = () => new Promise((resolve) => {
			if (!this.started) return resolve(null);
			this.outputBuffer = '';
			this.send(`position fen ${fen}`);
			this.send(`go movetime ${moveTimeMs}`);
			const startTime = Date.now();
			const check = () => {
				const lines = this.outputBuffer.split('\n');
				let score = null;
				for (const line of lines) {
					if (line.startsWith('info') && line.includes('score cp')) {
						const m = line.match(/score cp (-?\d+)/);
						if (m) score = parseInt(m[1], 10);
					} else if (line.startsWith('info') && line.includes('score mate')) {
						const m = line.match(/score mate (-?\d+)/);
						if (m) score = parseInt(m[1], 10) > 0 ? 100000 : -100000;
					}
					if (line.startsWith('bestmove')) {
						return resolve(score);
					}
				}
				if (Date.now() - startTime > moveTimeMs + 3000) return resolve(null);
				setTimeout(check, 20);
			};
			check();
		});
		const next = this.busy.then(run, run);
		this.busy = next.catch(() => {});
		return next;
	}

	// sends UCI quit and kills the subprocess
	quit() {
		if (this.process) {
			this.send('quit');
			this.process.kill();
			this.process = null;
			this.started = false;
		}
	}
}

module.exports = StockfishEngine;
