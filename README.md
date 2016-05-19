# heroku-db-transfer

Copy a database from a source Heroku app to a target Heroku app.

Will destroy the preexisting contents of the target database.

Returns a promise that is resolved once the transfer is complete.

Has optional verbose parameter that will use console.log to output something like:

```
DB TRANSFER IN PROGRESS
0
8912896
14155776
21495808
28835840
35197513
35197513
35197513
DB TRANSFER COMPLETE 35197513
```

## Context

At the time of this writing Heroku had not published any details regarding
their database transfer API, nor does their Node heroku-client package
implement the needed functionality. By inspecting the source for the Heroku
Ruby command line client it was reasonable to implement enough functionality in
Node to get the job done.

## Assumptions

- only have one Heroku Postgres database per Heroku App
- the Heroku Postgres database is not the free plan. There is a slightly different subdomain for the API endpoint for these databases and this functionality was not needed by the author. Might work, untested.

## Usage Example

```
var herokuDbTransfer = require('heroku-db-transfer');

herokuDbTransfer(sourceAppName, targetAppName)
  .then(function () {
    console.log('DONE DB TRANSFER');
  })
;
```
