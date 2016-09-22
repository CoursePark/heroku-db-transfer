'use strict';

var herokuDbTransfer = require('./index.js');

var sourceApp = process.argv[2];
var targetApp = process.argv[3];

if (!sourceApp || !targetApp) {
	console.error('must specify source and target apps\nusage:  node transfer.js <source-app> <target-app>');
}

console.log('heroku-db-copy copying and overwriting database, from ' + sourceApp + ' to ' + targetApp);
herokuDbTransfer(sourceApp, targetApp, true)
	.then(function (bytesTransfered) {
		console.log('heroku-db-copy complete', bytesTransfered);
	})
;
