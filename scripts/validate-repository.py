#!/usr/bin/env python3
"""Run dependency-free structural checks for the SciPhys OS repository."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def fail(message: str) -> None:
    ERRORS.append(message)


def load_json(path: Path) -> object | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"{path.relative_to(ROOT)}: invalid JSON: {error}")
        return None


def validate_json_files() -> None:
    ignored = {"node_modules", "dist", ".git"}
    for path in ROOT.rglob("*.json"):
        if ignored.intersection(path.parts):
            continue
        load_json(path)
    for path in ROOT.rglob("*.jsonl"):
        if ignored.intersection(path.parts):
            continue
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            try:
                json.loads(line)
            except json.JSONDecodeError as error:
                fail(f"{path.relative_to(ROOT)}:{line_number}: invalid JSONL: {error}")


def validate_skills() -> None:
    expected = {
        "analyze-instrument-data",
        "make-scientific-figure",
        "write-evidence-grounded-results",
        "audit-scientific-claims",
    }
    found: set[str] = set()
    for path in (ROOT / "skills").glob("*/SKILL.md"):
        text = path.read_text(encoding="utf-8")
        match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
        if not match:
            fail(f"{path.relative_to(ROOT)}: missing YAML frontmatter")
            continue
        fields = {line.split(":", 1)[0].strip(): line.split(":", 1)[1].strip() for line in match.group(1).splitlines() if ":" in line}
        if set(fields) != {"name", "description"}:
            fail(f"{path.relative_to(ROOT)}: frontmatter must contain only name and description")
        if fields.get("name") != path.parent.name:
            fail(f"{path.relative_to(ROOT)}: name must match directory")
        if "TODO" in text or "PLACEHOLDER" in text:
            fail(f"{path.relative_to(ROOT)}: unresolved placeholder")
        found.add(path.parent.name)
    if found != expected:
        fail(f"skills: expected {sorted(expected)}, found {sorted(found)}")


def validate_evidence_example() -> None:
    path = ROOT / "examples" / "evidence-bundle.example.json"
    bundle = load_json(path)
    if not isinstance(bundle, dict):
        return
    if bundle.get("schemaVersion") != "sciphys.evidence-bundle.v0.1":
        fail(f"{path.relative_to(ROOT)}: unsupported schemaVersion")
    nodes = bundle.get("nodes", [])
    claims = bundle.get("claims", [])
    node_ids = {node.get("id") for node in nodes if isinstance(node, dict)}
    for edge in bundle.get("edges", []):
        if edge.get("from") not in node_ids or edge.get("to") not in node_ids:
            fail(f"{path.relative_to(ROOT)}: edge references an unknown node")
    for claim in claims:
        if not claim.get("evidenceRefs") or not set(claim["evidenceRefs"]).issubset(node_ids):
            fail(f"{path.relative_to(ROOT)}: claim {claim.get('id')} has missing or unknown evidence")
    raw = next((node for node in nodes if node.get("id") == "raw:zno.xy"), None)
    source = ROOT / "examples" / "zno.xy"
    if raw and source.is_file():
        actual = hashlib.sha256(source.read_bytes()).hexdigest()
        if raw.get("contentHash") != actual:
            fail(f"{path.relative_to(ROOT)}: zno.xy contentHash does not match source")


def validate_registry() -> None:
    for path in (ROOT / "registry" / "plugins").glob("*.json"):
        plugin = load_json(path)
        if not isinstance(plugin, dict):
            continue
        for field in ("id", "version", "kind", "status", "maintainers", "capabilities", "license"):
            if field not in plugin:
                fail(f"{path.relative_to(ROOT)}: missing {field}")
        if not plugin.get("capabilities"):
            fail(f"{path.relative_to(ROOT)}: capabilities must not be empty")


def main() -> int:
    validate_json_files()
    validate_skills()
    validate_evidence_example()
    validate_registry()
    if ERRORS:
        print("Repository validation failed:")
        for error in ERRORS:
            print(f"- {error}")
        return 1
    print("Repository validation passed: JSON, JSONL, skills, registry, and Evidence Bundle.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
