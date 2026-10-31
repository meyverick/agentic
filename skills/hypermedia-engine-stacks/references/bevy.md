Re-verify when: the Bevy pin recorded in `scripts/provenance.lock` moves, a component rename lands, or the wasm/`getrandom` feature story changes.

# Bevy — ECS in WASM beside the Hypermedia Shell

Bevy is an archetypal ECS with a schedule DAG, asset-driven scenes, and a wasm target. In this stack it owns only the high-frequency canvas: rendering, prediction, and input. The shell stays Maud and Datastar.

## Schedule and Data Model

- Systems run in schedules (`Startup`, `Update`, `FixedUpdate`, `PostUpdate`) whose ordering is a DAG; `SystemSet` is the ordering unit, not a global phase.
- `#[require(...)]` declares component relations that are inserted with the spawning component. `Mesh3d` requires `Transform`; `MeshMaterial3d` declares none; `WorldAssetRoot(Handle<WorldAsset>)` requires `Transform` and `Visibility` and spawns an external world.
- `ChildOf(parent)` is the relation; `Children` is the derived collection. Despawn children through the relation, never by walking a name convention.
- `Resource` is a `Component` subtrait. A resource is a singleton entity, so it obeys the same insert/remove lifecycle.
- Storage is a per-component choice, not a global one. The default `Table` storage gives cache-friendly, schema-ordered iteration and slower insert/remove; `#[component(storage = "SparseSet")]` on the derive gives fast insert/remove and slower iteration. Put components that are added and removed every frame — markers, tracked targets, short-lived effects — in `SparseSet`, and the bulk data every query walks in `Table`.
- States are `States`, `SubStates`, and `ComputedStates`; transitions are scheduled events, not boolean flags.
- Fixed-timestep determinism is `Time<Fixed>` in `FixedUpdate`. Simulation logic goes there; interpolation and presentation stay in `Update`.

```rust
fn step(mut q: Query<(&mut Transform, &Velocity)>, time: Res<Time<Fixed>>) {
    for (mut transform, velocity) in &mut q {
        transform.translation += velocity.0 * time.delta_secs();
    }
}
```

- Fallible systems return `Result<(), BevyError>` and use `?`; do not `unwrap` a system result.
- `Single<Q>` requires exactly one match (`IterQueryData`); `Populated<Q>` requires at least one and is **mutable** (`QueryData`, `DerefMut`) — it is not the read-only form.

## Message versus Event

| Lane | Type | Write | Read | Use |
| --- | --- | --- | --- | --- |
| Buffered frame lane | `#[derive(Message)]` | `MessageWriter<M>` | `MessageReader<M>` | telemetry and simulation output consumed once per frame; a message not read before the second update is dropped silently |
| Immediate observer lane | `#[derive(Event)]` | `commands.trigger(..)` | `On<E>` | input-triggered reactions that must run now |
| Entity-targeted lane | `#[derive(EntityEvent)]` | `commands.trigger(..)` | `On<E>` | per-entity reactions; `#[entity_event(propagate)]` walks `ChildOf` |

Register messages with `app.add_message::<M>()`. `MessageWriter` needs `Messages<M>` to exist; `Event` does not. `Messages` is a double buffer: a reader that reads at least once per update never drops, one that reads once per two updates may still receive some, and one that reads after two updates drops everything older (`bevy_ecs/src/message/messages.rs`). A system that declares `MessageWriter<M>` without the registration fails system-parameter validation with code `B0009` and `Message not initialized` (`bevy_ecs/src/message/message_writer.rs`) — the same code covers a system declaring both a reader and a writer of `M`, whose fix is `MessageMutator`. The decision rule: cross-frame simulation telemetry is a `Message`; an input-triggered reaction is an `Observer`. Do not emit a `Message` per entity per frame — batch the frame, then write once.

### Cadence with a fixed timestep

`message_update_system` is scheduled in `First` under `message_update_condition` (`bevy_app/src/sub_app.rs`), and `MessageRegistry::should_update` starts at `Always`, so without a fixed timestep every message type swaps buffers once per frame. Adding `TimePlugin` schedules `signal_message_update_system` in `FixedPostUpdate` (`bevy_time/src/lib.rs`), which flips the registry to `Waiting`; from then on the swap happens **once per fixed tick**, for every message type in that world, not once per frame.

