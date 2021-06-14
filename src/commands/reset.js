// reset.js
// Author: Avery Smith (ajsmith2@wpi.edu)

const helper = require('../discord-helper-functions');

module.exports = {
    name: 'reset',
    description: 'clears the server playlist',
    execute(message, args, json, spotify) {
        if (!message.member.permissions.any(268435638)) return;

        const guildSettings = json.server_list[message.guild.id];
        const currentTime = new Date().getTime();

        // 3 hour time gate on using this command
        if (guildSettings.reset_cooldown + 10800000 >= currentTime) {
            message.channel.send(`3 hour time limit on using this command, please wait ${guildSettings.reset_cooldown + 10800000 - currentTime} more milliseconds.`);
            return;
        }

        spotify.clearPlaylist(json.server_list[message.guild.id].playlist_id).then(
            () => {
                helper.logToDiscord(message.client, guildSettings.logging_channel, `Cleared entire playlist`);
            },
            error => {
                helper.logToDiscord(message.client, guildSettings.logging_channel, `Unable to clear playlist. ${error}`);
            }
        );

        guildSettings.reset_cooldown = currentTime;
    }
};