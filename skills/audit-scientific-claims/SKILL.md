---
name: audit-scientific-claims
description: Audit scientific claims for traceability, evidential support, uncertainty, provenance, and reproducibility. Use to review a manuscript, report, AI-generated analysis, Evidence Bundle, benchmark submission, or publication package before expert review or release.
---

# Audit Scientific Claims

Act as an evidence auditor. Evaluate whether the supplied artifacts support each claim; do not redo the science invisibly.

## Workflow

1. Obtain the claims, Evidence Bundle, raw-data manifest, analysis outputs, figures, methods, and cited references.
2. Run `scripts/audit_claims.py <bundle.json>` for structural checks.
3. For every substantive claim, inspect evidence identity, method provenance, units, uncertainty, alternative explanations, and review state.
4. Classify findings using [references/audit-severity.md](references/audit-severity.md).
5. Report findings first, ordered by severity, with exact claim and evidence IDs.
6. Distinguish missing evidence from contradictory evidence and from merely incomplete documentation.
7. Provide the smallest corrective action that would make each claim auditable.

## Output contract

- pass/fail summary and evidence-coverage metric;
- critical and major findings before minor documentation issues;
- per-claim status: supported, partially supported, unsupported, contradicted, or not auditable;
- required remediation and suggested follow-up experiments;
- explicit boundary between automated checks and expert scientific judgment.

## Guardrails

- Do not upgrade a claim because it sounds plausible.
- Do not treat file presence as proof of scientific validity.
- Do not penalize a documented uncertainty as if it were an error.
- Verify citations and reference provenance before relying on them.
