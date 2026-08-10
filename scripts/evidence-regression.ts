import assert from "node:assert/strict"
import { EVIDENCE_BUNDLE_SCHEMA_VERSION, validateEvidenceBundle, type EvidenceBundle } from "../src/evidence-bundle"

const valid: EvidenceBundle = {
  schemaVersion: EVIDENCE_BUNDLE_SCHEMA_VERSION,
  id: "regression:valid",
  createdAt: "2026-08-10T00:00:00Z",
  nodes: [
    { id: "raw:1", type: "raw-data", label: "Raw measurement", contentHash: "a".repeat(64) },
    { id: "result:1", type: "result", label: "Result" },
  ],
  edges: [{ from: "raw:1", to: "result:1", relation: "derived-from" }],
  claims: [{ id: "claim:1", text: "A traceable observation.", kind: "observation", evidenceRefs: ["result:1"] }],
  reviews: [{ id: "review:1", targetRef: "claim:1", decision: "accept" }],
}

const validReport = validateEvidenceBundle(valid)
assert.equal(validReport.valid, true)
assert.equal(validReport.metrics.evidenceCoverage, 1)

const invalid: EvidenceBundle = {
  ...valid,
  id: "regression:invalid",
  nodes: [{ id: "raw:1", type: "raw-data", label: "Unhashed raw measurement" }],
  edges: [{ from: "raw:1", to: "missing:result", relation: "generated" }],
  claims: [{ id: "claim:1", text: "Unsupported claim.", kind: "interpretation", evidenceRefs: [] }],
  reviews: [{ id: "review:1", targetRef: "missing:claim", decision: "accept" }],
}

const invalidReport = validateEvidenceBundle(invalid)
assert.equal(invalidReport.valid, false)
assert.deepEqual(
  new Set(invalidReport.issues.map((issue) => issue.code)),
  new Set(["raw-hash-required", "unknown-node", "unsupported-claim", "unknown-review-target"]),
)

const malformedReport = validateEvidenceBundle({ schemaVersion: EVIDENCE_BUNDLE_SCHEMA_VERSION })
assert.equal(malformedReport.valid, false)
assert.deepEqual(
  new Set(malformedReport.issues.map((issue) => issue.code)),
  new Set(["missing-id", "invalid-date", "invalid-nodes", "invalid-edges", "invalid-claims"]),
)

const scalarReport = validateEvidenceBundle("not a bundle")
assert.equal(scalarReport.valid, false)
assert.equal(scalarReport.issues[0].code, "not-object")

console.log("Evidence Bundle regression suite: 4/4 passed")
