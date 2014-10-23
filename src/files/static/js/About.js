require.config({
	baseUrl : '/static/js',
	paths   : {
		Intermediary : 'vendor/Intermediary'
	}
});

require(['Intermediary', 'DataStore', 'ShowHide', 'ScrollTo'], function(Intermediary, DataStore, ShowHide, ScrollTo) {
	'use strict';

	function _onDataStoreMessage(event, channel) {
		Intermediary.unsubscribe('datastore', _subscriptionId);
		switch (channel) {
			case 'datastore:download-completed':
				console.log('about data loaded');
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

	scrollToController.init();

	DataStore.loadData();
});
