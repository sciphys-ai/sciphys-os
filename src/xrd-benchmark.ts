import {
  BUILTIN_XRD_REFERENCE_PHASES,
  identifyReferencePhases,
  type XRDObservedPeak,
  type XRDReferenceMatch,
  type XRDReferencePhase,
} from "./xrd-reference-library"

export type XRDBenchmarkPhaseInput = {
  id: string
  scale?: number
  shiftDeg?: number
  intensityJitterPct?: number
  includePeaksAbove?: number
  maxPeaks?: number
  onlyHkls?: readonly string[]
}

export type XRDBenchmarkExtraPeak = {
  twoTheta: number
  intensity: number
  label?: string
}

export type XRDBenchmarkCase = {
  id: string
  name: string
  description: string
  materialHint?: string
  phases: readonly XRDBenchmarkPhaseInput[]
  extraPeaks?: readonly XRDBenchmarkExtraPeak[]
  requiredPhaseIds: readonly string[]
  topPhaseId?: string
  allowedPhaseIds?: readonly string[]
  forbiddenPhaseIds?: readonly string[]
  toleranceDeg?: number
  minScore?: number
  minStrongCoverage?: number
}

export type XRDBenchmarkCaseResult = {
  case: XRDBenchmarkCase
  observedPeaks: XRDObservedPeak[]
  matches: XRDReferenceMatch[]
  foundPhaseIds: string[]
  missingPhaseIds: string[]
  unexpectedPhaseIds: string[]
  forbiddenPhaseIds: string[]
  topPhaseHit: boolean
  phaseRecall: number
  strongCoverage: number
  pass: boolean
  failures: string[]
}

export type XRDBenchmarkSummary = {
  pass: boolean
  caseCount: number
  passedCases: number
  top1Accuracy: number
  meanPhaseRecall: number
  meanStrongCoverage: number
  falsePositiveRate: number
  results: XRDBenchmarkCaseResult[]
}

const CU_K_ALPHA_WAVELENGTH_A = 1.5406

