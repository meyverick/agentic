# Hybrid Simulation Boundary: Bevy WASM, Datastar & Rama WSS

## 1. Boundary Architecture
When embedding an interactive 2D/3D Bevy WASM simulation inside a Maud and Datastar web application, enforce a strict two-tier communication architecture:

| Traffic Class | Examples | Transport Mechanism | DOM Involvement |
| :--- | :--- | :--- | :--- |
| **High-Frequency Simulation** | Player inputs, physics transforms, entity ticks, cursors | Direct Rama `WSS` (Binary Postcard / Compact JSON) | **Zero** (Bypasses DOM & Datastar) |
| **Low-Frequency Shell UI** | Scoreboards, inventory modals, match state, settings | Window `CustomEvent` + Datastar Signals via `wasm-bindgen` | **Declarative** (Maud + Datastar) |

**Prohibited Pattern**: Never allocate `SharedArrayBuffer` or manual cross-thread shared memory pointers between Bevy WASM and the browser DOM.

---

## 2. Mounting the Bevy Canvas in Maud without Morph Collisions
Always isolate the `<canvas>` container using Datastar's `data-ignore` attribute so incoming `PatchElements` SSE morphs do not recreate the canvas node or drop the WebGL2/WebGPU context:

```rust
use maud::{html, Markup};

pub fn simulation_viewport() -> Markup {
    html! {
        div
            id="hud-shell"
            data-signals="{ score: 0, paused: false, inventoryOpen: false }"
            // Listen for custom events emitted by Bevy WASM
            data-on-bevy-score-updated__window="$score = evt.detail.score"
        {
            header class="hud-bar" {
                span { "Score: " span data-text="$score" {} }
                button
                    data-on-click="$paused = !$paused; window.dispatchEvent(new CustomEvent('shell-toggle-pause', { detail: { paused: $paused } }))"
                {
                    "Toggle Pause"
                }
            }

            // data-ignore prevents Datastar from morphing the active WebGPU/WebGL canvas
            div id="canvas-stage" data-ignore {
                canvas id="bevy-canvas" width="1280" height="720" {}
            }
        }
    }
}
```

---

## 3. Low-Frequency Bridge: Emitting DOM `CustomEvent` from Bevy WASM
Use `web-sys` and `wasm-bindgen` inside Bevy systems to emit low-frequency state transitions (such as health changes, match completion, or score updates) upward to the Datastar shell:

```rust
use bevy::prelude::*;
use wasm_bindgen::JsValue;
use web_sys::{CustomEvent, CustomEventInit, window};

#[derive(Event)]
pub struct ScoreUpdatedEvent(pub u32);

pub fn emit_score_to_datastar_system(
    mut events: EventReader<ScoreUpdatedEvent>,
) {
    let Some(win) = window() else { return };

    for event in events.read() {
        let detail = js_sys::Object::new();
        let _ = js_sys::Reflect::set(
            &detail,
            &JsValue::from_str("score"),
            &JsValue::from_f64(event.0 as f64),
        );

        let mut init = CustomEventInit::new();
        init.detail(&detail);
        init.bubbles(true);

        if let Ok(custom_evt) = CustomEvent::new_with_event_init_dict(
            "bevy-score-updated",
            &init,
        ) {
            let _ = win.dispatch_event(&custom_evt);
        }
    }
}
```

---

## 4. Low-Frequency Bridge: Receiving Datastar Events in Bevy WASM
To pass shell commands (such as pause toggles, equipment changes, or camera resets) from Datastar into Bevy, attach a window event listener during Bevy startup that forwards events into a thread-safe channel read by a Bevy system:

```rust
use bevy::prelude::*;
use crossbeam_channel::{unbounded, Receiver};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{CustomEvent, window};

#[derive(Resource)]
pub struct ShellCommandReceiver(pub Receiver<bool>);

pub fn setup_shell_listener_system(mut commands: Commands) {
    let (tx, rx) = unbounded::<bool>();
    commands.insert_resource(ShellCommandReceiver(rx));

    if let Some(win) = window() {
        let closure = Closure::wrap(Box::new(move |evt: CustomEvent| {
            let detail = evt.detail();
            if let Ok(paused_val) = js_sys::Reflect::get(&detail, &JsValue::from_str("paused")) {
                if let Some(paused) = paused_val.as_bool() {
                    let _ = tx.send(paused);
                }
            }
        }) as Box<dyn FnMut(CustomEvent)>);

        let _ = win.add_event_listener_with_callback(
            "shell-toggle-pause",
            closure.as_ref().unchecked_ref(),
        );
        closure.forget();
    }
}
```

---

## 5. High-Frequency Transport: Direct Rama WSS
For continuous simulation frames (60Hz transforms, physics prediction, multiplayer inputs):
1. Instantiate a `web_sys::WebSocket` (with `BinaryType::Arraybuffer`) inside a Bevy startup system connecting directly to `wss://<host>/ws/simulation`.
2. Serialize wire structs with `postcard` or `bincode` for zero-overhead framing.
3. Handle WebSocket upgrades directly inside Rama using its native WebSocket extractor and forward binary frames to the authoritative Rust simulation loop.
