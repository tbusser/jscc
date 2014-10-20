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

	var exports = function(element, overrides, agents) {
		this._element = element;
		this._options = mergeOptions(overrides);
		this._agents = agents;
	};

	exports.options = {
		groupVersions      : true,
		showFullySupported : true,
		supportOrder       : ['u', 'n', 'p', 'a', 'x', 'd', 'y']
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

	function _renderCategory(category, target, options, agents, browserFilter) {
		var section = document.createElement('section'),
		    title = document.createElement('h3'),
		    desc = document.createElement('p'),
		    table = document.createElement('table');

		// Set the texts for title and the description
		if (category.spec !== '') {
			var link = document.createElement('a');
			link.textContent = category.title;
			link.setAttribute('href', category.spec);
			title.appendChild(link);
		} else {
			title.textContent = category.title;
		}
		desc.textContent = category.description;

		// Add the elements to the section
		section.classList.add('report-section');
		section.appendChild(title);
		section.appendChild(desc);

		var headerRow = document.createElement('tr'),
		    valueRows = [document.createElement('tr')];

		iterate(category.stats, function(browser, values) {
			var result = _checkBrowser(browser, values),
			    headerCell = document.createElement('th'),
			    valueCell = document.createElement('td'),
			    isVisible = browserFilter[browser];

			if (agents) {
				headerCell.textContent = agents[browser].browser;
				if (!isVisible) {
					headerCell.classList.add('hide');
				}
			} else {
				headerCell.textContent = browser;
			}
			headerCell.setAttribute('data-browser', browser);
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
					if (values[0].support === 'p') {
						valueCell.classList.add('has-polyfill');
					}
				}
				valueCell.setAttribute('data-browser', browser);
				if (!isVisible) {
					valueCell.classList.add('hide');
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
					cell.setAttribute('data-browser', browser);
					if (!isVisible) {
						cell.classList.add('hide');
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

		if (category.notes != null) {
			var notes = document.createElement('section');
			notes.classList.add('report-notes');
			notes.innerHTML = category.notes;
			section.appendChild(notes);
		}

		// Add the section to the review
		target.appendChild(section);
	}

	function _createCategoryContainer(category) {
		var section = document.createElement('section'),
		    title = document.createElement('h3'),
		    desc = document.createElement('p');

		// Set the texts for title and the description
		if (category.spec !== '') {
			var link = document.createElement('a');
			link.textContent = category.title;
			link.setAttribute('title', 'Go to specification');
			link.setAttribute('href', category.spec);
			title.appendChild(link);
		} else {
			title.textContent = category.title;
		}
		desc.textContent = category.description;

		// Add the elements to the section
		section.classList.add('report-section');
		section.appendChild(title);
		section.appendChild(desc);

		return section;
	}

	function _createNotes(notes) {
		if (notes == null) {
			return;
		}

		var section = document.createElement('section');
		section.classList.add('report-notes');
		section.innerHTML = notes;

		return section;
	}

	function _createSupportSection(supportValue) {
		var section = document.createElement('section'),
		    list = document.createElement('ol'),
		    title = document.createElement('h4');

		section.classList.add('support-section');

		switch (supportValue) {
		case 'n':
			title.appendChild(document.createTextNode('No support'));
			break;
		case 'y':
			title.appendChild(document.createTextNode('Full support'));
			break;
		case 'p':
			title.appendChild(document.createTextNode('Support through polyfill'));
			break;
		case 'u':
			title.appendChild(document.createTextNode('Unknown support'));
			break;
		default:
			title.appendChild(document.createTextNode('SUPPORT VALUE:' + supportValue));
		}
		section.setAttribute('data-support', supportValue);
		section.appendChild(title);
		section.appendChild(list);

		return {
			section : section,
			list    : list,
			count   : 0,
			usage   : 0
		};
	}

	function _renderBrowsers(key, list, browser, agentName, supportObject, collate, browserFilter) {
		var item,
		    index,
		    ubound,
		    isVisible = browserFilter[browser],
		    notes = {};

		if (collate) {
			item = document.createElement('li');
			if (supportObject.fromVersion === supportObject.toVersion) {
				item.appendChild(document.createTextNode(agentName + ' ' + supportObject.fromVersion));
			} else {
				item.appendChild(document.createTextNode(agentName + ' ' + supportObject.fromVersion + ' to ' + supportObject.toVersion));
			}
			item.setAttribute('data-browser', browser);
			if (!isVisible) {
				item.classList.add('hidden');
			}
			_addNoteLink(item, supportObject.versions, key);

			list.appendChild(item);
		} else {
			for (index = 0, ubound = supportObject.versions.length; index < ubound; index++) {
				var currentVersion = supportObject.versions[index];
				item = document.createElement('li');
				item.appendChild(document.createTextNode(agentName + ' ' + currentVersion.version));
				_addNoteLink(item, [{note: currentVersion.note}], key);
				item.setAttribute('data-browser', browser);
				if (!isVisible) {
					item.classList.add('hidden');
				}
				list.appendChild(item);
			}
		}
	}

	function _addNoteLink(item, versions, key) {
		var notes = {};
		for (var index = 0, ubound = versions.length; index < ubound; index++) {
			var currentVersion = versions[index];
			if (currentVersion.note != null && notes[currentVersion.note] == null) {
				notes[currentVersion.note] = true;
				var anchor = document.createElement('a'),
				    sup = document.createElement('sup'),
				    regex = /\d+/,
				    noteText = regex.exec(currentVersion.note);

				anchor.setAttribute('href', currentVersion.note);
				anchor.setAttribute('title', 'Go to note ' + noteText);
				anchor.appendChild(document.createTextNode(noteText));
				sup.appendChild(anchor);
				item.appendChild(sup);
			}
		}
	}

	function _renderCategoryExt(category, target, options, agents, browserFilter) {
		var section = _createCategoryContainer(category),
		    notes = _createNotes(category.notes),
		    supportSections = {},
		    index,
		    ubound;

		// Iterate over the user agents for the current category
		iterate(category.stats, function(browser, supportObjects) {
			// Loop over the support blocks
			for (index = 0, ubound = supportObjects.length; index < ubound; index++) {
				var supportObject = supportObjects[index],
				    supportValue = supportObject.support.substr(0, 1).toLowerCase();

				if (supportSections[supportValue] == null) {
					supportSections[supportValue] = _createSupportSection(supportValue);
				}

				var list = supportSections[supportValue].list;

				_renderBrowsers(category.key, list, browser, agents[browser].browser, supportObject, options.groupVersions, browserFilter);
				supportSections[supportValue].usage += supportObject.totalGlobalUsage;
			}
		});

		for (index = 0, ubound = options.supportOrder.length; index < ubound; index++) {
			var value = options.supportOrder[index];
			if (supportSections[value] != null) {
				var title = supportSections[value].section.querySelector('h4');
				if (title != null) {
					title.appendChild(document.createTextNode(' (' + supportSections[value].usage.toFixed(1) + '% global browser share)'));
				}
				section.appendChild(supportSections[value].section);
			}
		}

		// Check if there is a section with notes for the category
		if (notes != null) {
			// Add the notes section to the category section
			section.appendChild(notes);
		}
		// Add the category section to the document
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
		buildReport: function(data, browserFilter) {
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
				_renderCategoryExt(item, this._element, this._options, this._agents, browserFilter);
			}
		},

		filterBrowsers: function(browserFilter) {
			// Iterate over the objects in the filter. Each should be a key which
			// is the name of the user agent and a boolean value.
			iterate(browserFilter, function(agent, isVisible) {
				// Get all the elements for the current user agent
				var elements = document.querySelectorAll('[data-browser="' + agent + '"]');

				// Loop over the returned elements
				for (var index = 0, ubound = elements.length; index < ubound; index++) {
					// Check if this user agent should be visible and set/remove
					// the hide class accordingly
					if (isVisible) {
						elements[index].classList.remove('hidden');
					} else {
						elements[index].classList.add('hidden');
					}
				}
			});
		}
	};

	return exports;
}));
