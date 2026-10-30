#!/usr/bin/env python3
"""funding-gate.py -- generate and verify .github/FUNDING.yml + DEPENDENCIES.md from manifests.

  funding-gate.py --write <repo-dir>   regenerate artifacts (network: registry funding lookups)
  funding-gate.py --check <repo-dir>   fail (exit 1) when artifacts drift from manifests (offline)

Every declared dependency appears in both artifacts; parity is proven by a
sha256 over the sorted "ecosystem:name" set, stored as a `deps-sha256:` marker.
`--check` additionally validates FUNDING.yml structure against the documented
schema (allowed keys, `github` owner, `thanks_dev` slug, https-only custom URLs,
no duplicates) and DEPENDENCIES.md row parity with the parsed manifests.
GitHub itself renders at most 4 GitHub Sponsors entries + 4 custom URLs; the
generated FUNDING.yml is the full ledger, and GitHub renders its prefix.
"""
import hashlib
import http.client
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse

UA = {"User-Agent": "funding-gate/1.0 (+https://docs.github.com/sponsors)"}
SPONSORS = "https://github.com/sponsors/{}"
# ponytail: registry lookups only for the ecosystems present; no plugin registry.
CARGO_SECTIONS = ("dependencies", "dev-dependencies", "build-dependencies")
PY_SECTIONS = ("project",)
ALLOWED_KEYS = {"github", "thanks_dev", "custom"}


def fetch_json(url):
    parts = urlparse(url)
    if parts.scheme != "https" or not parts.hostname:
        return {}
    path = parts.path or "/"
    if parts.query:
        path = f"{path}?{parts.query}"
    connection = http.client.HTTPSConnection(parts.hostname, timeout=15)
    try:
        connection.request("GET", path, headers=UA)
        response = connection.getresponse()
        if response.status != 200:
            return {}
        return json.loads(response.read())
    except Exception:
        return {}
    finally:
        connection.close()


def github_owner(*candidates):
    for value in candidates:
        text = value if isinstance(value, str) else (value or {}).get("url", "")
        match = re.search(r"github\.com[/:]([A-Za-z0-9_.-]+)/", text or "")
        if match:
            return match.group(1)
    return ""


def http_status(url, hops=3):
    """Follow up to `hops` redirects; 0 means unreachable."""
    for _ in range(hops):
        parts = urlparse(url)
        if parts.scheme != "https" or not parts.hostname:
            return 0
        path = parts.path or "/"
        if parts.query:
            path = f"{path}?{parts.query}"
        connection = http.client.HTTPSConnection(parts.hostname, timeout=10)
        try:
            connection.request("GET", path, headers=UA)
            response = connection.getresponse()
            status = response.status
            location = response.getheader("Location") or ""
            if status in (301, 302, 303, 307, 308) and location:
                url = location if location.startswith("http") else f"https://{parts.hostname}{location}"
                continue
            return status
        except Exception:
            return 0
        finally:
            connection.close()
    return 0


