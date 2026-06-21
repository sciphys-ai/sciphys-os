import { fitPseudoVoigt, pickFitWindow, pseudoVoigt, pseudoVoigtArea } from "./xrd-fit"
import type { XRDData, XRDPeak, XRDPoint } from "./xrd-parser"
import { buildStructureFactorPattern } from "./xrd-structure-factor"
import type { XRDStructureInfo } from "./xrd-reference-library"

export type RefinementPhasePeak = {
  twoTheta: number
  intensity?: number
  hkl?: string
  source?: "reference-peaks" | "structure-factor"
  multiplicity?: number
}

export type RefinementPhaseInput = {
  name: string
  formula?: string
  confidence: number
  refinementDisabled?: boolean
  refinementRole?: "primary" | "impurity"
  matchedPeaks?: number[]
  peakMatches?: Array<{
    observedTwoTheta: number
    referenceTwoTheta: number
    deltaTwoTheta: number
    referenceIntensity: number
    hkl?: string
  }>
  referencePeaks?: RefinementPhasePeak[]
  missingStrongPeaks?: RefinementPhasePeak[]
  unexplainedPeaks?: number[]
  structure?: XRDStructureInfo
}

export type RefinementChartRow = {
  twoTheta: number
  observed: number
  calculated: number
  background: number
  residual: number
}

export type RefinementPeakFit = {
  observedTwoTheta: number
  referenceTwoTheta?: number
  fittedTwoTheta: number
  deltaTwoTheta: number
  intensity: number
  fwhm: number
  eta: number
  area: number
  rSquared: number
  phaseIndex?: number
  phaseName?: string
  hkl?: string
}

export type RefinementBraggTick = {
  twoTheta: number
  referenceTwoTheta: number
  intensity: number
  hkl?: string
  phaseIndex: number
  phaseName: string
}

export type RefinementPhaseWeight = {
  phaseIndex: number
  phaseName: string
  area: number
  percent: number
  scale?: number
  latticeStrainPct?: number
  matchedReflections?: number
  expectedReflections?: number
  rwpWithout?: number
  rwpImprovement?: number
  residualReductionPct?: number
  patternSource?: "reference-peaks" | "structure-factor"
}

export type RefinementPhaseParameter = {
  phaseIndex: number
  phaseName: string
  scale: number
  area: number
  percent: number
  latticeStrainPct: number
  weightedDeltaTwoTheta: number
  matchedReflections: number
  expectedReflections: number
  rwpWithout?: number
  rwpImprovement?: number
  residualReductionPct?: number
  patternSource?: "reference-peaks" | "structure-factor"
}

export type RefinementInstrumentModel = {
  wavelength: number
  eta: number
  fwhmAt30: number
  fwhmAt60: number
  cagliotiU: number
  cagliotiV: number
  cagliotiW: number
  backgroundOrder: number
  backgroundQuantile: number
  backgroundSmoothing: number
  peakWidthScale: number
  zeroShiftMode: RefinementZeroShiftMode
  maxActivePhases: number
}

export type RefinementZeroShiftMode = "refine" | "fixed"

export type RefinementExpertOptions = {
  backgroundQuantile?: number
  backgroundSmoothing?: number
  peakWidthScale?: number
  etaOverride?: number | null
  zeroShiftMode?: RefinementZeroShiftMode
  maxActivePhases?: number
}

export type XRDRefinementPreview = {
  mode: "rietveld-reference" | "profile-preview"
  rows: RefinementChartRow[]
  chartRows: RefinementChartRow[]
  fittedPeaks: RefinementPeakFit[]
  braggTicks: RefinementBraggTick[]
  phaseWeights: RefinementPhaseWeight[]
  phaseParameters: RefinementPhaseParameter[]
  instrument: RefinementInstrumentModel
  metrics: {
    rp: number
    rwp: number
    re: number
    gof: number
    chiLike: number
    zeroShift: number
    fitCoverage: number
    meanAbsDeltaTwoTheta: number
    residualRms: number
    maxAbsResidual: number
    residualBiasPct: number
    residualAutocorrelation: number
    unmatchedPeakCount: number
  }
  checks: {
    unexplainedObserved: number
    missingStrongReference: number
  }
}

type PhaseModel = {
  phase: RefinementPhaseInput
  phaseIndex: number
  phaseName: string
  refs: RefinementPhasePeak[]
  patternSource: "reference-peaks" | "structure-factor"
}

type WidthModel = {
  u: number
  v: number
  w: number
  eta: number
  multiplier: number
}

type ReferenceFitCandidate = {
  rows: RefinementChartRow[]
  fittedPeaks: RefinementPeakFit[]
  braggTicks: RefinementBraggTick[]
  phaseParameters: RefinementPhaseParameter[]
  instrument: RefinementInstrumentModel
  metrics: XRDRefinementPreview["metrics"]
  score: number
}

const CU_KA_WAVELENGTH = 1.5406
const MAX_PROFILE_PEAKS = 16
const MAX_REFERENCE_PEAKS_PER_PHASE = 28
const MAX_CHART_ROWS = 3200
export const DEFAULT_REFINEMENT_OPTIONS: Required<RefinementExpertOptions> = {
  backgroundQuantile: 0.18,
  backgroundSmoothing: 1,
  peakWidthScale: 1,
  etaOverride: null,
  zeroShiftMode: "refine",
  maxActivePhases: 4,
}

function normalizeRefinementOptions(
  options: RefinementExpertOptions,
): Required<RefinementExpertOptions> {
  return {
    backgroundQuantile: clamp(
      options.backgroundQuantile ?? DEFAULT_REFINEMENT_OPTIONS.backgroundQuantile,
      0.08,
      0.34,
    ),
    backgroundSmoothing: clamp(
      options.backgroundSmoothing ?? DEFAULT_REFINEMENT_OPTIONS.backgroundSmoothing,
      0.55,
      2.25,
    ),
    peakWidthScale: clamp(
      options.peakWidthScale ?? DEFAULT_REFINEMENT_OPTIONS.peakWidthScale,
      0.55,
      2.2,
    ),
    etaOverride:
      typeof options.etaOverride === "number"
        ? clamp(options.etaOverride, 0.05, 0.95)
        : null,
    zeroShiftMode: options.zeroShiftMode ?? DEFAULT_REFINEMENT_OPTIONS.zeroShiftMode,
    maxActivePhases: clampInt(
      options.maxActivePhases ?? DEFAULT_REFINEMENT_OPTIONS.maxActivePhases,
      1,
      6,
    ),
  }
}

