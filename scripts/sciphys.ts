#!/usr/bin/env node

import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, resolve } from "node:path"
import { detectPeaks, parseXRD, twoThetaToDSpacing, type XRDPeak } from "../src/xrd-parser"
import { identifyReferencePhases } from "../src/xrd-reference-library"
import { validateEvidenceBundle, type EvidenceBundle } from "../src/evidence-bundle"
import { validatePluginManifest, type PluginManifest, type PluginValidationIssue } from "../src/plugin-manifest"

function usage(): never {
  console.error("Usage:\n  sciphys xrd inspect <file> [material hint]\n  sciphys evidence validate <bundle.json>\n  sciphys plugin validate <manifest.json>")
  process.exit(2)
}

const [, , group, command, inputPath, ...rest] = process.argv
if (!group || !command || !inputPath) usage()

if (group === "xrd" && command === "inspect") {
  const bytes = readFileSync(inputPath)
  const text = bytes.toString("utf8")
  const data = parseXRD(text)
  const detectedPeaks = detectPeaks(data)
  const sparsePeakList = detectedPeaks.length === 0 && data.points.length > 0 && data.points.length <= 200 && data.stepSize > 0.25
  const peaks: XRDPeak[] = sparsePeakList
    ? data.points
        .filter((point) => point.intensity > data.intensityMin + (data.intensityMax - data.intensityMin) * 0.03)
        .map((point) => ({
          twoTheta: point.twoTheta,
          intensity: point.intensity,
          dSpacing: twoThetaToDSpacing(point.twoTheta, data.metadata?.wavelength),
          relativeIntensity: data.intensityMax === 0 ? 0 : (point.intensity / data.intensityMax) * 100,
        }))
        .sort((a, b) => b.intensity - a.intensity)
    : detectedPeaks
  const matches = identifyReferencePhases(peaks, undefined, { materialHint: rest.join(" ") || undefined })
  console.log(JSON.stringify({
    schemaVersion: "sciphys.xrd-inspection.v0.1",
    source: { filename: basename(inputPath), sha256: createHash("sha256").update(bytes).digest("hex") },
    measurement: {
      points: data.totalPoints,
      twoThetaRange: [data.twoThetaMin, data.twoThetaMax],
      stepSize: data.stepSize,
      inputInterpretation: sparsePeakList ? "sparse-peak-list" : "sampled-pattern",
      metadata: data.metadata,
    },
    peaks,
    candidates: matches.map((match) => ({
      phase: { id: match.phase.id, name: match.phase.name, formula: match.phase.formula, source: match.phase.source },
      score: match.score,
      role: match.phaseRole,
      matchedPeaks: match.matchedPeaks.length,
      missingStrongPeaks: match.missingStrongPeaks,
      unexplainedObservedPeaks: match.unexplainedObservedPeaks,
    })),
    warning: "Candidate evidence requires expert review and independent confirmation before publication.",
  }, null, 2))
} else if (group === "evidence" && command === "validate") {
  const bundle = JSON.parse(readFileSync(inputPath, "utf8")) as EvidenceBundle
  const report = validateEvidenceBundle(bundle)
  console.log(JSON.stringify(report, null, 2))
  if (!report.valid) process.exitCode = 1
} else if (group === "plugin" && command === "validate") {
  const manifest: unknown = JSON.parse(readFileSync(inputPath, "utf8"))
  const report = validatePluginManifest(manifest)
  const runtimeIssues: PluginValidationIssue[] = []
  if (report.valid) {
    const typedManifest = manifest as PluginManifest
    if (typedManifest.runtime.kind === "node") {
      const entrypoint = resolve(dirname(inputPath), typedManifest.runtime.entrypoint)
      if (!existsSync(entrypoint)) {
        runtimeIssues.push({ path: "runtime.entrypoint", code: "entrypoint-not-found", message: `Node entrypoint not found: ${entrypoint}` })
      } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const implementation = require(entrypoint) as Record<string, unknown>
        for (const [index, operation] of typedManifest.operations.entries()) {
          if (typeof implementation[operation.handler] !== "function") {
            runtimeIssues.push({ path: `operations[${index}].handler`, code: "handler-not-found", message: `Export ${operation.handler} was not found in ${entrypoint}.` })
          }
        }
      }
    }
  }
  const result = { valid: report.valid && runtimeIssues.length === 0, issues: [...report.issues, ...runtimeIssues] }
  console.log(JSON.stringify(result, null, 2))
  if (!result.valid) process.exitCode = 1
} else {
  usage()
}
