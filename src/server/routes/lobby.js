const express = require('express');
const supabase = require('../lib/supabaseAdmin');
const Game = require('../models/Game');

const router = express.Router();

// express middleware that validates the Supabase JWT and attaches userId to the request
async function auth(req, res, next) {
	const token = req.headers.authorization?.split(' ')[1] || req.body?.token;
	if (!token) return res.sendStatus(401);
	const { data: { user }, error } = await supabase.auth.getUser(token);
	if (error || !user) return res.sendStatus(401);
	req.userId = user.id;
	next();
}

// creates a new 4-player lobby game with the requested time control, returns the room code for sharing
router.post('/create', auth, async (req, res) => {
	try {
		const minutes = Math.min(60, Math.max(1, parseInt(req.body.minutes) || 5));
		const increment = Math.min(60, Math.max(0, parseInt(req.body.increment) || 5));
		const { id, roomCode } = await Game.createLobbyGame(req.userId, minutes, increment);
		res.json({ gameId: id, roomCode });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// joins an existing lobby by room code, returns the gameId so the client can route to the waiting room
router.post('/join', auth, async (req, res) => {
	try {
		const roomCode = (req.body.roomCode || '').toUpperCase().trim();
		if (!roomCode || roomCode.length !== 6) return res.status(400).json({ error: 'Invalid room code' });

		const game = await Game.getByRoomCode(roomCode);
		if (!game) return res.status(404).json({ error: 'Room not found or game already started' });

		res.json({ gameId: game.id });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/:gameId', async (req, res) => {
	let game;
	try {
		game = await Game.getByID(req.params.gameId);
	} catch (err) {
		return res.status(404).json({ error: 'Game not found' });
	}
	try {
		if (game.status !== 'lobby') return res.status(400).json({ error: 'Game not in lobby' });
		const state = await buildLobbyState(game);
		res.json(state);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// builds the lobby snapshot a waiting-room client renders: per-slot type, player profile or engine elo
async function buildLobbyState(game) {
	const { ProfileModel } = require('../models/ProfileModel') || require('../models/ProfileModel');
	const PM = require('../models/ProfileModel');
	const slots = {};
	for (const s of [1, 2, 3, 4]) {
		const isEngine = game.engine_slots?.[s];
		const playerId = game[`player${s}`];
		if (isEngine) {
			slots[s] = { type: 'engine', level: game.engine_levels?.[s] || 1500 };
		} else if (playerId) {
			try {
				const profile = await PM.getByID(playerId);
				slots[s] = { type: 'human', id: playerId, username: profile.username, rating: profile.rating };
			} catch {
				slots[s] = { type: 'human', id: playerId, username: '?', rating: 1500 };
			}
		} else {
			slots[s] = { type: 'empty' };
		}
	}
	return {
		gameId: game.id,
		roomCode: game.room_code,
		minutes: game.minutes,
		increment: game.increment,
		creatorId: game.creator_id,
		slots,
	};
}

module.exports = router;
module.exports.buildLobbyState = buildLobbyState;