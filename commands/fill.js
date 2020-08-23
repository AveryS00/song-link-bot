// fill.js
// Author: Avery Smith (ajsmith2@wpi.edu)

const helper = require('../discord-helper-functions');

/**
 * Gets all song ids from a Discord channel.
 * @param {Object} messageManager MessageManager object obtained from the channel a message was sent in
 * @param {number} maxMessage The max number of messages to read through, default is The max value for an integer
 * @return {Promise<[String]>} Returns a promise containing a list of the song ids in a channel
 */
async function getAllSongs(messageManager, maxMessage = Number.MAX_SAFE_INTEGER) {
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

/**
 * Helper function to reduce clutter. Send the songs from getAllSongs to the spotify.js file to be batch added
 * @param spotify The spotify module to call batchAdd
 * @param {[String]} tracks The list of tracks to add
 * @param guildSettings The json settings for the current server
 * @param {Client} client The Discord.js client to call messages to
 */
function sendSongsToSpotify(spotify, tracks, guildSettings, client) {
	spotify.batchAddSongs(tracks, guildSettings.playlist_id).then(
		result => {
			helper.logToDiscord(client, guildSettings.logging_channel, `Successfully added ${result} songs to playlist ${guildSettings.playlist_id}`);
		},
		error => { helper.logToDiscord(client, guildSettings.logging_channel,`Error adding songs to playlist ${guildSettings.playlist_id}. Error: ${error}`); }
	);
}

module.exports = {
	name: 'fill',
	description: 'Fills the playlist with the given number of messages. By default, will try to fill with all messages it can find in a channel.',
	execute(message, args, json, spotify) {
		if (!message.member.permissions.any(268435638)) return; // Sender needs moderator permissions

		const guildSettings = json.server_list[message.guild.id];
		const currentTime = new Date().getTime();

		// 3 hour time gate on using this command
		if (guildSettings.fill_cooldown + 10800000 >= currentTime) {
			message.channel.send(`3 hour time limit on using this command, please wait ${guildSettings.fill_cooldown + 10800000 - currentTime} more milliseconds.`);
			return;
		}

		if (args.length === 1) {
			const maxMessages = parseInt(args[0], 10);
			if (!isNaN(maxMessages)) {
				console.log(`Attempting to fill ${maxMessages} messages to playlist for guild: ${message.guild.id}/${message.guild.name}`);
				getAllSongs(message.channel.messages, maxMessages + 1).then(
					result => { sendSongsToSpotify(spotify, result, guildSettings, message.client); },
					error => { helper.logToDiscord(message.client, guildSettings.logging_channel,`Error adding songs to playlist ${guildSettings.playlist_id}. Error: ${error}`); }
				);
				guildSettings.fill_cooldown = currentTime;
				return;
			}
		} else if (args.length === 0) {
			console.log(`Attempting to fill playlist for guild: ${message.guild.id}/${message.guild.name}`);
			getAllSongs(message.channel.messages).then(
				result => { sendSongsToSpotify(spotify, result, guildSettings, message.client); },
				error => { helper.logToDiscord(message.client, guildSettings.logging_channel,`Error adding songs to playlist ${guildSettings.playlist_id}. Error: ${error}`); }
			);
			guildSettings.fill_cooldown = currentTime;
			return;
		}

		message.channel.send('Unable to understand fill command');
	}
};

