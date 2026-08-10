# SciPhys OS Architecture

SciPhys OS is the open agent stack for experimental science. It connects raw
instrument files to reproducible analysis, publication artifacts, scientific
claims, and expert review without treating generated prose as scientific
evidence.

## Invariants

1. Raw inputs are immutable and content-addressed.
2. Every transformation records its implementation, version, parameters, inputs, and outputs.
3. Deterministic calculation precedes generative interpretation.
4. Every scientific claim references evidence nodes.
5. Measured data, reference data, derived results, interpretations, and hypotheses remain distinct.
6. Stable plugins and skills include evaluation cases.
7. Private data never becomes public or cross-customer training data without explicit authorization.

## Layers

```text
Researcher interfaces      CLI, Jupyter, MCP, Agent Skills
Workflow skills            analyze, compare, figure, write, audit, reproduce
Technique plugins          XRD, Raman, PL, SEM, AFM, battery, I-V
Scientific primitives      signals, images, time series, structures, statistics
Instrument adapters        vendor files -> canonical measurements
Evidence graph             data, processes, artifacts, claims, reviews
Interoperability specs     SciPhysData, NeXus, NOMAD, HDF5, CIF, tabular formats
Reproducible runtime       Python/uv, TypeScript/Node, containers
```

The layers are contracts, not deployment boundaries. A small local workflow can
run all layers in one process; a lab or enterprise deployment can separate them.

## Evidence Graph

An Evidence Bundle contains nodes, edges, claims, and reviews. Nodes represent
raw data, normalized measurements, processes, results, artifacts, and external
references. Edges record how inputs were used and outputs were generated or
derived. Claims cite node IDs instead of relying on prose-only citations.

The authoritative v0.1 contract lives in `sciphys-formats`. A synchronized
offline mirror lives in `specs/evidence-bundle.schema.json`, and the runtime
validator lives in `src/evidence-bundle.ts`.

## Extension model

Plugins declare their capabilities using `specs/plugin-manifest.schema.json`.
Five plugin kinds are supported:

- `adapter`: detect and parse instrument formats;
- `primitive`: deterministic reusable scientific operations;
- `technique`: domain workflows and scientific constraints;
- `skill`: agent-facing orchestration;
- `exporter`: reproducible figures, tables, reports, and evidence packages.

Adding a plugin must not require changing core code. Stable plugins provide
fixtures, method references, evaluation cases, and an accountable maintainer.

## Repository boundaries

- `sciphys-os`: runtime, plugin contracts, reference implementations, skills, and local evaluation tooling.
- `sciphys-formats`: versioned interoperable schemas and examples.
- `sciphys-bench`: public benchmark specifications, dataset cards, and evaluation protocols.
- `sciphys-recipes`: runnable, evidence-producing research workflows.
- SciPhys.ai: private workspaces, collaboration, managed execution, enterprise governance, and certified support.
