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

	function _convertAgentsToArray(agents) {
		var result = [];

		iterate(agents, function(agent, agentData) {
			result.push({
				key   : agent,
				title : agentData.browser.toLowerCase()
			});
		});

		result.sort(function(a, b) {
			if (a.title < b.title) {
				return -1;
			} else if (a.title > b.title) {
				return 1;
			}
			return 0;
		});

		return result;
	}

	function getLocalStorageData() {
		var store = new LocalStorage(),
		    result,
		    value;

		// Check if the store is available
		if (store.isAvailable) {
			// Get the data from the local storage
			value = store.get('jscc-browser-filter');
			if (value != null) {
				if (result == null) {
					result = {};
				}
				result.browsersToShow = value;
			}

			value = store.get('jscc-support-filter');
			if (value != null) {
				if (result == null) {
					result = {};
				}
				result.supportToShow = value;
			}
		}
		// Return the result
		return result;
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
		this._consent = false;

		if (overrides == null) {
			overrides = getLocalStorageData();
		}

		if (overrides != null) {
			this._consent = true;
		}
		this._options = mergeOptions(overrides);
	};

	exports.options = {
		browsersToShow : {
			and_ch  : true,
			and_ff  : true,
			and_uc  : true,
			chrome  : true,
			firefox : true,
			ie      : true,
			ios_saf : true,
			op_mini : true,
			opera   : true,
			safari  : true
		},
		supportToShow  : {
			u : true,
			n : true,
			a : true,
			p : true,
			y : true
		}
	};

	function _emptyElement(element) {
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	}

	function _renderFilter(target, agents, agentArray, options) {
		var listDesktop = document.getElementById('bf-desktop'),
		    listMobile = document.getElementById('bf-mobile');

		// Make sure we found the two lists we need to show the user agents
		if (listDesktop == null || listMobile == null) {
			return;
		}

		// Empty the container
		_emptyElement(listDesktop);
		_emptyElement(listMobile);

		// Loop over the user agents, this way the user agents will be shown in
		// alphabetical order
		for (var index = 0, ubound = agentArray.length; index < ubound; index++) {
			var agent = agentArray[index].key,
			    agentData = agents[agent],
			    item = document.createElement('li'),
			    checkBox = document.createElement('input'),
			    label = document.createElement('label'),
			    textNode = document.createTextNode(agentData.browser);

			checkBox.setAttribute('id', 'chkbox_bf_' + agent);
			checkBox.setAttribute('type', 'checkbox');
			checkBox.setAttribute('data-browser', agent);

			if (options.browsersToShow[agent]) {
				checkBox.checked = true;
			} else if (options.browsersToShow[agent === undefined]) {
				options.browsersToShow[agent] = false;
			}

			label.setAttribute('for', 'chkbox_bf_' + agent);
			label.classList.add('toggle-button');
			item.appendChild(checkBox);
			label.appendChild(textNode);
			item.appendChild(label);
			if (agentData.type === 'mobile') {
				listMobile.appendChild(item);
			} else {
				listDesktop.appendChild(item);
			}
		}
	}

	exports.prototype = {
		_onBeforeUnload: function(event) {
			var consent = document.getElementById('localstorage-consent'),
				store = new LocalStorage();
			if (consent != null && consent.checked) {
				if (store.isAvailable) {
					store.set('jscc-browser-filter', this.getFilter(true));
				}
			} else {
				if (store.isAvailable) {
					store.remove('jscc-browser-filter');
				}
			}
		},

		_onClickCheckbox: function(event) {
			var target = event.target;
			if (target.tagName.toLowerCase() === 'input' && target.hasAttribute('data-browser')) {
				this._options.browsersToShow[target.getAttribute('data-browser')] = target.checked;
				Intermediary.publish('browser-filter:changed');
			}
		},

		getFilter: function(onlyEnabled) {
			if (onlyEnabled) {
				var result = {};
				iterate(this._options.browsersToShow, function (browser, isEnabled) {
					if (isEnabled) {
						result[browser] = true;
					}
				});
				return result;
			} else {
				return this._options.browsersToShow;
			}
		},

		init: function(agents) {
			// Make sure we have the information we need to be able to continue
			if (this._element == null || agents == null) {
				return;
			}

			if (this._consent) {
				var elem = document.getElementById('localstorage-consent');
				if (elem != null) {
					elem.checked =  true;
				}
			}

			var temp = this.getFilter(true);

			// Take the agents object and create an array with the user agents
			// sorted alphabetically
			var agentarray = _convertAgentsToArray(agents);
			// Render the browser filters
			_renderFilter(this._element, agents, agentarray, this._options);

			// Attach an event handler to the filter container, this way we only
			// need a single event listener instead of one per checkbox
			this._element.addEventListener('click', this._onClickCheckbox.bind(this));

			// Add an event listener for the beforeunload event, this should be fire
			// when the user navigates away from the page
			window.addEventListener('beforeunload', this._onBeforeUnload.bind(this));
		}
	};

	return exports;
}));
