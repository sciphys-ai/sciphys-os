# Reproducible figure contract

A figure bundle is a directory containing:

- `figure.*`: the rendered figure (`svg`, `pdf`, `png`, or `tif`);
- `data.*`: the exact plotted data or a machine-readable manifest pointing to immutable inputs;
- `generate.*`: script or notebook that regenerates the figure;
- `caption.md`: self-contained caption;
- `figure-metadata.json`: software versions, command, input hashes, output hash, dimensions, and color-space notes.

Minimum review checks:

1. Every panel maps to source data.
2. Axes have quantities and units.
3. Transformations and exclusions are disclosed.
4. Statistical summaries state `n`, aggregation unit, and uncertainty definition.
5. Color remains distinguishable in grayscale or a color-vision-deficiency simulation.
6. Labels remain readable at final print size.
7. The regeneration command succeeds in a clean environment.
