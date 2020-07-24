const Discord = require('discord.js');
const config = require('./config.json');
const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
	if (message.content.match(/https:\/\/open.spotify.com\/track\/[a-zA-Z0-9?=]/g) !== null) {
		message.channel.send('Spotify Link Received');
	}
});


client.login(config.token);


