Source: `bevy@ae6152152` · verified 2026-10-31 (`0.20.0-dev`; `v0.20.1` is the newest release tag and is not an ancestor of `main`)
Re-verify when: the Bevy pin moves, a component rename lands, or the wasm/`getrandom` feature story changes.

# Bevy — ECS in WASM beside the Hypermedia Shell

Bevy 0.20 is an archetypal ECS with a schedule DAG, asset-driven scenes, and a wasm target. In this stack it owns only the high-frequency canvas: rendering, prediction, and input. The shell stays Maud and Datastar.

## Schedule and Data Model

- Systems run in schedules (`Startup`, `Update`, `FixedUpdate`, `PostUpdate`) whose ordering is a DAG; `SystemSet` is the ordering unit, not a global phase.
- `#[require(...)]` declares component relations that are inserted with the spawning component. `Mesh3d` requires `Transform`; `MeshMaterial3d` declares none; `WorldAssetRoot(Handle<WorldAsset>)` requires `Transform` and `Visibility` and spawns an external world.
- `ChildOf(parent)` is the relation; `Children` is the derived collection. Despawn children through the relation, never by walking a name convention.
- `Resource` is a `Component` subtrait. A resource is a singleton entity, so it obeys the same insert/remove lifecycle.
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
| Buffered frame lane | `#[derive(Message)]` | `MessageWriter<M>` | `MessageReader<M>` | telemetry and simulation output consumed once per frame; may lag |
| Immediate observer lane | `#[derive(Event)]` | `commands.trigger(..)` | `On<E>` | input-triggered reactions that must run now |
| Entity-targeted lane | `#[derive(EntityEvent)]` | `commands.trigger(..)` | `On<E>` | per-entity reactions; `#[entity_event(propagate)]` walks `ChildOf` |

Register messages with `app.add_message::<M>()`. `MessageWriter` needs `Messages<M>` to exist; `Event` does not. The decision rule: cross-frame simulation telemetry is a `Message`; an input-triggered reaction is an `Observer`. Do not emit a `Message` per entity per frame — batch the frame, then write once.

## WASM and Assets

- Pin `wasm-bindgen` crate and CLI in lockstep (`wasm-bindgen = "0.2.x"` with the matching `wasm-bindgen-cli`); a mismatch fails at load time with a schema error.
- `embedded_asset!(app, "path")` bundles an asset into the binary; no separate fetch, no MIME configuration.
- `Task<T>::detach()` keeps a fire-and-forget load alive; without it the task is dropped.
- `webgl2` and `webgpu` are cargo features and `webgpu` overrides `webgl2`; pick one and do not ship both paths.
- `getrandom` 0.4 needs its `wasm_js` **crate feature**, and the application crate declares it: Bevy and `bevy_math` declare `getrandom` only under `[target.'cfg(target_arch = "wasm32")'.dev-dependencies]`, which does not propagate to a dependant.

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

## Accessibility Non-Goal

A canvas-only page has no meaningful accessibility story in this skill. If the product needs keyboard navigation, screen-reader labels, or zoom, those controls belong in the Maud shell as real DOM, not inside the canvas. Do not claim canvas accessibility by adding `aria-label` to the element.

## Migration and Retired Forms

| Retired form | Replacement |
| --- | --- |
| `SceneRoot` component | `WorldAssetRoot(Handle<WorldAsset>)` |
| `--cfg=getrandom_backend=wasm_js` | the `getrandom` 0.4 `wasm_js` crate feature |
| `EventReader` / `EventWriter` for frame data | `MessageReader` / `MessageWriter` with `#[derive(Message)]` |
| `EventReader` for immediate reactions | `On<E>` with `commands.trigger(..)` |
| unqualified `Single` for possibly-empty sets | `Populated<Q>` |
