require.config({
	baseUrl : '/static/js',
	paths   : {
		Intermediary : 'vendor/Intermediary'
	}
});

require(['Intermediary', 'CodeInput', 'CodeAnalyzer', 'Reporter'], function(Intermediary, CodeInput, CodeAnalyzer, Reporter) {
	'use strict';

	var codeInputWidget = document.getElementById('code-input'),
	    codeInputController = new CodeInput(codeInputWidget),
	    notifications = document.querySelector('.notifications'),
		checker;

	function _logMessage(message) {
		var item = document.createElement('li'),
		    date = new Date();

		item.textContent = ('0' + date.getHours()).substr(-2) + ':' + ('0' + date.getMinutes()).substr(-2) + ':' + ('0' + date.getSeconds()).substr(-2) + '.' + ('00' + date.getMilliseconds()).substr(-3) + ' - ' + message;
		notifications.insertBefore(item, notifications.firstChild);
	}

	function _onCodeAnalyzed(event) {
		_logMessage('Code analysis completed');
		var widget = document.getElementById('widget-report'),
		    reportController = new Reporter(document.getElementById('report-output'), {showFullySupported: false});
		reportController.buildReport(checker.getMatches());
		widget.classList.remove('hidden');
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

	codeInputController.init();
	Intermediary.subscribe('codeinput:ready', _onCodeInputReady);
	if (notifications != null) {
		Intermediary.subscribe('notification', _onNotification);
	}
	Intermediary.subscribe('codeAnalyzed', _onCodeAnalyzed);
});
