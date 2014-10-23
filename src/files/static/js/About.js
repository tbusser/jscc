require.config({
	baseUrl : '/static/js',
	paths   : {
		Intermediary : 'vendor/Intermediary'
	}
});

require(['Intermediary', 'DataStore', 'ScrollTo'], function(Intermediary, DataStore, ScrollTo) {
	'use strict';

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

	function _onDataStoreMessage(event, channel) {
		Intermediary.unsubscribe('datastore', _subscriptionId);
		switch (channel) {
			case 'datastore:download-completed':
				_listApis();
				break;
			case 'datastore:download-failed':
			case 'datastore:too-many-attempts':
				Intermediary.publish('notification:error', {
					level   : 1,
					message : 'Unable to download necessary data for analysis',
					error   : event.error
				});
				break;
		}
	}

	var scrollToController = new ScrollTo(),
		_subscriptionId = Intermediary.subscribe('datastore', _onDataStoreMessage),
		outputElem = document.getElementById('api-list');

	DataStore.loadData();

	scrollToController.init();
});
