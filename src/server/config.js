const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '..', '.env');
try {
	fs.accessSync(envPath);
	dotenv.config({ path: envPath });
} catch (err) {}

const config = {};

config.supabaseUrl = process.env.SUPABASE_URL;
config.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

config.serverPort = process.env.PORT || process.env.BUGHOUSE_SERVER_PORT || 3000;

const explicitOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);

function isAllowedOrigin(origin) {
	if (!origin) return true;
	if (explicitOrigins.indexOf(origin) !== -1) return true;
	try {
		const u = new URL(origin);
		const h = u.hostname;
		if (h === 'localhost' || h === '127.0.0.1') return true;
	} catch (e) {}
	return false;
}

config.corsOrigin = (origin, callback) => callback(null, isAllowedOrigin(origin));
config.isAllowedOrigin = isAllowedOrigin;
config.frontendUrl = explicitOrigins[0] || 'http://localhost:3000';

module.exports = config;
