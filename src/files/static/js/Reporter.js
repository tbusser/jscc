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


	/* ====================================================================== *\
		#
	\* ====================================================================== */

	/**
	 * Adds links to notes to an item
	 * @param {HTMLElement} item The HTML element which is the parent to the
	 *                           link(s) to the note(s)
	 * @param {Array} versions   The array with versions which need to be
	 *                           checked for notes.
	 */
	function _addNoteLink(item, versions) {
		var notes = {},
		    insertLink = function(note) {
			    // 1: The link to the note
			    // 2: We will place the anchor in a super-element
			    // 3: This regex will get the number to the note from the link
			    // 4: This is the note number, it will be the text for the link
			    var anchor = document.createElement('a'),		/* [1] */
				    sup = document.createElement('sup'),		/* [2] */
				    regex = /\d+/,								/* [3] */
				    noteText = regex.exec(note);				/* [4] */

			    anchor.setAttribute('href', note);
			    anchor.setAttribute('title', 'Go to note ' + noteText);
			    anchor.appendChild(document.createTextNode(noteText));
			    sup.appendChild(anchor);
			    item.appendChild(sup);
		    };

		// Make sure versions has a value, if not we're done
		if (versions == null) {
			return;
		}

		// Check if versions is an array
		if (Array.isArray(versions)) {
			// Loop over the items in the array
			for (var index = 0, ubound = versions.length; index < ubound; index++) {
				// Get an easy reference to the current item in the array
				var currentVersion = versions[index];
				// Check if the current version has a note and make sure the note is not
				// yet in the object we have created to keep track of the notes we've
				// made a link for
				if (currentVersion.note != null && notes[currentVersion.note] == null) {
					// Add an entry in the object, if we come across this link again the
					// if statement above will be false and thus we prevent the same link
					// from appearing more than once
					notes[currentVersion.note] = true;
					// Insert a link to note in the item
					insertLink(currentVersion.note);
				}
			}
		} else if (typeof versions === 'object') {
			// The versions is an object, check if it has a note property
			if (versions.note != null) {
				// The object has a note property, use it to create a link to
				// the to note
				insertLink(versions.note);
			}
		} else if (typeof versions === 'string') {
			// We've received a string, use it to create the link to the note
			insertLink(versions);
		}
	}

	/**
	 * Removes all the DOM children from an element.
	 */
	function _clearReport(element) {
		// As long as target has a first child we will remove the first child
		// from the target. There is little difference between removing the
		// first child vs removing the last child as seen in this perf test:
		// http://jsperf.com/innerhtml-vs-removechild/15
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
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

	/**
	 * Creates a section with a title and list which can be used to represent a
	 * single support section.
	 */
	function _createSupportSection(supportValue) {
		// Create the DOM elements we need to for the support section, it is the
		// section itself [1], a list to place the browsers in [2] and a title
		// element to show the support category [3]
		var section = document.createElement('section'),	/* [1] */
		    list = document.createElement('ol'),			/* [2] */
		    title = document.createElement('h4');			/* [3] */

		// Add a class to the section so it can be styled the way we want to
		section.classList.add('support-section');

		// Check what kind of support section we're creating
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
		case 'a':
			title.appendChild(document.createTextNode('Partial support'));
			break;
		default:
			title.appendChild(document.createTextNode('SUPPORT VALUE:' + supportValue));
		}
		// Set the data-support attribute so we can use this to filter out
		// certain categories the visitor doesn't want to see
		section.setAttribute('data-support', supportValue);
		// Add the title to the section
		section.appendChild(title);
		// Add the list to the section
		section.appendChild(list);

		// Return the result object with a reference to the section [1], the
		// list for the browsers [2], then number of items in the list [3] and
		// the global browser share [4]
		return {
			section : section,	/* [1] */
			list    : list,		/* [2] */
			count   : 0,		/* [3] */
			usage   : 0			/* [4] */
		};
	}

	function _renderBrowsers(key, list, browser, agentName, supportObject, collate, browserFilter) {
		var item,
		    index,
		    ubound,
		    currentVersion,
		    isVisible = browserFilter[browser];

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
			_addNoteLink(item, supportObject.versions);

			for (index = 0, ubound = supportObject.versions.length; index < ubound; index++) {
				currentVersion = supportObject.versions[index];
				if (currentVersion.disabled) {
					item.classList.add('disabled');
					item.setAttribute('title', 'Feature disabled by default, needs to be enabled through a flag or similar action');
				}
				if (currentVersion.needsPrefix) {
					item.classList.add('prefix');
					item.setAttribute('title', 'The prefix "' + currentVersion.needsPrefix + '" is required to use this feature');
				}
			}

			list.appendChild(item);
		} else {
			for (index = 0, ubound = supportObject.versions.length; index < ubound; index++) {
				currentVersion = supportObject.versions[index];
				item = document.createElement('li');
				item.appendChild(document.createTextNode(agentName + ' ' + currentVersion.version));
				if (currentVersion.note != null) {
					_addNoteLink(item, currentVersion.note);
				}
				if (currentVersion.disabled) {
					item.classList.add('disabled');
					item.setAttribute('title', 'Feature disabled by default, needs to be enabled through a flag or similar action');
				}
				if (currentVersion.needsPrefix) {
					item.classList.add('prefix');
					item.setAttribute('title', 'The prefix "' + currentVersion.needsPrefix + '" is required to use this feature');
				}
				item.setAttribute('data-browser', browser);
				if (!isVisible) {
					item.classList.add('hidden');
				}
				list.appendChild(item);
			}
		}
	}

	function _renderCategoryExt(category, target, options, agents, browserFilter) {
		var section = _createCategoryContainer(category),
		    notes,
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
		if (category.notes != null) {
			notes = _renderNotes(category.notes);
			// Add the notes section to the category section
			section.appendChild(notes);
		}
		// Add the category section to the document
		target.appendChild(section);
	}

	/**
	 * Creates a section and adds the notes to it.
	 * @param {[type]} notes [description]
	 */
	function _renderNotes(notes) {
		var section;

		// Make sure there are notes to display before we create the section
		if (notes == null) {
			return;
		}

		// Create a section
		section = document.createElement('section');
		// Add the CSS class report-notes so we can style it as we want
		section.classList.add('report-notes');
		// Add the notes to the innerHTML as the notes is a string containing
		// HTML tags. This way the string will be parsed to HTML and all the
		// elements in the string will get created
		section.innerHTML = notes;

		// Return the section
		return section;
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
