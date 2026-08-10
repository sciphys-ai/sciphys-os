#!/usr/bin/env python3
"""Create a deterministic manifest for raw scientific files."""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--id", default="instrument-data-manifest")
    args = parser.parse_args()

    missing = [str(path) for path in args.files if not path.is_file()]
    if missing:
        parser.error("not a file: " + ", ".join(missing))

    nodes = []
    for index, path in enumerate(sorted((p.resolve() for p in args.files), key=str)):
        nodes.append(
            {
                "id": f"raw:{index + 1}",
                "type": "raw-data",
                "label": path.name,
                "contentHash": sha256(path),
                "uri": path.as_uri(),
                "mediaType": mimetypes.guess_type(path.name)[0] or "application/octet-stream",
                "metadata": {"sizeBytes": path.stat().st_size},
            }
        )

    print(json.dumps({"id": args.id, "nodes": nodes}, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