export function buildRefinementPreview(
  data: XRDData,
  peaks: readonly XRDPeak[],
  phases: readonly RefinementPhaseInput[],
  options: RefinementExpertOptions = {},
): XRDRefinementPreview {
  const settings = normalizeRefinementOptions(options)
  const referencePhases = buildPhaseModels(phases, data, settings)
  if (referencePhases.length > 0) {
    return buildReferenceRefinement(data, peaks, phases, referencePhases, settings)
  }
  return buildProfilePreview(data, peaks, phases, settings)
}

function buildReferenceRefinement(
  data: XRDData,
  peaks: readonly XRDPeak[],
  phases: readonly RefinementPhaseInput[],
  phaseModels: readonly PhaseModel[],
  settings: Required<RefinementExpertOptions>,
): XRDRefinementPreview {
  const points = data.points
  const background = estimateBackground(points, settings)
  const target = points.map((point, i) => Math.max(0, point.intensity - background[i]))
  const lambda = data.metadata?.wavelength ?? CU_KA_WAVELENGTH
  const baseWidth = estimateBaseFwhm(data, peaks)
  const zeroSeed = estimateZeroShift(phases, peaks, data.stepSize, settings.maxActivePhases)
  const zeroCandidates =
    settings.zeroShiftMode === "fixed" ? [0] : buildZeroShiftCandidates(zeroSeed, data.stepSize)
  const widthCandidates = buildWidthCandidates(baseWidth, settings)

  let best: ReferenceFitCandidate | null = null
  for (const zeroShift of zeroCandidates) {
    for (const width of widthCandidates) {
      const candidate = fitReferenceCandidate(
        data,
        peaks,
        phaseModels,
        background,
        target,
        lambda,
        zeroShift,
        width,
        settings,
      )
      if (!best || candidate.score < best.score) best = candidate
    }
  }

  if (!best) return buildProfilePreview(data, peaks, phases, settings)

  return {
    mode: "rietveld-reference",
    rows: best.rows,
    chartRows: thinRows(best.rows, MAX_CHART_ROWS),
    fittedPeaks: best.fittedPeaks,
    braggTicks: best.braggTicks,
    phaseWeights: best.phaseParameters.map((phase) => ({
      phaseIndex: phase.phaseIndex,
      phaseName: phase.phaseName,
      area: phase.area,
      percent: phase.percent,
      scale: phase.scale,
      latticeStrainPct: phase.latticeStrainPct,
      matchedReflections: phase.matchedReflections,
      expectedReflections: phase.expectedReflections,
      rwpWithout: phase.rwpWithout,
      rwpImprovement: phase.rwpImprovement,
      residualReductionPct: phase.residualReductionPct,
      patternSource: phase.patternSource,
    })),
    phaseParameters: best.phaseParameters,
    instrument: best.instrument,
    metrics: best.metrics,
    checks: {
      unexplainedObserved: uniqueCount(phases.flatMap((phase) => phase.unexplainedPeaks ?? [])),
      missingStrongReference: phases.reduce(
        (sum, phase) => sum + (phase.missingStrongPeaks?.length ?? 0),
        0,
      ),
    },
  }
}

