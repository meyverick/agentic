Source: `sqlx@e5cbd61a` · verified 2026-10-31 (`git describe` reads `v0.9.0-47-ge5cbd61a`; the manifest still says `0.9.0`)
Re-verify when: the SQLx pin moves past 0.9, `PgListener` changes constructors, or `sqlx.toml` gains keys.

# SQLx — Typed SQL, Pools, and Notify Fan-Out

SQLx verifies SQL at compile time against a live schema or prepared metadata, hands out pooled connections, and carries PostgreSQL `LISTEN/NOTIFY` into the application. There is no ORM and no query builder: the SQL is the contract.

## Compile-Time Verification

```rust
let row = sqlx::query_as!(
    Row,
    r#"SELECT id as "id!: uuid::Uuid", label FROM rows WHERE id = $1"#,
    id
).fetch_one(&pool).await?;
```

- The quoted alias is the type override: `id as "id!: uuid::Uuid"` means non-null `Uuid`; `id as "id?: Uuid"` is nullable. Unquoted aliases infer from the schema.
- Bind macros to PostgreSQL. Never build a dual-engine trait or a `#[cfg]` database gate.
- `#[sqlx(transparent)]` for a newtype and `#[sqlx(no_pg_array)]` for a type that must not map to an array.

## Offline Metadata and the Drift Gate

```sh
cargo sqlx prepare --workspace -- --all-targets --all-features
cargo sqlx prepare --check --workspace -- --all-targets --all-features
SQLX_OFFLINE=true cargo build --workspace
```

- `.sqlx/` is the committed metadata directory; CI builds with `SQLX_OFFLINE=true`, so no database is present in the build lane.
- `prepare --check` runs a **full prepare** into `target/sqlx-prepare-check` and diffs the result. It needs a live database and is therefore a CI gate, not an inner-loop command.
- Re-run `prepare` in the same commit as any SQL or schema change; a stale `.sqlx/` is a build break, not a warning.
- `sqlx.toml` is read only when the `sqlx-toml` cargo feature is enabled. The default `sqlx-cli` feature set already enables it: do not disable default features.

`sqlx.toml` knobs worth setting: `[common] database-url-var`; `[migrate] migrations-dir`, `create-schemas`, `table-name`, `ignored-chars`, `unrecognized-sql-files`, `defaults.migration-type`, `defaults.migration-versioning`.

## Pools and Connections

- `PgPoolOptions` is FIFO (`fair` defaults to `true`) with `max_connections` and `acquire_timeout`. That budget is a capacity input for concurrent streams, so **no stream holds a connection for its lifetime**: query, drop the connection, then stream the broadcast channel.
- `test_before_acquire(false)` removes the round trip on every checkout. Compensate with `before_acquire`, which sees the idle time:

```rust
PgPoolOptions::new()
    .max_connections(16)
    .acquire_timeout(Duration::from_secs(5))
    .test_before_acquire(false)
    .before_acquire(|conn, meta| Box::pin(async move {
        if meta.idle_for.as_secs() > 60 { conn.ping().await?; }
        Ok(true)                      // retain the connection; Ok(false) discards it
    }))
    .connect(&url).await?;
```

`before_acquire` never runs for a fresh connection — that is `after_connect`. `meta.idle_for` is a field, not a method.

- `&mut *tx` and `&mut *conn` re-borrow through `Acquire`. Reuse the same `conn` for a sequence of `fetch` calls; a consumed transaction handle is gone, and a dropped `Transaction` rolls back when the connection returns to the pool, so a retry re-acquires instead of reusing it.
- `.fetch(&mut *conn)` streams rows without materializing the result set. Use it for large scans; `.fetch_all` is for bounded results only.
- `statement_cache_capacity` defaults to 100 per connection. Behind PgBouncer in **transaction** pooling mode, server-side prepared statements are not stable across checkouts; lower the capacity or disable the cache. This cross-pool interaction is an operational inference — upstream documents only stale-plan recovery after `DISCARD ALL`/`DEALLOCATE`, and the option's own docs say nothing about pooling mode.

## Migrations

- Append migration files; never edit a committed one. The checksum is `SHA-384` over the SQL (`migration.rs:87`), so an edit is detected as a changed migration.
- Replicas serialize migrations with a PostgreSQL session advisory lock whose key is `0x3d32ad9e * CRC_32_ISO_HDLC(database_name)` (`sqlx-postgres/src/migrate.rs:371-374`). It is database-wide: a second replica blocks until the first releases, and a crash releases it with the session. Keep migration runs in one job, not on every replica's boot path.
- Do not confuse that migration key with the generic `PgAdvisoryLock`, which derives its key with HKDF-SHA-256; they are separate mechanisms.

## LISTEN/NOTIFY Fan-Out

```rust
let mut listener = PgListener::connect(&database_url).await?;   // dedicated connection
listener.listen("domain_events").await?;
let (tx, _) = tokio::sync::broadcast::channel(1_024);
tokio::spawn(async move {
    loop {
        match listener.recv().await {
            Ok(note) => { let _ = tx.send(Event::from(note)); }
            Err(err) => { /* log; the listener reconnects on the next recv */ }
        }
    }
});
```

- Use `PgListener::connect(url)`: it builds a one-connection pool with no lifetime or idle timeout. `connect_with(&app_pool)` is a real API, but it takes a connection **from the application pool** for the listener's lifetime, so never point it at the request pool. `ignore_pool_close_event` is a no-op on `connect()` (the internal pool cannot be closed) and only matters for `connect_with`, where `pool.close()` cancels an in-flight `recv()` with `PoolClosed`.
- The listener's connection sits **outside** `max_connections` on every replica. Size the fleet as pool size plus one per listener.
- `NOTIFY` payloads are capped at 8 000 bytes. Emit keys (table, operation, id) and let the consumer re-query; never put a row or a rendered fragment in the payload.
- Fan out through `tokio::sync::broadcast`, and treat `RecvError::Lagged(n)` as a resync signal: drop the buffered state, re-query a snapshot, and render it. Count it (see telemetry) rather than logging it as an error.
- Subscribe before the snapshot query and merge by id; otherwise a commit between the two is lost.
- The isolated SQLite fallback publishes to the same in-process `broadcast` channel and never emulates `LISTEN/NOTIFY` in SQL.

## Telemetry

`broadcast_lagged_total` counts every `RecvError::Lagged`; `db_pool_in_use` and `db_pool_waiters` expose the pool as a gauge; the wide request/stream event names the query count and the total acquire wait. A rising `broadcast_lagged_total` means the channel capacity, not the database, is the bottleneck.
