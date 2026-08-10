# Data and reference licensing

Code in this repository is Apache-2.0. That does not automatically license raw measurements, reference databases, publications, images, or third-party instrument files.

Every contributed data asset must include:

- owner or source;
- an explicit license or public-domain statement;
- permission for redistribution and benchmark use;
- provenance and citation information;
- a privacy review for sample, operator, lab, project, and file-path metadata;
- whether transformations are reversible or derived from a restricted source.

Do not commit assets with unclear redistribution rights. A citation alone is not a license. Proprietary reference patterns may be used through user-supplied adapters but must not be copied into the open repository.

Synthetic data must be labeled synthetic and must identify the generator. It may be used for regression and robustness testing, but it must not be presented as an independent real-world benchmark.
