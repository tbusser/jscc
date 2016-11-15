module.exports = function(gulp, config, plugins) {
	'use strict';

	gulp.task('build:asset:html', function() {
		var paths = config[config.environment];

		return gulp.src(config.src.html + '*.html')
			.pipe(plugins.fileInclude({
				prefix: '@@',
				basePath: '@file',
				context: {
					deploy: config.deploy
				}
			}))
			.pipe(plugins.if(config.deploy, plugins.stripComments()))
			.pipe(plugins.if(config.deploy, plugins.save('before-sitemap')))
			.pipe(plugins.if(config.deploy, plugins.sitemap(config.sitemap)))
			.pipe(plugins.if(config.deploy, gulp.dest(paths.html)))
			.pipe(plugins.if(config.deploy, plugins.save.restore('before-sitemap')))
			.pipe(gulp.dest(paths.html));
	});

	gulp.task('watch:html', function() {
		gulp.watch(config.src.html + '**/*.htm*', ['build:asset:html']);
	});
};
