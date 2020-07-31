const fs = require('fs');
const config = '../config.json';
const json = require(config);

module.exports = {
	name: 'set',
	description: 'configure settings for the bot, such as music channel, logging channel, and accounts.',
	execute(message, args) {
		
		if (args[0] === 'music_channel') {
			json.music_channel = args[1];
			rewriteConfig(config, json);
		} else if (args[0] === 'logging_channel') {
			json.logging_channel = args[1];
			rewriteConfig(config, json);
		}
	},
};


function rewriteConfig(fileName, file) {
	console.log('writing config');
	fs.writeFile(fileName, JSON.stringify(file, null, 2), function writeJSON(err) {
		if (err) return console.log(err);
		console.log(JSON.stringify(file));
		console.log('writing to ' + fileName);
	});
	console.log('written');
}

