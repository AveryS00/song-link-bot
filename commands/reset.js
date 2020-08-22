const helper = require('../discord-helper-functions');

module.exports = {
    name: 'reset',
    description: 'clears the server playlist',
    execute(message, args, json, spotify) {
        if (!message.member.permissions.any(268435638)) return;

        spotify.clearPlaylist(json.server_list[message.guild.id].playlist_id).then(
            () => {
                helper.logToDiscord(message.client, json.server_list[message.guild.id].logging_channel, `Cleared entire playlist`);
            },
            error => {
                helper.logToDiscord(message.client, json.server_list[message.guild.id].logging_channel, `Unable to clear playlist. Error: ${error}`);
            }
        );
    }
};