function fitReferenceCandidate(
  data: XRDData,
  peaks: readonly XRDPeak[],
  phaseModels: readonly PhaseModel[],
  background: readonly number[],
  target: readonly number[],
  lambda: number,
  zeroShift: number,
  width: WidthModel,
  settings: Required<RefinementExpertOptions>,
): ReferenceFitCandidate {
  const phaseBases: number[][] = []
  const phaseAreas: number[] = []
  const phaseStrains: number[] = []
  const phaseDeltas: number[] = []
  const phaseExpected: number[] = []
  const phaseMatched: number[] = []

  for (const model of phaseModels) {
    const strain = estimatePhaseLatticeStrain(model.phase, model.refs, peaks, lambda, zeroShift)
    const adjusted = model.refs.map((ref) => ({
      ...ref,
      twoTheta: adjustTwoTheta(ref.twoTheta, lambda, strain, zeroShift),
      referenceTwoTheta: ref.twoTheta,
    }))
    phaseStrains.push(strain)
    phaseDeltas.push(estimateWeightedPhaseDelta(model.phase, peaks, adjusted, data.stepSize))
    phaseExpected.push(adjusted.slice(0, 12).length)
    phaseMatched.push(countMatchedReflections(adjusted.slice(0, 12), peaks, data.stepSize, width))
    const basis = buildPhaseBasis(data.points, adjusted, width)
    phaseBases.push(basis)
    phaseAreas.push(sumPositive(basis))
  }

  const scales = solveNonnegativeScales(target, phaseBases)
  const calculatedSignal = combineBases(phaseBases, scales)
  const rows = data.points.map((point, i) => {
    const calculated = background[i] + calculatedSignal[i]
    return {
      twoTheta: point.twoTheta,
      observed: point.intensity,
      calculated,
      background: background[i],
      residual: point.intensity - calculated,
    }
  })
  const fittedPeaks = buildReferencePeakFits(data, peaks, phaseModels, phaseStrains, scales, width, lambda, zeroShift)
  const braggTicks = buildReferenceBraggTicks(data, phaseModels, phaseStrains, lambda, zeroShift)
  const rawAreas = phaseAreas.map((area, i) => area * scales[i])
  const totalArea = rawAreas.reduce((sum, area) => sum + area, 0)
  const parameterCount =
    (settings.zeroShiftMode === "fixed" ? 0 : 1) + phaseModels.length * 2 + 4
  const unmatchedPeakCount = countUnmatchedObservedPeaks(peaks, fittedPeaks, data.stepSize)
  const metrics = calculateMetrics(
    rows,
    parameterCount,
    estimateReferenceCoverage(phaseMatched, phaseExpected),
    zeroShift,
    meanAbsDeltaTwoTheta(fittedPeaks),
    unmatchedPeakCount,
  )
  const currentResidual = weightedResidualSum(rows)
  const phaseImpacts = phaseModels.map((_, phaseIndex) => {
    const signalWithout = calculatedSignal.map((value, pointIndex) => {
      const removed = (scales[phaseIndex] ?? 0) * (phaseBases[phaseIndex]?.[pointIndex] ?? 0)
      return Math.max(0, value - removed)
    })
    const rowsWithout = data.points.map((point, i) => {
      const calculated = background[i] + signalWithout[i]
      return {
        twoTheta: point.twoTheta,
        observed: point.intensity,
        calculated,
        background: background[i],
        residual: point.intensity - calculated,
      }
    })
    const matchedWithout = phaseMatched.map((count, i) => (i === phaseIndex ? 0 : count))
    const expectedWithout = phaseExpected.map((count, i) => (i === phaseIndex ? 0 : count))
    const metricsWithout = calculateMetrics(
      rowsWithout,
      Math.max(1, parameterCount - 2),
      estimateReferenceCoverage(matchedWithout, expectedWithout),
      zeroShift,
    )
    const residualWithout = weightedResidualSum(rowsWithout)
    const residualReductionPct =
      residualWithout > 0
        ? ((residualWithout - currentResidual) / residualWithout) * 100
        : 0

    return {
      rwpWithout: metricsWithout.rwp,
      rwpImprovement: metricsWithout.rwp - metrics.rwp,
      residualReductionPct,
    }
  })
  const phaseParameters: RefinementPhaseParameter[] = phaseModels.map((model, i) => ({
    phaseIndex: model.phaseIndex,
    phaseName: model.phaseName,
    scale: scales[i],
    area: rawAreas[i],
    percent: totalArea > 0 ? (rawAreas[i] / totalArea) * 100 : 0,
    latticeStrainPct: phaseStrains[i] * 100,
    weightedDeltaTwoTheta: phaseDeltas[i],
    matchedReflections: phaseMatched[i],
    expectedReflections: phaseExpected[i],
    rwpWithout: phaseImpacts[i]?.rwpWithout,
    rwpImprovement: phaseImpacts[i]?.rwpImprovement,
    residualReductionPct: phaseImpacts[i]?.residualReductionPct,
    patternSource: model.patternSource,
  }))
  const score = weightedResidualSum(rows) * (1 + missingPeakPenalty(phaseMatched, phaseExpected))

  return {
    rows,
    fittedPeaks,
    braggTicks,
    phaseParameters,
    instrument: {
      wavelength: lambda,
      eta: width.eta,
      fwhmAt30: cagliotiFwhm(30, width),
      fwhmAt60: cagliotiFwhm(60, width),
      cagliotiU: width.u,
      cagliotiV: width.v,
      cagliotiW: width.w,
      backgroundOrder: 6,
      backgroundQuantile: settings.backgroundQuantile,
      backgroundSmoothing: settings.backgroundSmoothing,
      peakWidthScale: width.multiplier,
      zeroShiftMode: settings.zeroShiftMode,
      maxActivePhases: settings.maxActivePhases,
    },
    metrics,
    score,
  }
}

function buildProfilePreview(
  data: XRDData,
  peaks: readonly XRDPeak[],
  phases: readonly RefinementPhaseInput[],
  settings: Required<RefinementExpertOptions>,
): XRDRefinementPreview {
  const points = data.points
  const background = estimateBackground(points, settings)
  const fittedProfiles = fitDetectedPeaks(data, peaks, background)
  const profile = buildProfile(points, fittedProfiles)
  const scale = fitGlobalScale(points, background, profile)
  const fittedPeaks = fittedProfiles
    .map((profileFit) => {
      const params: [number, number, number, number] = [
        profileFit.params[0] * scale,
        profileFit.params[1],
        profileFit.params[2],
        profileFit.params[3],
      ]
      return {
        observedTwoTheta: profileFit.observedTwoTheta,
        fittedTwoTheta: params[1],
        deltaTwoTheta: params[1] - profileFit.observedTwoTheta,
        intensity: params[0],
        fwhm: params[2],
        eta: params[3],
        area: pseudoVoigtArea(params),
        rSquared: profileFit.rSquared,
      }
    })
    .sort((a, b) => a.fittedTwoTheta - b.fittedTwoTheta)

  const rows = points.map((point, i) => {
    const calculated = background[i] + profile[i] * scale
    return {
      twoTheta: point.twoTheta,
      observed: point.intensity,
      calculated,
      background: background[i],
      residual: point.intensity - calculated,
    }
  })

  const zeroShift =
    settings.zeroShiftMode === "fixed" ? 0 : estimateZeroShift(phases, peaks, data.stepSize)
  const braggTicks = buildBraggTicks(phases, data, zeroShift, settings.maxActivePhases)
  const metrics = calculateMetrics(
    rows,
    fittedPeaks.length * 4 + 1,
    peakCoverage(fittedPeaks.length, peaks.length),
    zeroShift,
    meanAbsDeltaTwoTheta(fittedPeaks),
    Math.max(0, peaks.length - fittedPeaks.length),
  )
  const phaseWeights = estimatePhaseWeights(phases, fittedPeaks, settings.maxActivePhases)

  return {
    mode: "profile-preview",
    rows,
    chartRows: thinRows(rows, MAX_CHART_ROWS),
    fittedPeaks,
    braggTicks,
    phaseWeights,
    phaseParameters: phaseWeights.map((weight) => ({
      phaseIndex: weight.phaseIndex,
      phaseName: weight.phaseName,
      scale: weight.area,
      area: weight.area,
      percent: weight.percent,
      latticeStrainPct: 0,
      weightedDeltaTwoTheta: 0,
      matchedReflections: 0,
      expectedReflections: 0,
      rwpWithout: undefined,
      rwpImprovement: undefined,
      residualReductionPct: undefined,
      patternSource: undefined,
    })),
    instrument: {
      wavelength: data.metadata?.wavelength ?? CU_KA_WAVELENGTH,
      eta: median(fittedPeaks.map((fit) => fit.eta)) ?? 0.5,
      fwhmAt30: median(fittedPeaks.map((fit) => fit.fwhm)) ?? estimateBaseFwhm(data, peaks),
      fwhmAt60: median(fittedPeaks.map((fit) => fit.fwhm)) ?? estimateBaseFwhm(data, peaks),
      cagliotiU: 0,
      cagliotiV: 0,
      cagliotiW: Math.pow(estimateBaseFwhm(data, peaks), 2),
      backgroundOrder: 6,
      backgroundQuantile: settings.backgroundQuantile,
      backgroundSmoothing: settings.backgroundSmoothing,
      peakWidthScale: settings.peakWidthScale,
      zeroShiftMode: settings.zeroShiftMode,
      maxActivePhases: settings.maxActivePhases,
    },
    metrics,
    checks: {
      unexplainedObserved: uniqueCount(phases.flatMap((phase) => phase.unexplainedPeaks ?? [])),
      missingStrongReference: phases.reduce(
        (sum, phase) => sum + (phase.missingStrongPeaks?.length ?? 0),
        0,
      ),
    },
  }
}

