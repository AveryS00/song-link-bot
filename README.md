# discord-bot
This Discord bot will read messages from a music channel and add all Spotify links that it finds to a public (not collaborative) playlist it creates. The usage of this bot requires a Spotify account, but not Premium as no streaming takes place. Therefore, it is HIGHLY recommended to create a new free account just for the bot.

YouTube functionality will be implemented at a later date

### Actors:
	Bot: The system that the users and admins interact with.
	Admin: A person that has control over the bot, and higher priveleges than the user to operate specific tasks.
	User: A person that interacts with the bot through song submissions and playlist viewing.


## Use Cases:
### Admin:
	set input channel
	set output channel
	link spotify
	link youtube
	fill playlists
	reset playlists
	change bot call modifier
		
### User:
	view playlists
	add song to playlists
		
### set input channel
Precondition: Bot is in at least one a channel
Participating Actor: Admin
Postcondition: Bot will only read messages from set channel
Flow of Events: 1) Admin requests a setting of the channel that the bot will read messages from
				2) Bot stores the channel it will read input from and responds to admin that the input channel has been set. This message will be relayed in output channel if set, or in the channel the request was sent in otherwise.
				
### set output channel
Precondition: Bot is reading from a channel
Participating Actor: Admin
Postcondition: Bot will relay all responses from set channel
Flow of Events: 1) Admin requests in a channel that the bot is reading, that the bot display all responses in a specific channel.
				2) Bot stores the channel it will respond to, and responds to the Admin's request in the set channel.
				
### link spotify
Not a feasible way to do this over Discord while protecting account integrity at the moment.

### link youtube

### fill playlists
Precondition: Bot is reading from a channel and a Spotify account is linked
Participating Actor: Admin
Postcondition: Playlist is filled with all shared music in the set channel
Flow of Events: 1) Admin requests a fill of the playlist.
				2) Bot will read through the channel and add all Spotify links it finds to the playlist, ignoring duplicates. Bot responds in the output channel that it has completed the task. This operation will likely be heavily rate limited by Discord, so this operation will be slow.

### reset playlists
Precondition: Bot is reading from a channel and a Spotify account is linked
Participating Actor: Admin
Postcondition: Playlist entities are reset to not contain any songs.
Flow of Events: 1) Admin requests a reset of the playlists.
				2) Bot will delete all songs in the linked

### change bot call modifier
Precondition: Bot is reading from a channel
Participating Actor: Admin
Postcondition: Bot reads requests using a different modifier.
Flow of Events: 1) Admin requests a change for the bot call modifier. Admin supplies the new modifier.
				2) Bot checks that the modifier is an acceptable modifier. Bot will change the modifier for reading if the modifier is acceptable. Otherwise, the state of the Bot remains unchanged. 

### view playlists
Precondition: Bot is reading from a channel and a Spotify account is linked
Participating Actor: User
Postcondition: Bot responds with a link to view the playlist
Flow of Events: 1) User sends a request to view the playlists.
				2) Bot responds in the output channel (or should I just have it be directly) with a link to view the playlists.

### add song to playlists
Precondition: Bot is reading from a channel and a Spotify account is linked
Participating Actor: User
Postcondition: The playlist is updated if the song sent by the user is distinct
Flow of Events: 1) User sends a link to a song on Spotify.
				2) Bot takes the link and updates the playlist by adding the song listed if not already in the playlist.
				3) Bot responds with success or failure in output channel.

