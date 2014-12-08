heroku-db-transfer
==================

For those in need of a way to periodically update their postgres database in one Heroku app with data from another. Can be scheduled using the Heroku Scheduler.


Requires
--------

- 2 Heroku apps, a source and a destination
- PG Backups Addon with each app ("Auto - One Month Retention" works for me)

Optionals
---------

- Heroku Scheduler for periodic overwritting of data on destination with data from source
