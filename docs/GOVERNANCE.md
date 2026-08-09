# Governance and Maturity

SciPhys OS welcomes contributions from software engineers, instrument users,
data stewards, and scientific domain experts. Code is only one contribution
type; approved fixtures, annotations, method reviews, and evaluation cases are
first-class scientific contributions.

## Maturity levels

- `experimental`: interface and results may change; maintainer evidence only.
- `community-verified`: at least one external fixture or reviewer.
- `stable`: versioned contract, documented limitations, and required evaluations.
- `certified`: maintained compatibility, security review, and declared support policy.
- `deprecated`: replacement and removal timeline are published.

No plugin or skill may be called stable without evaluation evidence.

## Change process

Use an RFC for changes to schemas, evidence relations, plugin contracts,
evaluation metrics, public data policy, or cross-repository boundaries. Small
fixes and new compatible fixtures can use normal pull requests.

Breaking changes require:

1. an accepted RFC;
2. a migration note;
3. a deprecation period when practical;
4. a semantic-version boundary;
5. updated conformance fixtures.

## Maintainer path

Contributors can progress from reporter, fixture contributor, benchmark
annotator, plugin contributor, plugin maintainer, to technique-area maintainer.
Maintainers are selected based on sustained review quality and scientific or
engineering accountability, not commit count alone.

## Data and attribution

Code is Apache-2.0. Every dataset and reference source declares its own license.
Contributors must have authority to share submitted data. Releases credit
scientific annotations and reviews through CITATION metadata and DOI-backed
dataset releases where appropriate.
