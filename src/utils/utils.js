/**
 * Miscellaneous utility functions
 * @author Avery Smith
 * @licence MIT
 * @module utils/utils
 * @requires module:fs
 */

const fs = require('fs');


module.exports = {
    sendMessageToDiscord,
    attachCommandsToClient,
    writeToConfig,
    readConfig,
    requestProperty
}

/**
 * @param {module:"discord.js".Client} client - The connected Discord client
 * @param {module:"discord.js".TextChannel} client.channels.cache.get()
 * @param {String} message - The message to send
 * @param {String} [channelId] - Optional channel ID to send the message to
 */
function sendMessageToDiscord(client, message, channelId) {
    if (channelId === '' || channelId === null) {
        // Find a channel to send to
        // TODO
    } else {

        const channel = client.channels.cache.get(channelId);
        if (channel.isText()) {
            channel.send(message);
        }

    }
}


/**
 * Attaches all the files in the commands folder to
 * @param {module:"discord.js".Client} client - The Discord client to attach commands to
 * @param {module:"discord.js".Collection} client.commands
 */
function attachCommandsToClient(client) {
    fs.readdir('../commands', (err, commandFiles) => {
        if (err) throw err;

        for (const file of commandFiles) {
            const command = require(`commands/${file}`);
            client.commands.set(command.name, command);
        }
    });
}


/**
 * Any commands to execute after writing config.json
 * @callback writeCallback
 * @param {Object} json - The JSON object that gets written
 */
/**
 * Writes the object to ./config.json
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

        if (callback) callback(json);
    });
}


/**
 * Any commands to execute after reading config.json
 * Returns the config in the parameter
 * @callback readCallback
 * @param {Object} config
 */
/**
 * Reads config.json and places it in the global variable config.
 * @param {string} [spotify_id] - The ID of the Spotify Account for the Bot to use.
 *                                Entering this value will overwrite the value in the config
 * @param {string} [spotify_secret] - The secret token for the Spotify account
 * @param {readCallback} [callback] - Any commands that should be executed after reading
 */
function readConfig(spotify_id, spotify_secret, callback) {
    let config;

    fs.readFile('./config.json', 'r+', (err, data) => {
        if (err) {
            console.log('Could not read config.json\nCreating config.json');
            createConfig(spotify_id, spotify_secret, callback);
        } else {
            config = JSON.parse(data);
            if (spotify_id) config['spotify_id'] = spotify_id;
            if (spotify_secret) config['spotify_secret'] = spotify_secret;
            if (callback) callback(config);
        }
    });
}


/**
 * No parameter callback after requesting the specific property
 * @callback requestCallback
 */
/**
 * Requests from the command line a specific property that was not filled in, calls the callback no matter what
 * @param {module:readline.Interface} rl - The readline interface object to access the command line
 * @param rl.removeEventListener
 * @param {Object} json - The config object
 * @param {string} property - The property to access from the config object
 * @param {string} message - A message to state when prompting the command line
 * @param {requestCallback} callback - A function to execute after the value has been filled in
 */
function requestProperty(rl, json, property, message, callback) {
    if (!json[property]) {
        const ac = new AbortController();
        const signal = ac.signal;

        // Set up an event listener for the question so that it can exit with ctrl-c
        signal.addEventListener('abort', () => {
            console.log("Cancelling...");
            rl.close();
            process.exit(0);
        }, { once: true });

        rl.once('SIGINT', ac.abort);

        // Pose a prompt to the command line
        rl.question(message, { signal }, (answer) => {
            json[property] = answer;

            rl.removeEventListener('SIGINT', ac.abort);

            callback();
        });
    } else {
        callback();
    }
}


/**
 * Creates the json object that is placed in the config, then calls writeToConfig
 * to create the file.
 * @private
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
        server_list: {}
    }

    if (spotify_id)
        json['spotify_id'] = spotify_id;
    if (spotify_secret)
        json['spotify_secret'] = spotify_secret;

    writeToConfig(json, callback);
}