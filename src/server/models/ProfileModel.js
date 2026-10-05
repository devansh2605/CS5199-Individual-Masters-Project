const supabase = require('../lib/supabaseAdmin');

class ProfileModel {
	static async getByID(id) {
		const { data, error } = await supabase
			.from('profiles')
			.select('id, username, rating, games_played')
			.eq('id', id)
			.single();
		if (error || !data) {
			const err = new Error('Profile not found');
			err.status = 404;
			throw err;
		}
		return data;
	}

	static async getByUsername(username) {
		const { data, error } = await supabase
			.from('profiles')
			.select('id, username, rating, games_played')
			.eq('username', username)
			.single();
		if (error || !data) return null;
		return data;
	}

	static async updateRating(id, newRating) {
		const { error } = await supabase
			.from('profiles')
			.update({ rating: newRating })
			.eq('id', id);
		if (error) throw new Error(error.message);
	}

	// reads the current count then writes count+1 — not transactional, fine for single-server load
	static async incrementGamesPlayed(id) {
		const profile = await ProfileModel.getByID(id);
		const { error } = await supabase
			.from('profiles')
			.update({ games_played: (profile.games_played || 0) + 1 })
			.eq('id', id);
		if (error) throw new Error(error.message);
	}

	// gets the leaderboard — top N profiles ordered by rating desc
	static async getAll(limit = 50) {
		const { data, error } = await supabase
			.from('profiles')
			.select('id, username, rating, games_played')
			.order('rating', { ascending: false })
			.limit(limit);
		if (error) throw new Error(error.message);
		return data || [];
	}

	// create a new profile
	static async create(profileData) {
		const { data, error } = await supabase
			.from('profiles')
			.insert([{
				id: profileData.id,
				username: profileData.username,
				email: profileData.email,
				is_guest: profileData.is_guest || false,
				rating: 1500,
				games_played: 0,
			}])
			.select()
			.single();
		if (error) throw new Error(error.message);
		return data;
	}
}

module.exports = ProfileModel;