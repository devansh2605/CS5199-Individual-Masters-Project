const express = require('express');
const ProfileModel = require('../models/ProfileModel');

const router = express.Router();

router.get('/profile/:username', async (req, res, next) => {
	try {
		const profile = await ProfileModel.getByUsername(req.params.username);
		if (!profile) return res.status(404).json({ error: 'User not found' });
		res.json(profile);
	} catch (err) {
		next(err);
	}
});

router.get('/username/:username', async (req, res, next) => {
	try {
		const profile = await ProfileModel.getByUsername(req.params.username);
		if (!profile) return res.status(404).json({ error: 'User not found' });
		res.json(profile);
	} catch (err) {
		next(err);
	}
});

router.get('/', async (req, res, next) => {
	try {
		const profiles = await ProfileModel.getAll(200);
		res.json(profiles);
	} catch (err) {
		next(err);
	}
});

module.exports = router;
