const express = require('express');
const supabase = require('../lib/supabaseAdmin');
const ProfileModel = require('../models/ProfileModel');

const router = express.Router();

// verifies a Supabase JWT and returns the matching profile row
router.post('/verify', async (req, res) => {
	const { token } = req.body;
	if (!token) return res.sendStatus(401);

	const { data: { user }, error } = await supabase.auth.getUser(token);
	if (error || !user) return res.sendStatus(401);

	try {
		const profile = await ProfileModel.getByID(user.id);
		res.json({ success: true, user: profile });
	} catch {
		res.sendStatus(401);
	}
});

// availability check for signup — returns { available: true } if no profile owns this username
router.get('/username/:username', async (req, res) => {
	try {
		const profile = await ProfileModel.getByUsername(req.params.username);
		res.json({ available: !profile });
	} catch (error) {
		res.status(500).json({ error: 'Failed to check username availability', details: error.message });
	}
});

// guest signup — create a temporary profile without auth
router.post('/guest', async (req, res) => {
	try {
		const { username } = req.body;
		if (!username || typeof username !== 'string' || username.length < 3) {
			return res.status(400).json({ error: 'Username must be at least 3 characters' });
		}

		// check if username is available
		const existing = await ProfileModel.getByUsername(username);
		if (existing) {
			return res.status(409).json({ error: 'Username already taken' });
		}

		// create guest profile
		const profile = await ProfileModel.create({
			username,
			email: `guest_${Date.now()}@chess.local`,
			is_guest: true,
		});

		res.json({ success: true, profile });
	} catch (error) {
		res.status(500).json({ error: 'Failed to create guest account', details: error.message });
	}
});

// normal signup — create profile with Supabase auth
router.post('/signup', async (req, res) => {
	try {
		const { username, email, password } = req.body;
		if (!username || !email || !password) {
			return res.status(400).json({ error: 'Username, email, and password required' });
		}

		// check if username is available
		const existing = await ProfileModel.getByUsername(username);
		if (existing) {
			return res.status(409).json({ error: 'Username already taken' });
		}

		// sign up with Supabase
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
		});

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		// create profile with the new user
		const profile = await ProfileModel.create({
			id: data.user.id,
			username,
			email,
			is_guest: false,
		});

		res.json({ success: true, user: profile, session: data.session });
	} catch (error) {
		res.status(500).json({ error: 'Failed to sign up', details: error.message });
	}
});

module.exports = router;