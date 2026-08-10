#!/usr/bin/env python3
"""Check the minimum SciPhys reproducible figure bundle contract."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    root = args.directory.resolve()

    groups = {
        "rendered figure": ["figure.svg", "figure.pdf", "figure.png", "figure.tif", "figure.tiff"],
        "plotted data": ["data.csv", "data.tsv", "data.json", "data-manifest.json"],
        "generation source": ["generate.py", "generate.R", "generate.ipynb", "generate.ts"],
        "caption": ["caption.md"],
        "metadata": ["figure-metadata.json"],
    }
    missing = [label for label, names in groups.items() if not any((root / name).is_file() for name in names)]
    metadata_path = root / "figure-metadata.json"
    if metadata_path.is_file():
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            for key in ("command", "inputs", "outputs", "software"):
                if key not in metadata:
                    missing.append(f"metadata field: {key}")
        except (OSError, json.JSONDecodeError) as error:
            missing.append(f"valid metadata JSON ({error})")

    if missing:
        print("Figure bundle invalid:")
        for item in missing:
            print(f"- missing {item}")
        return 1
    print(f"Figure bundle valid: {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
