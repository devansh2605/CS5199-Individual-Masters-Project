const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('./logger');
const config = require('./config');

const app = express();

app.use(cors({
	origin: config.corsOrigin,
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'client')));

const games = require('./routes/games');
const auth = require('./routes/auth');
const lobby = require('./routes/lobby');
const ratings = require('./routes/ratings');
const infinite = require('./routes/infinite');
const users = require('./routes/users');

app.use('/api/games', games);
app.use('/api/auth', auth);
app.use('/api/lobby', lobby);
app.use('/api/ratings', ratings);
app.use('/api/infinite', infinite);
app.use('/api/users', users);

app.get('/api/healthz', async (req, res) => {
	const StockfishEngine = require('./services/stockfishEngine');
	const e = new StockfishEngine(1500);
	const out = { stockfish: 'unknown', move: null, error: null };
	try {
		await e.start();
		out.stockfish = 'started';
		const m = await e.getBestMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 200);
		out.move = m;
	} catch (err) {
		out.error = String(err && err.message || err);
	} finally {
		try { e.quit(); } catch (qe) {}
	}
	res.json(out);
});

app.get(/^(?!\/api).*$/, (req, res) => {
	res.sendFile(path.resolve(__dirname, '..', 'client', 'index.html'));
});

app.use((req, res) => {
	res.status(404).send('<h1>404 Not Found</h1>');
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
	if (err.status === 401) {
		res.sendStatus(401);
	} else {
		logger.error(err);
		res.status(500).send('<h1>Internal Server Error</h1>');
	}
});

module.exports = app;