export const XRD_BENCHMARK_CASES: readonly XRDBenchmarkCase[] = [
  {
    id: "zno-wurtzite-clean",
    name: "ZnO wurtzite clean powder",
    description: "Canonical ZnO peaks with small zero-shift and intensity jitter.",
    materialHint: "ZnO wurtzite",
    phases: [{ id: "zno-wurtzite", shiftDeg: 0.03, intensityJitterPct: 8, includePeaksAbove: 10 }],
    requiredPhaseIds: ["zno-wurtzite"],
    topPhaseId: "zno-wurtzite",
    minStrongCoverage: 0.82,
  },
  {
    id: "zno-textured-002",
    name: "Textured ZnO thin film",
    description: "A c-axis textured ZnO pattern dominated by (002), similar to lab thin-film scans.",
    materialHint: "ZnO Mn Al doped wurtzite",
    phases: [
      {
        id: "zno-wurtzite",
        shiftDeg: -0.02,
        intensityJitterPct: 12,
        onlyHkls: ["002", "100", "101", "110", "103"],
      },
    ],
    extraPeaks: [{ twoTheta: 30.35, intensity: 4, label: "weak shoulder/background artifact" }],
    requiredPhaseIds: ["zno-wurtzite"],
    topPhaseId: "zno-wurtzite",
    minStrongCoverage: 0.72,
  },
  {
    id: "tio2-anatase-clean",
    name: "TiO2 anatase clean powder",
    description: "Anatase polymorph should not be mislabeled as rutile.",
    materialHint: "TiO2 anatase",
    phases: [{ id: "tio2-anatase", shiftDeg: 0.01, intensityJitterPct: 6, includePeaksAbove: 9 }],
    requiredPhaseIds: ["tio2-anatase"],
    topPhaseId: "tio2-anatase",
    forbiddenPhaseIds: ["tio2-rutile"],
    minStrongCoverage: 0.82,
  },
  {
    id: "tio2-rutile-clean",
    name: "TiO2 rutile clean powder",
    description: "Rutile polymorph should not collapse into anatase when the main 27.45 degree peak is present.",
    materialHint: "TiO2 rutile",
    phases: [{ id: "tio2-rutile", shiftDeg: -0.02, intensityJitterPct: 7, includePeaksAbove: 8 }],
    requiredPhaseIds: ["tio2-rutile"],
    topPhaseId: "tio2-rutile",
    forbiddenPhaseIds: ["tio2-anatase"],
    minStrongCoverage: 0.82,
  },
  {
    id: "anatase-rutile-mixture",
    name: "Mixed anatase / rutile TiO2",
    description: "Two TiO2 polymorphs must both survive the multiphase ranking.",
    materialHint: "TiO2 anatase rutile mixture",
    phases: [
      { id: "tio2-anatase", scale: 0.85, shiftDeg: 0.02, intensityJitterPct: 8, includePeaksAbove: 14 },
      { id: "tio2-rutile", scale: 0.52, shiftDeg: -0.01, intensityJitterPct: 8, includePeaksAbove: 18 },
    ],
    requiredPhaseIds: ["tio2-anatase", "tio2-rutile"],
    topPhaseId: "tio2-anatase",
    minStrongCoverage: 0.78,
  },
  {
    id: "zno-on-si",
    name: "ZnO film on Si substrate",
    description: "Primary ZnO with a strong substrate contribution should keep Si as a secondary phase.",
    materialHint: "ZnO on Si substrate",
    phases: [
      { id: "zno-wurtzite", scale: 0.9, shiftDeg: 0.01, intensityJitterPct: 10, includePeaksAbove: 18 },
      { id: "si-diamond", scale: 0.45, shiftDeg: 0, intensityJitterPct: 5, includePeaksAbove: 20 },
    ],
    requiredPhaseIds: ["zno-wurtzite", "si-diamond"],
    topPhaseId: "zno-wurtzite",
    minStrongCoverage: 0.78,
  },
  {
    id: "hematite-magnetite-mixture",
    name: "Mixed Fe2O3 / Fe3O4",
    description: "Common iron-oxide ambiguity case with overlapping peaks.",
    materialHint: "Fe O iron oxide hematite magnetite",
    phases: [
      { id: "fe2o3-hematite", scale: 0.8, shiftDeg: 0.02, intensityJitterPct: 8, includePeaksAbove: 18 },
      { id: "fe3o4-magnetite", scale: 0.6, shiftDeg: -0.02, intensityJitterPct: 8, includePeaksAbove: 20 },
    ],
    requiredPhaseIds: ["fe2o3-hematite", "fe3o4-magnetite"],
    topPhaseId: "fe2o3-hematite",
    minStrongCoverage: 0.72,
  },
  {
    id: "ceo2-fluorite-clean",
    name: "CeO2 fluorite clean powder",
    description: "Fluorite oxide control case with well-separated principal peaks.",
    materialHint: "CeO2 fluorite",
    phases: [{ id: "ceo2-fluorite", shiftDeg: 0.02, intensityJitterPct: 6, includePeaksAbove: 8 }],
    requiredPhaseIds: ["ceo2-fluorite"],
    topPhaseId: "ceo2-fluorite",
    minStrongCoverage: 0.84,
  },
]

