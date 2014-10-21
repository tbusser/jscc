# DocPad Configuration File
# http://docpad.org/docs/config

# Define the DocPad Configuration
docpadConfig = {
	events:
		generateAfter: (opts, next) ->
			if 'static' in @docpad.getEnvironments()
				@docpad.log('info', 'generateAfter: starting grunt task generateAfter')

				safeps = require('safeps')
				rootPath = @docpad.getConfig().rootPath
				command = ['grunt', 'generateAfter']
				safeps.spawn(command, {cwd: rootPath, output: true}, next)
			else
				return next()

		generateBefore: (opts, next) ->
			if 'static' in @docpad.getEnvironments()
				@docpad.log('info', 'generateBefore: starting grunt task generateBefore')

				safeps = require('safeps')
				rootPath = @docpad.getConfig().rootPath
				command = ['grunt', 'generateBefore']
				safeps.spawn(command, {cwd: rootPath, output: true}, next)
			else
				return next()

	templateData:
		baseUrl: ''
		staticTarget: 0

	environments:
		static:
			outPath: 'dist'
			templateData:
				baseUrl: ''
				staticTarget: 1

	plugins:
		ghpages:
			deployBranch: 'gh-pages'
			deployRemote: 'ghpages'

	port: 1339

	regenerateDelay: 0

	watchOptions:
		catchupDelay: 0
}

# Export the DocPad Configuration
module.exports = docpadConfig
