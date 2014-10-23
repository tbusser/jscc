(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['Intermediary'], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(require('Intermediary'));
	} else {
		root.CodeInput = factory(root.Intermediary);
	}
}(this, function(Intermediary) {
	'use strict';

	var _element,
	    _options,
	    _file,
	    _fileReader,
	    _directLoad = false,
	    exports = function(element, overrides) {
		    _element = element;
		    _options = overrides;
	    };

	function _checkTextArea() {
		var element = _element.querySelector('textarea');
		if (element == null) {
			return false;
		}

		if (element.value === '') {
			Intermediary.publish('notification:info', {
				level   : 1,
				message : 'There is no text in the textarea'
			});
			return false;
		} else {
			_trackEvent('textarea');
			_publishCode(element.value);
			return true;
		}
	}

	function _loadFile(file) {
		Intermediary.publish('notification:info', {
			level   : 9,
			message : 'Starting download of "' + file.name + '"'
		});

		_fileReader = new FileReader();

		_fileReader.onerror = _onErrorFileReader;
		_fileReader.onload = _onLoadFileReader;
		_fileReader.readAsText(file);
	}

	function _onChangeFileInput(event) {
		var regex = /javascript/i;

		// Check if a file was selected
		if (event.target.files.length > 0) {
			// Get the first file from the selection
			var item = event.target.files[0];

			// Check if the file is of the type JavaScript
			if (regex.test(item.type)) {
				// Show the current selected file
				_setSelectedFile(item);
			} else {
				// Show that no file has been selected
				_setSelectedFile(null);
			}

			// Check if the direct load flag has been set, if so we will
			// automatically start loading the flag
			if (_directLoad) {
				_loadFile(_file);
			}
		}
		// Reset the direct load flag
		_directLoad = false;
	}

	function _onClickButton(event) {
		Intermediary.publish('notification:clear', {});
		// Check if a file has been selected
		if (_file == null) {
			// There is no file, check if the textarea contains something we
			// can analyse
			if (!_checkTextArea()) {
				// There is nothing in the textarea, we will trigger the file
				// dialog of the input element via code and set the flag to
				// immediately load the file after a file has been selected

				// Get the input element
				var fileinput = _element.querySelector('input[type="file"]');
				// Make sure we have the input element before we continue
				if (fileinput != null) {
					// Set the direct load flag
					_directLoad = true;
					// Trigger the file dialog
					fileinput.click();
				}
			}
		} else {
			// A file has been selected, load it
			_loadFile(_file);
		}
	}

	function _onDragEnter(event) {
		var dataTransfer = event.dataTransfer,
		    validFile = false;

		if (dataTransfer.types.indexOf) {
			validFile = dataTransfer.types.indexOf('Files') !== -1;
		} else {
			validFile = dataTransfer.types.contains('Files');
		}

		if (validFile) {
			event.target.classList.add('on-drag');
		}
	}

	function _onDragLeave(event) {
		event.target.classList.remove('on-drag');
	}

	function _onDragOver(event) {
		// This is the most important one of the drag events. Forget to attach a
		// listener for the dragover event and you can kiss goodbye the drop
		// event.
		event.preventDefault();
		event.stopPropagation();
		event.dataTransfer.dropEffect = 'copy';
	}

	function _onDrop(event) {
		event.preventDefault();
		event.stopPropagation();

		event.target.classList.remove('on-drag');

		var item = event.dataTransfer.files[0];
		if ((/javascript/gi).test(item.type)) {
			_setSelectedFile(item);
		} else {
			_setSelectedFile(null);
		}
	}

	function _onErrorFileReader(event) {
		var message;

		switch (event.target.error.name) {
		case 'NotFoundError':
			message = 'File not found';
			break;
		case 'NotReadableError':
			message = 'Unable to read file';
			break;
		case 'AbortError':
			message = 'File read aborted';
			break;
		default:
			message = 'An error occured reading the file';
		}

		Intermediary.publish('notification:error', {
			level   : 1,
			message : message
		});
	}

	function _onLoadFileReader(event) {
		Intermediary.publish('notification:info', {
			level   : 9,
			message : 'File downloaded'
		});

		var fileContent = _fileReader.result;
		_trackEvent('file');
		_publishCode(fileContent);
	}

	function _publishCode(code) {
		Intermediary.publish('codeinput:ready', {
			jsCode : code
		});
	}

	function _setSelectedFile(newValue) {
		var element = _element.querySelector('.drop-target');

		_file = newValue;

		if (element == null) {
			return;
		}

		if (_file == null) {
			element.textContent = 'Selected file does not appear to be a javascript file. Click to select another file or try dropping another file.';
		} else {
			element.textContent = '"' + _file.name + '" selected. Click to select another file or try dropping another file.';
		}
	}

	function _trackEvent(value) {
		if (window.ga != null) {
			ga('send', 'event', 'code-input', 'code-submit', value);
		}
	}

	exports.prototype = {
		init: function() {
			if (_element == null) {
				return;
			}

			if (window.FileReader == null) {
				var fileInput = document.getElementById('file-selector');
				if (fileInput != null) {
					fileInput.parentNode.removeChild(fileInput);
					fileInput = null;
				}
				return;
			}

			var element = _element.querySelector('.drop-target');
			if (element != null) {
				element.addEventListener('dragenter', _onDragEnter);
				element.addEventListener('dragleave', _onDragLeave);
				element.addEventListener('dragover', _onDragOver);
				element.addEventListener('drop', _onDrop);
			}

			element = _element.querySelector('input[type="file"]');
			if (element != null) {
				element.addEventListener('change', _onChangeFileInput);
			}

			element = _element.querySelector('button[type="button"]');
			if (element) {
				element.addEventListener('click', _onClickButton);
			}
		}
	};

	return exports;
}));
