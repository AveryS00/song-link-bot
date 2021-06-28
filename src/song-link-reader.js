
// Do I need these, and do I need them here? Might not want to run spotify.js right away
const spotify = require('./spotify.js'); // Separate JS file to handle all things Spotify
const helper = require('./discord-helper-functions'); // Contains helper functions useful for commands and this file


const fs = require('fs');

// Contains environment variables needed to operate
let config;


/**
 * TODO I don't think this JSdoc is right
 * @type {{
 *  attachAllEvents: attachAllEvents,
 *  startUp: startUp,
 *  parseMessage: parseMessage,
 *  onChannelDelete: onChannelDelete,
 *  onJoinServer: onJoinServer
 * }}
 */
module.exports = {
    parseMessage,
    onJoinServer,
    onChannelDelete,
    attachAllEvents,
    startUp
}


/**
 *
 * @param {module:"discord.js".Client} client -
 * @param {module:"discord.js".Collection} client.commands -
 * @param {module:readline.Interface} rl -
 * @param {number} cache_size -
 * @param {string} [spotify_id] -
 * @param {string} [spotify_secret] -
 */
function startUp(client,
                 rl,
                 cache_size,
                 spotify_id,
                 spotify_secret) {

    // Callbacks all the way down, needs to be somewhat linear
    readConfig(spotify_id, spotify_secret, () => {
        requestProperty(rl, config, 'spotify_id', 'Enter the Spotify ID:\n> ', () => {
            requestProperty(rl, config, 'spotify_secret',
                'Enter the Spotify secret:\n> ', spotify.authenticate);
        });
    });

    fs.readdir('./commands', (err, commandFiles) => {
        if (err) throw err;

        for (const file of commandFiles) {
            const command = require(`./commands/${file}`);
            client.commands.set(command.name, command);
        }
    });

    // I want a graceful exit. This will save the json object to the config file
    // so that items are not lost on closure of the bot.
    rl.on('SIGINT', () => {
        console.log('Attempting to save changes');

        // TODO this seems bad, see if I can fix spotify.js
        config.spotify_refresh_token = spotify.getRefreshToken();
        config.spotify_user_id = spotify.getSpotifyUserId();

        writeToConfig(config, () => {
            rl.close();
            process.exit(0);
        });
    });
}


/**
 * Helper function to make importing simple for those who are not adding functionality to the bot.
 * Attaches parseMessage, onJoinServer, and onChannelDelete to their respective event handlers.
 *
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
 * TODO
 * @param channel
 */
function onChannelDelete(channel) {
    if (channel.type !== 'text') {
        return;
    }

    if (channel.id === config.server_list[channel.guild.id].music_channel) {
        config.server_list[channel.guild.id].music_channel = '';
    } else if (channel.id === config.server_list[channel.guild.id].logging_channel) {
        config.server_list[channel.guild.id].logging_channel = '';
    }
}


/**
 * TODO
 * @param guild
 */
function onJoinServer(guild) {
    // Create a JSON dict for the server
    config.server_list[guild.id] = {
        'music_channel': '',
        'logging_channel': '',
        'playlist_id': '',
        'prefix': '!',
        'operational': true,
        'fill_cooldown': 0,
        'reset_cooldown': 0
    };

    // Try to give the server a playlist, if unable, don't let the server do anything.
    spotify.createPlaylist(guild.name).then(
        result => {
            config.server_list[guild.id].playlist_id = result;

        },
        () => {
            config.server_list[guild.id].operational = false;
            // TODO figure out how to send an error and success message
        }
    );
}


/**
 * TODO
 * callback hell
 * @param client
 * @param message
 */
