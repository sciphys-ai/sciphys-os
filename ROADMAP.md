# SciPhys OS roadmap

The roadmap prioritizes reusable infrastructure and measured scientific trust over the raw number of Skills or supported file extensions.

## Stage 0 — Contract foundation (now)

- Evidence Bundle v0.1 with claims, provenance, hashes, and expert review.
- Plugin manifest and registry for instrument capabilities.
- Four cross-cutting Skills: analyze, figure, write, audit.
- XRD CLI vertical slice and honest synthetic regression suite.
- Versioned schemas, evaluation policy, governance, and repository validation.

Exit criterion: a new instrument adapter can join without changing the Skill or Evidence Bundle contracts.

## Stage 1 — XRD reference implementation

- Broader vendor/version fixtures and strict format diagnostics.
- Traceable peak detection, matching, fitting, uncertainty, and alternative candidates.
- Licensed real-world benchmark split by phase complexity and acquisition artifact.
- End-to-end ZnO recipe producing normalized data, figure, claim ledger, and Evidence Bundle.

Exit criterion: independent labs can reproduce benchmark scores and inspect every central claim.

## Stage 2 — Second and third modalities

- Raman as the first spectral plugin and electrochemistry as the first time-series plugin.
- Shared spectroscopy/time-series primitives where scientifically justified.
- SEM/AFM metadata and image-artifact contracts before model-heavy interpretation.
- Cross-measurement recipes with explicit sample identity and alignment provenance.

Exit criterion: common orchestration and evidence layers are reused unchanged across at least three modality families.

## Stage 3 — Community evaluation network

- DOI-backed public dataset snapshots and immutable evaluation manifests.
- Governed hidden test sets with transparent stewardship and conflict-of-interest rules.
- Reference baselines, uncertainty-aware scoring, subgroup reports, and reproducibility checks.
- Signed submissions and public result artifacts instead of an opaque leaderboard number.

Exit criterion: outside teams submit plugins and reproduce results without maintainer intervention.

## Stage 4 — Sustainable ecosystem

- Stable v1 contracts with deprecation windows and migration tooling.
- Maintainer ladder, domain working groups, reviewer recognition, and funded data curation.
- Hosted private evaluation, collaboration, compute, and expert review built on portable open artifacts.

Exit criterion: independent maintainers own major modalities and the open protocol remains useful without the hosted product.

## What we will not optimize for

- Inflating Skill count with near-duplicate prompts.
- Claiming instrument support from a single happy-path file.
- Ranking systems on synthetic data presented as real-world validation.
- Hiding provenance, uncertainty, or benchmark methodology for marketing convenience.
