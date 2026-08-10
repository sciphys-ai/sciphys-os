# Evidence policy

## Evidence levels

| Level | Meaning | Minimum requirement |
|---|---|---|
| E0 | Unverified input | File exists, provenance or integrity unknown |
| E1 | Traceable input | SHA-256, acquisition context, parser/version recorded |
| E2 | Reproducible result | E1 plus parameters, deterministic output, QC findings |
| E3 | Corroborated interpretation | E2 plus independent reference or complementary measurement |
| E4 | Reviewed conclusion | E3 plus named expert review and decision rationale |

Use the lowest level satisfied by all supporting evidence. Confidence is not a substitute for evidence level.

## Claim discipline

- Observation: directly visible or measured; cite the exact result node.
- Derived result: calculated from observations; record method and parameters.
- Interpretation: scientifically plausible meaning; include alternatives and assumptions.
- Hypothesis: proposed explanation requiring new evidence; state a discriminating test.

## Missing capability

When a file or modality is unsupported, report the detected format, checks attempted, missing adapter capability, and a minimal contribution path. Do not convert screenshots into quantitative raw data unless the user explicitly accepts that limitation.
