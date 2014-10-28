/*
TODO:

- Too difficult to properly detect: Dialog element (key: dialog)
- Not a JS technique: Picture element (key: picture)
 */
(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['DataStore', 'Intermediary'], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(require('DataStore'), require('Intermediary'));
	} else {
		root.CodeAnalyzer = factory(root.DataStore, root.Intermediary);
	}
}(this, function(DataStore, Intermediary) {
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

	var exports = function(options) {
		this._options = options;
		this._code = null;
		this._matches = [];
	};

	function _runRules(code) {
		var cleanCode = _stripComments(code),
		    features = DataStore.getData(),
		    matches = [];

		// Send the message to let everyone know we're starting the tests
		Intermediary.publish('notification:completed', {
			level   : 9,
			message : 'Testing ' + DataStore.getCategoryCount() + ' features'
		});

		iterate(features, function(feature, data) {
			var isMatch;

			for (var index = 0, ubound = data.tests.length; index < ubound; index++) {
				isMatch = data.tests[index].test(cleanCode);
				if (!isMatch) {
					break;
				}
			}

			if (isMatch) {
				matches.push(data);
				Intermediary.publish('notification:info', {
					level   : 1,
					message : 'Detected the usage of ' + data.title + ' (' + feature + ')'
				});
			}
		});

		return matches;
	}

	function _stripComments(code) {
		// Strip all comments from the code file, this RegEx is something I have
		// not created myself but found on StackOverflow. This is the link to
		// the post: http://stackoverflow.com/a/15123777/1244780
		return code.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '');
	}

	exports.prototype = {
		check: function(code) {
			this._code = code;

			if (DataStore.isReady()) {
				this._matches = _runRules(code);
				Intermediary.publish('codeAnalyzed');
			} else {
				Intermediary.publish('notification:error', {
					level   : 1,
					message : 'Make sure compatibility data is loaded before running the CodeAnalyzer'
				});
			}
		},

		getMatches: function() {
			return this._matches;
		}
	};

	return exports;
}));
