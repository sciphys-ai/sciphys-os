export const PLUGIN_PROTOCOL_VERSION = "sciphys.plugin.v0.1" as const

export type PluginKind = "adapter" | "primitive" | "technique" | "skill" | "exporter"
export type PluginStatus = "experimental" | "community-verified" | "stable" | "certified" | "deprecated"
export type PluginRuntimeKind = "node" | "python" | "wasm" | "container" | "external"

export type PluginOperation = {
  id: string
  capability: string
  handler: string
  deterministic: boolean
  inputSchema?: string
  outputSchema?: string
}

export type PluginManifest = {
  protocolVersion: typeof PLUGIN_PROTOCOL_VERSION
  id: string
  version: string
  kind: PluginKind
  status: PluginStatus
  techniques?: string[]
  modalities?: Array<"signal-1d" | "time-series" | "raster-2d" | "volume-3d" | "structure" | "tabular">
  vendors?: string[]
  formats?: string[]
  maintainers: Array<{ name: string; orcid?: string; github?: string }>
  capabilities: string[]
  runtime: { kind: PluginRuntimeKind; entrypoint: string; engine?: string }
  operations: PluginOperation[]
  fixtures?: string[]
  methodReferences?: string[]
  license: string
  dataLicense?: string
}

export type PluginValidationIssue = { path: string; code: string; message: string }
export type PluginValidationReport = { valid: boolean; issues: PluginValidationIssue[] }

const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/
const KINDS = new Set<PluginKind>(["adapter", "primitive", "technique", "skill", "exporter"])
const STATUSES = new Set<PluginStatus>(["experimental", "community-verified", "stable", "certified", "deprecated"])
const RUNTIMES = new Set<PluginRuntimeKind>(["node", "python", "wasm", "container", "external"])

export function validatePluginManifest(value: unknown): PluginValidationReport {
  const issues: PluginValidationIssue[] = []
  const issue = (path: string, code: string, message: string) => issues.push({ path, code, message })
  if (!isRecord(value)) return { valid: false, issues: [{ path: "$", code: "not-object", message: "Plugin manifest must be an object." }] }

  if (value.protocolVersion !== PLUGIN_PROTOCOL_VERSION) issue("protocolVersion", "unsupported-protocol", `Expected ${PLUGIN_PROTOCOL_VERSION}.`)
  if (typeof value.id !== "string" || !ID_PATTERN.test(value.id)) issue("id", "invalid-id", "Plugin id must be lowercase dot/dash notation.")
  if (typeof value.version !== "string" || !VERSION_PATTERN.test(value.version)) issue("version", "invalid-version", "Plugin version must be semantic versioning.")
  if (!KINDS.has(value.kind as PluginKind)) issue("kind", "invalid-kind", "Unknown plugin kind.")
  if (!STATUSES.has(value.status as PluginStatus)) issue("status", "invalid-status", "Unknown plugin maturity status.")
  if (typeof value.license !== "string" || value.license.trim() === "") issue("license", "missing-license", "Plugin license is required.")

  const maintainers = Array.isArray(value.maintainers) ? value.maintainers : []
  if (maintainers.length === 0 || maintainers.some((item) => !isRecord(item) || typeof item.name !== "string" || item.name.trim() === "")) {
    issue("maintainers", "invalid-maintainers", "At least one named maintainer is required.")
  }

  const capabilities = Array.isArray(value.capabilities) ? value.capabilities.filter((item): item is string => typeof item === "string" && item.trim() !== "") : []
  if (capabilities.length === 0) issue("capabilities", "missing-capabilities", "At least one capability is required.")
  if (new Set(capabilities).size !== capabilities.length) issue("capabilities", "duplicate-capability", "Capabilities must be unique.")

  if (!isRecord(value.runtime)) {
    issue("runtime", "missing-runtime", "Runtime declaration is required.")
  } else {
    if (!RUNTIMES.has(value.runtime.kind as PluginRuntimeKind)) issue("runtime.kind", "invalid-runtime", "Unknown runtime kind.")
    if (typeof value.runtime.entrypoint !== "string" || value.runtime.entrypoint.trim() === "") issue("runtime.entrypoint", "missing-entrypoint", "Runtime entrypoint is required.")
  }

  const operations = Array.isArray(value.operations) ? value.operations : []
  if (operations.length === 0) issue("operations", "missing-operations", "At least one operation is required.")
  const operationIds = new Set<string>()
  const coveredCapabilities = new Set<string>()
  for (const [index, operation] of operations.entries()) {
    const path = `operations[${index}]`
    if (!isRecord(operation)) {
      issue(path, "invalid-operation", "Operation must be an object.")
      continue
    }
    if (typeof operation.id !== "string" || !ID_PATTERN.test(operation.id)) issue(`${path}.id`, "invalid-operation-id", "Operation id is invalid.")
    else if (operationIds.has(operation.id)) issue(`${path}.id`, "duplicate-operation", `Duplicate operation id ${operation.id}.`)
    else operationIds.add(operation.id)
    if (typeof operation.capability !== "string" || !capabilities.includes(operation.capability)) {
      issue(`${path}.capability`, "unknown-capability", "Operation capability must be declared by the plugin.")
    } else coveredCapabilities.add(operation.capability)
    if (typeof operation.handler !== "string" || operation.handler.trim() === "") issue(`${path}.handler`, "missing-handler", "Operation handler is required.")
    if (typeof operation.deterministic !== "boolean") issue(`${path}.deterministic`, "missing-determinism", "Operation must declare whether it is deterministic.")
  }
  for (const capability of capabilities) {
    if (!coveredCapabilities.has(capability)) issue("operations", "unimplemented-capability", `No operation implements ${capability}.`)
  }
  return { valid: issues.length === 0, issues }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
