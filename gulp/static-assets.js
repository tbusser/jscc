module.exports = function(gulp, config, plugins) {
	'use strict';

	gulp.task('build:asset:static', function() {
		var paths = config[config.environment];

		// Copy all the files in the static folder and its subfolders to the
		// output folder
		gulp.src(config.src.static + '**/*')
			.pipe(gulp.dest(paths.static));
	});
};
