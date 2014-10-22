(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['Intermediary', 'LocalStorage'], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(require('Intermediary', 'LocalStorage'));
	} else {
		root.BrowserFilter = factory(root.Intermediary, root.LocalStorage);
	}
}(this, function(Intermediary, LocalStorage) {
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
	function mergeOptions(overrides, source) {
		var result = {};

		source = (source != null) ? source : exports.options;

		// Copy the default options to the result object
		iterate(source, function(key, value) {
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

	var exports = function(element, options, overrides) {
		this._element = element;
		this._options = mergeOptions(options);
		this._options = mergeOptions(overrides, this._options);
		this._consent = false;
	};

	exports.options = {
		filter     : {},
		storageKey : ''
	};

	exports.prototype = {
		_onBeforeUnload: function(event) {
			var store = new LocalStorage();
			if (this._consent) {
				if (store.isAvailable) {
					store.set(this._options.storageKey, this.getFilter(true));
				}
			} else {
				if (store.isAvailable) {
					store.remove(this._options.storageKey);
				}
			}
		},

		_onClickHandler: function(event) {
			var target = event.target;
			// We only want to process the click event for input elements
			if (target.tagName.toLowerCase() === 'input') {
				// Check if the input element has a filter value
				if (target.hasAttribute('data-filter-value')) {
					this._options.filter[target.getAttribute('data-filter-value')] = target.checked;
					Intermediary.publish('filter:filter-changed', {
						sender : this._options.storageKey
					});
				} else if (target.hasAttribute('data-consent')) {
					// The input element has the data-consent attribute, we need
					// to flip the value
					this._consent = target.checked;
					// Alert everyone of the change in the consent
					Intermediary.publish('filter:consent-changed', {
						sender : this._options.storageKey
					});
				}
			}
		},

		_onConsentChanged: function(event) {
			// Ignore the message if this instance was the sender of the event
			if (event.sender !== this._options.storageKey) {
				this._consent = !this._consent;
				var element = this._element.querySelector('[data-consent]');
				if (element != null) {
					element.checked = this._consent;
				}
			}
		},

		attachClickHandler: function() {
			if (this._element != null) {
				this._element.addEventListener('click', this._onClickHandler.bind(this));
				Intermediary.subscribe('filter:consent-changed', this._onConsentChanged, this);
			}
		},

		attachOnBeforeUnload: function() {
			// Add an event listener for the beforeunload event, this should be fire
			// when the user navigates away from the page
			window.addEventListener('beforeunload', this._onBeforeUnload.bind(this));
		},

		getFilter: function(onlyEnabledKeys) {
			if (onlyEnabledKeys) {
				var result = {};
				iterate(this._options.filter, function(key, isEnabled) {
					if (isEnabled) {
						result[key] = true;
					}
				});
				return result;
			} else {
				return this._options.filter;
			}
		},

		getFilterFromStorage: function() {
			var store = new LocalStorage();

			// Check if the store is available
			if (store.isAvailable) {
				// Get the data from the local storage
				var value = store.get(this._options.storageKey);
				if (value != null) {
					this._options.filter = value;
					this._consent = true;
				}
			}
			if (this._consent) {
				var element = this._element.querySelector('[data-consent]');
				if (element != null) {
					element.checked = this._consent;
				}
			}
		}
	};

	return exports;
}));
