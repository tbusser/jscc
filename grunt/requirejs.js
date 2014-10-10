module.exports = {
	generateAfter : {
		options : {
			baseUrl        : './dist/static/js',
			name           : 'app',
			optimize       : 'uglify2',
			out            : './dist/static/js/App-built.js',
			paths          : {
				Intermediary: 'vendor/Intermediary'
			},
			removeCombined : true
		}
	}
};