For telemetry written from `FixedUpdate` that means two things. A message survives until the next fixed post-update, so an `Update` reader that runs several render frames per tick reads the same message repeatedly — the per-system `MessageReader` cursor makes those repeats cheap rather than duplicated. And messages written from `Update` are batched into the next fixed tick's buffer, so the writes per swap are the update rate times the frames per tick, not the fixed rate. Do not assume per-frame cadence for one message type while a fixed timestep is installed: the registry is one resource for the whole world.

## WASM and Assets

- Pin the `wasm-bindgen` crate and the `wasm-bindgen-cli` binary in lockstep; a mismatch fails at load time with a schema error.
- `embedded_asset!(app, "path")` bundles an asset into the binary; no separate fetch, no MIME configuration.
- Lifetime is decided by the handle, not by the entity: a strong handle keeps the asset alive until the last strong handle drops, and a UUID handle never does. Holding only weak references in a manifest resource is the classic cause of models vanishing while their entities still render (`bevy_asset/src/lib.rs`). `AssetEvent::{Added, Modified, Removed, Unused, LoadedWithDependencies}` reports the lifecycle, and `LoadedWithDependencies` is the only variant that means the asset *and everything it references* is ready — `Added` does not.
- Three clocks, not one: `Time<Real>` is the wall clock and keeps advancing while the app is paused, `Time<Virtual>` is pausable and speed-scaled and is what gameplay timers should read, and `Time<Fixed>` is the fixed step and is meaningful only inside `FixedUpdate`. Reading `Time<Fixed>` from `Update` gives the step, not the elapsed frame.
- Build for the browser with the target the crate declares: `rustup target add wasm32-unknown-unknown`, then `cargo build --release --target wasm32-unknown-unknown` followed by `wasm-bindgen --target web --out-dir <dir> <artifact>` (`examples/README.md`). Shipping the raw `cargo` output without the `wasm-bindgen` pass produces a module the browser cannot instantiate.
- `Task<T>::detach()` keeps a fire-and-forget load alive; without it the task is dropped.
- `webgl2` and `webgpu` are cargo features and `webgpu` overrides `webgl2`; pick one and do not ship both paths.
- `getrandom` needs its `wasm_js` **crate feature**, and the application crate declares it: Bevy and `bevy_math` declare `getrandom` only under `[target.'cfg(target_arch = "wasm32")'.dev-dependencies]`, which does not propagate to a dependant.

```toml
[target.'cfg(target_arch = "wasm32")'.dependencies]
getrandom = { version = "0.4", default-features = false, features = ["wasm_js"] }
```

Payload budget is a build flag, not an aspiration:

```toml
[profile.release]
opt-level = "s"
lto = true
codegen-units = 1
panic = "abort"

[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz"]
```

Install `console_error_panic_hook` once at startup so a panic is a readable stack instead of `unreachable`.

## Canvas Mounting

```rust
Window {
    canvas: Some("#bevy-canvas".into()),     // CSS selector, not an element id lookup
    fit_canvas_to_parent: true,              // the parent must have explicit dimensions
    prevent_default_event_handling: false,   // keep browser hotkeys in hybrid pages
    ..default()
}
```

- `data-ignore-morph` goes on the `<canvas>` **and** on its mount container; a morph that replaces the canvas destroys the WebGL/WebGPU context.
- Any `data-on:*` listener that must survive a patch sits on an ancestor outside the morphed region, not on the canvas.
- `fit_canvas_to_parent` reads the parent's computed size; a `height: 100%` chain that resolves to `auto` gives a zero-height canvas.

## Shell Bridge

| Direction | Frequency | Mechanism |
| --- | --- | --- |
| WASM → shell | low (score, match state) | `web_sys::CustomEvent` on `window`; shell listens with `data-on:<event>__window` |
| shell → WASM | low (pause, loadout) | `CustomEvent` into a bounded channel read by a Bevy system |
| WASM ↔ server | high (inputs, ticks) | `WebSocket` plus `postcard`; never the DOM |
| server → shell | low | SSE `PatchElements` and `PatchSignals` |

