(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['Intermediary'], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(require('Intermediary'));
	} else {
		root.BrowserFilter = factory(root.Intermediary);
	}
}(this, function(Intermediary) {
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

	var exports = function(element, overrides) {
		this._element = element;
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
		}
	};

	function _emptyElement(element) {
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	}

	function _renderFilter(target, agents, options) {
		var listDesktop = document.getElementById('bf-desktop'),
		    listMobile = document.getElementById('bf-mobile');

		// Empty the container
		_emptyElement(listDesktop);
		_emptyElement(listMobile);

		iterate(agents, function(agent, agentData) {
			var item = document.createElement('li'),
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
		});
	}

	exports.prototype = {
		_onClickCheckbox: function(event) {
			var target = event.target;
			if (target.tagName.toLowerCase() === 'input') {
				this._options.browsersToShow[target.getAttribute('data-browser')] = target.checked;
				Intermediary.publish('browser-filter:changed');
			}
		},

		getFilter: function() {
			return this._options.browsersToShow;
		},

		init: function(agents) {
			if (this._element == null || agents == null) {
				return;
			}

			_renderFilter(this._element, agents, this._options);
			this._element.addEventListener('click', this._onClickCheckbox.bind(this));
		}
	};

	return exports;
}));
