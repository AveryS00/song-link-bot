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

client.on('guildCreate', (guild) => {
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
	
	if (guildSettings.music_channel !== '' && message.channel.id !== guildSettings.music_channel) return;

	if (guildSettings.operational && guildSettings.music_channel !== '' 
		&& message.content.match(/https:\/\/open.spotify.com\/track\/[a-zA-Z0-9]+/g) !== null) {

		// Found a message with spotify links. Add it to the playlist and log.
		for (let track of message.content.match(/https:\/\/open.spotify.com\/track\/[a-zA-Z0-9]+/g)) {
			track = track.replace(/\?si=[a-zA-Z0-9]+/,''); // Remove the sharing trackers at the end of the link

			spotify.addSong(track.replace('https://open.spotify.com/track/', ''), guildSettings.playlist_id).then(
				() => {
					console.log(`Added song ${track} to server ${message.guild.id}/${message.guild.name} sent by ${message.member.displayName}\n`);
					helper.logToDiscord(client, guildSettings.logging_channel, `Added song ${track} sent by ${message.member.displayName}`);
				},
				error => {
					console.log(`Unable to add song ${track} to server ${message.guild.id}/${message.guild.name} sent by ${message.member.displayName}\n`);
					helper.logToDiscord(client, guildSettings.logging_channel,`Unable to add song ${track} sent by ${message.member.displayName}\n\n${error.message}`);
				});
		}

		
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

// I want a graceful exit. This will save the json object to the config file
// so that items are not lost on closure of the bot.
rl.on('SIGINT', () => {
	console.log('Saving changes');
	json.spotify_refresh_token = spotify.getRefreshToken();
	//json.spotify_user_id = spotify.getSpotifyUserId();
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

spotify.authenticate(); // Start the authentication process for Spotify TODO make a promise, .then(connect to Discord)
client.login(json.token);

