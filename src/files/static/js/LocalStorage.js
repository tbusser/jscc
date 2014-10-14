/**
 * This module is a wrapper for the local storage object. It checks if local storage is available
 * and has some convenience methods to interact with the local storage.
 *
 * Even though at the start we check if the local storage is available this isn't enough ensurance
 * the local storage will actually be available when we use one of the methods to interact with it.
 * One of such scenarios is iOS7 where the user can switch private mode on and off at any given time.
 * If private mode was off when the module was instantiated and the user later switched private mode
 * on then any attempt to interact with the local storage will fail.
 *
 *
 * BROWSER COMPATIBILITY:
 * - This module uses Object.defineProperty and is compatible with IE9 and newer.
 */
(function(root, factory) {
	'use strict';

	/* istanbul ignore next */
	if (typeof define === 'function' && define.amd) {
		// AMD
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.LocalStorage = factory();
	}
}(this, function() {
	'use strict';

	var exports = function() {
		// Intialize the _enabled flag to true
		this._enabled = true;
		// Test the availability of the local storage
		this.testAvailability();

		Object.defineProperty(this, 'enabled', {
			get: function() {
				return (this._initialized && this._enabled);
			},
			set: function(newValue) {
				this._enabled = newValue;
			}
		});

		/**
		 * The property isAvailable indicates whether or not local storge is available to the website.
		 *
		 * @returns {Boolean} The result is true when local storage is available; otherwise false.
		 */
		Object.defineProperty(this, 'isAvailable', {
			get: function() {
				return this._initialized;
			},
			set: function(newValue) {
				throw new Error('The property isAvailable on the LocalStorage object is read-only');
			}
		});
	};

	function deserialize(data) {
		try {
			return JSON.parse(data);
		} catch(error) {
			return data;
		}
	}

	function serialize(data) {
		// After extensive testing I was unable to find a case where JSON.stringify would
		// throw an error. It is therefor my opinion there is no need for a try...catch
		return JSON.stringify(data);
	}

	exports.prototype = {
		/**
		 * Removes all keys in the local storage.
		 */
		clear: function() {
			// Check if the local storage has been initialized
			if (this.isAvailable) {
				// Clear the local storage
				try {
					localStorage.clear();
				} catch(error) {
					this._initialized = false;
				}
			}
			return this._initialized;
		},

		/**
		 * Returns the value for the specified key.
		 *
		 * @param {String} key  The key whose value should be retrieved from local storage.
		 *
		 * @returns {Object}    Returns the value for the specified key. The value is deserialized
		 *                      before it is returned. If local storage is not available this
		 *                      method will return null.
		 */
		get: function(key) {
			// If the module has been intialized succesfully we don't have to continue
			if (!this.isAvailable) {
				return null;
			}

			try {
				// Return the deserialized value for the specified key
				return deserialize(localStorage.getItem(key));
			} catch(error) {
				this._initialized = false;
				return null;
			}
		},

		/**
		 * Removes the provided key from local storage.
		 *
		 * @param {String} key The key which should be removed from local storage.
		 */
		remove: function(key) {
			// Check if the local storage has been initialized
			if (this.isAvailable) {
				// Local storage is available, remove the specified key
				try {
					localStorage.removeItem(key);
				} catch(error) {
					this._initialized = false;
				}
			}
			return this._initialized;
		},

		/**
		 * Stores the value for the specified key in local storage. If local storage is not
		 * available the method will return with performing any action.
		 *
		 * @param {String} key   The key which can be used to retrieved the data that will be stored.
		 * @param {Object} value The value which should be stored under the specified key. The value will
		 *                       be serialized before it is written to the local storage. If value is null
		 *                       the key will be removed from local storage. This is the same as calling
		 *                       the remove method.
		 */
		set: function(key, value) {
			// If the module has been intialized succesfully we don't have to continue
			if (!this.isAvailable) {
				return false;
			}
			// Check if the value is null, if so we should remove the specified key from local storage
			if (value == null) {
				// Remove the key from the local storage
				return this.remove(key);
			} else {
				// Store the value under the provided key after we first serialize the value
				try {
					localStorage.setItem(key, serialize(value));
				} catch(error) {
					this._initialized = false;
				}
			}
			return this._initialized;
		},

		/**
		 * Tests the availability of the local storage.
		 *
		 * @returns Returns true when the local storage is available; otherwise false.
		 */
		testAvailability: function() {
			var testKey = '__lsp__';

			try {
				// Attempt to set the test key
				localStorage.setItem(testKey, testKey);
				// The local storage is available if getItem returns the same value as we tried to store
				this._initialized = (localStorage.getItem(testKey) === testKey);
				// Remove our test key
				localStorage.removeItem(testKey);
			} catch(error) {
				// On error occured, the local storage is not available
				this._initialized = false;
			}

			return this._initialized;
		}
	};

	return exports;
}));
