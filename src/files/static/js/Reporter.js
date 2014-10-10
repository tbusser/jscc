(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.Reporter = factory();
	}
}(this, function() {
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
		showFullySupported : true
	};

	function _checkBrowser(browser, versions) {
		var result = {
			    allVersions  : false,
			    firstVersion : null,
			    hasPolyfill  : false
		    },
		    index = 0,
		    ubound = versions.length,
		    count = 0;

		for (; index < ubound; index++) {
			// console.log(browser + '@' + versions[index].version + ': ' + versions[index].support);
			if (versions[index].support === 'y') {
				count++;
				if (result.firstVersion == null) {
					result.firstVersion = '>= ' + versions[index].version;
				}
			} else if (versions[index].support === 'p') {
				result.hasPolyfill = true;
				if (result.firstVersion == null) {
					result.firstVersion = '>= ' + versions[index].version;
				}
			}
		}

		if (index === count) {
			result.allVersions = true;
		}

		return result;
	}

	function _clearReport(target) {
		while (target.firstChild) {
			target.removeChild(target.firstChild);
		}
	}

	function _renderCategory(category, target, options) {
		var section = document.createElement('section'),
		    title = document.createElement('h3'),
		    desc = document.createElement('p'),
		    table = document.createElement('table');

		// Set the texts for title and the description
		title.textContent = category.title;
		desc.textContent = category.description;

		// Add the elements to the section
		section.appendChild(title);
		section.appendChild(desc);

		var headerRow = document.createElement('tr'),
		    valueRows = [document.createElement('tr')];

		iterate(category.stats, function(browser, values) {
			var result = _checkBrowser(browser, values),
			    headerCell = document.createElement('th'),
			    valueCell = document.createElement('td');

			headerCell.textContent = browser;
			headerRow.appendChild(headerCell);
			if (values.length === 1) {
				valueCell.setAttribute('rowspan', category.maxRowCount);
				if (values[0].support === 'y') {
					valueCell.textContent = 'All';
					valueCell.classList.add('full-support');
				} else if (values[0].support === 'n') {
					valueCell.textContent = 'None';
					valueCell.classList.add('no-support');
				} else {
					valueCell.textContent = values[0].fromVersion + ' / ' + values[0].support;
				}
				valueRows[0].appendChild(valueCell);
			} else {
				for (var index = 0, ubound = values.length; index < ubound; index++) {
					if (index >= valueRows.length) {
						valueRows.push(document.createElement('tr'));
					}
					var cell = document.createElement('td');
					if (values[index].fromVersion === values[index].toVersion) {
						cell.textContent = values[index].fromVersion + ' / ' + values[index].support;
					} else {
						cell.textContent = values[index].fromVersion + ' to ' + values[index].toVersion + ' / ' + values[index].support;
					}
					if (values[index].support === 'n') {
						cell.classList.add('no-support');
					} else if (values[index].support === 'y') {
						cell.classList.add('full-support');
					} else if (values[index].support === 'p') {
						cell.classList.add('has-polyfill');
					}
					if (index === (ubound - 1) && index < category.maxRowCount) {
						cell.setAttribute('rowspan', category.maxRowCount - index);
					}
					valueRows[index].appendChild(cell);
				}
			}

			/*
			if (result.allVersions) {
				if (options.showFullySupported) {
					headerCell.textContent = browser;
					headerRow.appendChild(headerCell);
					valueCell.textContent = 'All';
					valueCell.classList.add('full-support');
					valueRow.appendChild(valueCell);
				}
			} else {
				headerCell.textContent = browser;
				headerRow.appendChild(headerCell);
				if (result.firstVersion == null) {
					valueCell.textContent = 'None';
					valueCell.classList.add('no-support');
				} else {
					valueCell.textContent = result.firstVersion;
				}
				if (result.hasPolyfill) {
					valueCell.classList.add('has-polyfill');
				}
				valueRow.appendChild(valueCell);
			}
			*/
		});
		table.appendChild(headerRow);
		for (var j = 0, u = valueRows.length; j < u; j++) {
			table.appendChild(valueRows[j]);
		}
		// table.appendChild(valueRow);
		section.appendChild(table);

		// Add the section to the review
		target.appendChild(section);
	}

	function _renderNoProblems(target) {
		var section = document.createElement('section'),
			title = document.createElement('h3'),
			desc = document.createElement('p');

		title.textContent = 'Congrats!';
		desc.textContent = 'The code you provided did not contain anything that might give compatibility problems. Yeey! (or perhaps there is but went undetected, don\'t you feel better now?)';

		// Add the elements to the section
		section.appendChild(title);
		section.appendChild(desc);

		target.appendChild(section);
	}

	exports.prototype = {
		buildReport: function(data) {
			// Make sure there is an element specified to render the report in
			if (this._element == null) {
				 return;
			}

			// Remove any existing report
			_clearReport(this._element);

			// When there is no data it means no compatibility problems were found
			if (data == null || data.length === 0) {
				_renderNoProblems(this._element);
			}

			// Sort the data to make sure the features are listed alphabetically
			data = data.sort(function(a, b) {
				if (a.title.toLowerCase() < b.title.toLowerCase()) {
					return -1;
				} else if (a.title.toLowerCase() > b.title.toLowerCase()) {
					return 1;
				}
				return 0;
			});

			// Loop over all the features found in the code
			for (var index = 0, ubound = data.length; index < ubound; index++) {
				var item = data[index];
				// Render a report item for the feature
				_renderCategory(item, this._element, this._options);
			}
		}
	};

	return exports;
}));
