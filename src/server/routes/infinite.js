const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const supabase = require('../lib/supabaseAdmin');
const infiniteManager = require('../services/infiniteManager');
const logger = require('../logger');

// resolves a Supabase JWT to a user object, returns null if the token is missing or invalid
async function verifyToken(token) {
	if (!token) return null;
	const { data: { user }, error } = await supabase.auth.getUser(token);
	if (error || !user) return null;
	return user;
}

// creates a new infinite-mode game with the requested params clamped to safe ranges, returns the initial state
router.post('/create', async (req, res) => {
	const { token, numBoards = 4, humanColor = 'white', minutes = 5, increment = 0, engineElo = 1500 } = req.body;

	const user = await verifyToken(token);
	if (!user) return res.status(401).json({ error: 'Unauthorized' });

	if (humanColor !== 'white' && humanColor !== 'black') {
		return res.status(400).json({ error: 'humanColor must be "white" or "black"' });
	}

	const n = Math.max(2, Math.min(10, parseInt(numBoards) || 4));
	const m = Math.max(1, Math.min(60, parseInt(minutes) || 5));
	const inc = Math.max(0, Math.min(60, parseInt(increment) || 0));
	const elo = Math.max(1320, Math.min(3190, parseInt(engineElo) || 1500));
	const gameId = randomUUID();

	try {
		const game = await infiniteManager.createGame({
			gameId,
			humanColor,
			numBoards: n,
			minutes: m,
			increment: inc,
			engineElo: elo,
			humanUserId: user.id,
		});

		logger.log(`Infinite game created: ${gameId} (${n} boards, ${humanColor}, ${m}+${inc}, Elo ${elo})`);
		res.json({ gameId, state: game.getFullState() });
	} catch (e) {
		logger.error(`Infinite create error: ${e}`);
		res.status(500).json({ error: 'Failed to create game' });
	}
});

router.get('/:gameId', async (req, res) => {
	const { gameId } = req.params;
	const game = infiniteManager.getGame(gameId);
	if (!game) return res.status(404).json({ error: 'Game not found' });
	res.json(game.getFullState());
});

module.exports = router;