function buildPhaseModels(
  phases: readonly RefinementPhaseInput[],
  data: XRDData,
  settings: Required<RefinementExpertOptions>,
): PhaseModel[] {
  const wavelength = data.metadata?.wavelength ?? CU_KA_WAVELENGTH
  return phases
    .map((phase, phaseIndex) => ({ phase, phaseIndex }))
    .filter(({ phase }) => !phase.refinementDisabled)
    .slice(0, settings.maxActivePhases)
    .map(({ phase, phaseIndex }) => {
      const structurePeaks = phase.structure
        ? buildStructureFactorPattern(phase.structure, {
            wavelength,
            twoThetaMin: data.twoThetaMin,
            twoThetaMax: data.twoThetaMax,
            maxPeaks: MAX_REFERENCE_PEAKS_PER_PHASE,
          }).map((peak) => ({
            twoTheta: peak.twoTheta,
            intensity: peak.intensity,
            hkl: peak.hkl,
            source: "structure-factor" as const,
            multiplicity: peak.multiplicity,
          }))
        : []
      const referencePeaks = [...(phase.referencePeaks ?? [])].map((peak) => ({
        ...peak,
        source: "reference-peaks" as const,
      }))
      const cifBacked =
        Boolean(phase.structure?.verified) ||
        /cif|cod|amscd|amcsd/i.test(phase.structure?.source ?? "") ||
        referencePeaks.length === 0
      const patternSource: PhaseModel["patternSource"] =
        cifBacked && structurePeaks.length >= 3 ? "structure-factor" : "reference-peaks"
      const refs = (patternSource === "structure-factor" ? structurePeaks : referencePeaks)
        .filter((peak) => Number.isFinite(peak.twoTheta))
        .sort((a, b) => (b.intensity ?? 50) - (a.intensity ?? 50))
        .slice(0, MAX_REFERENCE_PEAKS_PER_PHASE)
      return {
        phase,
        phaseIndex,
        phaseName: phase.formula ?? phase.name,
        refs,
        patternSource,
      }
    })
    .filter((model) => model.refs.length > 0)
}

function estimateBaseFwhm(data: XRDData, peaks: readonly XRDPeak[]): number {
  const measured = peaks
    .map((peak) => peak.fwhm)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
  const med = median(measured)
  if (med) return clamp(med, Math.max(data.stepSize * 3, 0.035), 0.9)
  return clamp(Math.max(data.stepSize * 8, 0.12), 0.06, 0.45)
}

function buildWidthCandidates(
  baseFwhm: number,
  settings: Required<RefinementExpertOptions>,
): WidthModel[] {
  const widthFactors = [0.82, 1.08, 1.42].map((factor) => factor * settings.peakWidthScale)
  const etas =
    typeof settings.etaOverride === "number"
      ? [settings.etaOverride]
      : [0.28, 0.5, 0.72]
  const candidates: WidthModel[] = []
  for (const multiplier of widthFactors) {
    for (const eta of etas) {
      const w = Math.pow(baseFwhm * multiplier, 2)
      const u = Math.pow(baseFwhm * multiplier * 0.42, 2)
      candidates.push({ u, v: 0, w, eta, multiplier })
    }
  }
  return candidates
}

function buildZeroShiftCandidates(seed: number, stepSize: number): number[] {
  const step = clamp(Math.max(stepSize * 2, 0.015), 0.015, 0.05)
  const offsets = [-1, 0, 1].map((n) => n * step)
  const candidates = [seed, 0, ...offsets.map((offset) => seed + offset)]
  return uniqueSorted(candidates.map((value) => clamp(value, -0.35, 0.35)))
}

function buildPhaseBasis(
  points: readonly XRDPoint[],
  peaks: ReadonlyArray<RefinementPhasePeak & { referenceTwoTheta: number }>,
  width: WidthModel,
): number[] {
  const basis = new Array(points.length).fill(0)
  for (const peak of peaks) {
    const rel = clamp((peak.intensity ?? 50) / 100, 0.02, 1.4)
    const fwhm = cagliotiFwhm(peak.twoTheta, width)
    const radius = Math.max(fwhm * 12, 0.22)
    const params: [number, number, number, number] = [rel, peak.twoTheta, fwhm, width.eta]
    const start = lowerBoundPoint(points, peak.twoTheta - radius)
    for (let i = start; i < points.length; i++) {
      const x = points[i].twoTheta
      if (x > peak.twoTheta + radius) break
      basis[i] += pseudoVoigt(x, params)
    }
  }
  return basis
}

