Re-verify when: the SQLx pin recorded in `scripts/provenance.lock` moves, `PgListener` changes constructors, or `sqlx.toml` gains keys.

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

### Custom types

- `#[derive(sqlx::Type)]` emits `Type`, `Encode`, and `Decode` in one derive (`sqlx-macros/src/lib.rs`). `#[sqlx(transparent)]` forwards to the inner type and `#[sqlx(type_name = "...")]` names a PostgreSQL enum or domain. Hand-write the three traits only for a wire format SQLx does not model.
- `impl PgHasArrayType for MyType` (`sqlx-postgres/src/types/array.rs`) is what makes `Vec<MyType>` bindable: without it there is no array type info for the element, and the bind fails to type-check.
- `#[derive(sqlx::FromRow)]` maps columns to fields by name. `#[sqlx(json)]` decodes a JSON/JSONB column into a `serde` type, and `#[sqlx(json(nullable))]` is the nullable form — without the argument a `NULL` column is an error, not an `Option` (`sqlx-core/src/from_row.rs`).

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

| Knob | Default | Set it because |
| --- | --- | --- |
| `min_connections` | `0` | the first request after an idle window should not pay connect latency; clamped to `max_connections` and maintained best-effort |
| `idle_timeout` | `10 min` | a usage-billed database, or a proxy that reaps idle sessions before the pool does |
| `max_lifetime` | `30 min` | keep it finite: database-side leaks (parse trees, plan caches, thread-locals) are only reclaimed when the session ends |
| `acquire_timeout` | `30 s` | shorten it — a request queued 30 s is already a failure, and the stream path must not hold a task that long |
| `acquire_slow_threshold` | `2 s` | a warning past this threshold means the pool, not the query, is the latency |
| `acquire_slow_level` | `Warn` | raise it when a slow acquire should fail a check, not just log |
| `connect_lazy_with(options)` | — | build the `Pool` without connecting, for a process that must boot before the database exists |
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

`after_connect` is where session invariants belong, because it runs once per physical connection before any caller sees it:

```rust
PgPoolOptions::new()
    .after_connect(|conn, _meta| Box::pin(async move {
        conn.execute("SET TIME ZONE 'UTC'; SET statement_timeout = '5s'").await?;
        Ok(())
    }))
    .connect(&url).await?;
```

`before_acquire` cannot substitute: it only ever sees connections that are already in the pool, so an invariant set there is absent on exactly the connection a fresh replica serves its first request with. `after_connect` fires on the connect path, once, and never again for that connection.

That multi-statement string is legal because a `&'static str` is a `SqlSafeStr` directly (`Repr::Static`, no copy), and a statement with no bind arguments takes the simple-query path — `take_arguments()` returns `None`, so the driver queues one simple query and reads text-format values, which is what allows several statements in one call. Two consequences: a string built at runtime does not compile into `execute` and must be wrapped in `AssertSqlSafe`, which records that you vetted it for injection, and `raw_sql(..)` is the separate uncached API for batch and DDL work, not a workaround for multi-statement setup.

- `&mut *tx` and `&mut *conn` re-borrow through `Acquire`. Reuse the same `conn` for a sequence of `fetch` calls; a consumed transaction handle is gone, and a dropped `Transaction` rolls back when the connection returns to the pool, so a retry re-acquires instead of reusing it.
- Nested `begin` is a savepoint, not a second transaction. `pool.begin()` opens depth 1 (`BEGIN`); calling `.begin()` again on `&mut Transaction` opens depth 2, which emits `SAVEPOINT _sqlx_savepoint_1`, and its `commit()`/`rollback()` emit `RELEASE SAVEPOINT` / `ROLLBACK TO SAVEPOINT` (`sqlx-core/src/transaction.rs`). That is the partial-rollback mechanism: one outer transaction per request, one savepoint per fallible step.
- Drop is not commit. A dropped `Transaction` queues a rollback — the whole request at depth 1, only back to the savepoint at depth 2 — so a dropped savepoint keeps the work before it and a dropped outer transaction discards everything.
- `.fetch(&mut *conn)` streams rows without materializing the result set. Use it for large scans; `.fetch_all` is for bounded results only.
- `statement_cache_capacity` defaults to 100 per connection. Behind PgBouncer in **transaction** pooling mode, server-side prepared statements are not stable across checkouts; lower the capacity or disable the cache. This cross-pool interaction is an operational inference — upstream documents only stale-plan recovery after `DISCARD ALL`/`DEALLOCATE`, and the option's own docs say nothing about pooling mode.

