'use strict';

const argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 [options] -d discord-bot-token')
    .help('h')
    .alias('h', 'help')
    .options({
        /*'test': {
            alias: 't',
            boolean: true,
            desc: 'Run test cases and use the testing bot'
        },*/ // Don't need, as Jasmine will run on it's own via a call
        'cache-size': {
            alias: 'c',
            number: true,
            nargs: 1,
            desc: 'Set the number of playlists that should be cached',
            default: 5
        },
        'discord-bot-token': {
            //demandOption: 'Supply the token for the bot to use with -b [token]\nTo read from a file use -b << filethatholdstoken.txt',
            alias: 'd',
            string: true,
            nargs: 1,
            desc: 'The value from the Developer Portal from Discord'
        },
        'spotify-id': {
            alias: 'i',
            string: true,
            nargs: 1,
            desc: 'Overwrite the value in the config for the Spotify ID'
        },
        'spotify-secret': {
            alias: 's',
            string: true,
            nargs: 1,
            desc: 'Overwrite the value in the config for the Spotify Secret'
        }
    }).argv;

const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

// Toss readline onto the arguments to be forwarded
argv.rl = rl;

if (!argv['discord-bot-token']) {
    // TODO Add an abort sequence, since Ctrl-c doesn't work
    rl.question('Enter the Discord Bot Token (Ctrl-c to exit):\n> ', (answer) => {
        argv['discord-bot-token'] = answer;

        // Connect the bot using CLI parameters
        require('./discord-connect')(argv);
    });
} else {
    require('./discord-connect')(argv);
}
