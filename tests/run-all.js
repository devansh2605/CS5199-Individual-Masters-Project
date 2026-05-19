const { spawnSync } = require('child_process');
const path = require('path');

const FILES = [
	'bughouse.test.js',
	'dropDecision.test.js',
	'elo.test.js',
	'engineStrength.test.js',
	'infiniteMode.test.js',
];

let totalPass = 0;
let totalFail = 0;
let totalSkip = 0;
const fileResults = [];

for (const file of FILES) {
	const filePath = path.join(__dirname, file);
	console.log(`\n#### Running ${file} ####`);
	const start = Date.now();
	const result = spawnSync('node', [filePath], { stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8' });
	const elapsed = Date.now() - start;
	const stdout = result.stdout || '';
	process.stdout.write(stdout);

	const m = stdout.match(/Results:\s+(\d+)\s+passed,\s+(\d+)\s+failed(?:,\s+(\d+)\s+skipped)?/);
	let p = 0, f = 0, s = 0;
	if (m) {
		p = parseInt(m[1], 10) || 0;
		f = parseInt(m[2], 10) || 0;
		s = m[3] ? parseInt(m[3], 10) : 0;
	}
	totalPass += p; totalFail += f; totalSkip += s;
	fileResults.push({ file, pass: p, fail: f, skip: s, exit: result.status, elapsed });
	if (result.status !== 0 && f === 0) {
		console.log(`  ERROR: ${file} exited ${result.status} with no parseable failures (likely a thrown error)`);
		totalFail += 1;
	}
}

console.log('\n               TESTING RESULTS              ');
for (const r of fileResults) {
	const mark = (r.fail === 0 && r.exit === 0) ? 'OK ' : 'FAIL';
	console.log(`  ${mark}  ${r.file.padEnd(28)}  ${String(r.pass).padStart(3)} pass, ${String(r.fail).padStart(2)} fail, ${String(r.skip).padStart(2)} skip   (${r.elapsed}ms)`);
}
console.log('--------------------------------------------------');
console.log(`  TOTAL                          ${String(totalPass).padStart(3)} pass, ${String(totalFail).padStart(2)} fail, ${String(totalSkip).padStart(2)} skip`);

process.exit(totalFail === 0 ? 0 : 1);
