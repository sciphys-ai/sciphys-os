# SciPhys OS

Open scientific data infrastructure for experimental materials and physics.

SciPhys OS is the open core behind [SciPhys.ai](https://www.sciphys.com): parsers,
schemas, benchmarks, and evidence-based analysis primitives for turning raw
instrument files into reproducible scientific results.

The first public release focuses on X-ray diffraction because phase
identification is where raw files, physical models, reference patterns, and
expert review meet.

## Why This Exists

Experimental science still has a missing infrastructure layer:

- instrument files are fragmented across proprietary formats;
- AI tools usually see screenshots or copied text, not raw scientific evidence;
- phase identification and refinement are hard to audit;
- labs need reusable, testable, privacy-aware data pipelines.

SciPhys OS aims to become the open standard layer for this workflow. The hosted
SciPhys product adds private storage, collaboration, AI agents, expert review,
and lab knowledge systems. This repository keeps the scientific foundation open.

## What Is Included

- Text XRD parser for `.txt`, `.xy`, and `.csv` two-column exports.
- Bruker RAW v3 and v4 parser support.
- Rigaku SmartLab RAW sniffing support.
- PANalytical `.xrdml` parser support.
- Curated starter reference patterns for common phases.
- Peak/reference matching utilities.
- Basic structure-factor pattern generation from CIF-like structure data.
- Basic profile fitting and refinement helpers.
- A deterministic XRD benchmark suite.

## Project Direction

This repository is the first public package in the SciPhys open stack.

Planned open modules:

- `sciphys-core`: parser and analysis primitives.
- `sciphys-formats`: open schemas for samples, measurements, instruments,
  analysis results, provenance, and expert feedback.
- `sciphys-bench`: benchmark datasets for XRD, Raman, SEM, AFM, spectroscopy,
  and battery data.
- `sciphys-recipes`: reproducible notebooks for common research workflows.

For now, these pieces live together here so the community can move quickly.

## Runtime Notes

The `.xrdml` parser uses `DOMParser`. It works directly in browser contexts.
Node callers should provide a DOMParser-compatible XML implementation before
invoking `xrdmlToText`.

## Install

```bash
pnpm install
```

## Build

```bash
pnpm build
```

## Run the XRD Benchmark

```bash
pnpm benchmark:xrd
```

The benchmark reports:

- top-1 phase accuracy;
- phase recall;
- strong-peak coverage;
- false-positive rate;
- per-case pass/fail reasons.

## Quick Example

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

## Contribution Tracks

The most valuable contributions right now are:

- new instrument parsers, especially real-world XRD exports;
- anonymized benchmark cases with expected phases and known artifacts;
- reference pattern corrections with source provenance;
- reproducible notebooks for common materials workflows;
- bug reports where a parser or phase match fails on a real file.

Start with [CONTRIBUTING.md](./CONTRIBUTING.md) and [ROADMAP.md](./ROADMAP.md).

## Data and Privacy

Do not commit private lab raw files unless the lab has explicitly approved
public release. Prefer benchmark fixtures that contain peak lists, synthetic
signals, public reference patterns, and expected labels.

If a real file is essential to reproduce a parser bug, remove personal,
institutional, sample, and project identifiers before opening an issue.

## Relationship to SciPhys.ai

SciPhys.ai is the hosted workspace for private experimental data, AI-assisted
analysis, lab collaboration, expert review, and publication-ready outputs.

SciPhys OS is the open scientific foundation: formats, parsers, benchmarks, and
evidence logic that the community can inspect and improve.

## Citation

If SciPhys OS helps your research, cite the repository using the metadata in
[CITATION.cff](./CITATION.cff). A DOI-backed release will be added once the
benchmark suite stabilizes.

## License

Apache-2.0.
