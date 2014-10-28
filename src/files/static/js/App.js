require.config({
	baseUrl : '/static/js',
	paths   : {
		Intermediary : 'vendor/Intermediary'
	}
});

require(['Intermediary', 'CodeInput', 'CodeAnalyzer', 'Reporter', 'DataStore', 'BrowserFilter', 'ShowHide', 'ScrollTo', 'StickyHeader', 'SupportFilter', 'AjaxLoader'], function(Intermediary, CodeInput, CodeAnalyzer, Reporter, DataStore, BrowserFilter, ShowHide, ScrollTo, StickyHeader, SupportFilter, AjaxLoader) {
	'use strict';

	// 1: We need a correction of -88px, this will ensure the scroll to target
	//    is positioned below the top of the viewport. If we don't do this the
	//    top of scroll target will fall under the fixed report header
	// 2: Show the scroll to top element as soon as half the viewport height is
	//    scrolled
	// 3: In dire need of a refactor action, this is way too brittle
	var codeInputWidget = document.getElementById('code-input'),
	    codeInputController = new CodeInput(codeInputWidget),
	    notifications = document.querySelector('.notifications'),
	    scrollToController,
	    analyzer,
	    ajaxLoader,
	    browserFilter,
	    reportController,
	    stickyHeaderController,
	    showHideController,
	    supportFilterController,
	    scrollToConfig = {
		    correction        : -88,    /* [1] */
		    topThresholdRatio : 2       /* [2] */
	    },
	    sources = {                     /* [3] */
		    '/static/data/additional.json' : null,
		    '/static/data/caniuse2.json'   : null
	    },
	    dataLoaderHandler,
	    jsCode;

	/* ====================================================================== *\
		LOGGING
	\* ====================================================================== */
	function _logMessage(message) {
		var item = document.createElement('li'),
			date = new Date();

		item.textContent = ('0' + date.getHours()).substr(-2) + ':' + ('0' + date.getMinutes()).substr(-2) + ':' + ('0' + date.getSeconds()).substr(-2) + '.' + ('00' + date.getMilliseconds()).substr(-3) + ' - ' + message;
		notifications.insertBefore(item, notifications.firstChild);
	}

	/**
	 * This method gets calles when the Intermediary has received a message on
	 * the 'notification' channel
	 */
	function _onNotification(event, channel) {
		if (channel === 'notification:clear') {
			while (notifications.firstChild)	{
				notifications.removeChild(notifications.firstChild);
			}
		} else {
			_logMessage(event.message);
		}
	}


	/* ====================================================================== *\
		APPLICATION FLOW
	\* ====================================================================== */
	/**
	 * This handles the message which signals the CodeInput module has code
	 * which is ready to be analyzed.
	 */
	function _onCodeInputReady(message) {
		// Check if we already have an analyzer, if not create an instance
		if (analyzer == null) {
			analyzer = new CodeAnalyzer();
		}

		// If the data store is ready we're good to go, we can immediately
		// analyze the code the visitor has provided us with
		if (DataStore.isReady()) {
			// Check the code that was passed on from the CodeInput module
			analyzer.check(message.jsCode);
		} else {
			// Keep the code for later
			jsCode = message.jsCode;
			// Create a new loader to load the compatibility data
			ajaxLoader = new AjaxLoader();
			// Listen to messages from the data loader
			dataLoaderHandler = Intermediary.subscribe('dataloader', _onDataLoaderMessage);
			// Try to load the compatibility data
			ajaxLoader.loadData(sources);
		}
	}

	function _onCodeAnalyzed(message) {
		_logMessage('Code analysis completed');
		_initializeFilters();

		// Check if the showHideController still needs to be initialized
		if (showHideController == null) {
			// Create and initialize the ShowHide controller
			showHideController = new ShowHide();
			showHideController.init();
		}

		if (stickyHeaderController == null) {
			stickyHeaderController = new StickyHeader(document.getElementById('report'));
			stickyHeaderController.init();
		}

		var widget = document.getElementById('widget-report');
		reportController = new Reporter(document.getElementById('report-output'), {showFullySupported: false}, DataStore.getAgents());
		reportController.buildReport(analyzer.getMatches(), browserFilter.getFilter());
		reportController.filterSupportSections(supportFilterController.getFilter());
		widget.classList.remove('hidden');

		scrollToController = new ScrollTo(scrollToConfig);
		scrollToController.init();

		scrollToController.scrollToElement(document.getElementById('report'));
	}

	/**
	 * Handles the messages received from the loader.
	 */
	function _onDataLoaderMessage(message, channel) {
		var cleanUp = false;

		// Check the channel on which the message was posted
		switch (channel) {
		case 'dataloader:download-completed':
			// The loader was able to download all the data we need, we can proceed
			// with intializing the data store and analyzing the code
			DataStore.init(ajaxLoader.getData());
			analyzer.check(jsCode);
			jsCode = null;
			cleanUp = true;
			break;
		case 'dataloader:too-many-attempts':
			_logMessage('Exhausted compatibility data download attempts. (' + channel + ')');
			cleanUp = true;
			break;
		default:
			// The compatibility data didn't get downloaded, this needs some
			// more to better deal with situations where things didn't go as
			// planned
			_logMessage('Unable to download necessary data for analysis. (' + channel + ')');
			break;
		}

		if (cleanUp) {
			// Unsubscribe from message from the data loader
			Intermediary.unsubscribe('dataloader', dataLoaderHandler);
			// Relaease the data loader and its handler
			dataLoaderHandler = null;
			ajaxLoader = null;
		}
	}

	/**
	 * This handles the message which indicates a filter has been changed
	 */
	function _onFilterChanged(message) {
		// The message will have a sender property, we can use this to determine
		// which filter (browser or support) has been changed
		switch (message.sender) {
		case 'jscc-browser-filter':
			reportController.filterBrowsers(browserFilter.getFilter());
			break;
		case 'jscc-support-filter':
			reportController.filterSupportSections(supportFilterController.getFilter());
			break;
		}
	}

	/**
	 * This handles the click events from the index list
	 */
	function _onClickHandlerIndex(event) {
		// We've attached a click event on the list element and not on the
		// individual anchors. Before we continue we will have to check if the
		// target is an anchor or not
		if (event.target.nodeName.toUpperCase() === 'A') {
			// The event if from an anchor element, the document will scroll to
			// the matching ID. We just need to hide the index from view at
			// this point
			showHideController.hideDetailView('index', true);
		}
	}

	function _initializeFilters() {
		// Check if the browser filter hasn't yet been initialized
		if (browserFilter == null) {
			// Create the browser filter
			browserFilter = new BrowserFilter(document.getElementById('browser-filter'));
			// Initialize it with the agents we got from the compatibility data
			browserFilter.init(DataStore.getAgents());
		}

		// Check if the support filter hasn't yet been initialized
		if (supportFilterController == null) {
			// Create the support filter and initialize it
			supportFilterController = new SupportFilter(document.getElementById('support-filter'));
			supportFilterController.init();
		}
	}


	/* ====================================================================== *\
		INITIALIZATION
	\* ====================================================================== */
	function initInputLabels() {
		// Create an input element to check if it has a placeholder property, if
		// it does not it means the browser does not support placeholders and we
		// need to show the label text
		if (document.createElement('input').placeholder == null) {
			// Get all the spans inside label elements
			var spans = document.querySelectorAll('label > span');
			// Loop over all the elements we found and remove the visually-hidden
			// class so the label text will be visible to the visitor
			for (var index = 0, ubound = spans.length; index < ubound; index++) {
				spans[index].classList.remove('visually-hidden');
			}
		}
	}

	function init() {
		// Initialize the module responsible for letting the user select some JS code
		codeInputController.init();
		Intermediary.subscribe('codeinput:ready', _onCodeInputReady);

		// Check if there is an element for writing log messages to, if there is
		// we need to subscribe to the channel
		if (notifications != null) {
			Intermediary.subscribe('notification', _onNotification);
		}

		// Create and initialize the scrollTo module
		scrollToController = new ScrollTo(scrollToConfig);
		scrollToController.init();

		// Try to get the index list element
		var index = document.getElementById('index-list');
		// Add an event listener for the click event if we were able to locate
		// the index list element
		if (index != null) {
			index.addEventListener('click', _onClickHandlerIndex);
		}

		// Subscribe to the message indicating the code has been analyzed and a
		// report can be generated
		Intermediary.subscribe('codeAnalyzed', _onCodeAnalyzed);
		// Subscribe to the message indicating a filter has changed and needs to
		// be applied on the report
		Intermediary.subscribe('filter:filter-changed', _onFilterChanged);

		initInputLabels();

		_logMessage('Reporting for duty');
	}

	init();
});
