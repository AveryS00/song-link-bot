# Song Link Bot
This Discord bot will read messages from a specified channel and add all Spotify links that it finds to a playlist it creates.

I am currently not hosting a running version of this bot. If you would like to run it, you will have to self host. Instructions on how to do so will be written eventually.

Once added to a server, give the bot permissions to read messages, read message history, and send messages to the channel you want it to read from, and permissions to read and send messages to the channel you want it to log to (read is unfortunately required for logging or else the bot cannot see the channel in the first place).
Type the following command into any channel the bot can read ``!set music_channel <your-channel-here>`` and the bot is ready to go! It's highly suggested you also set logging channel right away as well
using ``!set logging_channel <your-channel-here>``.

## Known Issues
```
Unknown interaction of what happens when using fill command over a song that doesn't exist
TODO: Streamline code integration process with existing bots, eg. one import and it's good to go
TODO: YouTube functionality
TODO: Optimize flow for adding to a server. By default, read all channels allowed for its permissions. Respond directly to song links if no logging channel set. Add a silent mode for no logging. Add command for updating who has set privileges. Update documentation to reflect these changes.
TODO: Enhance error handling to include queuing up commands when rate-limited, abstract out shared error handling code
TODO: Take another look at caching system
TODO: Proper testing environment which uses secondary bot instead of primary 
TODO: Save config at regular intervals, centralize the handling of it
```

Please submit any and all issues that you find through GitHub. I am particularly interested in error messages that show up on client side.

## Commands:
All of these commands will be started with a prefix, so I have omitted it. The prefix will depend on what you set it to be. By default, the prefix is ``!``.

### set
``set music_channel <channel-name>``
This will set the channel that the Discord bot will read from. Once set, the bot will ONLY read from this channel and no other channel. That includes other commands as well as Spotify links. This channel must be a text channel.

When entering a ``<channel-name>``, you either must match the name exactly or use the ``#channel-name`` option from Discord. If your channel has an emoji, use the # version.


``set logging_channel <channel-name>``
This will set the channel that the Discord bot will write (but not read) logs to. This channel must be a text channel. Logging will take place when a user sends a spotify link into the ``music_channel``. The bot will send a message indicating whether it succeeded or not to add it to the server playlist. ``<channel-name>`` formatting is the same as the above command.

``set prefix <prefix>``
This will change the prefix to the given value in prefix, if it is one of the acceptable prefixes. Currently, acceptable prefixes are ``! !! . .. ? ?? & && + ++``. If you have a different prefix that you would like to be added to this list, create a GitHub issue.
If you are self-hosting, you have direct control over this list in the config.json.

All the set commands require moderator privileges.

### fill
``fill [number]``
This will fill the Spotify playlist with links going back ``number`` amount of messages. If number is omitted, it will attempt to read the entire channel.
Admin privileges are required for this command. There is a time gate of 3 hours before using this command again.

### reset
``reset``
This will completely clear the Spotify playlist associated with the server. Admin privileges are required for this command. There is a time gate of 3 hours before using this command again.

### playlist
``playlist``
The bot will reply directly with a link to view the Spotify playlist. Anyone can use this command.

### add song
This is not a command. Anytime a spotify link is sent in the ``music_channel``, the bot will take it and place it in the server playlist. The success or failure is then marked in the ``logging_channel``.

## Privacy and Data Collection
Should you choose to use the bot I host, I keep logs about command usages which specify guild ids, guild names, and usernames for the associated call. I also have access to view and modify all Spotify playlists created by the bot.
These logs are not shared with anyone and are used only for error solving purposes. The logs are destroyed upon resets of the bot. I will never sell or share data with anyone.

## Self Hosting
A Spotify account is required to host this bot yourself, but Premium is not necessary. Therefore, it is HIGHLY recommended creating a new free account just for the bot.

To host this bot yourself follow these instructions (INCOMPLETE):
1) Find a suitable machine to run this bot, that can either be your own computer that you guarantee will not close, or a cloud instance.
2) Clone this repository into a folder on that machine.
3) Install node.js.
4) Create a file called ``config.json`` and place it into the same level. Copy and paste the below template into it:
```
{
    "token": "",
    "spotify_id": "",
    "spotify_secret": "",
    "spotify_refresh_token": "",
    "spotify_user_id": "",
    "valid_prefixes": ["!", "!!", ".", "..", "?", "??", "&", "&&", "+", "++"],
    "server_list": {}
}
```
5) Go to the Discord Developer portal and create a new app. In that app create a new bot. Take the bot token and fill into the template config.
6) Do the same for Spotify. Add the Spotify client_id and spotify_secret. The rest will autofill.
7) Run the bot ``node index.js``.
8) Authorize a spotify account when prompted, this account should be one where you are OK with the creation of new playlists.
9) Add the bot to your server(s). 

