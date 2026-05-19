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
	const profile = await ProfileModel.getByUsername(req.params.username);
	res.json({ available: !profile });
});

module.exports = router;