# Runtime specification mirrors

The authoritative public schemas live in [sciphys-formats](https://github.com/sciphys-ai/sciphys-formats). SciPhys OS ships byte-semantic mirrors so local tools and npm consumers can validate artifacts without network access.

Before a release, maintainers compare each mirror's parsed JSON value with the matching version in `sciphys-formats`. A mirror may not change independently; contract changes start in the formats repository and follow its versioning policy.
