const querystring = require('querystring');

const express = require('express'); // These require NPM Installs
const request = require('request'); // Deprecated module, for future use ajax or alternative
const opn = require('opn'); // There's a module for everything! Used once to open the authorization link automatically

const json = require('./config.json');


const app = express(); // Create a simple http access
let access_token = ""; // Access token used to act on a Spotify account
let refresh_time = 0; // The time in seconds since epoch when the access token was refreshed
let expires_in = 0; // The time in seconds for how long the access token is valid

app.get('/', function(req, res) {
	res.send('hello world (this is just to see if the server is online)');
});

// Create a page to obtain the spotify access and refresh tokens
app.get('/callback', function(req, res) {
	res.send('You can close this window');
	const err = req.query.error;
	
	if (err) {
		console.log(`Unable to login due to error: ${req.query.error}`);
		process.exit(); // Bad code practice, but for now I just want the bot to shut down instead of error later
	} else {
		const code = req.query.code || null;
		
		// API call to Spotify to get refresh and access codes.
		const authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			form: {
				code: code,
				redirect_uri: 'http://localhost:8888/callback',
				grant_type: 'authorization_code'
			},
			headers: {'Authorization': 'Basic ' + (new Buffer(json.spotify_id + ':' + json.spotify_secret).toString('base64'))},
			json: true
		};

		request.post(authOptions, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				// Success! Save the token info.
				access_token = body.access_token;
				refresh_time = new Date().getTime() / 1000; // Current time in seconds
				expires_in = body.expires_in;
				json.spotify_refresh_token = body.refresh_token;
				
			    console.log('Access tokens acquired, closing server\n');
				server.close(); // Close the server as I won't need it anymore.
			} else {
				// Fail! Print why and close the bot.
				console.log(`Error: ${error}`);
				console.log(`Status Code: ${response.statusCode}`);
				process.exit();
			}
		});
	}
});

const server = app.listen('8888'); // Open the HTTP Server, will be closed when authenticated.



/**
 * Checks to see if the bot currently has a valid access token.
 * @return {Promise<String>} A promise to obtain the access_token from the request
 * @throws No refresh token
 * @throws Cannot gain access token (in the promise)
 */
function checkAccess() {
	if (json.spotify_refresh_token === "") throw new Error('No refresh token');

	const currentTime = new Date().getTime() / 1000;
	if (refresh_time + expires_in >= currentTime || access_token === "") {
		const authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			headers: { 'Authorization': 'Basic ' + (new Buffer(json.spotify_id + ':' + json.spotify_secret).toString('base64'))},
			form: {
				grant_type: 'refresh_token',
				refresh_token: json.spotify_refresh_token
			},
			json: true
		};

		return new Promise(function (resolve, reject) {
			request.post(authOptions, function (error, response, body) {
				if (typeof body === 'string') {
					body = body.replace(/\n/g, '');
					body = JSON.parse(body);
				}

				if (!error && response.statusCode === 200) {
					access_token = body.access_token;
					refresh_time = new Date().getTime() / 1000;
					expires_in = body.expires_in;
					console.log('Access token refreshed\n');
					resolve(access_token);
				} else {
					console.log('Tried to refresh access token but unable\n');
					console.log(`Status Code: ${response.statusCode}`);
					console.log(`Error: ${body.error.message}`);
					reject(new Error(`Cannot gain access token: ${body.error.message}`));
				}
			});
		});
	}
}

/**
 * Gets all of the song ids from a given playlist and returns them in a dictionary
 * where the ids are the key and the value is the Spotify URI. For Console logs, if
 * the start is less than the end, there were no songs to get.
 * @param {String} playlistId The id for the playlist to get
 * @return {Promise<{String:String}>} A dictionary of ID:URI song key:value pairs
 */
