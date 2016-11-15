(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.StickyHeader = factory();
	}
}(this, function() {
	'use strict';

	// Because of the numerous names of requestAnimationFrame we use this var to
	// point to the version that is available to us. When the browser doesn't
	// have one of the known requestAnimationFrame methods we will role our own
	// fallback method with a setTimeout.
	var requestAnimationFrame = window.requestAnimationFrame ||
		                        window.mozRequestAnimationFrame ||
		                        window.webkitRequestAnimationFrame ||
		                        function(callback) {
			                        window.setTimeout(callback, 1000 / 60);
		                        };

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

	var exports = function(element, overrides) {
		this._element = element;
		this._options = mergeOptions(overrides);
		this._isFixed = false;
	};

	exports.options = {
		cssFixed    : 'fixed',
		queryHeader : '#widget-report-header'
	};

	exports.prototype = {
		_checkElementPosition: function() {
			var rect = this._element.getBoundingClientRect();
			if (rect.top < 0 && !this._isFixed) {
				this._isFixed = true;
				this._header.classList.add(this._options.cssFixed);
			} else if (rect.top >= 0 && this._isFixed) {
				this._isFixed = false;
				this._header.classList.remove(this._options.cssFixed);
			}
		},

		_onScrollWindow: function(event) {
			requestAnimationFrame(this.checkHandler);
		},

		init: function() {
			this._header = document.querySelector(this._options.queryHeader);

			if (this._element == null || this._header == null) {
				return;
			}
			this.checkHandler = this._checkElementPosition.bind(this);

			window.addEventListener('scroll', this._onScrollWindow.bind(this));

			this._checkElementPosition();
		}
	};

	return exports;
}));
