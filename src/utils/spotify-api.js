/**
 * Handles all Spotify API calls
 * @author Avery Smith
 * @licence MIT
 * @module utils/spotify-api
 * @requires module:http
 * @requires module:utils/playlist-cache
 */

const http = require('http');

const playlist_cache = require('utils/playlist-cache');
const cache = new playlist_cache(5);

let access_token = ''; // Access token used to act on a Spotify account
let refresh_time = 0; // The time in seconds since epoch when the access token was refreshed
let expires_in = 0; // The time in seconds for how long the access token is valid

module.exports = {
    createPlaylist,
    batchAddSongs,
    clearPlaylist
}


/**
 * Helper function to make sure that the incoming body is proper JSON
 * @param body
 * @return {*}
 */
function handleBody(body) {
    if (typeof body === 'string') {
        body = body.replace(/\n/g, '');
        body = JSON.parse(body);
    }
    return body;
}

/**
 * Checks to see if the bot currently has a valid access token.
 * @return {Promise<String>} A promise to obtain the access_token from the request
 * @throws No refresh token
 * @throws Cannot gain access token (in the promise)
 */
function checkAccess() {
    if (json.spotify_refresh_token === "") throw new Error('No refresh token');

    const currentTime = new Date().getTime() / 1000;
    if (refresh_time + expires_in <= currentTime || access_token === "") {
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
                body = handleBody(body);

                if (!error && response.statusCode === 200) {
                    access_token = body.access_token;
                    refresh_time = new Date().getTime() / 1000;
                    expires_in = body.expires_in;
                    console.log(`[${(new Date()).toISOString()}]: Access token refreshed\n`);
                    resolve(access_token);
                } else {
                    console.log('Tried to refresh access token but unable');
                    console.log(`Status Code: ${response.statusCode}`);
                    console.log(`[${(new Date()).toISOString()}]: Error: ${body.error.message}\n`);
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
 * @return {Promise<{}>} A dictionary of ID:URI song key:value pairs
 */
async function getAllIds(playlistId) {
    let idDict = cache.get(playlistId); // Try to get from cache first

    if (idDict === null) {
        idDict = {};
        let offset = 0;
        let idList = await getIdsByOffset(playlistId, offset); // Spotify API can only get 100 songs at a time

        while (idList.length !== 0) {
            for (let track of idList) {
                idDict[track.track.id] = `spotify:track:${track.track.id}`;
            }
            offset += 100;
            idList = await getIdsByOffset(playlistId, offset);
        }

        cache.add(idDict, playlistId); // Add the dictionary to the cache
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
            body = handleBody(body);

            if (!error && response.statusCode === 200) {
                console.log(`Successfully got tracks ${offset + 1}-${offset+body.items.length} from playlist: ${playlistId}`);
                resolve(body.items);
            } else {
                console.log(`Status Code: ${response.statusCode}`);
                console.log(`[${(new Date()).toISOString()}]: Error message: ${body.error.message}`);
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
            cache.updateSong(track, playlistId);
            trackList.push(`spotify:track:${track}`);
            playlist[track] = `spotify:track:${track}`;
        }
    }

    return trackList;
}

/**
 * Create a Spotify Playlist named after the server and return the playlist id.
 * Throw errors from checkAccess if unable to get token.
 * @param {String} guildName The name of the server
 * @return {Promise<String>} The id of the playlist created
 * @throws Could not create Playlist
 */
async function createPlaylist(guildName) {
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
            body = handleBody(body);

            if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
                console.log(`[${(new Date()).toISOString()}]: Playlist: ${body.id} created for Guild: ${guildName}\n`);
                resolve(body.id);
            } else {
                console.log(`Could not create playlist for ${guildName}`);
                console.log(`Status code: ${response.statusCode}`);
                console.log(`[${(new Date()).toISOString()}]: Error Message: ${body.error.message}\n`);
                reject(new Error('Could not create playlist'));
            }
        });
    });
}

/**
 * DEPRECATED, for the future, all additions to a playlist should go through batchAdd
 * Adds the given track to the given playlist.
 * Throws errors from checkAccess() if an issue occurs there.
 * @deprecated
 * @param {String} track The id of the song
 * @param {String} playlistId The id of the playlist
 * @return {Promise<boolean>} Will always return true as a failure will have an error
 * @throws Could not add song
 */
async function addSong(track, playlistId) {
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
            body = handleBody(body);

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
}

/**
 * Adds a list of song ids to the given playlist. Ignores duplicates.
 * @param {[String]} tracks The array of track IDs
 * @param {String} playlistId The playlist to add the songs to.
 * @return {Promise<number>} Returns a promise which on resolve, gives the number of tracks added
 */
async function batchAddSongs(tracks, playlistId) {
    await checkAccess();

    tracks = await removeDuplicates(tracks, playlistId);

    if (tracks.length === 0) {
        console.log(`[${(new Date()).toISOString()}]: All song(s) duplicate\n`);
        throw new Error('Did not add song(s) to playlist, all duplicates');
    }

    let songsAdded = 0;
    for (let i = 0; i < Math.ceil(tracks.length / 100); i++) {
        const lastIndex = Math.min(tracks.length, i*100 + 99);

        const options = {
            url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'

            },
            body: JSON.stringify({
                uris: tracks.slice(i*100, lastIndex + 1)
            }),
            dataType: 'json'
        };

        songsAdded += await new Promise(function(resolve, reject) {
            request.post(options, function (error, response, body) {
                body = handleBody(body);

                if (!error && response.statusCode === 201) {
                    console.log(`Added ${lastIndex % 100} songs to playlistId: ${playlistId}`);
                    resolve(lastIndex % 100);
                } else {
                    console.log(`Could not add ${lastIndex % 100} songs to playlistId: ${playlistId}`);
                    console.log(`Status code: ${response.statusCode}`);
                    console.log(`[${(new Date()).toISOString()}]: Error Message: ${body.error.message}\n`);
                    reject(new Error(`Could not add ${lastIndex % 100} songs: ${body.error.message}`));
                }
            });
        });
    }

    console.log(`[${(new Date()).toISOString()}]: Done adding songs\n`);
    return songsAdded;
}

/**
 * Clears the entire playlist
 * @param {String} playlistId The id of the playlist to clear
 * @return {Promise<boolean>} Always returns true, if it were to fail, it would throw an error instead
 */
async function clearPlaylist(playlistId) {
    await checkAccess();

    let trackList = await getAllIds(playlistId);

    for (let i = 0; i < Math.ceil(Object.keys(trackList).length / 100); i++) {
        const lastIndex = Math.min(Object.keys(trackList).length, i*100 + 99);

        const tracks = Object.values(trackList).slice(i*100, lastIndex + 1).map(value => {
            return { uri: value };
        }); // Specific formatting needed for deletion by Spotify API

        const options = {
            url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'

            },
            body: JSON.stringify({
                tracks: tracks
            }),
            dataType: 'json'
        };

        await new Promise(function(resolve, reject) {
            request.delete(options, function (error, response, body) {
                body = handleBody(body);

                if (!error && response.statusCode === 200) {
                    console.log(`Deleted ${lastIndex % 100} songs to playlistId: ${playlistId}`);
                    resolve(lastIndex % 100);
                } else {
                    console.log(`Could not delete ${lastIndex % 100} songs to playlistId: ${playlistId}`);
                    console.log(`Status code: ${response.statusCode}`);
                    console.log(`[${(new Date()).toISOString()}]: Error Message: ${body.error.message}\n`);
                    reject(new Error(`Could not delete ${lastIndex % 100} songs: ${body.error.message}`));
                }
            });
        });
    }
    console.log(`[${(new Date()).toISOString()}]: Deleted all contents of playlist: ${playlistId}\n`);
    cache.deletePlaylist(playlistId);
    return true;
}
