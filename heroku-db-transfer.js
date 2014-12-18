'use strict';

var when = require('when');
var nodefn = require('when/node');
var Heroku = require('heroku-client');
var request = require('request');
var url = require('url');

if (process.argv.length < 3) {
	console.log('requires source_app argument' + "\n" + 'node heroku-db-transfer.js source_app [destination_app]');
	process.exit(1);
}
var sourceApp = process.argv[2];
var destApp;
if (process.argv.length > 3) {
	destApp = process.argv[3];
} else if (process.env.APP_NAME) {
	destApp = process.env.APP_NAME;
} else if (process.env.PGBACKUPS_URL && process.env.DATABASE_URL) {
	destApp = null;
} else {
	console.log('requires destination_app argument, or APP_NAME environment variable, or PGBACKUPS_URL and DATABASE_URL environment variables' + "\n" + 'node heroku-db-transfer.js source_app [destination_app]');
	process.exit(1);
}

var heroku = new Heroku({token: process.env.HEROKU_API_TOKEN});

var sourceDbDumpUrl;

// start
when.resolve()
	// collection source database backup file url
	.then(function () {
		// get config info for the source
		return heroku.apps(sourceApp).configVars().info();
	})
	.then(function (configVars) {
		// get info for the latest backup
		var pgBackupsUrl = url.parse(configVars.PGBACKUPS_URL);
		return nodefn.lift(request)({
			url: url.format({
				protocol: pgBackupsUrl.protocol,
				auth: pgBackupsUrl.auth,
				hostname: pgBackupsUrl.hostname,
				pathname: '/client/latest_backup'
			})
		});
	})
	.then(function (requestCallbackParam) {
		// format response for latest backup
		return JSON.parse(requestCallbackParam[1]);
	})
	.then(function (latestBackup) {
		// remember the source file url for usage in transfer
		sourceDbDumpUrl = latestBackup.public_url
	})
	
	// collect destination items
	.then(function () {
		if (destApp === null) {
			return {
				PGBACKUPS_URL: process.env.PGBACKUPS_URL,
				DATABASE_URL: process.env.DATABASE_URL
			};
		}
		// get config info for the destination
		return heroku.apps(destApp).configVars().info();
	})
	.then(function (configVars) {
		// post transfer request from source url to destination database
		var pgBackupsUrl = url.parse(configVars.PGBACKUPS_URL);
		return nodefn.lift(request)({
			method: 'POST',
			url: url.format({
				protocol: pgBackupsUrl.protocol,
				auth: pgBackupsUrl.auth,
				hostname: pgBackupsUrl.hostname,
				pathname: '/client/transfers'
			}),
			form: {
				from_url: sourceDbDumpUrl,
				from_name: 'EXTERNAL_BACKUP',
				to_url: configVars.DATABASE_URL,
				to_name: 'replication'
			}
		});
	})
	.then(function (requestCallbackParam) {
		// format response on creation of transfer
		return JSON.parse(requestCallbackParam[1]);
	})
	.then(function (transfer) {
		// transfer successfull, show the id
		console.log(transfer.id);
	})
	.catch(function (err) {
		// oh no
		if (err.statusCode) {
			console.log('error status code', err.statusCode);
			return;
		}
		
		console.log(err);
	})
	.done()
;