function solveNonnegativeScales(target: readonly number[], bases: readonly number[][]): number[] {
  if (bases.length === 0) return []
  if (bases.length === 1) {
    const denom = dot(bases[0], bases[0])
    return [denom > 0 ? Math.max(0, dot(target, bases[0]) / denom) : 0]
  }
  const scales = bases.map((basis) => {
    const denom = dot(basis, basis)
    return denom > 0 ? Math.max(0, dot(target, basis) / denom) : 0
  })
  const current = combineBases(bases, scales)
  const denoms = bases.map((basis) => Math.max(dot(basis, basis), 1e-9))

  for (let iter = 0; iter < 32; iter++) {
    let maxChange = 0
    for (let j = 0; j < bases.length; j++) {
      const basis = bases[j]
      const old = scales[j]
      if (old !== 0) {
        for (let i = 0; i < current.length; i++) current[i] -= old * basis[i]
      }
      let numerator = 0
      for (let i = 0; i < target.length; i++) numerator += basis[i] * (target[i] - current[i])
      const next = Math.max(0, numerator / denoms[j])
      scales[j] = next
      if (next !== 0) {
        for (let i = 0; i < current.length; i++) current[i] += next * basis[i]
      }
      maxChange = Math.max(maxChange, Math.abs(next - old))
    }
    if (maxChange < 1e-4) break
  }
  return scales
}

function combineBases(bases: readonly number[][], scales: readonly number[]): number[] {
  const n = bases[0]?.length ?? 0
  const out = new Array(n).fill(0)
  for (let j = 0; j < bases.length; j++) {
    const basis = bases[j]
    const scale = scales[j] ?? 0
    if (scale === 0) continue
    for (let i = 0; i < n; i++) out[i] += basis[i] * scale
  }
  return out
}

function estimatePhaseLatticeStrain(
  phase: RefinementPhaseInput,
  referencePeaks: readonly RefinementPhasePeak[],
  peaks: readonly XRDPeak[],
  lambda: number,
  zeroShift: number,
): number {
  const estimates: Array<{ value: number; weight: number }> = []
  for (const match of phase.peakMatches ?? []) {
    const obs = twoThetaToD(match.observedTwoTheta - zeroShift, lambda)
    const ref = twoThetaToD(match.referenceTwoTheta, lambda)
    if (!obs || !ref) continue
    estimates.push({
      value: obs / ref - 1,
      weight: Math.max(match.referenceIntensity, 5),
    })
  }

  if (estimates.length === 0) {
    const refs = [...referencePeaks]
      .filter((peak) => Number.isFinite(peak.twoTheta))
      .sort((a, b) => (b.intensity ?? 50) - (a.intensity ?? 50))
      .slice(0, 10)
    for (const refPeak of refs) {
      const observed = nearestPeak(peaks, refPeak.twoTheta + zeroShift, 0.45)
      if (!observed) continue
      const obs = twoThetaToD(observed.twoTheta - zeroShift, lambda)
      const ref = twoThetaToD(refPeak.twoTheta, lambda)
      if (!obs || !ref) continue
      estimates.push({
        value: obs / ref - 1,
        weight: Math.max(refPeak.intensity ?? observed.relativeIntensity, 5),
      })
    }
  }

  if (estimates.length === 0) return 0
  return clamp(weightedAverage(estimates), -0.025, 0.025)
}

function adjustTwoTheta(referenceTwoTheta: number, lambda: number, latticeStrain: number, zeroShift: number): number {
  const dRef = twoThetaToD(referenceTwoTheta, lambda)
  if (!dRef) return referenceTwoTheta + zeroShift
  const d = dRef * (1 + latticeStrain)
  const ratio = lambda / (2 * d)
  if (ratio <= 0 || ratio >= 1) return referenceTwoTheta + zeroShift
  return (2 * Math.asin(ratio) * 180) / Math.PI + zeroShift
}

function twoThetaToD(twoTheta: number, lambda: number): number | null {
  const theta = (twoTheta / 2) * (Math.PI / 180)
  const sinTheta = Math.sin(theta)
  if (sinTheta <= 0) return null
  return lambda / (2 * sinTheta)
}

function cagliotiFwhm(twoTheta: number, model: WidthModel): number {
  const theta = (twoTheta / 2) * (Math.PI / 180)
  const tanTheta = Math.tan(theta)
  const variance = model.u * tanTheta * tanTheta + model.v * tanTheta + model.w
  return clamp(Math.sqrt(Math.max(variance, 1e-6)), 0.035, 1.4)
}

function buildReferencePeakFits(
  data: XRDData,
  peaks: readonly XRDPeak[],
  phaseModels: readonly PhaseModel[],
  strains: readonly number[],
  scales: readonly number[],
  width: WidthModel,
  lambda: number,
  zeroShift: number,
): RefinementPeakFit[] {
  const fits: RefinementPeakFit[] = []
  for (let p = 0; p < phaseModels.length; p++) {
    const model = phaseModels[p]
    const refs = model.refs.slice(0, 14)
    for (const ref of refs) {
      const center = adjustTwoTheta(ref.twoTheta, lambda, strains[p] ?? 0, zeroShift)
      if (center < data.twoThetaMin || center > data.twoThetaMax) continue
      const fwhm = cagliotiFwhm(center, width)
      const observed = nearestPeak(peaks, center, Math.max(0.35, fwhm * 2.5, data.stepSize * 18))
      const observedTheta = observed?.twoTheta ?? center
      const height = Math.max(0, scales[p] ?? 0) * clamp((ref.intensity ?? 50) / 100, 0.02, 1.4)
      const params: [number, number, number, number] = [height, center, fwhm, width.eta]
      const delta = observed ? observed.twoTheta - center : 0
      fits.push({
        observedTwoTheta: observedTheta,
        referenceTwoTheta: ref.twoTheta,
        fittedTwoTheta: center,
        deltaTwoTheta: delta,
        intensity: height,
        fwhm,
        eta: width.eta,
        area: pseudoVoigtArea(params),
        rSquared: observed ? clamp(1 - Math.abs(delta) / Math.max(fwhm * 2.5, 0.1), 0, 1) : 0,
        phaseIndex: model.phaseIndex,
        phaseName: model.phaseName,
        hkl: ref.hkl,
      })
    }
  }
  return fits.sort((a, b) => b.area - a.area)
}

