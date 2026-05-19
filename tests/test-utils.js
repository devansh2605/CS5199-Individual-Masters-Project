const fs = require('fs');
const { execSync } = require('child_process');

const state = { passed: 0, failed: 0, skipped: 0 };

function assert(condition, message) {
	if (condition) {
		state.passed++;
		console.log(`  PASS: ${message}`);
	} else {
		state.failed++;
		console.log(`  FAIL: ${message}`);
	}
}

function assertEqual(actual, expected, message) {
	if (actual === expected) {
		state.passed++;
		console.log(`  PASS: ${message}`);
	} else {
		state.failed++;
		console.log(`  FAIL: ${message} (expected ${expected}, got ${actual})`);
	}
}

function assertNear(actual, expected, tolerance, message) {
	if (Math.abs(actual - expected) <= tolerance) {
		state.passed++;
		console.log(`  PASS: ${message} (${actual} ≈ ${expected})`);
	} else {
		state.failed++;
		console.log(`  FAIL: ${message} (expected ${expected} ± ${tolerance}, got ${actual})`);
	}
}

function section(name) {
	console.log(`\n=== ${name} ===`);
}

function skip(message) {
	state.skipped++;
	console.log(`  SKIP: ${message}`);
}

function summary() {
	console.log(`Results: ${state.passed} passed, ${state.failed} failed, ${state.skipped} skipped, ${state.passed + state.failed + state.skipped} total`);
	return state.failed === 0;
}

function getCounters() { return { ...state }; }
function resetCounters() { state.passed = 0; state.failed = 0; state.skipped = 0; }

function applyMoves(bug, sanList) {
	for (const san of sanList) {
		const result = bug.move(san);
		if (!result) throw new Error(`Move failed: ${san}`);
	}
	return bug;
}

function buildReserves(spec) {
	const arr = [];
	for (const [type, count] of Object.entries(spec)) {
		for (let i = 0; i < count; i++) arr.push(type);
	}
	return arr;
}

function withTimeout(promise, ms, label) {
	return Promise.race([
		promise,
		new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label || 'op'} after ${ms}ms`)), ms)),
	]);
}

function hasStockfishBinary() {
	const candidates = process.platform === 'darwin'
		? ['/opt/homebrew/bin/stockfish', '/usr/local/bin/stockfish', '/usr/bin/stockfish']
		: ['/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish'];
	for (const p of candidates) {
		try { if (fs.existsSync(p)) return p; } catch (e) {}
	}
	try {
		const which = execSync('which stockfish 2>/dev/null', { encoding: 'utf8' }).trim();
		if (which && fs.existsSync(which)) return which;
	} catch (e) {}
	return null;
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
	assert, assertEqual, assertNear, section, skip, summary,
	getCounters, resetCounters,
	applyMoves, buildReserves, withTimeout, hasStockfishBinary, sleep,
};