function parseMessage(client, message) {
    const guildSettings = config.server_list[message.guild.id];
    if (guildSettings === undefined) return; // edge case for when the bot just joins and a message comes faster than config can be set

    // If the message isn't from the music channel and the music channel is set
    if (guildSettings.music_channel !== '' && message.channel.id !== guildSettings.music_channel) return;

    let matches = message.content.match(/https:\/\/open.spotify.com\/track\/[a-zA-Z0-9]+/g);
    // Guild is good to go, the music channel is set, the author isn't the bot, and there is a spotify link in the message
    if (guildSettings.operational && guildSettings.music_channel !== '' && !message.author.bot && matches !== null) {

        // Found a message with spotify links. Add it to the playlist and log.
        matches = matches.map(track => track.replace(/\?si=[a-zA-Z0-9]+/, ''));// Remove the sharing tracker from the end
        spotify.batchAddSongs(matches.map(track => track.replace('https://open.spotify.com/track/', '')), guildSettings.playlist_id).then(
            result => {
                let resultMessage;
                if (matches.length === 1) {
                    resultMessage = `Added song \<${matches[0]}\> sent by ${message.member.user.tag}`; // Template format doesn't like my angled brackets
                } else {
                    resultMessage = `Successfully added ${result} songs to playlist ${guildSettings.playlist_id}`;
                }
                helper.logToDiscord(client, guildSettings.logging_channel, resultMessage);
            },
            error => {
                let resultMessage;
                if (matches.length === 1) {
                    resultMessage = `Could not add song \<${matches[0]}\> sent by ${message.member.user.tag}.\nError: ${error.message}`; // Template format doesn't like my angled brackets
                } else {
                    resultMessage = `Error adding ${matches.length} songs to playlist ${guildSettings.playlist_id} sent by ${message.member.user.tag}.\n${error}`;
                }
                helper.logToDiscord(client, guildSettings.logging_channel, resultMessage);
            });

    } else {
        // Message is calling the bot and also isn't the bot itself doing it
        if (!message.content.startsWith(guildSettings.prefix) || message.author.bot) return;

        // If something is very badly broken, don't do anything else
        if (!guildSettings.operational) {
            if (message.member.permissions.any(268435638)) {
                message.reply('Something has gone horribly wrong, please contact bot owner.');
            }
            return;
        }

        // All this stuff is from the Discord.js guide. I'm probably not going to touch it for now unless necessary.
        const args = message.content.slice(guildSettings.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        if (!client.commands.has(commandName)) return;
        const command = client.commands.get(commandName);
        try {
            command.execute(message, args, config, spotify);
        } catch (error) {
            console.error(error);
        }
    }
}


/**
 * Any commands to execute after writing config.json
 * No parameters
 * @callback writeCallback
 */
/**
 * Writes the object to ./config.json
 *
 * @param {Object} json - The configuration object that should be written
 * @param {writeCallback} [callback] - A callback to execute after the file is written
 */
function writeToConfig(json, callback) {
    fs.writeFile('./config.json', JSON.stringify(json, null, 4), (err) => {
        if (err) {
            console.log(`WARNING, UNABLE TO SAVE CONFIG!\n${err}`);
            console.log(JSON.stringify(json, null, 4));
        } else {
            console.log('Configuration settings written to config.json');
        }

        if (callback) callback();
    });
}

/**
 * Any commands to execute after reading config.json
 * No parameters
 * @callback readCallback
 */
/**
 * Reads config.json and places it in the global variable config.
 *
 * @param {string} [spotify_id] - The ID of the Spotify Account for the Bot to use.
 *                                Entering this value will overwrite the value in the config
 * @param {string} [spotify_secret] - The secret token for the Spotify account
 * @param {readCallback} [callback] - Any commands that should be executed after reading
 */
function readConfig(spotify_id, spotify_secret, callback) {
    fs.readFile('./config.json', 'r+', (err, data) => {
            if (err) {
                console.log('Could not read config.json\nCreating config.json');
                createConfig(spotify_id, spotify_secret, callback);
            } else {

                config = JSON.parse(data);
                if (spotify_id) config['spotify_id'] = spotify_id;
                if (spotify_secret) config['spotify_secret'] = spotify_secret;
                if (callback) callback();
            }
    });
}


/**
 * Creates the json object that is placed in the config, then calls writeToConfig
 * to create the file.
 *
 * @param {string} [spotify_id] - The ID of the Spotify Account for the Bot to use
 * @param {string} [spotify_secret] - The secret token for the Spotify account
 * @param {writeCallback} [callback] - Passes a callback function to writeToConfig
 */
function createConfig(spotify_id, spotify_secret, callback) {
    const json = {
        spotify_id: '',
        spotify_secret: '',
        spotify_refresh_token: '',
        spotify_user_id: '',
        valid_prefixes: ['!', '!!', '.', '..', '?', '??', '&', '&&', '+', '++'],
        server_list: {}
    }

    if (spotify_id)
        json['spotify_id'] = spotify_id;
    if (spotify_secret)
        json['spotify_secret'] = spotify_secret;

    writeToConfig(json, callback);
}


/**
 * No parameter callback after requesting the specific property
 * @callback requestCallback
 */
/**
 * Requests from the command line a specific property that was not filled in, calls the callback no matter what
 * @param {module:readline.Interface} rl - The readline interface object to access the command line
 * @param {Object} json - The config object
 * @param {string} property - The property to access from the config object
 * @param {string} message - A message to state when prompting the command line
 * @param {requestCallback} callback - A function to execute after the value has been filled in
 */
function requestProperty(rl, json, property, message, callback) {
    if (!json[property]) {
        rl.question(message, (answer) => {
            json[property] = answer;
            callback();
        });
    } else {
        callback();
    }
}