function buildReferenceBraggTicks(
  data: XRDData,
  phaseModels: readonly PhaseModel[],
  strains: readonly number[],
  lambda: number,
  zeroShift: number,
): RefinementBraggTick[] {
  return phaseModels
    .flatMap((model, i) =>
      model.refs.slice(0, 32).map((peak) => ({
        twoTheta: adjustTwoTheta(peak.twoTheta, lambda, strains[i] ?? 0, zeroShift),
        referenceTwoTheta: peak.twoTheta,
        intensity: peak.intensity ?? 50,
        hkl: peak.hkl,
        phaseIndex: model.phaseIndex,
        phaseName: model.phaseName,
      })),
    )
    .filter((tick) => tick.twoTheta >= data.twoThetaMin && tick.twoTheta <= data.twoThetaMax)
    .sort((a, b) => a.twoTheta - b.twoTheta)
}

function estimateWeightedPhaseDelta(
  phase: RefinementPhaseInput,
  peaks: readonly XRDPeak[],
  adjusted: ReadonlyArray<RefinementPhasePeak & { referenceTwoTheta: number }>,
  stepSize: number,
): number {
  const deltas: Array<{ value: number; weight: number }> = []
  for (const match of phase.peakMatches ?? []) {
    deltas.push({
      value: match.deltaTwoTheta,
      weight: Math.max(match.referenceIntensity, 5),
    })
  }
  if (deltas.length === 0) {
    for (const peak of adjusted.slice(0, 10)) {
      const observed = nearestPeak(peaks, peak.twoTheta, Math.max(0.35, stepSize * 18))
      if (!observed) continue
      deltas.push({
        value: observed.twoTheta - peak.twoTheta,
        weight: Math.max(peak.intensity ?? observed.relativeIntensity, 5),
      })
    }
  }
  return deltas.length > 0 ? weightedAverage(deltas) : 0
}

function countMatchedReflections(
  adjusted: ReadonlyArray<RefinementPhasePeak & { referenceTwoTheta: number }>,
  peaks: readonly XRDPeak[],
  stepSize: number,
  width: WidthModel,
): number {
  let count = 0
  for (const peak of adjusted) {
    const fwhm = cagliotiFwhm(peak.twoTheta, width)
    if (nearestPeak(peaks, peak.twoTheta, Math.max(0.28, stepSize * 16, fwhm * 2.2))) count++
  }
  return count
}

function estimateReferenceCoverage(matched: readonly number[], expected: readonly number[]): number {
  const totalExpected = expected.reduce((sum, n) => sum + n, 0)
  if (totalExpected <= 0) return 0
  return matched.reduce((sum, n) => sum + n, 0) / totalExpected
}

function missingPeakPenalty(matched: readonly number[], expected: readonly number[]): number {
  const coverage = estimateReferenceCoverage(matched, expected)
  return Math.max(0, 1 - coverage) * 0.18
}

function fitDetectedPeaks(
  data: XRDData,
  peaks: readonly XRDPeak[],
  background: readonly number[],
): Array<{
  observedTwoTheta: number
  params: [number, number, number, number]
  rSquared: number
}> {
  const minFwhm = Math.max(data.stepSize * 4, 0.08)
  const maxFwhm = Math.max(0.25, (data.twoThetaMax - data.twoThetaMin) / 6)
  const ordered = [...peaks]
    .filter((peak) => Number.isFinite(peak.twoTheta) && Number.isFinite(peak.intensity))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, MAX_PROFILE_PEAKS)

  const fits: Array<{
    observedTwoTheta: number
    params: [number, number, number, number]
    rSquared: number
  }> = []

  for (const peak of ordered) {
    if (fits.some((fit) => Math.abs(fit.params[1] - peak.twoTheta) < minFwhm * 0.75)) continue
    const fwhmGuess = clamp(peak.fwhm ?? Math.max(data.stepSize * 8, 0.18), minFwhm, maxFwhm)
    const win = pickFitWindow(data.points, peak.twoTheta, fwhmGuess, 3)
    if (!win) continue
    const bg = interpolateAt(data.points, background, peak.twoTheta)
    const fit = fitPseudoVoigt(
      win.xs,
      win.ys,
      [Math.max(peak.intensity - bg, peak.intensity * 0.15, 1), peak.twoTheta, fwhmGuess, 0.5],
      { maxIters: 28 },
    )
    if (!fit) continue
    const [height, center, width, eta] = fit.params
    if (fit.rSquared < 0.35) continue
    if (height <= 0 || width < minFwhm * 0.5 || width > maxFwhm) continue
    if (center < data.twoThetaMin || center > data.twoThetaMax) continue
    fits.push({
      observedTwoTheta: peak.twoTheta,
      params: [height, center, width, eta],
      rSquared: fit.rSquared,
    })
  }

  return fits.sort((a, b) => a.params[1] - b.params[1])
}

function buildProfile(
  points: readonly XRDPoint[],
  fits: readonly { params: [number, number, number, number] }[],
): number[] {
  const profile = new Array(points.length).fill(0)
  for (const fit of fits) {
    const [, center, width] = fit.params
    const radius = Math.max(width * 12, 0.25)
    for (let i = 0; i < points.length; i++) {
      const x = points[i].twoTheta
      if (Math.abs(x - center) > radius) continue
      profile[i] += pseudoVoigt(x, fit.params)
    }
  }
  return profile
}

function fitGlobalScale(
  points: readonly XRDPoint[],
  background: readonly number[],
  profile: readonly number[],
): number {
  let numerator = 0
  let denominator = 0
  for (let i = 0; i < points.length; i++) {
    const signal = Math.max(0, points[i].intensity - background[i])
    numerator += signal * profile[i]
    denominator += profile[i] * profile[i]
  }
  if (denominator <= 0) return 1
  return clamp(numerator / denominator, 0.35, 2.25)
}

function estimateBackground(
  points: readonly XRDPoint[],
  settings: Required<RefinementExpertOptions>,
): number[] {
  const n = points.length
  if (n === 0) return []
  const radius = clampInt(Math.round(n * 0.012 * settings.backgroundSmoothing), 8, 120)
  const raw = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - radius)
    const hi = Math.min(n - 1, i + radius)
    const values: number[] = []
    for (let j = lo; j <= hi; j++) values.push(points[j].intensity)
    raw[i] = quantile(values, settings.backgroundQuantile)
  }
  return smooth(
    smooth(raw, clampInt(Math.round(n * 0.004 * settings.backgroundSmoothing), 3, 48)),
    clampInt(Math.round(n * 0.01 * settings.backgroundSmoothing), 4, 80),
  )
}

