
/**
 * TODO will crash if admin deletes logging channel (actually doesn't but requires a reset)
 * Send a logging message to the logging channel if it has been set. If not, do nothing
 * @param {Client} client The connected Discord client
 * @param {String} channelId The id of the channel to send the message to
 * @param {String} message The message to send
 */
exports.logToDiscord = function (client, channelId, message) {
    if (channelId === '') return;
    client.channels.cache.get(channelId).send(message);
}