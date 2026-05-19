const { computeEloUpdates } = require('../src/server/lib/elo');
const { assert, assertEqual, assertNear, section, summary } = require('./test-utils');

function profile(id, rating, gamesPlayed) {
	return { id, rating, gamesPlayed };
}

section('elo: basic team1 wins');

(function testTeam1WinAllEqual() {
	const profiles = {
		p1: profile('a', 1500, 50),
		p2: profile('b', 1500, 50),
		p3: profile('c', 1500, 50),
		p4: profile('d', 1500, 50),
	};
	const updates = computeEloUpdates(profiles, 'team1');
	assert(updates[1].delta > 0, 'p1 (team1) gains rating after win');
	assert(updates[4].delta > 0, 'p4 (team1) gains rating after win');
	assert(updates[2].delta < 0, 'p2 (team2) loses rating after loss');
	assert(updates[3].delta < 0, 'p3 (team2) loses rating after loss');
})();

(function testSymmetricEqualRatings() {
	const profiles = {
		p1: profile('a', 1500, 50),
		p2: profile('b', 1500, 50),
		p3: profile('c', 1500, 50),
		p4: profile('d', 1500, 50),
	};
	const updates = computeEloUpdates(profiles, 'team1');
	assertEqual(updates[1].delta, 10, 'p1 gains exactly K/2 = 10 points');
	assertEqual(updates[2].delta, -10, 'p2 loses exactly 10 points');
})();

section('elo: upsets and small gains');

(function testStrongerTeamWinSmallGain() {
	const profiles = {
		p1: profile('a', 2000, 50),
		p2: profile('b', 1500, 50),
		p3: profile('c', 1500, 50),
		p4: profile('d', 2000, 50),
	};
	const updates = computeEloUpdates(profiles, 'team1');
	assert(updates[1].delta > 0 && updates[1].delta < 10, `team1 (2000) win over team2 (1500) gives small positive (got ${updates[1].delta})`);
})();

(function testWeakerTeamUpsetLargeGain() {
	const profiles = {
		p1: profile('a', 1500, 50),
		p2: profile('b', 2000, 50),
		p3: profile('c', 2000, 50),
		p4: profile('d', 1500, 50),
	};
	const updates = computeEloUpdates(profiles, 'team1');
	assert(updates[1].delta > 10, `team1 (1500) upset over team2 (2000) gives large positive (got ${updates[1].delta})`);
})();

section('elo: K-factor');

(function testNewPlayerHigherKFactor() {
	const profiles = {
		p1: profile('a', 1500, 5),
		p2: profile('b', 1500, 50),
		p3: profile('c', 1500, 50),
		p4: profile('d', 1500, 50),
	};
	const updates = computeEloUpdates(profiles, 'team1');
	assertEqual(updates[1].delta, 20, 'new player gains 40 * 0.5 = 20 points');
	assertEqual(updates[4].delta, 10, 'veteran teammate gains 20 * 0.5 = 10 points');
})();

(function testVeteranLowerKFactor() {
	const profiles = {
		p1: profile('a', 1500, 100),
		p2: profile('b', 1500, 100),
		p3: profile('c', 1500, 100),
		p4: profile('d', 1500, 100),
	};
	const updates = computeEloUpdates(profiles, 'team1');
	assertEqual(updates[1].delta, 10, 'veteran (K=20) gains 10 on equal-rating win');
})();

section('elo: draw');

(function testDrawGivesNearZeroChange() {
	const profiles = {
		p1: profile('a', 1500, 50),
		p2: profile('b', 1500, 50),
		p3: profile('c', 1500, 50),
		p4: profile('d', 1500, 50),
	};
	const updates = computeEloUpdates(profiles, 'draw');
	for (const s of [1, 2, 3, 4]) {
		assertEqual(updates[s].delta, 0, `slot ${s}: equal ratings + draw → 0 delta`);
	}
})();

(function testDrawAsymmetric() {
	const profiles = {
		p1: profile('a', 1700, 50),
		p2: profile('b', 1500, 50),
		p3: profile('c', 1500, 50),
		p4: profile('d', 1700, 50),
	};
	const updates = computeEloUpdates(profiles, 'draw');
	assert(updates[1].delta < 0, 'stronger team loses small rating on draw');
	assert(updates[2].delta > 0, 'weaker team gains small rating on draw');
})();

section('elo: edge cases');

(function testMissingProfileSkipped() {
	const profiles = {
		p1: profile('a', 1500, 50),
		p2: null,
		p3: profile('c', 1500, 50),
		p4: profile('d', 1500, 50),
	};
	const updates = computeEloUpdates(profiles, 'team1');
	assert(!updates[2], 'missing profile produces no update entry');
	assert(updates[1] && updates[3] && updates[4], 'other slots still have updates');
})();

(function testRatingFloor() {
	const profiles = {
		p1: profile('a', 150, 5),
		p2: profile('b', 2500, 100),
		p3: profile('c', 2500, 100),
		p4: profile('d', 150, 5),
	};
	const updates = computeEloUpdates(profiles, 'team2');
	assert(updates[1].newRating >= 100, 'rating floor at 100 enforced');
	assert(updates[4].newRating >= 100, 'rating floor at 100 enforced for partner');
})();

(function testReturnsExpectedShape() {
	const profiles = {
		p1: profile('a', 1500, 50),
		p2: profile('b', 1500, 50),
		p3: profile('c', 1500, 50),
		p4: profile('d', 1500, 50),
	};
	const updates = computeEloUpdates(profiles, 'team1');
	const u = updates[1];
	assert(typeof u === 'object', 'update has object shape');
	assert(u.id === 'a', 'update carries player id');
	assert(typeof u.oldRating === 'number' && typeof u.newRating === 'number', 'update has old/new rating');
	assert(typeof u.delta === 'number', 'update has delta');
	assertEqual(u.delta, u.newRating - u.oldRating, 'delta matches newRating-oldRating');
})();

const ok = summary();
process.exit(ok ? 0 : 1);
