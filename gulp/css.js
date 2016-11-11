module.exports = function(gulp, config, plugins) {
	'use strict';

	gulp.task('build:asset:css', function() {
		var paths = config[config.environment];

		return gulp.src([config.src.css + '**/*.scss'])
			.pipe(plugins.plumber({
				errorHandler: plugins.notify.onError('SCSS: <%= error.message %>')
			}))
			.pipe(plugins.if(config.deploy, plugins.sourcemaps.init()))
			.pipe(plugins.sass({
				outputStyle: config.deploy ? 'compressed' : 'expanded'
			}))
			.pipe(plugins.autoprefixer(
				config.autoprefix.support.split(', ')
			))
			.pipe(plugins.if(config.deploy, plugins.sourcemaps.write('./')))
			.pipe(gulp.dest(paths.css))
			.pipe(plugins.size({title: 'styles:scss'}));
	});

	gulp.task('watch:css', function() {
		gulp.watch(config.src.css + '**/*.scss', ['build:asset:css']);
	});
};