## Migrations

- Append migration files; never edit a committed one. The checksum is `SHA-384` over the SQL (`migration.rs:87`), so an edit is detected as a changed migration.
- Embed them: `static MIGRATOR: Migrator = sqlx::migrate!("migrations");` then `MIGRATOR.run(&pool).await?` (`sqlx-core/src/migrate/migrator.rs`, `sqlx-macros/src/lib.rs`). The macro reads the directory at compile time, so the binary carries its own migrations and a deploy cannot ship code and schema from different trees. `Migrator::new(Path::new("migrations")).await?` is the runtime form, for tests.
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
- `recv()` returns a notification: `Result<PgNotification, Error>`, never an empty poll. It loops on `try_recv()` internally, so it returns only when a notification arrives or a non-I/O error surfaces. Use it for the fan-out loop, where "nothing arrived yet" is not an event.
- `try_recv()` returns an option: `Result<Option<PgNotification>, Error>`, and `Ok(None)` means the **connection was lost**, not that nothing arrived. It drops the dead connection and reconnects immediately when `eager_reconnect` is `true` (the default), or on the next call when it is `false`; the tracked channel list is replayed with `LISTEN` on reconnect, so subscriptions survive the drop (`sqlx-postgres/src/listener.rs`). Count `Ok(None)` as a reconnect metric — with `eager_reconnect(false)` it is the only signal a flapping database gives. A `recv()` loop never yields `None`, so a reconnect counter written against `recv()` counts nothing.
- `PoolClosed` is a shutdown signal, not a retryable error. It arrives only from a `connect_with` listener whose application pool was closed, and it cancels an in-flight `recv()` instead of returning empty.
- `NOTIFY` is delivered at **commit** and discarded on rollback: PostgreSQL queues a transaction's notifications and sends them when it commits. A rolled-back write is therefore silent, and a subscriber never observes state no reader can see.
- Emit with `SELECT pg_notify($1, $2)`, not the `NOTIFY` statement. The statement form takes no bind parameters and lowercases an unquoted channel identifier; the function form binds and preserves case (`examples/postgres/listen/src/main.rs`).
- `NOTIFY` payloads are capped at 8 000 bytes. Emit keys (table, operation, id) and let the consumer re-query; never put a row or a rendered fragment in the payload.
- Fan out through `tokio::sync::broadcast`, and treat `RecvError::Lagged(n)` as a resync signal: drop the buffered state, re-query a snapshot, and render it. Count it (see telemetry) rather than logging it as an error.
- Subscribe before the snapshot query and merge by id. The two orders together are safe because they cover both commit windows: a transaction committed before the snapshot is already visible in it, so its notification is a duplicate the id merge absorbs, and one committed after the snapshot must produce a notification, because the subscription predates the read. Merge by id rather than by arrival, or the duplicate becomes a replayed row.
- The isolated SQLite fallback publishes to the same in-process `broadcast` channel and never emulates `LISTEN/NOTIFY` in SQL.

## Telemetry

`broadcast_lagged_total` counts every `RecvError::Lagged`; `db_pool_in_use` and `db_pool_waiters` expose the pool as a gauge; the wide request/stream event names the query count and the total acquire wait. A rising `broadcast_lagged_total` means the channel capacity, not the database, is the bottleneck.
