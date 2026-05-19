
// FIDE K-factor — higher for new players to let their rating settle faster
function kFactor(gamesPlayed) {
	return gamesPlayed < 30 ? 40 : 20;
}

// standard Elo expected-score sigmoid against a single opponent rating
function expectedScore(playerRating, opponentRating) {
	return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

// computes per-slot Elo deltas for a 4-player 2v2 game, averaging team ratings as the opponent rating
function computeEloUpdates(profiles, winner) {
	const score = slot => {
		if (winner === 'draw') return 0.5;
		return (winner === 'team1' ? [1, 4] : [2, 3]).includes(slot) ? 1.0 : 0.0;
	};

	const team1Ratings = [profiles.p1, profiles.p4].map(p => (p ? p.rating : 1500));
	const team2Ratings = [profiles.p2, profiles.p3].map(p => (p ? p.rating : 1500));
	const team1Avg = Math.round((team1Ratings[0] + team1Ratings[1]) / 2);
	const team2Avg = Math.round((team2Ratings[0] + team2Ratings[1]) / 2);
	const opponentAvgOf = { 1: team2Avg, 4: team2Avg, 2: team1Avg, 3: team1Avg };

	const slotToProfile = { 1: profiles.p1, 2: profiles.p2, 3: profiles.p3, 4: profiles.p4 };
	const updates = {};

	for (const [slot, profile] of Object.entries(slotToProfile)) {
		if (!profile) continue;
		const s = Number(slot);
		const k = kFactor(profile.gamesPlayed || 0);
		const delta = Math.round(k * (score(s) - expectedScore(profile.rating, opponentAvgOf[s])));
		const newRating = Math.max(100, profile.rating + delta);
		updates[s] = { id: profile.id, oldRating: profile.rating, newRating, delta: newRating - profile.rating };
	}

	return updates;
}

module.exports = { computeEloUpdates };