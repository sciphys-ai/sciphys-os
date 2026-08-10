#!/usr/bin/env python3
"""Audit structural claim-to-evidence coverage in an Evidence Bundle."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    args = parser.parse_args()
    try:
        bundle = json.loads(args.bundle.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"Critical: cannot read valid JSON: {error}")
        return 2

    nodes = {node.get("id") for node in bundle.get("nodes", []) if node.get("id")}
    claims = bundle.get("claims", [])
    findings: list[str] = []
    covered = 0
    for index, claim in enumerate(claims):
        claim_id = claim.get("id") or f"claims[{index}]"
        refs = claim.get("evidenceRefs", [])
        known = [ref for ref in refs if ref in nodes]
        unknown = [ref for ref in refs if ref not in nodes]
        if known:
            covered += 1
        else:
            findings.append(f"Major {claim_id}: no known evidence reference")
        if unknown:
            findings.append(f"Major {claim_id}: unknown evidence {', '.join(unknown)}")
        if claim.get("status") == "supported" and not known:
            findings.append(f"Critical {claim_id}: marked supported without evidence")

    coverage = 1.0 if not claims else covered / len(claims)
    print(f"Claims: {len(claims)}; structurally covered: {covered}; coverage: {coverage:.1%}")
    for finding in findings:
        print(f"- {finding}")
    if not findings:
        print("Structural audit passed. Expert scientific review is still required.")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