async function getAllIds(playlistId) {
	let idDict = {};
	let offset = 0;
	let idList = await getIdsByOffset(playlistId, offset); // Spotify API can only get 100 songs at a time

	while (idList.length !== 0) {
		for (let track of idList) {
			idDict[idList[track].track.id] = `spotify:track:${idList[track].track.id}`;
		}
		offset += 100;
		idList = await getIdsByOffset(playlistId, offset);
	}

	return idDict;
}

/**
 * Assumes access token has already been refreshed. Returns up to 100 Spotify track
 * IDs from the given playlist at the offset.
 * @param {String} playlistId The id of the playlist to get songs from
 * @param {number} offset The starting point. 0 starts at the first song in a playlist
 * @return {Promise<{String:{String:String}}>} Returns the raw body of the call. A list of dictionaries with a structure of {track: {id:'trackId'}}
 * @throws 'Could not get songs in playlist: [playlistId], could not check for duplicates: error message'
 */
function getIdsByOffset(playlistId, offset) {
	const options = {
		url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks?` +
			querystring.stringify({
				fields: 'items(track.id)',
				offset: offset
			}),
		headers: { 'Authorization': 'Bearer ' + access_token },
		json: true
	};

	return new Promise(function (resolve, reject) {
		request.get(options, function(error, response, body) {
			if (typeof body === 'string') {
				body = body.replace(/\n/g, '');
				body = JSON.parse(body);
			}

			if (!error && response.statusCode === 200) {
				console.log(`Successfully got tracks ${offset + 1}-${offset+body.items.length} from playlist: ${playlistId}`);
				resolve(body.items);
			} else {
				console.log(`Status Code: ${response.statusCode}`);
				console.log(`Error message: ${body.error.message}`);
				reject(new Error(`Could not get songs in playlist: ${playlistId}, could not check for duplicates: ${body.error.message}`));
			}
		});
	});
}

/**
 * Checks to see if one song is already in the given playlist
 * @param {String} track The ID of the track to check
 * @param {String} playlistId The ID of the playlist
 * @return {Promise<boolean>} True if the track is already in the playlist
 */
async function inPlaylist(track, playlistId) {
	let trackList = await getAllIds(playlistId);
	return track in trackList;
}

/**
 * Removes duplicate ids from the given tracks and returns the non-duplicates in URI form
 * @param {[String]} tracks The list of track ids
 * @param {String} playlistId The playlist to check duplicates against
 * @return {Promise<[String]>} Returns a list of the songs that aren't duplicates in URI form
 */
async function removeDuplicates(tracks, playlistId) {
	let playlist = await getAllIds(playlistId);
	let trackList = [];

	for (let track of tracks) {
		if (!(track in playlist)) {
			trackList.push(`spotify:track:${track}`);
		}
	}

	return trackList;
}

/**
 * Check for an existing refresh token, if none, request authorization from a Spotify account.
 * TODO add user_id to JSON config programmatically.
 */
exports.authenticate = function () {
	if (json.spotify_refresh_token === "") {
		console.log('Please authorize a Spotify account for this bot to use:');
		
		const signInStr = 'https://accounts.spotify.com/authorize?' + 
		querystring.stringify({
			response_type: 'code',
			client_id: json.spotify_id,
			scope: 'playlist-modify-private',
			redirect_uri: 'http://localhost:8888/callback'
		});
		
		//console.log(signInStr); 
		opn(signInStr);
	} else {
		console.log('Spotify access already authorized\n');
	}
};

/**
 * Create a Spotify Playlist named after the server and return the playlist id.
 * Throw errors from checkAccess if unable to get token.
 * @param {String} guildName The name of the server
 * @return {Promise<String>} The id of the playlist created
 * @throws Could not create Playlist
  */
exports.createPlaylist = async function (guildName) {
	await checkAccess();
	
	const options = {
        url: `https://api.spotify.com/v1/users/${json.spotify_user_id}/playlists`,
        body: JSON.stringify({
            'name': guildName,
            'public': false
        }),
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
        },
		dataType: 'json'
    };

	return await new Promise(function(resolve, reject) {
		request.post(options, function(error, response, body) {
			if (typeof body === 'string') {
				body = body.replace(/\n/g, '');
				body = JSON.parse(body);
			}

			if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
				console.log(`Body: ${body}`);
				console.log(`Playlist: ${body.id} created for Guild: ${guildName}\n`);
				resolve(body.id);
			} else {
				console.log(`Could not create playlist for ${guildName}`);
				console.log(`Status code: ${response.statusCode}`);
				console.log(`Error Message: ${body.error.message}`);
				reject(new Error('Could not create playlist'));
			}
		});
	});
};

