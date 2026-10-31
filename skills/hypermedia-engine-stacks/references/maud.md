Re-verify when: the maud pin recorded in `scripts/provenance.lock` moves past the `maud::json` release, or the `#id` / void-element syntax changes.

# Maud — Compile-Time HTML Templates

`html!` compiles a template into imperative Rust that writes into one `String`, with zero runtime parsing. The returned `Markup` is `PreEscaped<String>`, so interpolated values were escaped at write time and the result is inserted verbatim.

## The Single Buffer

- The macro emits `String::with_capacity(size_hint)` once, where `size_hint` is the byte length of the **stringified token stream** (`input.to_string().len()`, `maud_macros/src/lib.rs`) — not the byte length of the template source. Printing a `TokenStream` inserts separators between tokens, so the number is a heuristic, not a computed total, and rows rendered per request are not part of it.
- Never re-render a fragment through a second `html!` inside a loop. A per-row `html!` allocates one `Markup` fragment and the `format!` id string; write the row straight into the reused buffer instead.
- `Render::render_to` on `Markup` and `&str` appends with no allocation; the trait's default implementation allocates one intermediate `Markup`. A hand-written `Render` that writes with `std::fmt::Write` and `maud::Escaper` allocates nothing per row: `write!` formats the static `<li>` markup and the numeric id into the buffer, and `Escaper` escapes the label as it writes. Prefer the inherent implementations; otherwise write directly.

```rust
use std::fmt::Write as _;

pub struct RowView<'a> {
    pub id: i64,
    pub label: &'a str,
}

impl maud::Render for RowView<'_> {
    fn render_to(&self, buffer: &mut String) {
        let _ = write!(buffer, "<li id=\"row-{}\">", self.id);
        let _ = write!(maud::Escaper::new(buffer), "{}", self.label);
        buffer.push_str("</li>");
    }
}

let mut buffer = String::with_capacity(4_096);
for row in &rows {
    row.render_to(&mut buffer);          // direct writes: no Markup, no id String, no per-row allocation
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

`div#hud-shell` never reaches maud: the lexer reserves `ident#` as a prefixed token, so `rustc` rejects the macro input with `prefix 'div' is unknown … prefixed identifiers and literals are reserved since Rust 2021`. `div #hud-shell` lexes as the tag `div` followed by the `#id` shorthand and parses. `div.foo` has no reserved prefix, which is why only `#` needs the space.

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

`maud::json::Json<T>` does exactly that rewrite for any `serde_json::Value` or `Serialize` value. It is **unreleased**: it sits behind the `json` feature on commits after the current release, so treat it as the forward path rather than shipped behaviour. Until the release that carries it, run `serde_json::to_string` and apply the same three-escape pass yourself:

```rust
fn sanitize_json(json: &str) -> PreEscaped<String> {
    let mut out = String::with_capacity(json.len());
    for ch in json.chars() {
        match ch {
            '<' => out.push_str("\\u003c"),
            '>' => out.push_str("\\u003e"),
            '&' => out.push_str("\\u0026"),
            other => out.push(other),
        }
    }
    PreEscaped(out)          // safe by construction: no raw '<', '>', or '&' survives
}

// data attribute: escaping is enough
let _ = html! { div data-signals=(serde_json::to_string(&signals)?) { … } };

// script: serialization, then the three-escape pass, then a verbatim splice
let _ = html! { script { (sanitize_json(&serde_json::to_string(&state)?)) } };
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

Three shapes, one per layer. A **page** owns the document and opens with `maud::DOCTYPE`, which is a `PreEscaped<&'static str>` constant — splice it as `(maud::DOCTYPE)` rather than pasting the literal into the template:

```rust
pub fn page(title: &str, body: Markup) -> Markup {
    html! {
        (maud::DOCTYPE)
        html lang="en" {
            head { meta charset="utf-8"; title { (title) } }
            body { (body) }
        }
    }
}
```

A **partial** is a function over one row returning `Markup`, with no doctype and no `<html>`: a patched fragment lands inside a document that already exists, so a second doctype is invalid markup. A **bulk** list implements `Render` for the row type and appends through `render_to` into one buffer, as in *The Single Buffer* — direct `write!` calls per row, never an `html!` fragment or a second `html!` wrapping it.

- Pass pre-rendered children as `Markup` and splice with `(children)`.
- Render the shell once per request and stream only the fragments that change; Maud has no partial-render cache, and a re-rendered shell costs a full template pass.
- Keep the deterministic `id` in the template itself. An id derived from `(row.id)` is stable across morphs; a loop index is not.
