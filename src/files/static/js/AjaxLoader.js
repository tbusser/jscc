(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['Intermediary', 'Ajax'], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(require('Intermediary', 'Ajax'));
	} else {
		root.AjaxLoader = factory(root.Intermediary, root.Ajax);
	}
}(this, function(Intermediary, Ajax) {
	'use strict';

	/**
	* Iterates over the keys of an object and calls a callback function when the
	* key belongs to he object itself and not to its prototype.
	*/
	function iterate(object, callback) {
		for (var key in object) {
			if (object.hasOwnProperty(key)) {
				callback(key, object[key]);
			}
		}
	}

	var exports = function(overrides) {
		this._options = overrides;

		this._attempts = 0;
		this._isReady = false;
	};

	exports.prototype = {
		/**
		* Load the JSON files containing the compatibility data.
		*/
		_loadData: function() {
			this._isReady = false;
			this._attempts++;
			iterate(this._sources, function(key) {
				if (this._sources[key] == null) {
					this._callCount++;
					var ajax = new Ajax({
						callbackOnSuccess : this._onAjaxSuccess.bind(this),
						callbackOnError   : this._onAjaxError.bind(this)
					});

					Intermediary.publish('notification:info', {
						level   : 9,
						message : 'Downloading compatibility data from "' + key + '" (attempt ' + this._attempts + ').'
					});

					ajax.makeRequest(key);
				}
			});
		},

		_onAjaxError: function(event) {
			// Decrease the number of outstanding calls
			this._callCount--;

			// Send out a message about the failed attempt
			Intermediary.publish('dataloader:download-failed', {
				level   : 1,
				message : 'Unable to download compatibility data from (' + event.url + ')',
				error   : event
			});

			// Call the call completed method for some housekeeping
			this._onCallCompleted();
		},

		_onAjaxSuccess: function(event) {
			Intermediary.publish('notification:info', {
				level   : 9,
				message : 'Compatibility data from "' + event.url + '" downloaded.'
			});

			// Decrease the number of outstanding calls
			this._callCount--;

			// Store the raw data
			this._sources[event.url] = event.result;

			// Call the call completed method for some housekeeping
			this._onCallCompleted();
		},

		_onCallCompleted: function() {
			// Check if the call count is 0, if not we need to wait for more data to
			// arrive
			if (this._callCount !== 0) {
				return;
			}

			var retry = false;
			iterate(this._sources, function(key) {
				if (this._sources[key] == null) {
					retry = true;
				}
			});

			if (retry) {
				if (this._attempts < 5) {
					this._loadData();
				} else {
					Intermediary.publish('dataloader:too-many-attempts');
				}
			} else {
				// Set the ready flag
				this._isReady = true;

				// Inform subscribers of the fact that the data has been downloaded
				Intermediary.publish('dataloader:download-completed', {
					level   : 9,
					message : 'Compatibility data successfully downloaded'
				});
			}
		},

		getData: function() {
			return this._sources;
		},

		isReady: function() {
			return this._isReady;
		},

		loadData: function(sources) {
			this._isReady = false;
			this._sources = sources;
			this._attempts = 0;
			this._loadData();
		}
	};

	return exports;
}));
