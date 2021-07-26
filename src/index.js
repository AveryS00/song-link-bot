/**
 * Entry point to starting this program
 * @author Avery Smith
 * @version 1.1.0
 * @licence MIT
 * @requires file:yargs/yargs
 * @requires module:readline
 * @requires module:discord-connect
 * @requires module:utils/utils
 */
'use strict';

const { requestProperty } = require('utils/utils');

const argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 [options] -d discord-bot-token')
    .options({
        'cache-size': {
            alias: 'c',
            number: true,
            nargs: 1,
            desc: 'Set the number of playlists that should be cached',
            default: 5
        },
        'discord-bot-token': {
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

rl.removeEventListener();

if (!argv['discord-bot-token']) {
    requestProperty(rl, argv, 'discord-bot-token',
        'Enter the Discord Bot Token (Ctrl-c to exit):\n> ', () => {
            // Connect the bot using CLI parameters
            require('discord-connect')(argv);
        });
} else {
    require('discord-connect')(argv);
}


/**
 * @license
 * Copyright (c) 2021 Avery Smith
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */