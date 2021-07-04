/**
 * Starts up the server to wait for the Spotify authentication process
 * @author Avery Smith
 * @licence MIT
 * @module utils/spotify-server
 * @requires module:querystring
 * @requires module:http
 */

const querystring = require('querystring');
const http = require('http'); // TODO upgrade to https

module.exports = {
	authenticate
}

const server = http.createServer(parseRequest);


/**
 *
 * @param {module:http.IncomingMessage} req
 * @param {module:http.ServerResponse} res
 */
function parseRequest(req, res) {

	loginToSpotify(req, res);
}

/**
 *
 * @param {module:http.IncomingMessage} req
 * @param {module:http.ServerResponse} res
 */
function loginToSpotify(req, res) {
	res.end('You can close this window');
	const err = req.query.error;

	if (err) {
		// TODO Give a 3 tries instead of exit
		console.log(`Unable to login due to error: ${req.query.error}`);
		process.exit();
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
			headers: {'Authorization': 'Basic ' + Buffer.from(json.spotify_id + ':' + json.spotify_secret, 'base64')},
			json: true
		};

		http.post(authOptions, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				// Success! Save the token info.
				access_token = body.access_token;
				refresh_time = new Date().getTime() / 1000; // Current time in seconds
				expires_in = body.expires_in;
				json.spotify_refresh_token = body.refresh_token;

				console.log('Access tokens acquired, closing server');
				server.close(); // Close the server as I won't need it anymore.

				// Get the spotify user id
				const options = {
					url: 'https://api.spotify.com/v1/me',
					headers: {'Authorization': `Bearer ${access_token}`},
					json: true
				};
				request.get(options, function (error, response, body) {
					body = handleBody(body);

					if (!error && response.statusCode === 200) {
						json.spotify_user_id = body.id;
						console.log('Able to get spotify user id from authorization\n');
					} else {
						console.log('Unable to get user id. Please enter manually before continuing operation\n');
						console.log(`Status Code: ${response.statusCode}`);
						console.log(`Error: ${body.error.message}`);
					}
				});

			} else {
				// Fail! Print why and close the bot.
				console.log(`Error: ${body.error_description}`);
				console.log(`Status Code: ${response.statusCode}`);
				process.exit();
			}
		});
	}
}


/**
 * Check for an existing refresh token, if none, request authorization from a Spotify account.
 * @param {String} spotify_id - The spotify ID to log in to
 * @param {String} [refresh_token] - An optional refresh token which can be used to generate access tokens
 */
function authenticate(spotify_id, refresh_token) {
	if (!server.listening) server.listen(80);

	if (refresh_token === '') {
		console.log('Please authorize a Spotify account for this bot to use:');
		
		const signInStr = 'https://accounts.spotify.com/authorize?' + querystring.stringify({
			response_type: 'code',
			client_id: spotify_id,
			scope: 'playlist-modify-private',
			redirect_uri: 'http://localhost:80/callback'
		});

		console.log(signInStr);
	} else {
		console.log('Spotify access already authorized\n');
	}
}
