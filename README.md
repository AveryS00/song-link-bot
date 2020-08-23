# discord-bot
This Discord bot will read messages from a music channel and add all Spotify links that it finds to a playlist it creates. A Spotify account is required to host this bot yourself, but Premium is not necessary. Therefore, it is HIGHLY recommended creating a new free account just for the bot.

YouTube functionality will be implemented at a later date

To add this bot to your server, I am hosting one but cannot guarantee a reliable uptime. The link to invite it is here: https://discord.com/oauth2/authorize?client_id=736308578721202276&scope=bot

Once added, give the bot permissions to read messages and message history of the channel you want it to read from, and permissions to send messages to the channel you want it to log to.
Type the following command into any channel the bot can read ``!set music_channel <your-channel-here>`` and the bot is ready to go! It's highly suggested you also set logging channel right away as well
using ``!set logging_channel <your-channel-here>``.

## Known Issues
```
Unknown interaction of what happens when using fill command over a song that doesn't exist
fill and reset command not time gated
caching not implemented
no help command, likely implementation is to just redirect to this github when asked
```

Please submit any and all issues that you find either through GitHub, or my email: as@averysmith.net

## Commands:
All of these commands will be started with a prefix, so I have omitted it. The prefix will depend on what you set it to be. By default, the prefix is ``!``.

### set
``set music_channel <channel-name>``
This will set the channel that the Discord bot will read from. Once set, the bot will ONLY read from this channel and no other channel. That includes other commands as well as Spotify links. This channel must be a text channel.

When entering a ``<channel-name>``, you either must match the name exactly or use the ``#channel-name`` option from Discord. If your channel has an emoji, use the # version.


``set logging_channel <channel-name>``
This will set the channel that the Discord bot will write (but not read) logs to. This channel must be a text channel. Logging will take place when a user sends a spotify link into the ``music_channel``. The bot will send a message indicating whether it succeeded or not to add it to the server playlist. ``<channel-name>`` formatting is the same as the above command.

``set prefix <prefix>``
This will change the prefix to the given value in prefix, if it is one of the acceptable prefixes. Currently, acceptable prefixes are ``! !! . .. ? ?? & && + ++``. If you have a different prefix that you would like to be added to this list, send me a pull request if you know how to do so, or a message through any form of media.
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
The bot will reply with a link to view the Spotify playlist. Anyone can use this command.

### add song
This is not a 'command' per se. Anytime a spotify link is sent in the ``music_channel``, the bot will take it and place it in the server playlist. The success or failure is then marked in the ``logging_channel``.

## Self Hosting

To host this bot yourself follow these instructions:
1) Find a suitable machine to run this bot, that can either be your own computer that you guarantee will not close, or possibly a cloud instance.
2) Clone this repository into a folder on that machine.
3) Install node.js.
4) Go to the Discord Developer portal and create a new app. In that app create a new bot. Take the bot token and fill into the template config.
5) Do the same for Spotify. Add the Spotify client_id and spotify_secret. The rest will autofill.
6) Run the bot ``node index.js``.
7) Authorize a spotify account when prompted, this account should be one where you are OK with the creation of new playlists.
8) Add the bot to your server(s). 

The rest of this readme is more technical writing to help me focus on features I wanted to implement.
### Actors:
	Bot: The system that the users and admins interact with.
	Admin: A person that has control over the bot, and higher privileges than the user to operate specific tasks.
	User: A person that interacts with the bot through song submissions and playlist viewing.

## Use Cases:
### Admin:
	set input channel
	set logging channel
	fill playlist
	reset playlist
	change bot call modifier
		
### User:
	view playlist
	add song to playlist
		
### Set Input Channel
```
Precondition: Bot is in at least one channel
Participating Actor: Admin
Postcondition: Bot will only read messages from set channel
Flow of Events: 1) Admin requests a setting of the channel that the bot will read messages from.
		2) Bot checks that the channel given is a proper channel in the Discord.
		Bot stores the channel it will read input from and responds to admin that the input channel
		has been set. Bot replies directly that the channel has been set for reading.
```
### Set Logging Channel
```
Precondition: Bot is reading from a set channel
Participating Actor: Admin
Postcondition: Bot will relay all responses from set channel
Flow of Events: 1) Admin requests in a channel that the bot is reading, that the bot display all 
		responses in a specific channel.
		2) Bot checks that the channel given is a proper channel in the Discord.
		Bot stores the channel it will log to, and replies directly to the Admin's request.
```

### Fill Playlist
```
Precondition: Bot is reading from a set channel
Participating Actor: Admin
Postcondition: Playlist is filled with all shared music in the set channel
Flow of Events: 1) Admin requests a fill of the playlist.
		2) Bot will read through the channel and add all Spotify links it finds to the playlist,
		ignoring duplicates and other playlists. Bot replies directly that it has completed the task. 
		This operation will likely be slow.
```
### Reset Playlist
```
Precondition: Bot is reading from a set channel
Participating Actor: Admin
Postcondition: Playlist entities are reset to not contain any songs.
Flow of Events: 1) Admin requests a reset of the playlists.
		2) Bot will delete all songs in the playlist and reply directly that the playlist has been cleared.
```
### Change Bot Call Modifier
```
Precondition: Bot is reading from a set channel
Participating Actor: Admin
Postcondition: Bot reads requests using a different modifier.
Flow of Events: 1) Admin requests a change for the bot call modifier. Admin supplies the new modifier.
		2) Bot checks that the modifier is an acceptable modifier. Bot will change the modifier 
		for reading if the modifier is acceptable. Otherwise, the state of the Bot remains unchanged.
		Bot then replies directly that the modifier has been changed.
```
### View Playlists
```
Precondition: Bot is reading from a set channel
Participating Actor: User
Postcondition: Bot responds with a link to view the playlist
Flow of Events: 1) User sends a request to view the playlists.
		2) Bot responds directly to the user with a link to view the playlist.
```
### Add Song to Playlists
```
Precondition: Bot is reading from a set channel
Participating Actor: User
Postcondition: The playlist is updated if the song sent by the user is distinct
Flow of Events: 1) User sends a link to a song on Spotify.
		2) Bot takes the link and updates the playlist by adding the song listed if not already 
		in the playlist.
		3) Bot responds with success or failure in logging channel.
```
