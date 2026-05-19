function logMessage(message, level) {
	const line = `[${level}@${new Date().toISOString()}] ${message}\n`;
	if (level === 'error') {
		console.error(line);
	} else {
		console.log(line);
	}
}

module.exports = {
	log: message => logMessage(message, 'standard'),
	error: message => logMessage(message, 'error'),
};