def repo_owner(repo_dir):
    try:
        remote = subprocess.run(
            ["git", "-C", str(repo_dir), "remote", "get-url", "origin"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
    except Exception:
        return ""
    return github_owner(remote)


def npm_funding(name):
    data = fetch_json(f"https://registry.npmjs.org/{name}/latest")
    funding = data.get("funding")
    urls = []
    if isinstance(funding, str):
        urls = [funding]
    elif isinstance(funding, dict):
        urls = [funding.get("url", "")]
    elif isinstance(funding, list):
        urls = [f if isinstance(f, str) else f.get("url", "") for f in funding]
    urls = [u for u in urls if u]
    if urls:
        return urls
    owner = github_owner(data.get("repository"), data.get("homepage"))
    return [SPONSORS.format(owner)] if owner else []


def crate_funding(name):
    data = fetch_json(f"https://crates.io/api/v1/crates/{name}")
    owner = github_owner((data.get("crate") or {}).get("repository"))
    return [SPONSORS.format(owner)] if owner else []


def pypi_funding(name):
    info = (fetch_json(f"https://pypi.org/pypi/{name}/json").get("info") or {})
    urls = [u for k, u in (info.get("project_urls") or {}).items()
            if re.search(r"fund|sponsor|donat", k, re.I) and u]
    if urls:
        return urls
    owner = github_owner(info.get("home_page"), *(info.get("project_urls") or {}).values())
    return [SPONSORS.format(owner)] if owner else []


def cell(line):
    return line.split("#", 1)[0].strip()


def parse_manifests(repo_dir):
    """Return sorted list of (ecosystem, name) for every declared dependency."""
    found = set()
    for manifest in repo_dir.rglob("package.json"):
        if "node_modules" in manifest.parts:
            continue
        data = json.loads(manifest.read_text(encoding="utf-8") or "{}")
        for key in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
            found.update(("npm", n) for n in (data.get(key) or {}))
    for manifest in repo_dir.rglob("Cargo.toml"):
        if "target" in manifest.parts:
            continue
        section = ""
        for raw in manifest.read_text(encoding="utf-8", errors="replace").splitlines():
            line = cell(raw)
            if line.startswith("["):
                section = line.strip("[]")
                continue
            match = re.match(r"([A-Za-z0-9_-]+)\s*=", line)
            if match and section in CARGO_SECTIONS:
                found.add(("crate", match.group(1)))
    for manifest in repo_dir.rglob("pyproject.toml"):
        text = manifest.read_text(encoding="utf-8", errors="replace")
        for block in re.findall(r"dependencies\s*=\s*\[(.*?)\]", text, re.S):
            for spec in re.findall(r"[\"']([^\"']+)[\"']", block):
                name = re.split(r"[<>=!~\[; ]", spec.strip(), maxsplit=1)[0]
                if name:
                    found.add(("pypi", name.lower()))
    for manifest in repo_dir.rglob("go.mod"):
        for name in re.findall(r"^\s+([\w.\-/]+\.[\w.\-/]+)\s+v", manifest.read_text(encoding="utf-8", errors="replace"), re.M):
            found.add(("go", name))
    return sorted(found)


def resolve(ecosystem, name):
    return {"npm": npm_funding, "crate": crate_funding, "pypi": pypi_funding}.get(ecosystem, lambda _: [])(name)


def digest(deps):
    return hashlib.sha256("\n".join(f"{e}:{n}" for e, n in deps).encode()).hexdigest()


def render(repo_dir, deps):
    owner = repo_owner(repo_dir)
    lines = [
        "# Generated by skills/check/scripts/funding-gate.py --write -- never hand-edit.",
        "# GitHub renders at most 4 GitHub Sponsors entries and 4 custom URLs; this file is the",
        "# full machine-readable dependency-funding ledger, so the tail beyond the render window",
        "# is kept for other consumers (Forgejo, thanks.dev) and for CREDITS.md parity.",
        f"# deps-sha256: {digest(deps)}",
        f"github: [{owner}]" if owner else "github: []",
        f"thanks_dev: u/gh/{owner}" if owner else "# thanks_dev: u/gh/<owner>",
        "custom:",
        f"  - \"https://thanks.dev/u/gh/{owner}\"" if owner else "  - \"https://thanks.dev\"",
    ]
    credits = ["# Dependencies", "",
               "Every dependency this repository declares, with its upstream funding link.",
               f"Support the whole tree at once via [thanks.dev](https://thanks.dev/u/gh/{owner}).",
               "", f"deps-sha256: {digest(deps)}", "",
               "| Ecosystem | Package | Funding |", "| --- | --- | --- |"]
    for ecosystem, name in deps:
        urls = resolve(ecosystem, name)
        link = urls[0] if urls else "no public funding link"
        for url in urls:
            lines.append(f"  - \"{url}\"")
        credits.append(f"| {ecosystem} | {name} | {link} |")
    return "\n".join(lines) + "\n", "\n".join(credits) + "\n"


def parse_funding(text):
    """Strict parse of the generated FUNDING.yml contract -> (values, custom urls, problems)."""
    values, urls, problems, section = {}, [], [], ""
    for number, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        header = re.match(r"^([A-Za-z0-9_]+)\s*:\s*(.*)$", line)
        if header and not raw.startswith((" ", "\t")):
            key, value = header.group(1), header.group(2).strip()
            section = key
            values[key] = value
            if key not in ALLOWED_KEYS:
                problems.append(f"line {number}: unsupported key '{key}'")
            if key == "custom" and value:
                problems.append(f"line {number}: 'custom' must be a block list, not '{value}'")
            continue
        if section == "custom" and line.startswith("- "):
            urls.append(line[2:].strip().strip("'\""))
            continue
        problems.append(f"line {number}: unexpected content '{line}'")
    return values, urls, problems


def dependency_rows(text):
    rows = []
    for line in text.splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 3 and cells[0] not in ("Ecosystem",) and set(cells[0]) != {"-"}:
            rows.append((cells[0], cells[1], cells[2]))
    return rows


def validate(repo_dir, deps):
    problems = []
    owner = repo_owner(repo_dir)
    funding = (repo_dir / ".github" / "FUNDING.yml").read_text(encoding="utf-8")
    values, urls, problems = parse_funding(funding)
    problems = list(problems)
    if owner:
        declared = values.get("github", "").strip("[] ").split(",")
        if [name.strip() for name in declared if name.strip()] != [owner]:
            problems.append(f"github must be exactly [{owner}], found {values.get('github')!r}")
        if values.get("thanks_dev") != f"u/gh/{owner}":
            problems.append(f"thanks_dev must be u/gh/{owner}, found {values.get('thanks_dev')!r}")
    elif values.get("github", "[]") != "[]":
        problems.append("github must be empty when the repository owner cannot be resolved")
    if not urls:
        problems.append("custom must list at least the thanks.dev support link")
    bad_scheme = [url for url in urls if urlparse(url).scheme != "https"]
    if bad_scheme:
        problems.append(f"custom URLs must be https: {bad_scheme[:3]}")
    duplicates = sorted({url for url in urls if urls.count(url) > 1})
    if duplicates:
        problems.append(f"duplicate custom URLs: {duplicates[:3]}")
    rows = dependency_rows((repo_dir / "DEPENDENCIES.md").read_text(encoding="utf-8"))
    listed = {(ecosystem, name) for ecosystem, name, _ in rows}
    if listed != set(deps):
        missing = sorted(set(deps) - listed)[:5]
        extra = sorted(listed - set(deps))[:5]
        problems.append(f"DEPENDENCIES.md rows do not match manifests (missing={missing}, extra={extra})")
    linked = sum(1 for _, _, link in rows if link.startswith("http")) + 1
    if owner and len(urls) != linked:
        problems.append(f"custom has {len(urls)} URLs but DEPENDENCIES.md implies {linked}")
    readme = repo_dir / "README.md"
    if readme.exists() and "thanks.dev" not in readme.read_text(encoding="utf-8"):
        problems.append("README.md must name the thanks.dev support link")
    contributing = repo_dir / "CONTRIBUTING.md"
    if contributing.exists() and "thanks.dev" not in contributing.read_text(encoding="utf-8"):
        problems.append("CONTRIBUTING.md must name the thanks.dev support link")
    elif not contributing.exists():
        print("funding-gate: WARN CONTRIBUTING.md absent (account-level default expected)", file=sys.stderr)
    return problems


def verify_links(repo_dir):
    """Network lane: every entry must resolve. 404/410/5xx/unreachable fail; anti-bot walls warn."""
    values, urls, problems = parse_funding((repo_dir / ".github" / "FUNDING.yml").read_text(encoding="utf-8"))
    owner = repo_owner(repo_dir)
    targets = [(url, url) for url in urls]
    if owner:
        targets.append((f"github:{owner}", f"https://github.com/{owner}"))
        targets.append((f"thanks_dev:u/gh/{owner}", f"https://thanks.dev/u/gh/{owner}"))
    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = list(pool.map(lambda target: (target[0], http_status(target[1])), targets))
    for label, status in statuses:
        if status == 0 or status in (404, 410) or status >= 500:
            problems.append(f"{label}: does not resolve (status {status or 'unreachable'})")
        elif status in (401, 403, 429):
            print(f"funding-gate: WARN {label}: unverified (status {status}, anti-bot wall)", file=sys.stderr)
    return problems


def main():
    args = sys.argv[1:]
    flags = [a for a in args if a.startswith("--")]
    rest = [a for a in args if not a.startswith("--")]
    if len(rest) != 1 or not flags or flags[0] not in ("--write", "--check"):
        print("usage: funding-gate.py --write|--check [--verify-links] <repo-dir>", file=sys.stderr)
        return 2
    mode, repo_dir = flags[0], Path(rest[0])
    unknown = set(flags[1:]) - {"--verify-links"}
    if unknown or len(flags) > 2:
        print(f"usage: unknown flags {sorted(unknown)}", file=sys.stderr)
        return 2
    verify = "--verify-links" in flags
    deps = parse_manifests(repo_dir)
    if mode == "--write":
        funding, credits = render(repo_dir, deps)
        (repo_dir / ".github").mkdir(parents=True, exist_ok=True)
        (repo_dir / ".github" / "FUNDING.yml").write_text(funding, encoding="utf-8")
        (repo_dir / "DEPENDENCIES.md").write_text(credits, encoding="utf-8")
        print(f"funding-gate: wrote {len(deps)} dependencies")
        return 0
    marker = f"deps-sha256: {digest(deps)}"
    problems = []
    for rel in (Path(".github") / "FUNDING.yml", Path("DEPENDENCIES.md")):
        path = repo_dir / rel
        if not path.exists():
            problems.append(f"{rel}: missing (run funding-gate.py --write)")
        elif marker not in path.read_text(encoding="utf-8"):
            problems.append(f"{rel}: stale, manifests changed (run funding-gate.py --write)")
    if not problems:
        problems = validate(repo_dir, deps)
    if not problems and verify:
        problems = verify_links(repo_dir)
    for problem in problems:
        print(f"funding-gate: FAIL {problem}", file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
