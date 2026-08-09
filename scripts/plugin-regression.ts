import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { validatePluginManifest } from "../src/plugin-manifest"

const validManifest: unknown = JSON.parse(readFileSync("registry/plugins/xrd-core.json", "utf8"))
const validReport = validatePluginManifest(validManifest)
assert.equal(validReport.valid, true, JSON.stringify(validReport.issues))

const invalidReport = validatePluginManifest({
  protocolVersion: "sciphys.plugin.v0.1",
  id: "Invalid Plugin",
  version: "latest",
  kind: "technique",
  status: "stable",
  maintainers: [],
  capabilities: ["parse", "parse", "analyze"],
  runtime: { kind: "node", entrypoint: "" },
  operations: [
    { id: "parse", capability: "parse", handler: "parse", deterministic: true },
    { id: "parse", capability: "undeclared", handler: "", deterministic: "sometimes" },
  ],
  license: "",
})
assert.equal(invalidReport.valid, false)
assert.deepEqual(
  new Set(invalidReport.issues.map((issue) => issue.code)),
  new Set([
    "invalid-id",
    "invalid-version",
    "missing-license",
    "invalid-maintainers",
    "duplicate-capability",
    "missing-entrypoint",
    "duplicate-operation",
    "unknown-capability",
    "missing-handler",
    "missing-determinism",
    "unimplemented-capability",
  ]),
)

console.log("Plugin manifest regression suite: 2/2 passed")
