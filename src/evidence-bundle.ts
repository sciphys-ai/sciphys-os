export const EVIDENCE_BUNDLE_SCHEMA_VERSION = "sciphys.evidence-bundle.v0.1"

export type EvidenceNodeType = "raw-data" | "measurement" | "process" | "result" | "artifact" | "reference"
export type EvidenceRelation = "used" | "generated" | "derived-from" | "supports" | "contradicts" | "supersedes"

export type EvidenceNode = {
  id: string
  type: EvidenceNodeType
  label: string
  contentHash?: string
  uri?: string
  mediaType?: string
  createdAt?: string
  metadata?: Record<string, unknown>
}

export type EvidenceEdge = {
  from: string
  to: string
  relation: EvidenceRelation
  rationale?: string
}

export type ScientificClaim = {
  id: string
  text: string
  kind: "observation" | "derived-result" | "interpretation" | "hypothesis"
  evidenceRefs: string[]
  status?: "draft" | "supported" | "contested" | "rejected"
}

export type ExpertReview = {
  id: string
  targetRef: string
  decision: "accept" | "revise" | "reject"
  reviewer?: string
  rationale?: string
  createdAt?: string
}

export type EvidenceBundle = {
  schemaVersion: typeof EVIDENCE_BUNDLE_SCHEMA_VERSION
  id: string
  createdAt: string
  nodes: EvidenceNode[]
  edges: EvidenceEdge[]
  claims: ScientificClaim[]
  reviews?: ExpertReview[]
}

export type EvidenceValidationIssue = {
  path: string
  code: string
  message: string
}

export type EvidenceValidationReport = {
  valid: boolean
  issues: EvidenceValidationIssue[]
  metrics: {
    nodeCount: number
    claimCount: number
    supportedClaimCount: number
    evidenceCoverage: number
  }
}

export function validateEvidenceBundle(bundle: EvidenceBundle): EvidenceValidationReport {
  const issues: EvidenceValidationIssue[] = []
  if (bundle.schemaVersion !== EVIDENCE_BUNDLE_SCHEMA_VERSION) {
    issues.push({ path: "schemaVersion", code: "unsupported-schema", message: `Expected ${EVIDENCE_BUNDLE_SCHEMA_VERSION}.` })
  }

  const nodeIds = new Set<string>()
  for (const [index, node] of bundle.nodes.entries()) {
    if (!node.id.trim()) issues.push({ path: `nodes[${index}].id`, code: "missing-id", message: "Node id is required." })
    if (nodeIds.has(node.id)) issues.push({ path: `nodes[${index}].id`, code: "duplicate-id", message: `Duplicate node id ${node.id}.` })
    nodeIds.add(node.id)
    if (node.type === "raw-data" && !node.contentHash) {
      issues.push({ path: `nodes[${index}].contentHash`, code: "raw-hash-required", message: "Raw data nodes require a content hash." })
    }
  }

  for (const [index, edge] of bundle.edges.entries()) {
    if (!nodeIds.has(edge.from)) issues.push({ path: `edges[${index}].from`, code: "unknown-node", message: `Unknown node ${edge.from}.` })
    if (!nodeIds.has(edge.to)) issues.push({ path: `edges[${index}].to`, code: "unknown-node", message: `Unknown node ${edge.to}.` })
  }

  const claimIds = new Set<string>()
  let supportedClaimCount = 0
  for (const [index, claim] of bundle.claims.entries()) {
    if (claimIds.has(claim.id)) issues.push({ path: `claims[${index}].id`, code: "duplicate-id", message: `Duplicate claim id ${claim.id}.` })
    claimIds.add(claim.id)
    const knownRefs = claim.evidenceRefs.filter((ref) => nodeIds.has(ref))
    if (claim.evidenceRefs.length === 0) {
      issues.push({ path: `claims[${index}].evidenceRefs`, code: "unsupported-claim", message: "Every scientific claim must reference evidence." })
    }
    for (const ref of claim.evidenceRefs) {
      if (!nodeIds.has(ref)) issues.push({ path: `claims[${index}].evidenceRefs`, code: "unknown-evidence", message: `Unknown evidence node ${ref}.` })
    }
    if (knownRefs.length > 0) supportedClaimCount += 1
  }

  for (const [index, review] of (bundle.reviews ?? []).entries()) {
    if (!nodeIds.has(review.targetRef) && !claimIds.has(review.targetRef)) {
      issues.push({ path: `reviews[${index}].targetRef`, code: "unknown-review-target", message: `Unknown review target ${review.targetRef}.` })
    }
  }

  const claimCount = bundle.claims.length
  return {
    valid: issues.length === 0,
    issues,
    metrics: {
      nodeCount: bundle.nodes.length,
      claimCount,
      supportedClaimCount,
      evidenceCoverage: claimCount === 0 ? 1 : supportedClaimCount / claimCount,
    },
  }
}
