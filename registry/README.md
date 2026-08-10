# SciPhys Plugin Registry

This directory contains reviewable plugin manifests. It is a source registry,
not yet a hosted package index.

Submit a manifest only when the referenced implementation and fixtures are
publicly resolvable. Each capability must map to a runtime operation, named
handler, and determinism declaration. CI validates structural conformance and
the runtime CLI validates semantic coverage with
`sciphys plugin validate <manifest.json>`. Maturity status follows
`docs/GOVERNANCE.md`.

Runtime entrypoints are resolved relative to the manifest file. For Node
plugins, CLI validation also loads the built entrypoint and verifies that every
declared handler is exported as a function.
