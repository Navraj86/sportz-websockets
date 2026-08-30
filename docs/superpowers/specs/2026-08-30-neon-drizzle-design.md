# Neon and Drizzle integration

## Goal

Configure the existing ESM Express project to use a Neon Postgres database through Drizzle ORM and provide a safe, standalone CRUD demonstration.

## Scope

- Use `node-postgres` (`pg`) with a Drizzle `node-postgres` adapter and exported connection pool.
- Keep the existing Express server in `src/index.js` unchanged.
- Add JavaScript-only database setup: `drizzle.config.js`, `src/schema.js`, and `src/db.js`.
- Add a standalone `src/crud-example.js` script that creates, reads, updates, and deletes one uniquely identified demo user, then always closes the connection pool.
- Add package scripts for migration generation, migration application, and the CRUD example.
- Create `.env` only when absent. It will contain a documented `DATABASE_URL` placeholder; credentials remain local and are never printed or committed.

## Data model

The `demo_users` table has an auto-incrementing `id`, required `name`, unique required `email`, and required `created_at` timestamp that defaults to the database's current time.

## Configuration and data flow

`drizzle.config.js` reads `DATABASE_URL` through `dotenv/config` for Drizzle Kit. `src/db.js` reads the same environment variable, constructs a `pg` pool, exports that pool and a Drizzle client. `src/schema.js` is shared by the migration generator and CRUD script. The CRUD script imports the client, schema, and pool; it cleans up its generated record and closes the pool in `finally`.

## Error handling and validation

All database entry points throw a clear error if `DATABASE_URL` is unavailable. The CRUD script exits nonzero after logging an operation failure and still closes its pool. The migration and CRUD commands will not be run while the `.env` value is absent or still a placeholder.

## Verification

Verify the JavaScript configuration loads, the generated migration represents `demo_users`, and—once the user supplies a real Neon URL—run the migration and CRUD script to confirm the complete lifecycle.
