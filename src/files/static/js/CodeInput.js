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
	    exports = function(element, overrides) {
		    _element = element;
		    _options = overrides;
	    };

	function _checkTextArea() {
		var element = _element.querySelector('textarea');
		if (element == null) {
			return;
		}

		if (element.value === '') {
			Intermediary.publish('notification:info', {
				level   : 1,
				message : 'There is no text in the textarea'
			});
		} else {
			_publishCode(element.value);
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
		if (event.target.files.length > 0) {
			var item = event.target.files[0];

			if ((/javascript/gi).test(item.type)) {
				_setSelectedFile(item);
			} else {
				_setSelectedFile(null);
			}
		}
	}

	function _onClickButton(event) {
		Intermediary.publish('notification:clear', {});
		if (_file == null) {
			_checkTextArea();
		} else {
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
