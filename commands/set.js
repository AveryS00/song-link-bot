
module.exports = {
	name: 'set',
	description: 'Configure settings for the bot, such as music channel, logging channel, and prefix',
	execute(message, args, json) {
		if (!message.member.permissions.any(268435638)) return; 
		// Magic permissions number, basically if the sender cannot moderate, don't let them use this.
		
		if (args.length !== 2) {
			message.reply('Invalid number of arguments given');
			return;
		}


		if (args[0] === 'music_channel') {
		
			if (args[1].startsWith('<#') && args[1].endsWith('>')) {
				args[1] = args[1].slice(2, -1);
			}
			
			// Validate this is an acceptable channel
			for (const [id, channel] of message.guild.channels.cache) {
				if (channel.type === 'text' && (id === args[1] || channel.name === args[1])) {
					json.server_list[message.guild.id].music_channel = id;
					message.reply(`Channel ${channel.name} set as music_channel`);
					return;
				}
			}
			
			message.reply('Invalid channel');
			return;
		
		} else if (args[0] === 'logging_channel') {
		
			if (args[1].startsWith('<#') && args[1].endsWith('>')) {
				args[1] = args[1].slice(2, -1);
			}
			
			// Validate this is an acceptable channel, too lazy to abstract this into an outside function
			for (const [id, channel] of message.guild.channels.cache) {
				if (channel.type === 'text' && (id === args[1] || channel.name === args[1])) {
					json.server_list[message.guild.id].logging_channel = id;
					message.reply(`Channel ${channel.name} set as logging_channel`);
					return;
				}
			}
			
			message.reply('Invalid channel');
			return;
		
		} else if (args[0] === 'prefix') {
			for (const prefix of json.valid_prefixes) {
				if (args[1] === prefix) {
					json.server_list[message.guild.id].prefix = args[1];
					message.reply(`Prefix set to ${args[1]}`);
					return;
				}
			}
			message.reply('Invalid prefix, see help for list of valid prefixes');
			return;
		}

		message.reply('Unable to understand set command');
	},
};

