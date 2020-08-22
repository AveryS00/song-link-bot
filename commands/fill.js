const helper = require('../discord-helper-functions');

/**
 *
 * @param messageManager
 * @param maxMessage
 * @return {Promise<[String]>}
 */
async function getAllSongs(messageManager, maxMessage) {
	let songList = [];
	let messageList = await messageManager.fetch({limit:100}, false, true);
	let currentMessage = 0;

	// While there are still messages to get or until maxMessage
	while (messageList.size !== 0) {
		// Iterate through the messages
		for (let message of messageList.values()) {
			if (currentMessage === maxMessage) { return songList; } // Hit cap, return early
			// Message has at least one Spotify link
			if (message.content.match(/https:\/\/open.spotify.com\/track\/[a-zA-Z0-9]+/g) !== null) {
				for (let track of message.content.match(/https:\/\/open.spotify.com\/track\/[a-zA-Z0-9]+/g)) {
					track = track.replace(/\?si=[a-zA-Z0-9]+/,''); // Remove the sharing trackers at the end of the link
					songList.push(track.replace('https://open.spotify.com/track/', ''));
				}
			}
			currentMessage++;
		}

		// Get the next set of 100 messages starting at the final message of the last set
		messageList = await messageManager.fetch({limit: 100, before: messageList.last().id}, false, true);
	}

	return songList;
}

function handleError(message, error, guildSettings) {
	helper.logToDiscord(message.client, guildSettings.logging_channel,`Error adding songs to playlist ${guildSettings.playlist_id}. Error: ${error}` );
}

module.exports = {
	name: 'fill',
	description: 'Fills the playlist with the given number of messages. By default, will try to fill with all messages it can find in a channel.',
	execute(message, args, json, spotify) {
		if (!message.member.permissions.any(268435638)) return;

		const guildSettings = json.server_list[message.guild.id];
		if (args.length === 1) {
			const maxMessages = parseInt(args[0], 10);
			console.log(`Attempting to fill playlist`)
			if (!isNaN(maxMessages)) {
				getAllSongs(message.channel.messages, maxMessages + 1).then(
					result => {
						spotify.batchAddSongs(result, guildSettings.playlist_id).then(
							result => {
								helper.logToDiscord(message.client, guildSettings.logging_channel, `Successfully added ${result} songs to playlist ${guildSettings.playlist_id}`);
							},
							error => { handleError(message, error, guildSettings); }
						);
					},
					error => { handleError(message, error, guildSettings); }
				);
				return;
			}
		} else if (args.length === 0) {
			console.log(`Attempting to fill playlist for guild: ${message.guild.id}/${message.guild.name}`);
			getAllSongs(message.channel.messages, Number.MAX_SAFE_INTEGER).then(
				result => {
					spotify.batchAddSongs(result, guildSettings.playlist_id).then(
						result => {
							helper.logToDiscord(message.client, guildSettings.logging_channel, `Successfully added ${result} songs to playlist ${guildSettings.playlist_id}`);
						},
						error => { handleError(message, error, guildSettings); }
					);
				},
				error => { handleError(message, error, guildSettings); }
			);
			return;
		}

		message.channel.send('Unable to understand fill command');
	},
};