- On the client, set `websocket.set_binary_type(web_sys::BinaryType::Arraybuffer)` before sending `postcard` frames.
- Bound the inbound queue. `requestAnimationFrame` pauses in a hidden tab while the socket keeps writing, so an unbounded `wasm-bindgen` queue becomes heap growth; drop the oldest frame and let the next snapshot correct it.
- A `CustomEvent` bridge is for low-frequency UI state only. A 60 Hz transform stream through `CustomEvent` is the DOM-thrashing anti-pattern in a different costume.

### The browser queue

A `wasm-bindgen` callback cannot await and has no `World`, so `onmessage` cannot write a message directly. It pushes into a bounded `thread_local!` queue and a `PreUpdate` system drains that queue into the message lane — the only place a socket frame becomes an ECS message.

```rust
#[derive(Message)]
struct SimTick { tick: u64, payload: Vec<u8> }

thread_local! {
    static INBOUND: RefCell<VecDeque<SimTick>> = RefCell::new(VecDeque::new());
}

const QUEUE_CAP: usize = 64;

fn push(tick: SimTick) {
    INBOUND.with(|queue| {
        let mut queue = queue.borrow_mut();
        if queue.len() == QUEUE_CAP { queue.pop_front(); }   // drop-oldest: the next snapshot corrects the gap
        queue.push_back(tick);
    });
}

fn drain_inbound(mut writer: MessageWriter<SimTick>) {
    let batch: Vec<SimTick> = INBOUND.with(|queue| queue.borrow_mut().drain(..).collect());
    if !batch.is_empty() { writer.write_batch(batch); }      // one write per drain, not one per frame
}

app.add_message::<SimTick>();                                // required: MessageWriter panics B0009 without it
app.add_systems(PreUpdate, drain_inbound);
```

```rust
use wasm_bindgen::JsCast as _;

socket.set_binary_type(web_sys::BinaryType::Arraybuffer);
let onmessage = Closure::<dyn FnMut(web_sys::MessageEvent)>::new(move |event: web_sys::MessageEvent| {
    let Some(buffer) = event.data().dyn_ref::<js_sys::ArrayBuffer>() else { return };
    let bytes = js_sys::Uint8Array::new(buffer).to_vec();
    if let Ok(tick) = postcard::from_bytes::<SimTick>(&bytes) { push(tick); }
});
socket.set_onmessage(Some(onmessage.as_ref().unchecked_ref()));
onmessage.forget();                                          // the socket owns the callback for the page's life
```

- `write_batch` fills the buffer once for the whole drain and returns the ids it assigned; calling `write` in a loop is `N` wakes for one batch.
- The queue is `thread_local!` because wasm is single-threaded: a `Mutex` would add an uncontended lock to every frame for no reason.
- Drop the oldest on overflow, never grow. A hidden tab pauses `requestAnimationFrame` while the socket keeps writing, so an unbounded queue is heap growth with extra steps.
- `PreUpdate` is the drain point because readers in `Update` then see the same frame's frames; draining in `Update` races the systems that read them.

## Accessibility Non-Goal

A canvas-only page has no meaningful accessibility story in this skill. If the product needs keyboard navigation, screen-reader labels, or zoom, those controls belong in the Maud shell as real DOM, not inside the canvas. Do not claim canvas accessibility by adding `aria-label` to the element.

## Migration and Retired Forms

| Retired form | Replacement |
| --- | --- |
| `SceneRoot` component | `WorldAssetRoot(Handle<WorldAsset>)` |
| `--cfg=getrandom_backend=wasm_js` | the `getrandom` `wasm_js` crate feature |
| `EventReader` / `EventWriter` for frame data | `MessageReader` / `MessageWriter` with `#[derive(Message)]` |
| `EventReader` for immediate reactions | `On<E>` with `commands.trigger(..)` |
| unqualified `Single` for possibly-empty sets | `Populated<Q>` |