export function runXRDBenchmark(
  cases: readonly XRDBenchmarkCase[] = XRD_BENCHMARK_CASES,
  library: readonly XRDReferencePhase[] = BUILTIN_XRD_REFERENCE_PHASES,
): XRDBenchmarkSummary {
  const results = cases.map((testCase) => evaluateXRDBenchmarkCase(testCase, library))
  const passedCases = results.filter((result) => result.pass).length
  const matchCount = results.reduce((sum, result) => sum + result.matches.length, 0)
  const falsePositiveCount = results.reduce((sum, result) => sum + result.unexpectedPhaseIds.length, 0)
  const top1Accuracy = mean(results.map((result) => (result.topPhaseHit ? 1 : 0)))
  const meanPhaseRecall = mean(results.map((result) => result.phaseRecall))
  const meanStrongCoverage = mean(results.map((result) => result.strongCoverage))
  const falsePositiveRate = matchCount > 0 ? falsePositiveCount / matchCount : 0

  return {
    pass: results.every((result) => result.pass),
    caseCount: results.length,
    passedCases,
    top1Accuracy,
    meanPhaseRecall,
    meanStrongCoverage,
    falsePositiveRate,
    results,
  }
}

export function evaluateXRDBenchmarkCase(
  testCase: XRDBenchmarkCase,
  library: readonly XRDReferencePhase[] = BUILTIN_XRD_REFERENCE_PHASES,
): XRDBenchmarkCaseResult {
  const observedPeaks = buildSyntheticObservedPeaks(testCase, library)
  const matches = identifyReferencePhases(observedPeaks, [...library], {
    toleranceDeg: testCase.toleranceDeg ?? 0.45,
    maxResults: 3,
    minScore: testCase.minScore ?? 30,
    materialHint: testCase.materialHint,
  })
  const foundPhaseIds = matches.map((match) => match.phase.id)
  const required = new Set(testCase.requiredPhaseIds)
  const allowed = new Set([...(testCase.allowedPhaseIds ?? []), ...testCase.requiredPhaseIds])
  const missingPhaseIds = testCase.requiredPhaseIds.filter((id) => !foundPhaseIds.includes(id))
  const unexpectedPhaseIds = foundPhaseIds.filter((id) => !allowed.has(id))
  const forbiddenPhaseIds = (testCase.forbiddenPhaseIds ?? []).filter((id) => foundPhaseIds.includes(id))
  const expectedTop = testCase.topPhaseId ?? testCase.requiredPhaseIds[0]
  const topPhaseHit = foundPhaseIds[0] === expectedTop
  const phaseRecall = required.size > 0 ? (required.size - missingPhaseIds.length) / required.size : 1
  const strongCoverage = calculateStrongPeakCoverage(observedPeaks, matches)
  const failures: string[] = []

  if (!topPhaseHit) {
    failures.push(`top phase expected ${expectedTop}, got ${foundPhaseIds[0] ?? "none"}`)
  }
  if (missingPhaseIds.length > 0) {
    failures.push(`missing required phases: ${missingPhaseIds.join(", ")}`)
  }
  if (forbiddenPhaseIds.length > 0) {
    failures.push(`forbidden phases found: ${forbiddenPhaseIds.join(", ")}`)
  }
  if (unexpectedPhaseIds.length > 0) {
    failures.push(`unexpected phases found: ${unexpectedPhaseIds.join(", ")}`)
  }
  if (strongCoverage < (testCase.minStrongCoverage ?? 0.75)) {
    failures.push(
      `strong peak coverage ${formatPct(strongCoverage)} below ${formatPct(testCase.minStrongCoverage ?? 0.75)}`,
    )
  }

  return {
    case: testCase,
    observedPeaks,
    matches,
    foundPhaseIds,
    missingPhaseIds,
    unexpectedPhaseIds,
    forbiddenPhaseIds,
    topPhaseHit,
    phaseRecall,
    strongCoverage,
    pass: failures.length === 0,
    failures,
  }
}

