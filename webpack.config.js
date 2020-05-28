const DisableOutputWebpackPlugin = require('disable-output-webpack-plugin');
const JazzUpdateSitePlugin = require('jazz-update-site-webpack-plugin');
const RemovePlugin = require('remove-files-webpack-plugin');
const moment = require('moment');
const packageJson = require('./package.json');
const core = require('@actions/core');

module.exports = (env) => {
	const timestamp = moment().format('[_]YYYYMMDD[-]HHmm');
	const version = (typeof env !== 'undefined' && (packageJson.version + '_' + env.buildUUID)) || packageJson.version + timestamp;
	const config = {
		entry: {
			app: './index.js'
		},
		output: {
			filename: '[name]Bundle.js' // not used, prevent webpack from failing
		},
		plugins: [
			new DisableOutputWebpackPlugin(),
			new JazzUpdateSitePlugin({
				appType: 'ccm',
				projectId: 'com.siemens.bt.jazz.workitemeditor.rtcPrintWorkItemAction',
				acceptGlobPattern: [
					'resources/**',
					'META-INF/**',
					'plugin.xml'
				],
				projectInfo: {
					author: packageJson.author,
					copyright: packageJson.author,
					description: packageJson.description,
					license: packageJson.license,
					version: version
				}
			}),
			new RemovePlugin({
				before: {
					root: __dirname,
					test: [
						{
							folder: './',
							method: (filePath) => {
								return new RegExp(/com\.siemens\.bt\.jazz\.workitemeditor\.rtcPrintWorkItemAction.*\.zip$/, 'i').test(filePath);
							}
						}
					]
				},
				after: {
					root: __dirname,
					include: ['dist']
				}
			})
		]
	};

	if (process.env["GITHUB_ACTIONS"]) {
		// Set the output file name for use in GitHub Actions
		core.setOutput("output_file", `${projectId}_${version}.zip`);
	}

	return config;
};
