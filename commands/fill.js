
module.exports = {
	name: 'fill',
	description: 'Fills the playlist with the given number of messages. By default, will try to fill with all messages it can find in a channel.',
	execute(message, args) {
		message.channel.send('filling playlist');
	},
};
