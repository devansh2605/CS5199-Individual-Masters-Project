const express = require('express');
const supabase = require('../lib/supabaseAdmin');
const ProfileModel = require('../models/ProfileModel');

const router = express.Router();

// gets the top 50 profiles by rating for the leaderboard page
router.get('/leaderboard', async (_req, res) => {
	try {
		const profiles = await ProfileModel.getAll(50);
		res.json(profiles);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// returns rating-history rows filtered by game or user — feeds the post-game modal and the rating chart
router.get('/history', async (req, res) => {
	try {
		const { gameId, userId } = req.query;
		let query = supabase
			.from('rating_history')
			.select('*, profile:profiles(username)')
			.order('recorded_at', { ascending: false });

		if (gameId) query = query.eq('game_id', gameId);
		if (userId) query = query.eq('player_id', userId).limit(50);

		const { data, error } = await query;
		if (error) throw new Error(error.message);
		res.json(data || []);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;