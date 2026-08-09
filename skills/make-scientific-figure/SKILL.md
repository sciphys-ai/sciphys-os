---
name: make-scientific-figure
description: Create or review publication-ready scientific figures whose data, transformations, visual encodings, and captions are reproducible. Use for plots, multi-panel figures, instrument-data visualization, journal graphics, figure regeneration, or figure integrity checks.
---

# Make Scientific Figure

Create a figure as a reproducible research artifact, not an isolated image.

## Workflow

1. Establish the scientific question, intended comparison, audience, and target venue constraints.
2. Link each plotted series or image panel to its source data and record all filtering, normalization, fitting, cropping, and aggregation.
3. Choose encodings that expose the evidence: units on axes, meaningful scales, readable labels, distinguishable colors, uncertainty, sample size, and statistical definition.
4. Generate the figure from a script or notebook with a deterministic command and pinned dependencies.
5. Write a self-contained caption covering sample, measurement, transformation, symbols, uncertainty, statistics, and panel mapping.
6. Export an editable/vector version when appropriate plus a delivery image at the venue's required dimensions.
7. Run `scripts/validate_figure_bundle.py` on the artifact directory.

Read [references/figure-contract.md](references/figure-contract.md) for the required bundle layout and integrity checks.

## Guardrails

- Do not hide inconvenient points without a documented exclusion rule.
- Do not use connecting lines or smooth fits that imply unsupported continuity.
- Do not apply non-linear image adjustments without disclosure.
- Do not encode uncertainty with unexplained error bars.
- Do not claim publication readiness when source data or generation code is missing.
