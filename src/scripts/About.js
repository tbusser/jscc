requirejs.config({
	baseUrl : '/scripts',
	paths   : {
		Intermediary : 'vendor/Intermediary'
	}
});

requirejs(['Intermediary', 'DataStore', 'ScrollTo', 'AjaxLoader'], function(Intermediary, DataStore, ScrollTo, AjaxLoader) {
	'use strict';

	/**
	* Handles the messages received from the loader.
	*/
	function _onDataLoaderMessage(message, channel) {
		// Check the channel on which the message was posted
		switch (channel) {
		case 'dataloader:download-completed':
			// The loader was able to download all the data we need, we can proceed
			// with intializing the data store and analyzing the code
			DataStore.init(ajaxLoader.getData());
			_listApis();
			break;
		}

		// Unsubscribe from message from the data loader
		Intermediary.unsubscribe('dataloader', dataLoaderHandler);
		// Relaease the data loader and its handler
		dataLoaderHandler = null;
		ajaxLoader = null;
	}

	function _listApis() {
		var features = DataStore.getData(),
			keys = Object.keys(features),
			list = document.createElement('ol'),
			index,
			ubound;

		list.classList.add('api-list');

		keys.sort(function(a, b) {
			a = features[a].title.toLowerCase();
			b = features[b].title.toLowerCase();

			if (a < b) {
				return -1;
			} else if (a > b) {
				return 1;
			}
			return 0;
		});

		for (index = 0, ubound = keys.length; index < ubound; index++) {
			var feature = keys[index],
				data = features[feature],
				item = document.createElement('li');

			item.appendChild(document.createTextNode(data.title));
			list.appendChild(item);
		}

		outputElem.appendChild(list);
	}

	var scrollToController = new ScrollTo(),
		outputElem = document.getElementById('api-list'),
		ajaxLoader = new AjaxLoader(),
		dataLoaderHandler = Intermediary.subscribe('dataloader', _onDataLoaderMessage),
		sources = {
			'/data/additional.json' : null,
			'/data/caniuse2.json'   : null
		};

	// Try to load the compatibility data
	ajaxLoader.loadData(sources);

	scrollToController.init();
});
