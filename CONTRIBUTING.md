# Contributing to SciPhys OS

Thank you for helping build open infrastructure for experimental science.

The project is young, so high-quality bug reports, parser fixtures, benchmark
cases, and documentation are as valuable as code.

## Development Setup

```bash
pnpm install
pnpm build
pnpm test
```

## Best First Contributions

- Add a small anonymized XRD file that fails to parse.
- Add a new parser fixture with expected metadata.
- Improve a benchmark case with clearer expected phases.
- Correct a reference peak list and cite the source.
- Add an example notebook or TypeScript snippet.

## Parser Contributions

When adding or improving an instrument parser:

- include at least one anonymized fixture;
- preserve raw metadata when it is scientifically useful;
- return clear error messages for unsupported variants;
- avoid silently guessing instrument settings when the file is ambiguous;
- add tests or benchmark coverage for the format.

Please do not commit private sample names, lab names, operator names, file paths,
project names, or unpublished research details.

## Benchmark Contributions

Benchmark cases should include:

- instrument type and wavelength if known;
- expected primary phase and possible secondary phases;
- known artifacts such as substrate peaks, preferred orientation, broadening,
  fluorescence, or low signal-to-noise;
- a short explanation of why the case is useful.

Public or synthetic data is preferred. Real lab data must be approved by the lab
before release.

## Reference Pattern Contributions

Reference patterns should include provenance:

- database or publication source;
- radiation wavelength assumption;
- peak list and relative intensities;
- notes on polymorph, space group, or common ambiguity.

## Pull Request Checklist

- `pnpm test` passes.
- New behavior is covered by a fixture, benchmark, or focused test.
- README or docs are updated when user-facing behavior changes.
- No private lab data or sensitive metadata is included.

## Community Standard

Be precise, evidence-oriented, and respectful. Scientific disagreement is
welcome; unsupported certainty is not.
