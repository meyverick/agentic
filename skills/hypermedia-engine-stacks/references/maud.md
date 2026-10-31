Source: `maud@42f4789` · verified 2026-10-31 (v0.27.0 plus 12 commits; `maud::json` and edition 2024 are unreleased)
Re-verify when: the maud pin moves past the `maud::json` release, or the `#id` / void-element syntax changes.

# Maud — Compile-Time HTML Templates

`html!` compiles a template into imperative Rust that writes into one `String`, with zero runtime parsing. The returned `Markup` is `PreEscaped<String>`, so interpolated values were escaped at write time and the result is inserted verbatim.

## The Single Buffer

- The macro emits `String::with_capacity(size_hint)` once, where `size_hint` is **the byte length of the template source** (`maud_macros/src/lib.rs`). It is a heuristic, not a computed total; rows rendered per request are not part of it.
- Never re-render a fragment through a second `html!` inside a loop. Render the row once into a reused buffer with `Render::render_to`.
- `Render::render_to` on `Markup` and `&str` appends with no allocation; the trait's default implementation allocates one intermediate `Markup`. Prefer the inherent implementations.

```rust
let mut buffer = String::with_capacity(4_096);
for row in rows {
    row.render_to(&mut buffer);          // no per-row allocation
}
let markup = PreEscaped(buffer);
```

## Syntax Rules

| Context | Rule |
| --- | --- |
| `#id` shorthand | whitespace before `#`: `div #hud-shell`; `#` takes one id only |
| `.class` shorthand | chains freely: `div.row.row--active` |
| void element | terminate with `;`: `input type="text" name="q";` |
| optional attribute | `attr=[option]` omits the attribute on `None` |
| toggled attribute | `[condition]` emits or omits the attribute |
| splice | `(markup)` inserts rendered `Markup` |
| control flow | `@if`, `@else if`, `@else`, `@for`, `@match`, `@let` |
| dynamic text | `(value)` escapes; `maud::display(value)` renders any `Display` |

Rust 2021 reserves nothing here, but the parser is whitespace-sensitive: `div#id` is not the shorthand, and `div.foo` is. Keep the space after the tag name before `#`.

## Escaping

`Markup`'s escape set is `& < > "` — exactly four characters. A single quote is **not** escaped. That is safe for double-quoted attributes and text, and unsafe for a single-quoted attribute value; never interpolate into `attr='…'`.

`PreEscaped` bypasses escaping entirely. It is the correct type for a fragment Maud already rendered and the wrong type for anything user-controlled. `maud::Escaper::new(&mut buffer)` gives the same four-character escape as a `fmt::Write` adapter for hand-written output:

```rust
use maud::Escaper;
use std::fmt::Write;
write!(Escaper::new(&mut buffer), "{user_text}")?;
```

## The Two Escaping Contexts

Maud escapes an attribute value and escapes a text node identically; what differs is where the browser stops decoding escapes.

- In `data-signals=(json)` the escape is fully effective: `&quot;` becomes `"` after HTML parsing, so the JSON stays JSON and injection stays blocked. Splice serialized JSON, never concatenate it, and never wrap it in `PreEscaped`.
- Inside `<script>` the content is raw text: `&lt;` is **not** decoded, so Maud's escape neither protects nor corrupts a script payload — it simply leaves invalid JavaScript. Script JSON must be serialized and then have `<`, `>`, `&` rewritten to `\u003c`, `\u003e`, `\u0026`.

`maud::json::Json<T>` does exactly that rewrite for any `serde_json::Value` or `Serialize` value. It is **unreleased**: it sits behind the `json` feature on post-`v0.27.0` commits, so treat it as the forward path rather than 0.27.0 behaviour. Until the release that carries it, run `serde_json::to_string` and apply the same three-escape pass yourself.

```rust
// data attribute: escaping is enough
div data-signals=(serde_json::to_string(&signals)?) { … }

// script: serialization + \u003c/\u003e/\u0026 sanitization
script { (sanitize_json(&serde_json::to_string(&state)?)) }
```

## Markup to NonEmptyStr

`rama`'s `PatchElements::new` takes `NonEmptyStr`; Maud returns `Markup`. No `TryFrom<Markup>` exists, so bridge through the `String`:

```rust
use rama::utils::str::NonEmptyStr;

let markup = html! { li id=(format!("row-{id}")) { (label) } };
let elements = NonEmptyStr::try_from(markup.into_string())   // Result<_, EmptyStrErr>
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
let patch = PatchElements::new(elements).with_mode(ElementPatchMode::Inner);
```

Handle `EmptyStrErr`; an empty fragment is a bug, not an unwrap. Reserve `non_empty_str!` for literals — it panics on an empty runtime value.

## Component Shape

- A page is a function returning `Markup`; a fragment is a function taking the row and returning `Markup`. Do not build one template per responsive state.
- Pass pre-rendered children as `Markup` and splice with `(children)`.
- Render the shell once per request and stream only the fragments that change; Maud has no partial-render cache, and a re-rendered shell costs a full template pass.
- Keep the deterministic `id` in the template itself. An id derived from `(row.id)` is stable across morphs; a loop index is not.
