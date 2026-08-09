# Interoperability

SciPhys does not attempt to replace established scientific formats. It provides
an agent-ready evidence layer and import/export contracts around them.

Priority integrations:

- NeXus/HDF5 for raw and processed instrument data;
- NOMAD Metainfo for structured materials-science archives;
- CIF for crystal structures;
- JCAMP-DX and tabular formats for spectroscopy;
- OME-compatible image metadata where relevant;
- RO-Crate or equivalent research-object packaging for portable evidence bundles.

Adapters preserve the original bytes and metadata, emit a normalized
measurement, and record all transformations. Format-specific fields that cannot
yet be normalized remain available under a namespaced raw-metadata object.

Schema alignment should be proven with bidirectional examples and conformance
tests rather than asserted from field-name similarity.
