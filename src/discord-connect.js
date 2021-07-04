/**
 * Interface for connecting to the Discord client and integrating the bot abilities
 * @author Avery Smith
 * @licence MIT
 * @module discord-connect
 * @requires module:"discord.js"
 * @requires module:song-link-reader
 */

const Discord = require('discord.js');
const client = new Discord.Client();

// This collection must exist for this bot to work
client.commands = new Discord.Collection();


/**
 * If have your own callback functions for discord events, you should instead call song-link-reader like this
 *
 * @example
 * const {parseMessage, onJoinServer, onChannelDelete, startUp} = require('./song-link-reader');
 * client.on('message', (message) => () {
 *      // Your code here
 *      parseMessage(client, message);
 * });
*/
const {attachAllEvents, startUp} = require('song-link-reader');
attachAllEvents(client);


/**
 * Log in using the token contained in argv, then start the Spotify authentication process
 * @param {object} argv - CLI arguments to assist with starting the bot
 */
module.exports = function connectToDiscord(argv) {
    client.login(argv['discord-bot-token'])
        .then(
            () => {
                startUp(client, argv.rl, argv['cache-size'], argv['spotify_id'], argv['spotify_secret']);
            },
            error => {
                console.log(`Could not connect to Discord\n${error}`);
                process.exit(1);
            });
}