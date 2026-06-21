# sciphys-os

Open-source parsers, benchmarks, and basic XRD tools from
[SciPhys](https://www.sciphys.com).

SciPhys OS is the public core for building reliable instrument-data pipelines in
materials and physics research. The first release focuses on XRD because phase
identification is where raw instrument files, scientific algorithms, reference
patterns, and expert review meet.

## What is included

- Text XRD parser for `.txt`, `.xy`, and `.csv` two-column exports.
- Bruker RAW v3 and v4 parser support.
- Rigaku SmartLab RAW sniffing support.
- PANalytical `.xrdml` parser support.
- Curated starter reference patterns for common phases.
- Peak/reference matching utilities.
- Basic structure-factor pattern generation from CIF-like structure data.
- Basic profile fitting and refinement helpers.
- A deterministic XRD benchmark suite.

The hosted SciPhys product contains private collaboration, AI, storage, and lab
workflow layers. This repository keeps the parser and benchmark layer open so
the scientific community can inspect, test, and improve the foundation.

Note: the `.xrdml` parser uses `DOMParser`. It works directly in browser
contexts. Node callers should provide a DOMParser-compatible XML implementation
before invoking `xrdmlToText`.

## Install

```bash
pnpm install
```

## Build

```bash
pnpm build
```

## Run the XRD benchmark

```bash
pnpm benchmark:xrd
```

The benchmark reports:

- top-1 phase accuracy;
- phase recall;
- strong-peak coverage;
- false-positive rate;
- per-case pass/fail reasons.

## Example

```ts
import { identifyReferencePhases, parseXRD } from "sciphys-os"

const text = "31.77 2400\n34.42 10000\n36.25 5300"
const pattern = parseXRD(text)
const peaks = pattern.points.map((point) => ({
  twoTheta: point.twoTheta,
  dSpacing: 1,
  relativeIntensity: point.intensity,
}))

const matches = identifyReferencePhases(peaks)
console.log(matches[0]?.phase.formula)
```

## Data and privacy

Do not commit private lab raw files unless the lab has explicitly approved
public release. Prefer adding benchmark fixtures as peak lists and expected
phase labels.

## Relationship to SciPhysData

Reviewed datasets exported from SciPhys follow the SciPhysData schema family.
See the main SciPhys repository for the canonical schema document:

- `docs/SCIPHYS_DATA_SCHEMA.md`

## License

Apache-2.0.
