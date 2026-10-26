# SQL scripts

This folder contains version-controlled SQL references for Tickety database tables. The scripts are not executed automatically and do not contain credentials or sample records.

- `schema.sql` creates the complete schema for a new development database.
- `migrations/001_owner_approval_interests.sql` additively upgrades an existing
  schema without deleting Users, Events, Bookings, or historical prices.
- `events.sql` is the earlier standalone Event table reference retained from the initial milestone.

The final role constraint permits exactly `customer`, `organizer`, and `owner`.
Event `status` is the Organizer-controlled lifecycle (`draft`, `active`, or
`cancelled`). The separate `approval_status` is the Owner-controlled moderation
lifecycle (`pending`, `approved`, or `rejected`); `approved_by`, `approved_at`,
and `rejection_reason` record its outcome. Public visibility requires active
and approved.

`event_interests` records explicit Customer bookmarks with `id`, `user_id`,
`event_id`, and `created_at`. Its foreign keys cascade on User/Event deletion,
and its unique constraint prevents duplicate bookmarks.

Review a script before running it against an existing database.
