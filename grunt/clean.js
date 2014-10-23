module.exports = {
	/*  Remove the dist folder, this ensures the folder only contains the files needed for the website after generation */
	generateBefore : ['./dist'],
	generateAfter  : ['./dist/static/js/**/*.js', '!./dist/static/js/App-built.js', '!./dist/static/js/About-built.js', '!./dist/static/js/vendor/require.js', './dist/static/data/example.json']
};
