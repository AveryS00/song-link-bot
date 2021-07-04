/**
 * A caching class to store playlists with a Least-Recently-Used Eviction policy
 * @author Avery Smith
 * @licence MIT
 * @module utils/playlist-cache
 */

/**
 * Create a cache object with the given maxSize
 * @param {number} maxSize - The maximum number of playlists to hold
 * @return {PlaylistCache} PlaylistCache is a LRU cache to store playlist info so that Spotify
 *                          does not need to be called for each action
 * @constructor
 */
module.exports = class PlaylistCache {
    #size = 0;
    #tail = null;
    #head = null;
    #cache = {};
    #maxSize;

    /**
     * Create a cache object with the given maxSize
     * @param {number} maxSize - The maximum number of playlists to hold
     */
    constructor(maxSize) {
        this.#maxSize = maxSize;
    }

    /**
     * Get the given playlist from the cache, if a miss, return null
     * @param {String} playlistId The playlist to get
     * @return {null|{String: String}}
     */
    get(playlistId) {
        if (!(playlistId in this.#cache)) {
            console.log('Cache miss!');
            return null;
        }
        console.log('Cache hit!');

        // Reorganize order, if prev is null then the playlist is already the head, so do nothing
        if (this.#cache[playlistId].prev !== null) {
            this.#cache[playlistId].prev = this.#cache[playlistId].next;

            if (this.#cache[playlistId].next !== null) {
                this.#cache[playlistId].next = this.#cache[playlistId].prev;
            }

            // Move the current playlist to the head by utilizing the add function
            let idDict = this.#cache[playlistId].tracks;
            this.#size--;
            delete this.#cache[playlistId];
            this.#cache.add(idDict, playlistId);
        }

        return this.#cache[playlistId].tracks;
    }

    /**
     * Add the given dictionary of ids to this cache, named after the playlistId
     * @param {{String: String}} idDict The dictionary of id: uri
     * @param {String} playlistId The playlistId
     */
     add(idDict, playlistId) {
        const playlist = {
            id: playlistId,
            tracks: idDict,
            prev: null,
            next: this.#head
        }; // Create a playlist object

        this.#cache[playlistId] = playlist;

        if (this.#size !== 0) {
            this.#head.prev = playlist;
            this.#head = playlist;
        }

        if (this.#size === this.#maxSize) {
            let tailId = this.#tail.id;
            this.#tail.prev.next = null;
            this.#tail = this.#tail.prev;
            delete this.#cache[tailId];
        } else {
            this.#size++;
        }
    }

    /**
     * Add the given tracks to the playlistId in the cache. Should ensure that the playlist is in the cache first.
     * @param {String} track List of song ids to add, should not exist in playlist already
     * @param {String} playlistId The playlist to add them to
     */
    updateSong(track, playlistId) {
        this.#cache[playlistId].tracks[track] = `spotify:track:${track}`;
    }

    /**
     * Remove the playlist from the cache
     * @param {String} playlistId
     */
    deletePlaylist(playlistId) {
        if (this.#cache[playlistId].prev !== null) {
            this.#cache[playlistId].prev.next = this.#cache[playlistId].next;
        }

        if (this.#cache[playlistId].next !== null) {
            this.#cache[playlistId].next.prev = this.#cache[playlistId].prev;
        }

        delete this.#cache[playlistId];
        this.#size--;
    }
};