module.exports = function(gulp, config, plugins) {
	'use strict';

	gulp.task('build:asset:js', function(taskReady) {
		var paths = config[config.environment];

		if (config.environment === 'dist') {
			plugins.rjs.optimize(config.requirejs, function(buildResponse) {
				plugins.rjs.optimize(config.requirejsAbout, function(buildResponse) {
					taskReady();
				},function(error) {
					plugins.notify(error);
					taskReady();
				});
			}, function(error) {
				plugins.notify(error);
				taskReady();
			});
		} else {
			return gulp.src(config.src.js + '**/*.js')
				.pipe(gulp.dest(paths.js));
		}
	});

	gulp.task('watch:js', function() {
		gulp.watch(config.src.js + '**/*.js', ['build:asset:js']);
	});
};
