const Game = require('../models/Game');
const logger = require('../logger');
const engineManager = require('./engineManager');

// returns a termination string if any of the four clocks has flagged, else empty
function checkIfTimeOut(game) {
	const currentTime = Date.now();
	for (let userPosition = 1; userPosition <= 4; userPosition++) {
		const boardNum = (userPosition === 1 || userPosition === 2) ? 1 : 2;
		const lastTime = (userPosition === 1 || userPosition === 2) ? game.left_last_time : game.right_last_time;

		if (lastTime === null || engineManager.isBoardDrawn(game.id, boardNum)) {
			continue;
		}

		const diffTime = currentTime - lastTime;
		if (diffTime + game.clocks.split(',').map(Number)[userPosition - 1] >= game.minutes * 1000 * 60) {
			if (userPosition === 1 || userPosition === 4) {
				return 'Team 1 timed out, Team 2 is victorious';
			} else if (userPosition === 2 || userPosition === 3) {
				return 'Team 2 timed out, Team 1 is victorious';
			}
		}
	}
	return '';
}

module.exports = async (id, socket, gameSocket, clearRoom) => {
	try {
		const game = await Game.getByID(id);
		if (game && game.status === 'playing') {
			const termination = checkIfTimeOut(game);
			if (termination) {
				await Game.endGame(game, termination, socket, gameSocket, clearRoom);
			}
		}
	} catch (err) {
		logger.error(`Error handling timeOut for game id ${id}: ${err}`);
	}
};
