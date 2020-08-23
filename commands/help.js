// help.js
// Author: Avery Smith (ajsmith2@wpi.edu)

module.exports = {
    name: 'help',
    execute(message, args, json, spotify) {
        message.channel.send('Please view https://github.com/AveryS00/discord-bot for list of commands and information');
    }
};