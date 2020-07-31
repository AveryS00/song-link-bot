
module.exports = {
	name: 'playlist',
	description: 'Gives a link to the playlist of collected songs',
	execute(message, args) {
		message.channel.send('View playlist here: ');
	},
};

