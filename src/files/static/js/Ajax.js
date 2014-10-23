(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['Intermediary'], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(require('Intermediary'));
	} else {
		root.Ajax = factory(root.Intermediary);
	}
}(this, function(Module1Intermediary) {
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

	/**
	* Helper method to merge the default options with the overrides passed
	* along to the constructor.
	*
	* @param {object} overrides The overrides for the default options. These
	*                           values will take precedence over the default
	*                           values.
	*
	* @returns {object} The method returns an object containing the default
	*                   options with the values override by those of the
	*                   overrides object.
	*/
	function mergeOptions(overrides) {
		var result = {};

		// Copy the default options to the result object
		iterate(exports.options, function(key, value) {
			result[key] = value;
		});

		// Iterate over the keys in the overrides object
		iterate(overrides, function(key, value) {
			// Check if the key for an existing configuration property
			if (result[key] !== undefined) {
				// Override the default value
				result[key] = value;
			}
		});

		// Return the merge result
		return result;
	}

	var exports = function(overrides) {
		this._options = mergeOptions(overrides);
	};

	exports.options = {
		callbackOnError   : null,
		callbackOnSuccess : null,
		timeout           : 5000
	};

	function _clearTimeout(timeoutId) {
		if (timeoutId != null) {
			clearTimeout(timeoutId);
		}
	}

	function _sendError(error, callback, url) {
		if (callback != null && typeof callback === 'function') {
			callback.call({}, {
				error : error,
				url   : url
			});
		}
	}

	exports.prototype = {
		_onError: function() {
			this._clearTimeout(this._timeoutId);
			_sendError(event.target.status, this._options.callbackOnError, this._url);
		},

		_onLoad: function() {
			_clearTimeout(this._timeoutId);
			var result;

			// Check if the request completed succesfully
			if (this._request.status >= 200 && this._request.status < 400) {
				if (this._options.callbackOnSuccess) {
					var type = this._request.getResponseHeader('Content-Type'),
						regex = /json/gi;

					if (regex.test(type)) {
						try {
							result = JSON.parse(this._request.response);
						} catch (e) {
							result = this._request.responseText;
						}
					} else {
						result = this._request.responseText;
					}
					this._options.callbackOnSuccess.call({}, {
						url    : this._url,
						result : result
					});
				}
			} else {

			}
		},

		onTimeout: function() {
			if (this._request.readyState < 4) {
				this._request.abort();
			}
			this._timeoutId = null;
		},

		makeRequest: function(url) {
			this._url = url;
			this._request = new XMLHttpRequest();
			this._request.open('GET', url, true);

			this._request.addEventListener('load', this._onLoad.bind(this));
			this._request.addEventListener('error', this._onError.bind(this));

			this._timeoutId = setTimeout(this._onTimeout, this._options.timeout);

			this._request.send();
		}
	};

	return exports;
}));
