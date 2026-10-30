# PostgreSQL LISTEN/NOTIFY & Rama Datastar SSE Streaming

## 1. Architecture Overview
To achieve real-time reactivity across distributed Rama server instances without external message brokers (such as Redis or RabbitMQ), PostgreSQL's native `LISTEN/NOTIFY` engine acts as the primary event bus.

1. **Database Trigger or Application Emit**: A transaction commits and emits `NOTIFY channel_name, 'payload'`.
2. **Dedicated Listener Task**: A background Tokio task maintains a `sqlx::postgres::PgListener` connection and forwards payloads into an internal `tokio::sync::broadcast` fan-out channel.
3. **Rama SSE Responder**: Active HTTP client streams subscribe to the broadcast receiver, render updated Maud `html!` fragments or signal payloads, and yield `rama::http::sse::datastar` events.

---

## 2. PostgreSQL Notification Trigger Pattern
Prefer emitting compact JSON metadata from PostgreSQL triggers or explicit `sqlx::query!("SELECT pg_notify($1, $2)", channel, payload)` calls inside transaction blocks:

```sql
CREATE OR REPLACE FUNCTION notify_state_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'domain_events',
    json_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP,
      'id', COALESCE(NEW.id, OLD.id)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Bridging `PgListener` to a Tokio Broadcast Fan-Out
Never spawn a separate `PgListener` per connected HTTP client, as each listener consumes a dedicated PostgreSQL connection. Instead, multiplex a single `PgListener` per server instance into a `tokio::sync::broadcast` channel:

```rust
use sqlx::postgres::PgListener;
use sqlx::PgPool;
use tokio::sync::broadcast;

#[derive(Clone, Debug)]
pub struct DomainEvent {
    pub channel: String,
    pub payload: String,
}

pub async fn spawn_pg_event_multiplexer(
    pool: PgPool,
    channels: &[&str],
) -> Result<broadcast::Sender<DomainEvent>, sqlx::Error> {
    let (tx, _rx) = broadcast::channel(1024);
    let tx_clone = tx.clone();

    let mut listener = PgListener::connect_with(&pool).await?;
    listener.listen_all(channels.iter().copied()).await?;

    tokio::spawn(async move {
        loop {
            match listener.recv().await {
                Ok(notification) => {
                    let event = DomainEvent {
                        channel: notification.channel().to_owned(),
                        payload: notification.payload().to_owned(),
                    };
                    // Ignore error when no active SSE clients are listening
                    let _ = tx_clone.send(event);
                }
                Err(err) => {
                    tracing::error!("PgListener error, reconnecting: {:?}", err);
                }
            }
        }
    });

    Ok(tx)
}
```

---

## 4. Streaming Maud Fragments via Rama Datastar SSE
Inside your Rama route handler, subscribe to the `broadcast::Sender<DomainEvent>`, render type-safe HTML via Maud, and emit `PatchElements` or `PatchSignals` events:

```rust
use async_stream::stream;
use maud::{html, Markup};
use rama::http::sse::{
    datastar::{ElementPatchMode, PatchElements, PatchSignals},
    Sse,
};
use rama::http::IntoResponse;
use tokio::sync::broadcast;

pub fn render_item_row(id: i64, status: &str) -> Markup {
    html! {
        div id=(format!("item-{}", id)) class="row-item" {
            span class="status" { (status) }
        }
    }
}

pub async fn sse_events_handler(
    tx: broadcast::Sender<DomainEvent>,
) -> impl IntoResponse {
    let mut rx = tx.subscribe();

    let event_stream = stream! {
        while let Ok(event) = rx.recv().await {
            let fragment = render_item_row(42, &event.payload);

            // Emit a Datastar DOM patch
            let patch = PatchElements::new(fragment.into_string())
                .with_mode(ElementPatchMode::Morph);

            yield Ok::<_, std::convert::Infallible>(patch.into_sse_event());

            // Optionally synchronize client-side Datastar signals
            let signals = PatchSignals::new(r#"{"lastUpdated": true}"#);
            yield Ok::<_, std::convert::Infallible>(signals.into_sse_event());
        }
    };

    Sse::new(event_stream)
}
```

---

## 5. Embedded SQLite Fallback Pattern
When building an isolated local CLI or single-node embedded tool where SQLite is explicitly mandated:
1. Do **not** abstract SQLx queries behind generic traits.
2. Reuse the exact `broadcast::Sender<DomainEvent>` fan-out pattern above.
3. Have your write handlers publish `DomainEvent` structs directly to `tx.send(event)` immediately after `sqlx::query!().execute(&sqlite_pool).await?` commits. The Rama SSE streaming pipeline remains 100% identical.