function calculateMetrics(
  rows: readonly RefinementChartRow[],
  parameterCount: number,
  fitCoverage: number,
  zeroShift: number,
  meanAbsDeltaTwoTheta = 0,
  unmatchedPeakCount = 0,
): XRDRefinementPreview["metrics"] {
  if (rows.length === 0) {
    return {
      rp: 0,
      rwp: 0,
      re: 0,
      gof: 0,
      chiLike: 0,
      zeroShift,
      fitCoverage,
      meanAbsDeltaTwoTheta,
      residualRms: 0,
      maxAbsResidual: 0,
      residualBiasPct: 0,
      residualAutocorrelation: 0,
      unmatchedPeakCount,
    }
  }
  let absResidual = 0
  let absObserved = 0
  let weightedResidualSq = 0
  let weightedObservedSq = 0
  let residualSq = 0
  let residualSum = 0
  let lagNumerator = 0
  let lagDenominator = 0
  let previousResidual: number | null = null
  let maxAbsResidual = 0
  for (const row of rows) {
    const w = 1 / Math.max(Math.abs(row.observed), 1)
    absResidual += Math.abs(row.residual)
    absObserved += Math.abs(row.observed)
    weightedResidualSq += w * row.residual * row.residual
    weightedObservedSq += w * row.observed * row.observed
    residualSq += row.residual * row.residual
    residualSum += row.residual
    lagDenominator += row.residual * row.residual
    if (previousResidual !== null) lagNumerator += previousResidual * row.residual
    previousResidual = row.residual
    maxAbsResidual = Math.max(maxAbsResidual, Math.abs(row.residual))
  }
  const dof = Math.max(1, rows.length - parameterCount)
  const rwp = weightedObservedSq > 0 ? Math.sqrt(weightedResidualSq / weightedObservedSq) * 100 : 0
  const re = weightedObservedSq > 0 ? Math.sqrt(dof / weightedObservedSq) * 100 : 0
  const gof = re > 0 ? rwp / re : 0
  return {
    rp: absObserved > 0 ? (absResidual / absObserved) * 100 : 0,
    rwp,
    re,
    gof,
    chiLike: gof * gof,
    zeroShift,
    fitCoverage,
    meanAbsDeltaTwoTheta,
    residualRms: Math.sqrt(residualSq / rows.length),
    maxAbsResidual,
    residualBiasPct:
      absObserved > 0 ? (residualSum / rows.length / (absObserved / rows.length)) * 100 : 0,
    residualAutocorrelation: lagDenominator > 0 ? lagNumerator / lagDenominator : 0,
    unmatchedPeakCount,
  }
}

function estimateZeroShift(
  phases: readonly RefinementPhaseInput[],
  peaks: readonly XRDPeak[],
  stepSize: number,
  maxActivePhases = DEFAULT_REFINEMENT_OPTIONS.maxActivePhases,
): number {
  const deltas: Array<{ delta: number; weight: number }> = []
  for (const phase of phases.filter((item) => !item.refinementDisabled).slice(0, maxActivePhases)) {
    for (const match of phase.peakMatches ?? []) {
      if (!Number.isFinite(match.deltaTwoTheta)) continue
      deltas.push({
        delta: match.deltaTwoTheta,
        weight: Math.max(match.referenceIntensity, 5),
      })
    }
    if (phase.peakMatches?.length) continue
    const refs = [...(phase.referencePeaks ?? [])]
      .filter((peak) => Number.isFinite(peak.twoTheta))
      .sort((a, b) => (b.intensity ?? 50) - (a.intensity ?? 50))
      .slice(0, 12)
    for (const ref of refs) {
      const observed = nearestPeak(peaks, ref.twoTheta, Math.max(0.35, stepSize * 16))
      if (!observed) continue
      deltas.push({
        delta: observed.twoTheta - ref.twoTheta,
        weight: Math.max(ref.intensity ?? observed.relativeIntensity, 5),
      })
    }
  }
  const total = deltas.reduce((sum, item) => sum + item.weight, 0)
  if (total <= 0) return 0
  return deltas.reduce((sum, item) => sum + item.delta * item.weight, 0) / total
}

function buildBraggTicks(
  phases: readonly RefinementPhaseInput[],
  data: XRDData,
  zeroShift: number,
  maxActivePhases = DEFAULT_REFINEMENT_OPTIONS.maxActivePhases,
): RefinementBraggTick[] {
  return phases
    .map((phase, phaseIndex) => ({ phase, phaseIndex }))
    .filter(({ phase }) => !phase.refinementDisabled)
    .slice(0, maxActivePhases)
    .flatMap(({ phase, phaseIndex }) => {
      const strongest = [...(phase.referencePeaks ?? [])]
        .filter((peak) => Number.isFinite(peak.twoTheta))
        .sort((a, b) => (b.intensity ?? 50) - (a.intensity ?? 50))
        .slice(0, 28)
      return strongest
        .map((peak) => ({
          twoTheta: peak.twoTheta + zeroShift,
          referenceTwoTheta: peak.twoTheta,
          intensity: peak.intensity ?? 50,
          hkl: peak.hkl,
          phaseIndex,
          phaseName: phase.formula ?? phase.name,
        }))
        .filter(
          (tick) =>
            tick.twoTheta >= data.twoThetaMin &&
            tick.twoTheta <= data.twoThetaMax,
        )
    })
    .sort((a, b) => a.twoTheta - b.twoTheta)
}

