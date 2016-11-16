module.exports = function(gulp, config, plugins) {
	'use strict';

	gulp.task('punlish', function(taskReady) {
		var paths = config.dist;
		return gulp.src(paths.base + '**/*')
			.pipe(plugins.ghPages(config.ghPages));
	});
};
