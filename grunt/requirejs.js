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
	},
	generateAfter2 : {
		options : {
			baseUrl        : './dist/static/js',
			name           : 'about',
			optimize       : 'uglify2',
			out            : './dist/static/js/About-built.js',
			paths          : {
				Intermediary: 'vendor/Intermediary'
			},
			removeCombined : true
		}
	}

};
