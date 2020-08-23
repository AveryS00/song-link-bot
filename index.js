// index.js
// Author: Avery Smith (ajsmith2@wpi.edu)

const fs = require('fs');
const rl = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});

// Discord.js wrapper used in the Discord bot functions
const Discord = require('discord.js');
const client = new Discord.Client();
client.commands = new Discord.Collection();

const spotify = require('./spotify.js'); // Separate JS file to handle all things Spotify
const json = require('./config.json'); // Contains environment variables needed to operate
const helper = require('./discord-helper-functions'); // Contains helper functions useful for commands and this file

// Dynamically loads command files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}



client.once('ready', () => {
	console.log('Connected to Discord\n');
});

client.on('guildCreate', guild => {
	// Create a JSON dict for the server
	json.server_list[guild.id] = {
		'music_channel': '',
		'logging_channel': '',
		'playlist_id': '',
		'prefix': '!',
		'operational': true
	};
	
	// Try to give the server a playlist, if unable, don't let the server do anything.
	spotify.createPlaylist(guild.name).then(
		result => {
			json.server_list[guild.id].playlist_id = result;

			},
		() => {
			json.server_list[guild.id].operational = false;
			// TODO figure out how to send an error and success message
		}
	);
});

client.on('message', message => {
	const guildSettings = json.server_list[message.guild.id];

	// If the message isn't from the music channel and the music channel is set
	if (guildSettings.music_channel !== '' && message.channel.id !== guildSettings.music_channel) return;

	let matches = message.content.match(/https:\/\/open.spotify.com\/track\/[a-zA-Z0-9]+/g);
	// Guild is good to go, the music channel is set, the author isn't the bot, and there is a spotify link in the message
	if (guildSettings.operational && guildSettings.music_channel !== '' && !message.author.bot && matches !== null) {

		// Found a message with spotify links. Add it to the playlist and log.
		matches = matches.map(track => track.replace(/\?si=[a-zA-Z0-9]+/,''));// Remove the sharing tracker from the end
		spotify.batchAddSongs(matches.map(track => track.replace('https://open.spotify.com/track/', '')), guildSettings.playlist_id).then(
				result => {
					let resultMessage;
					if (matches.length === 1) {
						resultMessage = `Added song \<${matches[0]}\> sent by ${message.member.displayName}`; // Template format doesn't like my angled brackets
					} else {
						resultMessage = `Successfully added ${result} songs to playlist ${guildSettings.playlist_id}`;
					}
					helper.logToDiscord(client, guildSettings.logging_channel, resultMessage);
				},
				error => {
					let resultMessage;
					if (matches.length === 1) {
						resultMessage = `Could not add song \<${matches[0]}\> sent by ${message.member.displayName}.\nError: ${error.message}`; // Template format doesn't like my angled brackets
					} else {
						resultMessage = `Error adding ${matches.length} songs to playlist ${guildSettings.playlist_id} sent by ${message.member.displayName}.\n${error}`;
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
			command.execute(message, args, json, spotify);
		} catch (error) {
			console.error(error);
		}
	}
});

client.on('channelDelete', channel => {
		if (channel.type !== 'text') { return; }

		if (channel.id === json.server_list[channel.guild.id].music_channel) {
			json.server_list[channel.guild.id].music_channel = '';
		} else if (channel.id === json.server_list[channel.guild.id].logging_channel) {
			json.server_list[channel.guild.id].logging_channel = '';
		}
	}
);

// I want a graceful exit. This will save the json object to the config file
// so that items are not lost on closure of the bot.
rl.on('SIGINT', () => {
	console.log('Saving changes');
	json.spotify_refresh_token = spotify.getRefreshToken();
	json.spotify_user_id = spotify.getSpotifyUserId();
	fs.writeFile('config.json', JSON.stringify(json, null, 4), err => {
		if (err) {
			console.log(err);
			console.log('Unable to save changes');
		} else {
			console.log('Saved changes to config.json');
		}
		rl.close();
		process.exit();
	});
});



spotify.authenticate(); // Start the authentication process for Spotify
client.login(json.token).catch(
	error => {
		console.log(`Couldn't connect to Discord. Error: ${error}`);
		process.exit();
	});

