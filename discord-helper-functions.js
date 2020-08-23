// discord-helper-functions.js
// Author: Avery Smith (ajsmith2@wpi.edu)

/**
 * Send a logging message to the logging channel if it has been set. If not, do nothing
 * @param {Client} client The connected Discord client
 * @param {String} channelId The id of the channel to send the message to
 * @param {String} message The message to send
 */
exports.logToDiscord = function (client, channelId, message) {
    if (channelId === '') return;
    client.channels.cache.get(channelId).send(message);
}