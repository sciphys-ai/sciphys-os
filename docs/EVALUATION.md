# Evaluation System

SciPhys evaluates the complete path from bytes to scientific claims. A green
unit test is necessary but does not prove scientific validity.

## Evaluation levels

| Level | Scope | Examples |
| --- | --- | --- |
| E0 | Static conformance | schemas, manifests, skill frontmatter, licenses |
| E1 | Parser golden tests | point count, units, ranges, metadata, format variants |
| E2 | Scientific primitives | peak error, fitting error, segmentation, uncertainty |
| E3 | Technique benchmarks | phase evidence, Raman assignments, particle size, battery cycles |
| E4 | Skill behavior | correct trigger, tool, parameters, artifacts, failure handling |
| E5 | Workflow completion | raw files to comparison, figure, Results, Methods, and audit |
| E6 | Scientific validity | unsupported-claim rate, evidence coverage, expert acceptance |
| E7 | System robustness | repeated runs, models, operating systems, cost, time, tokens |
| E8 | External validation | independent laboratories, experts, and external benchmarks |

## Dataset partitions

- `examples`: small tutorial artifacts; never use for accuracy claims.
- `synthetic`: deterministic regression fixtures; never label as external benchmarks.
- `public-dev`: labeled cases for contributors and method development.
- `public-test`: versioned reproducible cases with frozen scoring.
- `challenge`: periodically released blind tasks.
- `hidden-holdout`: private labels and edge cases used to detect overfitting.

Public and hidden cases must have dataset cards, provenance, licenses, and
explicit authorization. Real scientific ground truth should be independently
reviewed by two domain experts with adjudication for disagreements.

## Required comparisons

Agent evaluations report:

1. base agent without SciPhys skills;
2. the same agent and model with SciPhys skills;
3. repeated runs with confidence intervals;
4. time, token, and tool-call cost;
5. scientific and artifact-integrity metrics.

The north-star metric is **Verified Workflow Completion Rate**: the fraction of
tasks that are correct, evidence-covered, reproducible, free of unsupported
claims, and accepted by the defined review protocol.

## Current XRD suite

The eight built-in XRD cases are generated from the same curated library used
by the matcher. They are a synthetic regression suite. They protect behavior
while algorithms change but do not measure real-world phase-identification
accuracy. External accuracy claims belong in `sciphys-bench`.