function estimatePhaseWeights(
  phases: readonly RefinementPhaseInput[],
  fits: readonly RefinementPeakFit[],
  maxActivePhases = DEFAULT_REFINEMENT_OPTIONS.maxActivePhases,
): RefinementPhaseWeight[] {
  const weights = phases
    .map((phase, phaseIndex) => ({ phase, phaseIndex }))
    .filter(({ phase }) => !phase.refinementDisabled)
    .slice(0, maxActivePhases)
    .map(({ phase, phaseIndex }) => {
      const matchedCenters =
        phase.peakMatches?.map((match) => match.observedTwoTheta) ?? phase.matchedPeaks ?? []
      const area = matchedCenters.reduce((sum, center) => {
        const fit = nearestFit(fits, center, 0.45)
        return sum + (fit?.area ?? 0)
      }, 0)
      return {
        phaseIndex,
        phaseName: phase.formula ?? phase.name,
        area,
        percent: 0,
      }
    })
  const total = weights.reduce((sum, item) => sum + item.area, 0)
  if (total <= 0) return []
  return weights
    .filter((item) => item.area > 0)
    .map((item) => ({ ...item, percent: (item.area / total) * 100 }))
}

function meanAbsDeltaTwoTheta(fits: readonly RefinementPeakFit[]): number {
  const usable = fits.filter((fit) => Number.isFinite(fit.deltaTwoTheta))
  if (usable.length === 0) return 0
  return usable.reduce((sum, fit) => sum + Math.abs(fit.deltaTwoTheta), 0) / usable.length
}

function countUnmatchedObservedPeaks(
  peaks: readonly XRDPeak[],
  fits: readonly RefinementPeakFit[],
  stepSize: number,
): number {
  const tolerance = Math.max(0.24, stepSize * 14)
  let count = 0
  for (const peak of peaks) {
    const matched = fits.some(
      (fit) =>
        Math.abs(fit.observedTwoTheta - peak.twoTheta) <= tolerance ||
        Math.abs(fit.fittedTwoTheta - peak.twoTheta) <= tolerance,
    )
    if (!matched) count++
  }
  return count
}

function nearestPeak(
  peaks: readonly XRDPeak[],
  twoTheta: number,
  tolerance: number,
): XRDPeak | null {
  let best: XRDPeak | null = null
  let bestDelta = tolerance
  for (const peak of peaks) {
    const delta = Math.abs(peak.twoTheta - twoTheta)
    if (delta <= bestDelta) {
      best = peak
      bestDelta = delta
    }
  }
  return best
}

function nearestFit(
  fits: readonly RefinementPeakFit[],
  twoTheta: number,
  tolerance: number,
): RefinementPeakFit | null {
  let best: RefinementPeakFit | null = null
  let bestDelta = tolerance
  for (const fit of fits) {
    const delta = Math.abs(fit.observedTwoTheta - twoTheta)
    if (delta <= bestDelta) {
      best = fit
      bestDelta = delta
    }
  }
  return best
}

function interpolateAt(
  points: readonly XRDPoint[],
  values: readonly number[],
  twoTheta: number,
): number {
  if (points.length === 0) return 0
  if (twoTheta <= points[0].twoTheta) return values[0] ?? 0
  const last = points.length - 1
  if (twoTheta >= points[last].twoTheta) return values[last] ?? 0
  let lo = 0
  let hi = last
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (points[mid].twoTheta <= twoTheta) lo = mid
    else hi = mid
  }
  const span = points[hi].twoTheta - points[lo].twoTheta
  if (span <= 0) return values[lo] ?? 0
  const t = (twoTheta - points[lo].twoTheta) / span
  return (values[lo] ?? 0) * (1 - t) + (values[hi] ?? 0) * t
}

function lowerBoundPoint(points: readonly XRDPoint[], twoTheta: number): number {
  let lo = 0
  let hi = points.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (points[mid].twoTheta < twoTheta) lo = mid + 1
    else hi = mid
  }
  return lo
}

function weightedResidualSum(rows: readonly RefinementChartRow[]): number {
  let sum = 0
  for (const row of rows) {
    const w = 1 / Math.max(Math.abs(row.observed), 1)
    sum += w * row.residual * row.residual
  }
  return sum
}

function peakCoverage(fittedCount: number, peakCount: number): number {
  return peakCount > 0 ? fittedCount / peakCount : 0
}

function dot(a: readonly number[], b: readonly number[]): number {
  let sum = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) sum += a[i] * b[i]
  return sum
}

function sumPositive(values: readonly number[]): number {
  let sum = 0
  for (const value of values) if (value > 0) sum += value
  return sum
}

function weightedAverage(values: ReadonlyArray<{ value: number; weight: number }>): number {
  let numerator = 0
  let denominator = 0
  for (const item of values) {
    numerator += item.value * item.weight
    denominator += item.weight
  }
  return denominator > 0 ? numerator / denominator : 0
}

function median(values: readonly number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (clean.length === 0) return null
  const mid = Math.floor(clean.length / 2)
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2
}

function uniqueSorted(values: readonly number[]): number[] {
  return [...new Set(values.map((value) => value.toFixed(5)))]
    .map(Number)
    .sort((a, b) => a - b)
}

function thinRows(rows: readonly RefinementChartRow[], maxRows: number): RefinementChartRow[] {
  if (rows.length <= maxRows) return [...rows]
  const stride = Math.ceil(rows.length / maxRows)
  const thinned: RefinementChartRow[] = []
  for (let i = 0; i < rows.length; i += stride) thinned.push(rows[i])
  const last = rows[rows.length - 1]
  if (thinned[thinned.length - 1] !== last) thinned.push(last)
  return thinned
}

function smooth(values: readonly number[], radius: number): number[] {
  if (radius <= 0) return [...values]
  const out = new Array<number>(values.length)
  for (let i = 0; i < values.length; i++) {
    let sum = 0
    let count = 0
    for (let j = Math.max(0, i - radius); j <= Math.min(values.length - 1, i + radius); j++) {
      sum += values[j]
      count++
    }
    out[i] = count > 0 ? sum / count : values[i]
  }
  return out
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0
  values.sort((a, b) => a - b)
  const idx = clampInt(Math.floor((values.length - 1) * q), 0, values.length - 1)
  return values[idx]
}

function uniqueCount(values: readonly number[]): number {
  return new Set(values.map((value) => value.toFixed(3))).size
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)))
}
