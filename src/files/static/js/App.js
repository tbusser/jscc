require.config({
	baseUrl : '/static/js',
	paths   : {
		Intermediary : 'vendor/Intermediary'
	}
});

require(['Intermediary', 'CodeInput', 'CodeAnalyzer', 'Reporter', 'DataStore', 'BrowserFilter', 'ShowHide', 'ScrollTo', 'StickyHeader'], function(Intermediary, CodeInput, CodeAnalyzer, Reporter, DataStore, BrowserFilter, ShowHide, ScrollTo, StickyHeader) {
	'use strict';

	var codeInputWidget = document.getElementById('code-input'),
	    codeInputController = new CodeInput(codeInputWidget),
	    notifications = document.querySelector('.notifications'),
	    scrollToController,
	    checker,
	    browserFilter,
	    reportController,
	    activeFilter,
	    stickyHeaderController;

	function _logMessage(message) {
		var item = document.createElement('li'),
		    date = new Date();

		item.textContent = ('0' + date.getHours()).substr(-2) + ':' + ('0' + date.getMinutes()).substr(-2) + ':' + ('0' + date.getSeconds()).substr(-2) + '.' + ('00' + date.getMilliseconds()).substr(-3) + ' - ' + message;
		notifications.insertBefore(item, notifications.firstChild);
	}

	function _onCodeAnalyzed(event) {
		_logMessage('Code analysis completed');
		_renderBrowserFilter();

		var widget = document.getElementById('widget-report');
		reportController = new Reporter(document.getElementById('report-output'), {showFullySupported: false}, DataStore.getAgents());
		reportController.buildReport(checker.getMatches(), activeFilter);
		widget.classList.remove('hidden');

		scrollToController = new ScrollTo({topThresholdRatio: 2, correction: -88});
		scrollToController.init();

		scrollToController.scrollToElement(document.getElementById('report'));
	}

	function _onBrowserFilterChanged(event) {
		activeFilter = browserFilter.getFilter();
		reportController.filterBrowsers(activeFilter);
	}

	function _onClickHandlerIndex(event) {
		if (event.target.nodeName.toUpperCase() === 'A') {
			showHideController.hideDetailView('index', true);
		}
	}

	function _onCodeInputReady(event) {
		if (checker == null) {
			checker = new CodeAnalyzer();
		}
		checker.check(event.jsCode);
	}

	function _onNotification(event, channel) {
		if (channel === 'notification:clear') {
			while (notifications.firstChild)	{
				notifications.removeChild(notifications.firstChild);
			}
		} else {
			_logMessage(event.message);
		}
	}

	function _renderBrowserFilter() {
		if (browserFilter == null) {
			browserFilter = new BrowserFilter(document.getElementById('browser-filter'));
			browserFilter.init(DataStore.getAgents());
			activeFilter = browserFilter.getFilter();
		}
	}

	codeInputController.init();
	Intermediary.subscribe('codeinput:ready', _onCodeInputReady);
	if (notifications != null) {
		Intermediary.subscribe('notification', _onNotification);
	}
	Intermediary.subscribe('codeAnalyzed', _onCodeAnalyzed);
	Intermediary.subscribe('browser-filter:changed', _onBrowserFilterChanged);

	var showHideController = new ShowHide();
	showHideController.init();

	scrollToController = new ScrollTo({topThresholdRatio: 2, correction: -88});
	scrollToController.init();

	stickyHeaderController = new StickyHeader(document.getElementById('report'));
	stickyHeaderController.init();

	var index = document.getElementById('index-list');
	if (index != null) {
		index.addEventListener('click', _onClickHandlerIndex);
	}

	_logMessage('Reporting for duty');
});
