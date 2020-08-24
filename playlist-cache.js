// playlist-cache.js
// Author: Avery Smith (ajsmith2@wpi.edu)
// An cache system for playlists using Least-Recently-Used Eviction policy
// The head is most recently used while tail is least recent

/**
 * Create a cache object with the given maxSize
 * @param maxSize The maximum number of playlists to hold
 * @return {{head: null, size: number, tail: null, maxSize: *}}
 * @constructor
 */
exports.Cache = function (maxSize) {
    return {
        size: 0,
        maxSize: maxSize,
        head: null,
        tail: null,

        /**
         * Get the given playlist from the cache, if a miss, return null
         * @param {String} playlistId The playlist to get
         * @return {null|{String: String}}
         */
        get: function (playlistId) {
            if (!(playlistId in this)) {
                console.log('Cache miss!');
                return null;
            }
            console.log('Cache hit!');

            // Reorganize order, if prev is null then the playlist is already the head, so do nothing
            if (this[playlistId].prev !== null) {
                this[playlistId].prev = this[playlistId].next;

                if (this[playlistId].next !== null) {
                    this[playlistId].next = this[playlistId].prev;
                }

                // Move the current playlist to the head by utilizing the add function
                let idDict = this[playlistId].tracks;
                this.size--;
                delete this[playlistId];
                this.add(idDict, playlistId);
            }

            return this[playlistId].tracks;
        },

        /**
         * Add the given dictionary of ids to this cache, named after the playlistId
         * @param {{String: String}} idDict The dictionary of id: uri
         * @param {String} playlistId The playlistId
         */
        add: function (idDict, playlistId) {
            let playlist = {
                id: playlistId,
                tracks: idDict,
                prev: null,
                next: this.head
            }; // Create a playlist node object
            this[playlistId] = playlist;

            this.head.prev = playlist;
            this.head = playlist;

            if (this.size === this.maxSize) {
                let tailId = this.tail.id;
                this.tail.prev.next = null;
                this.tail = this.tail.prev;
                delete this[tailId];
            } else {
                this.size++;
            }
        }
    };
};