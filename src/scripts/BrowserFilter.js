(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['Filter'], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(require('Filter'));
	} else {
		root.BrowserFilter = factory(root.Filter);
	}
}(this, function(Filter) {
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

	var exports = function(element, overrides) {
		Filter.call(this, element, exports.options, overrides);
	};

	exports.prototype = Object.create(Filter.prototype);

	exports.options = {
		filter     : {
			and_ch  : true,
			and_ff  : true,
			and_uc  : true,
			chrome  : true,
			edge    : true,
			firefox : true,
			ie      : true,
			ios_saf : true,
			op_mini : true,
			opera   : true,
			safari  : true
		},
		storageKey : 'jscc-browser-filter'
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
			checkBox.setAttribute('data-filter-value', agent);

			if (options.filter[agent]) {
				checkBox.checked = true;
			} else if (options.filter[agent === undefined]) {
				options.filter[agent] = false;
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

	exports.prototype.init = function(agents) {
		if (this._element == null) {
			return;
		}
		this.attachOnBeforeUnload();
		this.attachClickHandler();
		this.getFilterFromStorage();

		// Take the agents object and create an array with the user agents
		// sorted alphabetically
		var agentarray = _convertAgentsToArray(agents);
		// Render the browser filters
		_renderFilter(this._element, agents, agentarray, this._options);
	};

	return exports;
}));
