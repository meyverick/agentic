#!/usr/bin/env python3
"""Offline contract test for funding-gate.py. Run: python3 test_funding_gate.py"""
import importlib.util
import pathlib
import subprocess
import sys
import tempfile

SCRIPT = pathlib.Path(__file__).with_name("funding-gate.py")
spec = importlib.util.spec_from_file_location("funding_gate", SCRIPT)
if spec is None or spec.loader is None:
    raise SystemExit(f"cannot load {SCRIPT}")
funding_gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(funding_gate)

DEPS = [("npm", "x")]


def make_repo(readme="thanks.dev\n", contributing="thanks.dev\n"):
    root = pathlib.Path(tempfile.mkdtemp())
    (root / "package.json").write_text('{"dependencies":{"x":"1.0.0"}}', encoding="utf-8")
    subprocess.run(["git", "init", "-q", str(root)], check=True)
    subprocess.run(["git", "-C", str(root), "remote", "add", "origin", "git@github.com:owner/demo.git"], check=True)
    if readme is not None:
        (root / "README.md").write_text(readme, encoding="utf-8")
    if contributing is not None:
        (root / "CONTRIBUTING.md").write_text(contributing, encoding="utf-8")
    marker = funding_gate.digest(DEPS)
    (root / ".github").mkdir()
    (root / ".github" / "FUNDING.yml").write_text(
        f"# deps-sha256: {marker}\ngithub: [owner]\nthanks_dev: u/gh/owner\ncustom:\n"
        '  - "https://thanks.dev/u/gh/owner"\n  - "https://github.com/sponsors/x"\n',
        encoding="utf-8",
    )
    (root / "DEPENDENCIES.md").write_text(
        f"# Dependencies\n\ndeps-sha256: {marker}\n\n| Ecosystem | Package | Funding |\n"
        "| --- | --- | --- |\n| npm | x | https://github.com/sponsors/x |\n",
        encoding="utf-8",
    )
    return root


def failures(root):
    return funding_gate.validate(root, DEPS)


def test_clean():
    assert failures(make_repo()) == [], failures(make_repo())


def test_dropped_dependency_row():
    root = make_repo()
    (root / "DEPENDENCIES.md").write_text("# Dependencies\n", encoding="utf-8")
    assert any("rows do not match" in p for p in failures(root))


def test_wrong_owner():
    root = make_repo()
    funding = (root / ".github" / "FUNDING.yml").read_text(encoding="utf-8")
    (root / ".github" / "FUNDING.yml").write_text(funding.replace("github: [owner]", "github: [intruder]"), encoding="utf-8")
    assert any("github must be exactly" in p for p in failures(root))


def test_non_https_custom():
    root = make_repo()
    funding = (root / ".github" / "FUNDING.yml").read_text(encoding="utf-8")
    (root / ".github" / "FUNDING.yml").write_text(funding.replace("https://github.com", "http://github.com"), encoding="utf-8")
    assert any("must be https" in p for p in failures(root))


def test_missing_thanksdev_in_readme():
    root = make_repo(readme="# Demo\n")
    assert any("README.md must name the thanks.dev" in p for p in failures(root))


def test_missing_thanksdev_in_contributing():
    root = make_repo(contributing="# Contributing\n")
    assert any("CONTRIBUTING.md must name the thanks.dev" in p for p in failures(root))


def test_check_exit_codes():
    root = make_repo()
    assert subprocess.run([sys.executable, str(SCRIPT), "--check", str(root)], capture_output=True).returncode == 0
    (root / "DEPENDENCIES.md").unlink()
    assert subprocess.run([sys.executable, str(SCRIPT), "--check", str(root)], capture_output=True).returncode == 1
    assert subprocess.run([sys.executable, str(SCRIPT), "--bogus", str(root)], capture_output=True).returncode == 2


if __name__ == "__main__":
    for name, case in sorted({k: v for k, v in globals().items() if k.startswith("test_")}.items()):
        case()
        print(f"ok {name}")
    print("funding-gate: all contract tests passed")
