(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['Filter'], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(require('Filter'));
	} else {
		root.SupportFilter = factory(root.Filter);
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

	var exports = function(element, overrides) {
		Filter.call(this, element, exports.options, overrides);
		this._keys = ['u', 'n', 'a', 'p', 'y'];
	};

	exports.prototype = Object.create(Filter.prototype);

	exports.options = {
		filter     : {
			u : true,
			n : true,
			a : true,
			p : true,
			y : true
		},
		storageKey : 'jscc-support-filter'
	};

	function _renderFilter(target, options, keys) {
		var list = document.getElementById('support-filter');

		// Make sure we found the two lists we need to show the user agents
		if (list == null) {
			return;
		}

		for (var index = 0, ubound = keys.length; index < ubound; index++) {
			if (options.filter[keys[index]]) {
				var checkbox = target.querySelector('[data-filter-value="' + keys[index] + '"]');
				if (checkbox != null) {
					checkbox.checked = true;
				}
			} else {
				options.filter[keys[index]] = false;
			}
		}
	}

	exports.prototype.init = function() {
		if (this._element == null) {
			return;
		}
		this.attachOnBeforeUnload();
		this.attachClickHandler();
		this.getFilterFromStorage();

		_renderFilter(this._element, this._options, this._keys);
	};

	return exports;
}));
