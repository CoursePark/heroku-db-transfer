'use strict';

var Heroku = require('heroku-client');
var poll = require('when/poll');
var rp = require('request-promise');
var when = require('when');

module.exports = function (sourceApp, targetApp, verbose) {
	if (typeof sourceApp !== 'string' || typeof targetApp !== 'string') {
		throw new Error('heroku-db-copy must be passed two app names, a '
			+ 'source and a target. Ex. heroku:db-copy:bln-api:qc-bln-api'
		);
	}
	
	var heroku = new Heroku({token: process.env.HEROKU_API_TOKEN});
	
	return when
		.all([
			heroku.get('/apps/' + sourceApp + '/config-vars'),
			heroku.get('/apps/' + targetApp + '/config-vars'),
			heroku.get('/apps/' + sourceApp + '/addons'),
			heroku.get('/apps/' + targetApp + '/addons')
		])
		.spread(function (sourceConfigVars, targetConfigVars, sourceAddons, targetAddons) {
			var dbs = [{}, {}];
			var appConfigs = [sourceConfigVars, targetConfigVars];
			var appAddons = [sourceAddons, targetAddons];
			
			function isPostgresEnvKey(x) {
				// matches against pattern HEROKU_POSTGRESQL_XXXXX_URL
				return x.startsWith('HEROKU_POSTGRESQL_') && x.endsWith('_URL');
			}
			
			dbs.forEach(function (db, i) {
				// extract url from env property with a key that has a heroku postgres pattern
				var key = Object.keys(appConfigs[i]).find(isPostgresEnvKey);
				db.url = appConfigs[i][key];
				
				// extract addon name that has config var with a heroku postgres pattern
				var addon = appAddons[i].find(function (addon) {
					return addon.config_vars.find(isPostgresEnvKey);
				});
				db.name = addon.name;
			});
			
			var source = dbs[0];
			var target = dbs[1];
			return rp({
				uri: 'https://postgres-api.heroku.com/client/v11/databases/' + target.name + '/transfers',
				method: 'POST',
				json: true,
				auth: {user: '', pass: process.env.HEROKU_API_TOKEN},
				body: {
					from_name: source.name,
					from_url: source.url,
					to_name: target.name,
					to_url: target.url
				}
			});
		})
		.then(function (transferState) {
			if (verbose) {
				console.log('DB TRANSFER IN PROGRESS');
			}
			
			var interval = 2 * 1000;
			var timeoutWithoutProgress = 30 * 1000;
			
			var getTransferState = function () {
				return rp({
					uri: 'https://postgres-api.heroku.com/client/v11/apps/' + targetApp + '/transfers/' + transferState.uuid + '?verbose=false',
					method: 'GET',
					json: true,
					auth: {user: '', pass: process.env.HEROKU_API_TOKEN}
				});
			};
			
			var lastProcessedBytes = 0;
			var count = 0;
			
			var endCondition = function (transferState) {
				if (transferState.finished_at !== null) {
					return true;
				}
				
				if (lastProcessedBytes >= transferState.processed_bytes) {
					if (count * interval > timeoutWithoutProgress) {
						return true;
					}
					count++;
				} else {
					count = 0;
					lastProcessedBytes = transferState.processed_bytes;
				}
				
				if (verbose) {
					console.log(transferState.processed_bytes);
				}
			};
			
			return poll(getTransferState, interval, endCondition);
		})
		.then(function (transferState) {
			if (verbose) {
				console.log('DB TRANSFER COMPLETE', transferState.processed_bytes);
			}
		})
	;
};
