# Contributing to SciPhys OS

SciPhys OS grows through small, reviewable scientific capabilities joined by shared contracts. A useful contribution may be a parser fixture, an evidence review, a Skill improvement, or a full instrument plugin.

## Set up and validate

```bash
corepack enable
pnpm install
pnpm build
pnpm test
python scripts/validate-repository.py
```

## Choose a contribution unit

### Instrument adapter

Implement the smallest pipeline stage needed: sniff, parse, normalize, QC, analyze, or export. Declare capabilities in `registry/plugins/`, preserve useful raw metadata, report ambiguity explicitly, and include fixtures for supported and rejected variants.

### Agent Skill

Keep `SKILL.md` focused on orchestration. Put deterministic transformations and validation in scripts or core tools. State trigger conditions in frontmatter, define outputs and guardrails, and add an eval case. Run the repository validator and the Skills validator before review.

### Evaluation case

Classify it correctly:

- synthetic fixtures test regression and edge cases;
- public real-world cases test transparent scientific performance;
- governed hidden cases test generalization and resist overfitting.

Record task definition, input license, consent/privacy review, expected output, scoring, subgroup/artifact labels, expert annotators, disagreements, and dataset version.

### Schema or shared contract

Open an RFC for changes that affect more than one plugin or repository. Include compatibility, migration, and evaluation plans. Additive experimental fields may land under a pre-1.0 namespace; breaking stable changes require a version increment.

### Recipe

A recipe must declare inputs, immutable versions, commands, expected artifacts, validation steps, and a complete Evidence Bundle. It should run without access to private SciPhys services.

## Scientific contribution checklist

- Raw inputs remain unchanged and are hashed.
- Units, calibration, parameters, software versions, and uncertainty are explicit.
- Results distinguish observations, derived values, interpretations, and hypotheses.
- Central claims link to evidence nodes.
- Alternative explanations and failure modes are documented.
- Test data and references have redistributable licenses and provenance.
- Private sample, operator, lab, project, and path metadata has been removed.
- Automated checks and domain-expert judgments are clearly separated.

## Pull request expectations

- Keep each pull request focused on one capability or contract.
- Add or update tests/evals before claiming better scientific performance.
- Report limitations and incompatible vendor variants.
- Update user-facing docs and migration notes when contracts change.
- Do not describe synthetic self-generated fixtures as an external benchmark.

Maintainers review software quality, contract compatibility, evidence traceability, data rights, and scientific validity separately. A change may pass CI and still need domain review.

## Governance

The acceptance path is documented in [docs/GOVERNANCE.md](docs/GOVERNANCE.md). Use [rfcs/0000-template.md](rfcs/0000-template.md) for cross-cutting changes and [DATA_LICENSES.md](DATA_LICENSES.md) for data requirements.
