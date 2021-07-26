/**
 * Module to process events from the Discord client, and attach commands
 * @author Avery Smith
 * @licence MIT
 * @module song-link-reader
 * @requires module:utils/spotify-server
 * @requires module:utils/spotify-api
 * @requires module:utils/utils
 * @requires module:"discord.js"
 */

const {authenticate} = require('utils/spotify-server');
const spotify_api = require('utils/spotify-api');
const utils = require('utils/utils');


// Contains environment variables needed to operate
let _config;


module.exports = {
    parseMessage,
    onJoinServer,
    onChannelDelete,
    attachAllEvents,
    startUp
}


/**
 * Startup the bot by going through the Spotify auth process, attach some final commands
 * @param {module:"discord.js".Client} client - The client to interact with
 * @param {module:readline.Interface} rl - An interface for the command line I/O
 * @param {number} cache_size - How many playlists that the cache should hold
 * @param {string} [spotify_id] - The id of the Spotify bot
 * @param {string} [spotify_secret] - The secret of the Spotify bot
 */
function startUp(client,
                 rl,
                 cache_size,
                 spotify_id,
                 spotify_secret) {

    // Callbacks all the way down, but needs to be linear
    utils.readConfig(spotify_id, spotify_secret, (json) => {
        _config = json;

        utils.requestProperty(rl, _config, 'spotify_id',
            'Enter the Spotify ID:\n> ', () => {

            utils.requestProperty(rl, _config, 'spotify_secret',
                'Enter the Spotify secret:\n> ', () => {
                    authenticate(_config);
                    attachCloseEventRL(rl);
                });
        });
    });

    utils.attachCommandsToClient(client);
}


/**
 * Helper function to make importing simple for those who are not adding functionality to the bot.
 * Attaches parseMessage, onJoinServer, and onChannelDelete to their respective event handlers.
 * @param {module:"discord.js".Client} client - The connected Discord Client
 */
function attachAllEvents(client) {
    client.once('ready', () => {
        console.log('Connected to Discord\n');
    });
    client.on('message', (message) => parseMessage(client, message));
    client.on('guildCreate', onJoinServer);
    client.on('channelDelete', onChannelDelete);
}


/**
 * The action that responds to the deletion of a channel. Checks to see if the
 * channel was the current set logging or music channel and empties the config value
 * @param {module:"discord.js".Channel} channel - A channel passed from the event
 * @param {module:"discord.js".Guild} channel.guild
 */
function onChannelDelete(channel) {
    if (channel.type !== 'text') {
        return;
    }

    if (channel.id === _config.server_list[channel.guild.id].music_channel) {
        _config.server_list[channel.guild.id].music_channel = '';
    } else if (channel.id === _config.server_list[channel.guild.id].logging_channel) {
        _config.server_list[channel.guild.id].logging_channel = '';
    }
}


/**
 * When the bot joins a server, create a default settings object for the guild.
 * The id of the guild setting is the id of the guild itself. Also instantiate
 * a new playlist
 * @param {module:"discord.js".Guild} guild - The newly joined guild
 */
function onJoinServer(guild) {
    const Discord = require("discord.js");

    // Create a JSON dict for the server
    _config.server_list[guild.id] = {
        'music_channel': '',
        'logging_channel': '',
        'playlist_id': '',
        'prefix': '!',
        'admin_permission_level': Discord.Permissions.FLAGS.MANAGE_GUILD,
        'fill_cooldown': 0,
        'reset_cooldown': 0
    };

    // Try to give the server a playlist, if unable, don't let the server do anything.
    spotify_api.createPlaylist(guild.name)
        .then(result => {
            _config.server_list[guild.id].playlist_id = result;
            // TODO
            utils.sendMessageToDiscord(guild.client, ``);
        })
        .catch(() => {
            utils.sendMessageToDiscord(guild.client,
                `Unable to create the playlist, please wait a bit and \
                try again with ${_config.server_list[guild.id].prefix}create playlist`);
        });
}


/**
 * Takes the received message from the event and parses it to determine what action to take next
 * @param {module:"discord.js".Client} client - The Discord client of the bot
 * @param {module:"discord.js".Channel} client.channel
 * @param {module:"discord.js".Collection} client.commands
 * @param {module:"discord.js".Message} message - The incoming message
 */
function parseMessage(client,
                      message) {
    const guildSettings = _config.server_list[message.guild.id];

    // If the author is a bot, the guildSettings haven't been set, or the playlist doesn't exist
    if (message.author.bot || guildSettings === undefined || guildSettings.playlist_id === '') return;

    // Pattern match for a spotify link
    const matches = message.content.match(/https:\/\/open.spotify.com\/track\/[a-zA-Z0-9]+/g);

    // Playlist exists and there is a spotify link in the message
    if (matches !== null)
        return handleSpotifyLinks(client, guildSettings, matches, message);

    // Not the prefix for the guild
    if (!message.content.startsWith(guildSettings.prefix)) return;

    // All this stuff is from the Discord.js guide. I'm probably not going to touch it for now unless necessary.
    // Remove the prefix and split the command by whitespace
    const args = message.content.slice(guildSettings.prefix.length).trim().split(/ +/);

    // Grab the first element and check the collection for the command
    const commandName = args.shift().toLowerCase();
    if (!client.commands.has(commandName)) return;

    const command = client.commands.get(commandName);
    try {
        command.execute(message, args, _config, spotify_api);
    } catch (error) {
        console.error(error);
    }
}


/**
 * Cleans the links and sends them to the Spotify API, then logs the result to the discord server
 * @private
 * @param {module:"discord.js".Client} client - The Discord client
 * @param {Object} guildSettings - The settings for the guild
 * @param {[String]} matches - The array of pattern matches, cannot be null
 * @param {module:"discord.js".Message} message - The original full message
 */
function handleSpotifyLinks(client, guildSettings,
                            matches, message) {
    // Remove the sharing tracker from the end
    //matches = matches.map(track => track.replace(/(\?si=[a-zA-Z0-9])+/, ''));
    // Remove the link itself
    //matches = matches.map(track => track.replace('https://open.spotify.com/track/', ''));
    matches = matches.map(track =>
        track.replace(/(https:\/\/open.spotify.com\/track\/)|(\?si=[a-zA-Z0-9])+/, ''));

    let resultMessage;
    spotify_api.batchAddSongs(matches, guildSettings.playlist_id)
        // All this gross looking code is just determining which message to respond to Discord with
        .then(result => {
            if (matches.length === 1) {
                resultMessage = 'Added song <' + matches[0] + '> sent by ' + message.member.user.tag;
            } else {
                resultMessage = 'Successfully added ' + result + ' songs to playlist ' +  guildSettings.playlist_id;
            }
        })
        .catch(error => {
            if (matches.length === 1) {
                resultMessage = 'Could not add song <' + matches[0] + '> sent by ' +
                    message.member.user.tag + '.\nError: ' + error.message;
            } else {
                resultMessage = 'Error adding ' + matches.length + ' songs to playlist ' +
                    guildSettings.playlist_id + 'sent by ' + message.member.user.tag + '\nError' + error.message;
            }
        })
        .finally(() => {
            utils.sendMessageToDiscord(client, resultMessage, guildSettings.logging_channel)
        });
}


/**
 * Attach a graceful exit. This will save the json object to the config file
 * so that items are not lost on closure of the bot.
 * @private
 * @param {module:readline.Interface} rl
 */
function attachCloseEventRL(rl) {
    rl.on('SIGINT', () => {
        console.log('Attempting to save changes');

        utils.writeToConfig(_config, () => {
            rl.close();
            process.exit(0);
        });
    });
}