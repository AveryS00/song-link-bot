// playlist.js
// Author: Avery Smith (ajsmith2@wpi.edu)

module.exports = {
	name: 'playlist',
	description: 'Gives a link to the playlist of collected songs',
	execute(message, args, json, spotify) {
		message.channel.send(`View playlist here: https://open.spotify.com/user/${spotify.getSpotifyUserId()}/playlist/${json.server_list[message.guild.id].playlist_id}`);
	console.log(`${message.member.displayName} requested viewing of link in guild ${message.guild.id}`);
	}
};

