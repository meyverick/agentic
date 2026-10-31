import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const skill = join(import.meta.dir, "..", "skills", "hypermedia-engine-stacks");
const read = (path: string): string => readFileSync(join(skill, path), "utf8");

function implBlock(text: string): string {
  const start = text.indexOf("impl maud::Render");
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf("\n}\n", start);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end + 3);
}

describe("hypermedia content invariants", () => {
  test("the Maud Render example writes directly into the buffer", () => {
    const maud = read("references/maud.md");
    const block = implBlock(maud);
    expect(block).not.toContain("html!");
    expect(block).not.toContain('format!("row-');
    expect(block).toContain("write!");
    expect(block).toContain("maud::Escaper");
    expect(maud).toMatch(/per-row `html!` allocates one `Markup`/);
  });

  test("the syllabus states provenance once", () => {
    const skillMd = read("SKILL.md");
    expect(skillMd.match(/^## Provenance$/gm)?.length).toBe(1);
    expect(skillMd).not.toContain("Provenance lives");
    const refs = skillMd.slice(skillMd.indexOf("## Reference Archives"));
    expect(refs.toLowerCase()).not.toContain("provenance");
    expect(
      refs
        .trim()
        .endsWith(
          "- `references/bevy.md` — read before touching ECS schedules, WASM builds, the canvas mount, or the shell bridge.",
        ),
    ).toBe(true);
    expect(skillMd).toContain("digest mirrors the recorded corpus snapshot");
  });

  test("the stream budget maps LimitReached instead of assuming IntoResponse", () => {
    const rama = read("references/rama.md");
    expect(rama).toContain("Err(LimitReached) =>");
    expect(rama).toContain("with_error_into_response_fn");
    expect(rama).toContain("implements no `IntoResponse`");
    expect(rama).toMatch(/`ConcurrentPolicy` is request concurrency and the corpus answers it `429`/);
    expect(rama).toContain("`Retry-After` is proxy-facing in both lanes");
  });

  test("Extensions isolate by fork and not by clone", () => {
    const rama = read("references/rama.md");
    expect(rama).toContain("A plain clone is **not** a fork");
    expect(rama).toContain("`with_base(&base)`");
    expect(rama).toContain("`get_ref_or_insert(|| ..)`");
    expect(rama).toContain(".overwrite(false)`");
    expect(rama).not.toContain("a parent never sees a child insert");
  });

  test("the CSRF contract names all five allow conditions and the proxy caveat", () => {
    const rama = read("references/rama.md");
    const conditions = [
      "The method is `GET`, `HEAD`, or `OPTIONS`",
      "`Sec-Fetch-Site` is `same-origin` or `none`",
      "`Origin` matches a trusted origin",
      "No usable `Sec-Fetch-Site` and no non-empty `Origin`",
      "matches the request's effective host",
      "`TRACE` and `QUERY` are **not** exempt",
      "with_insecure_bypass",
      "rewrites `Host`",
    ];
    for (const phrase of conditions) expect(rama).toContain(phrase);
  });

  test("routing states its match policy, specificity, and layering", () => {
    const rama = read("references/rama.md");
    expect(rama).toContain("`AsciiInsensitive` + `PercentDecoded`");
    expect(rama).toContain("`PathMatchPolicy::STRICT`");
    expect(rama).toContain("a static segment wins over a capture");
    for (const method of ["with_endpoint_layer", "with_not_found", "with_fallback_match_route", "with_sub_router_make_fn"]) {
      expect(rama).toContain(`\`${method}(..)\``);
    }
  });

  test("the Datastar surface names the local actions and the unkeyed bind", () => {
    const datastar = read("references/datastar.md");
    for (const action of ["`@setAll(", "`@toggleAll(", "`@peek("]) expect(datastar).toContain(action);
    expect(datastar).toContain('`data-bind="name"` — the unkeyed value *is* the signal name');
    expect(datastar).not.toContain("| `data-bind` | `data-bind:name` | — |");
    expect(datastar).toContain("| `data-bind` without a signal name | `data-bind:key`, or the unkeyed value as the name |");
  });

  test("the WSS example binds and consumes its upstream receiver", () => {
    const rama = read("references/rama.md");
    expect(rama).toContain("ws.extensions().get_ref::<AppState>()");
    expect(rama).toContain("let mut upstream = state.events.subscribe();");
    expect(rama).not.toContain("while let Some(msg) = upstream.recv()");
    expect(rama).toContain("RecvError::Lagged");
    expect(rama).toContain("RecvError::Closed");
    expect(rama).toContain("mpsc::channel::<Message>(64)");
    expect(rama).toContain("send_message");
    expect(rama).toContain("recv_message");
    expect(rama).toContain("Message::Close");
    expect(rama).toContain("is_connection_error");
  });
});