/**
 * Adds the given track to the given playlist.
 * Throws errors from checkAccess() if an issue occurs there.
 * @param {String} track The id of the song
 * @param {String} playlistId The id of the playlist
 * @return {Promise<boolean>} Will always return true as a failure will have an error
 * @throws Could not add song
 */
exports.addSong = async function (track, playlistId) {
	await checkAccess();

	if (await inPlaylist(track, playlistId)) {
		throw new Error('Duplicate song');
	}

	const options = {
		url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
		headers: {
			'Authorization': `Bearer ${access_token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			'uris': [`spotify:track:${track}`]
		}),
		dataType: 'json'
	};

	return await new Promise(function(resolve, reject) {
		request.post(options, function(error, response, body) {
			if (typeof body === 'string') {
				body = body.replace(/\n/g, '');
				body = JSON.parse(body);
			}

			if (!error && response.statusCode === 201) {
				console.log(`Added song to playlistId: ${playlistId}`);
				resolve(true);
			} else {
				console.log(`Could not add song to playlistId: ${playlistId}`);
				console.log(`Status code: ${response.statusCode}`);
				console.log(`Error Message: ${body.error.message}`);
				reject(new Error(`Could not add song: ${body.error.message}`));
			}
		});
	});
};

/**
 * Adds a list of song ids to the given playlist. Ignores duplicates.
 * @param {[String]} tracks The array of track IDs
 * @param {String} playlistId The playlist to add the songs to.
 * @return {Promise<number>} Returns a promise which on resolve, gives the number of tracks added
 */
exports.batchAddSongs = async function (tracks, playlistId) {
	await checkAccess();

	tracks = await removeDuplicates(tracks, playlistId);

	let songsAdded = 0;
	for (let i = 0; i < Math.ceil(tracks.length / 100); i++) {
		const numSongsToAdd = Math.min(tracks.length - 1, i*100 + 99);

		const options = {
			url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
			headers: {
				'Authorization': `Bearer ${access_token}`,
				'Content-Type': 'application/json'

			},
			body: JSON.stringify({
				uris: tracks.slice(i*100, numSongsToAdd)
			}),
			dataType: 'json'
		};

		songsAdded += await new Promise(function(resolve, reject) {
			request.post(options, function (error, response, body) {
				if (typeof body === 'string') {
					body = body.replace(/\n/g, '');
					body = JSON.parse(body);
				}

				if (!error && response.statusCode === 201) {
					console.log(`Added ${numSongsToAdd} songs to playlistId: ${playlistId}`);
					resolve(numSongsToAdd);
				} else {
					console.log(`Could not add ${numSongsToAdd} songs to playlistId: ${playlistId}`);
					console.log(`Status code: ${response.statusCode}`);
					console.log(`Error Message: ${body.error.message}`);
					reject(new Error(`Could not add ${numSongsToAdd} songs: ${body.error.message}`));
				}
			});
		});
	}

	return songsAdded;
};

// Clears the entire playlist to be filled again.
// !!! TODO
exports.clearPlaylist = function (playlistId) {

};

exports.getRefreshToken = () => json.spotify_refresh_token; // Have to send the refresh token back to index.js to be saved
exports.getSpotifyUserId = () => json.spotify_user_id; // Same for user_id