export function buildSyntheticObservedPeaks(
  testCase: XRDBenchmarkCase,
  library: readonly XRDReferencePhase[] = BUILTIN_XRD_REFERENCE_PHASES,
): XRDObservedPeak[] {
  const byId = new Map(library.map((phase) => [phase.id, phase]))
  const rawPeaks: Array<{ twoTheta: number; intensity: number }> = []

  for (const phaseInput of testCase.phases) {
    const phase = byId.get(phaseInput.id)
    if (!phase) throw new Error(`Unknown XRD benchmark phase: ${phaseInput.id}`)
    const hklSet = phaseInput.onlyHkls ? new Set(phaseInput.onlyHkls) : null
    const selected = phase.peaks
      .filter((peak) => peak.intensity >= (phaseInput.includePeaksAbove ?? 0))
      .filter((peak) => !hklSet || (peak.hkl ? hklSet.has(peak.hkl) : false))
      .slice(0, phaseInput.maxPeaks ?? Number.POSITIVE_INFINITY)
    const scale = phaseInput.scale ?? 1
    const shift = phaseInput.shiftDeg ?? 0
    const jitter = phaseInput.intensityJitterPct ?? 0

    for (const peak of selected) {
      const jitterScale = 1 + deterministicJitter(`${testCase.id}:${phase.id}:${peak.twoTheta}`, jitter)
      rawPeaks.push({
        twoTheta: round(peak.twoTheta + shift, 4),
        intensity: Math.max(0.1, peak.intensity * scale * jitterScale),
      })
    }
  }

  for (const peak of testCase.extraPeaks ?? []) {
    rawPeaks.push({ twoTheta: peak.twoTheta, intensity: peak.intensity })
  }

  const merged = mergeClosePeaks(rawPeaks, 0.14)
  const maxIntensity = Math.max(...merged.map((peak) => peak.intensity), 1)
  return merged
    .map((peak) => ({
      twoTheta: round(peak.twoTheta, 4),
      dSpacing: round(twoThetaToDSpacing(peak.twoTheta), 5),
      relativeIntensity: round((peak.intensity / maxIntensity) * 100, 3),
    }))
    .filter((peak) => peak.relativeIntensity >= 2)
    .sort((a, b) => a.twoTheta - b.twoTheta)
}

function calculateStrongPeakCoverage(
  observedPeaks: readonly XRDObservedPeak[],
  matches: readonly XRDReferenceMatch[],
): number {
  const strong = observedPeaks.filter((peak) => peak.relativeIntensity >= 12)
  if (strong.length === 0) return 1
  const explained = new Set(
    matches.flatMap((match) => match.matchedPeaks.map((peakMatch) => observedPeakKey(peakMatch.observed))),
  )
  const explainedStrong = strong.filter((peak) => explained.has(observedPeakKey(peak))).length
  return explainedStrong / strong.length
}

function mergeClosePeaks(
  peaks: readonly { twoTheta: number; intensity: number }[],
  toleranceDeg: number,
): Array<{ twoTheta: number; intensity: number }> {
  const sorted = [...peaks].sort((a, b) => a.twoTheta - b.twoTheta)
  const merged: Array<{ twoTheta: number; intensity: number }> = []

  for (const peak of sorted) {
    const prev = merged[merged.length - 1]
    if (!prev || Math.abs(prev.twoTheta - peak.twoTheta) > toleranceDeg) {
      merged.push({ ...peak })
      continue
    }
    const total = prev.intensity + peak.intensity
    prev.twoTheta = (prev.twoTheta * prev.intensity + peak.twoTheta * peak.intensity) / total
    prev.intensity = total
  }

  return merged
}

function twoThetaToDSpacing(twoTheta: number): number {
  const thetaRad = (twoTheta / 2) * (Math.PI / 180)
  return CU_K_ALPHA_WAVELENGTH_A / (2 * Math.sin(thetaRad))
}

function deterministicJitter(seed: string, percent: number): number {
  if (percent <= 0) return 0
  const hash = hashText(seed)
  const normalized = (hash % 2001) / 1000 - 1
  return normalized * (percent / 100)
}

function hashText(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function observedPeakKey(peak: XRDObservedPeak): string {
  return peak.twoTheta.toFixed(3)
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`
}
