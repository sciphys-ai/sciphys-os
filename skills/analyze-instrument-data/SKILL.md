---
name: analyze-instrument-data
description: Analyze experimental instrument files with traceable evidence, uncertainty, and provenance. Use for XRD, Raman, spectroscopy, microscopy, thermal analysis, electrochemistry, or other instrument data when the user needs parsing, quality checks, quantitative analysis, interpretation, or a reproducible evidence bundle.
---

# Analyze Instrument Data

Build a traceable analysis from raw measurements. Treat the instrument-specific implementation as a plugin; keep the evidence workflow stable across modalities.

## Workflow

1. Inventory every input and preserve the original files unchanged.
2. Identify modality, vendor format, acquisition metadata, units, calibration, and sample context. State unknowns instead of guessing.
3. Hash inputs with `scripts/build_evidence_manifest.py` and start an Evidence Bundle.
4. Select a compatible parser/analyzer from `registry/plugins/`. If none exists, produce a gap report rather than fabricating results.
5. Run quality checks before interpretation: parse completeness, unit consistency, saturation, missing ranges, duplicates, baseline/noise, and modality-specific artifacts.
6. Produce machine-readable results plus a short scientific interpretation. Separate observation, derived result, interpretation, and hypothesis.
7. Link every claim to result or reference nodes and record parameters, software versions, warnings, and alternative explanations.
8. Validate the bundle with `sciphys evidence validate <bundle.json>`.

## Outputs

Return or create:

- an input manifest with SHA-256 hashes;
- normalized data or an explicit unsupported-format report;
- quality-control findings and analysis parameters;
- structured results with units and uncertainty where available;
- an Evidence Bundle connecting inputs, processes, outputs, and claims;
- concise next steps that distinguish required checks from optional follow-up.

Read [references/evidence-policy.md](references/evidence-policy.md) before assigning confidence or making cross-instrument claims.

## Guardrails

- Never infer an instrument setting that materially changes the result.
- Never overwrite raw data.
- Never call a synthetic regression fixture a scientific benchmark.
- Flag reference-database licensing and provenance.
- Require expert review for safety-critical, clinical, regulatory, or publication-final conclusions.
