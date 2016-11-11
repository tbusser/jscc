module.exports = function(gulp, config, plugins) {
	'use strict';

	gulp.task('clean', function() {
		if (config.environment === 'src') {
			return;
		}

		var paths = config[config.environment];
		return plugins.del(paths.base + '**');
	});
};
