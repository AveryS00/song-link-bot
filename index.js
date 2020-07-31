const fs = require('fs');
const Discord = require('discord.js');
const { prefix, token, logging_channel, music_channel } = require('./config.json');
const client = new Discord.Client();

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
	if (message.channel.name === music_channel && message.content.match(/https:\/\/open.spotify.com\/track\/[a-zA-Z0-9?=]/g) !== null) {
		message.channel.send('Spotify Link Received');
		return;
	} else {
		if (!message.content.startsWith(prefix) || message.author.bot || message.channel.name !== logging_channel) return;

		const args = message.content.slice(prefix.length).trim().split(/ +/);
		const commandName = args.shift().toLowerCase();

		if (!client.commands.has(commandName)) return;
		
		const command = client.commands.get(commandName);

		try {
			command.execute(message, args);
		} catch (error) {
			console.error(error);
			message.reply('There was an error trying to execute that command!');
		}
	}
});


client.login(token);


