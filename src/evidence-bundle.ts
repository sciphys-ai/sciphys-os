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

const NODE_TYPES = new Set<EvidenceNodeType>(["raw-data", "measurement", "process", "result", "artifact", "reference"])
const RELATIONS = new Set<EvidenceRelation>(["used", "generated", "derived-from", "supports", "contradicts", "supersedes"])
const CLAIM_KINDS = new Set<ScientificClaim["kind"]>(["observation", "derived-result", "interpretation", "hypothesis"])
const CLAIM_STATUSES = new Set<NonNullable<ScientificClaim["status"]>>(["draft", "supported", "contested", "rejected"])
const REVIEW_DECISIONS = new Set<ExpertReview["decision"]>(["accept", "revise", "reject"])
const SHA256_PATTERN = /^(?:sha256:)?[a-fA-F0-9]{64}$/

export function validateEvidenceBundle(bundle: unknown): EvidenceValidationReport {
  const issues: EvidenceValidationIssue[] = []
  const emptyMetrics = { nodeCount: 0, claimCount: 0, supportedClaimCount: 0, evidenceCoverage: 1 }
  if (!isRecord(bundle)) {
    return { valid: false, issues: [{ path: "$", code: "not-object", message: "Evidence Bundle must be an object." }], metrics: emptyMetrics }
  }
  if (bundle.schemaVersion !== EVIDENCE_BUNDLE_SCHEMA_VERSION) {
    issues.push({ path: "schemaVersion", code: "unsupported-schema", message: `Expected ${EVIDENCE_BUNDLE_SCHEMA_VERSION}.` })
  }
  if (typeof bundle.id !== "string" || bundle.id.trim() === "") {
    issues.push({ path: "id", code: "missing-id", message: "Bundle id is required." })
  }
  if (typeof bundle.createdAt !== "string" || Number.isNaN(Date.parse(bundle.createdAt))) {
    issues.push({ path: "createdAt", code: "invalid-date", message: "createdAt must be an ISO-compatible date-time string." })
  }

  const nodes = Array.isArray(bundle.nodes) ? bundle.nodes : []
  const edges = Array.isArray(bundle.edges) ? bundle.edges : []
  const claims = Array.isArray(bundle.claims) ? bundle.claims : []
  const reviews = bundle.reviews === undefined ? [] : Array.isArray(bundle.reviews) ? bundle.reviews : []
  if (!Array.isArray(bundle.nodes)) issues.push({ path: "nodes", code: "invalid-nodes", message: "nodes must be an array." })
  if (!Array.isArray(bundle.edges)) issues.push({ path: "edges", code: "invalid-edges", message: "edges must be an array." })
  if (!Array.isArray(bundle.claims)) issues.push({ path: "claims", code: "invalid-claims", message: "claims must be an array." })
  if (bundle.reviews !== undefined && !Array.isArray(bundle.reviews)) issues.push({ path: "reviews", code: "invalid-reviews", message: "reviews must be an array." })

  const nodeIds = new Set<string>()
  for (const [index, node] of nodes.entries()) {
    if (!isRecord(node)) {
      issues.push({ path: `nodes[${index}]`, code: "invalid-node", message: "Node must be an object." })
      continue
    }
    const nodeId = typeof node.id === "string" ? node.id : ""
    if (!nodeId.trim()) issues.push({ path: `nodes[${index}].id`, code: "missing-id", message: "Node id is required." })
    else if (nodeIds.has(nodeId)) issues.push({ path: `nodes[${index}].id`, code: "duplicate-id", message: `Duplicate node id ${nodeId}.` })
    else nodeIds.add(nodeId)
    if (!NODE_TYPES.has(node.type as EvidenceNodeType)) issues.push({ path: `nodes[${index}].type`, code: "invalid-node-type", message: "Unknown evidence node type." })
    if (typeof node.label !== "string" || node.label.trim() === "") issues.push({ path: `nodes[${index}].label`, code: "missing-label", message: "Node label is required." })
    if (node.contentHash !== undefined && (typeof node.contentHash !== "string" || !SHA256_PATTERN.test(node.contentHash))) {
      issues.push({ path: `nodes[${index}].contentHash`, code: "invalid-content-hash", message: "contentHash must be a SHA-256 digest." })
    }
    if (node.type === "raw-data" && !node.contentHash) {
      issues.push({ path: `nodes[${index}].contentHash`, code: "raw-hash-required", message: "Raw data nodes require a content hash." })
    }
  }

  for (const [index, edge] of edges.entries()) {
    if (!isRecord(edge)) {
      issues.push({ path: `edges[${index}]`, code: "invalid-edge", message: "Edge must be an object." })
      continue
    }
    if (typeof edge.from !== "string" || !nodeIds.has(edge.from)) issues.push({ path: `edges[${index}].from`, code: "unknown-node", message: `Unknown node ${String(edge.from)}.` })
    if (typeof edge.to !== "string" || !nodeIds.has(edge.to)) issues.push({ path: `edges[${index}].to`, code: "unknown-node", message: `Unknown node ${String(edge.to)}.` })
    if (!RELATIONS.has(edge.relation as EvidenceRelation)) issues.push({ path: `edges[${index}].relation`, code: "invalid-relation", message: "Unknown evidence relation." })
  }

  const claimIds = new Set<string>()
  let supportedClaimCount = 0
  for (const [index, claim] of claims.entries()) {
    if (!isRecord(claim)) {
      issues.push({ path: `claims[${index}]`, code: "invalid-claim", message: "Claim must be an object." })
      continue
    }
    const claimId = typeof claim.id === "string" ? claim.id : ""
    if (!claimId.trim()) issues.push({ path: `claims[${index}].id`, code: "missing-id", message: "Claim id is required." })
    else if (claimIds.has(claimId)) issues.push({ path: `claims[${index}].id`, code: "duplicate-id", message: `Duplicate claim id ${claimId}.` })
    else claimIds.add(claimId)
    if (typeof claim.text !== "string" || claim.text.trim() === "") issues.push({ path: `claims[${index}].text`, code: "missing-claim-text", message: "Claim text is required." })
    if (!CLAIM_KINDS.has(claim.kind as ScientificClaim["kind"])) issues.push({ path: `claims[${index}].kind`, code: "invalid-claim-kind", message: "Unknown claim kind." })
    if (claim.status !== undefined && !CLAIM_STATUSES.has(claim.status as NonNullable<ScientificClaim["status"]>)) issues.push({ path: `claims[${index}].status`, code: "invalid-claim-status", message: "Unknown claim status." })
    const evidenceRefs = Array.isArray(claim.evidenceRefs) ? claim.evidenceRefs : []
    if (!Array.isArray(claim.evidenceRefs)) issues.push({ path: `claims[${index}].evidenceRefs`, code: "invalid-evidence-refs", message: "evidenceRefs must be an array." })
    const stringRefs = evidenceRefs.filter((ref): ref is string => typeof ref === "string")
    if (stringRefs.length !== evidenceRefs.length) issues.push({ path: `claims[${index}].evidenceRefs`, code: "invalid-evidence-ref", message: "Evidence references must be strings." })
    const knownRefs = stringRefs.filter((ref) => nodeIds.has(ref))
    if (evidenceRefs.length === 0) {
      issues.push({ path: `claims[${index}].evidenceRefs`, code: "unsupported-claim", message: "Every scientific claim must reference evidence." })
    }
    for (const ref of stringRefs) {
      if (!nodeIds.has(ref)) issues.push({ path: `claims[${index}].evidenceRefs`, code: "unknown-evidence", message: `Unknown evidence node ${ref}.` })
    }
    if (knownRefs.length > 0) supportedClaimCount += 1
  }

  for (const [index, review] of reviews.entries()) {
    if (!isRecord(review)) {
      issues.push({ path: `reviews[${index}]`, code: "invalid-review", message: "Review must be an object." })
      continue
    }
    if (typeof review.id !== "string" || review.id.trim() === "") issues.push({ path: `reviews[${index}].id`, code: "missing-id", message: "Review id is required." })
    const targetRef = typeof review.targetRef === "string" ? review.targetRef : ""
    if (!nodeIds.has(targetRef) && !claimIds.has(targetRef)) {
      issues.push({ path: `reviews[${index}].targetRef`, code: "unknown-review-target", message: `Unknown review target ${targetRef}.` })
    }
    if (!REVIEW_DECISIONS.has(review.decision as ExpertReview["decision"])) issues.push({ path: `reviews[${index}].decision`, code: "invalid-review-decision", message: "Unknown review decision." })
  }

  const claimCount = claims.length
  return {
    valid: issues.length === 0,
    issues,
    metrics: {
      nodeCount: nodes.length,
      claimCount,
      supportedClaimCount,
      evidenceCoverage: claimCount === 0 ? 1 : supportedClaimCount / claimCount,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
