import type { XRDStructureInfo, XRDStructureSite } from "./xrd-reference-library"

export type StructureFactorPeak = {
  twoTheta: number
  dSpacing: number
  intensity: number
  hkl: string
  multiplicity: number
  fSquared: number
}

type BuildPatternOptions = {
  wavelength: number
  twoThetaMin: number
  twoThetaMax: number
  maxPeaks?: number
  mergeToleranceDeg?: number
}

type Vec3 = [number, number, number]

const DEFAULT_MAX_PEAKS = 48
const DEFAULT_MERGE_TOLERANCE = 0.08

const ATOMIC_NUMBERS: Record<string, number> = {
  H: 1,
  Li: 3,
  Be: 4,
  B: 5,
  C: 6,
  N: 7,
  O: 8,
  F: 9,
  Na: 11,
  Mg: 12,
  Al: 13,
  Si: 14,
  P: 15,
  S: 16,
  Cl: 17,
  K: 19,
  Ca: 20,
  Ti: 22,
  V: 23,
  Cr: 24,
  Mn: 25,
  Fe: 26,
  Co: 27,
  Ni: 28,
  Cu: 29,
  Zn: 30,
  Ga: 31,
  Ge: 32,
  As: 33,
  Se: 34,
  Br: 35,
  Sr: 38,
  Y: 39,
  Zr: 40,
  Nb: 41,
  Mo: 42,
  Ag: 47,
  Cd: 48,
  In: 49,
  Sn: 50,
  Sb: 51,
  Te: 52,
  I: 53,
  Ba: 56,
  La: 57,
  Ce: 58,
  Pr: 59,
  Nd: 60,
  Sm: 62,
  Gd: 64,
  W: 74,
  Pt: 78,
  Au: 79,
  Pb: 82,
  Bi: 83,
}

export function buildStructureFactorPattern(
  structure: XRDStructureInfo,
  options: BuildPatternOptions,
): StructureFactorPeak[] {
  if (structure.sites.length === 0) return []
  const lattice = structure.lattice
  const reciprocal = reciprocalBasis(lattice)
  const dMin = twoThetaToD(options.twoThetaMax, options.wavelength)
  if (!dMin) return []
  const hMax = reflectionLimit(lattice.a, dMin)
  const kMax = reflectionLimit(lattice.b, dMin)
  const lMax = reflectionLimit(lattice.c, dMin)
  const raw: StructureFactorPeak[] = []

  for (let h = -hMax; h <= hMax; h += 1) {
    for (let k = -kMax; k <= kMax; k += 1) {
      for (let l = -lMax; l <= lMax; l += 1) {
        if (h === 0 && k === 0 && l === 0) continue
        const g = add(add(scale(reciprocal.aStar, h), scale(reciprocal.bStar, k)), scale(reciprocal.cStar, l))
        const gLength = length(g)
        if (gLength <= 0) continue
        const dSpacing = 1 / gLength
        const twoTheta = dToTwoTheta(dSpacing, options.wavelength)
        if (!twoTheta || twoTheta < options.twoThetaMin || twoTheta > options.twoThetaMax) continue
        const fSquared = structureFactorSquared(structure.sites, h, k, l, twoTheta, options.wavelength)
        if (fSquared <= 1e-8) continue
        raw.push({
          twoTheta,
          dSpacing,
          intensity: fSquared * lorentzPolarization(twoTheta),
          hkl: formatHkl(h, k, l),
          multiplicity: 1,
          fSquared,
        })
      }
    }
  }

  return mergeReflections(raw, options.mergeToleranceDeg ?? DEFAULT_MERGE_TOLERANCE)
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, options.maxPeaks ?? DEFAULT_MAX_PEAKS)
    .map(normalizeIntensity)
    .filter((peak) => peak.intensity >= 0.4)
}

function structureFactorSquared(
  sites: readonly XRDStructureSite[],
  h: number,
  k: number,
  l: number,
  twoTheta: number,
  wavelength: number,
): number {
  let real = 0
  let imag = 0
  for (const site of sites) {
    const f = atomicScattering(site.element, twoTheta, wavelength) * (site.occupancy ?? 1)
    const dw = debyeWaller(site.bIso, twoTheta, wavelength)
    const phase = 2 * Math.PI * (h * site.a + k * site.b + l * site.c)
    real += f * dw * Math.cos(phase)
    imag += f * dw * Math.sin(phase)
  }
  return real * real + imag * imag
}

function atomicScattering(element: string, twoTheta: number, wavelength: number): number {
  const z = ATOMIC_NUMBERS[element] ?? 12
  const theta = (twoTheta / 2) * (Math.PI / 180)
  const s = Math.sin(theta) / wavelength
  return z * Math.exp(-4.5 * s * s)
}

function debyeWaller(bIso: number | undefined, twoTheta: number, wavelength: number): number {
  if (typeof bIso !== "number" || !Number.isFinite(bIso) || bIso <= 0) return 1
  const theta = (twoTheta / 2) * (Math.PI / 180)
  const s = Math.sin(theta) / wavelength
  return Math.exp(-bIso * s * s)
}

function lorentzPolarization(twoTheta: number): number {
  const theta = (twoTheta / 2) * (Math.PI / 180)
  const sinTheta = Math.sin(theta)
  const cosTheta = Math.cos(theta)
  if (sinTheta <= 1e-6 || cosTheta <= 1e-6) return 0
  const cos2Theta = Math.cos(2 * theta)
  return (1 + cos2Theta * cos2Theta) / Math.max(1e-6, sinTheta * sinTheta * cosTheta)
}

function mergeReflections(peaks: readonly StructureFactorPeak[], tolerance: number): StructureFactorPeak[] {
  const sorted = [...peaks].sort((a, b) => a.twoTheta - b.twoTheta)
  const merged: StructureFactorPeak[] = []

  for (const peak of sorted) {
    const last = merged[merged.length - 1]
    if (last && Math.abs(last.twoTheta - peak.twoTheta) <= tolerance) {
      const total = last.intensity + peak.intensity
      const primary = peak.intensity > last.intensity ? peak : last
      last.twoTheta = (last.twoTheta * last.intensity + peak.twoTheta * peak.intensity) / total
      last.dSpacing = (last.dSpacing * last.intensity + peak.dSpacing * peak.intensity) / total
      last.intensity = total
      last.fSquared += peak.fSquared
      last.multiplicity += peak.multiplicity
      last.hkl = primary.hkl
      continue
    }
    merged.push({ ...peak })
  }

  return merged
}

function normalizeIntensity(peak: StructureFactorPeak, _index: number, peaks: readonly StructureFactorPeak[]): StructureFactorPeak {
  const max = Math.max(...peaks.map((item) => item.intensity), 1)
  return {
    ...peak,
    intensity: (peak.intensity / max) * 100,
  }
}

function reflectionLimit(lengthA: number, dMin: number): number {
  return Math.min(18, Math.max(2, Math.ceil(lengthA / Math.max(dMin, 0.2)) + 1))
}

function dToTwoTheta(dSpacing: number, wavelength: number): number | null {
  const ratio = wavelength / (2 * dSpacing)
  if (ratio <= 0 || ratio >= 1) return null
  return (2 * Math.asin(ratio) * 180) / Math.PI
}

function twoThetaToD(twoTheta: number, wavelength: number): number | null {
  const theta = (twoTheta / 2) * (Math.PI / 180)
  const sinTheta = Math.sin(theta)
  if (sinTheta <= 0) return null
  return wavelength / (2 * sinTheta)
}

function reciprocalBasis(lattice: XRDStructureInfo["lattice"]): { aStar: Vec3; bStar: Vec3; cStar: Vec3 } {
  const gamma = (lattice.gamma * Math.PI) / 180
  const beta = (lattice.beta * Math.PI) / 180
  const alpha = (lattice.alpha * Math.PI) / 180
  const a: Vec3 = [lattice.a, 0, 0]
  const b: Vec3 = [lattice.b * Math.cos(gamma), lattice.b * Math.sin(gamma), 0]
  const cx = lattice.c * Math.cos(beta)
  const cy = lattice.c * (Math.cos(alpha) - Math.cos(beta) * Math.cos(gamma)) / Math.max(Math.sin(gamma), 1e-8)
  const cz = Math.sqrt(Math.max(0, lattice.c * lattice.c - cx * cx - cy * cy))
  const c: Vec3 = [cx, cy, cz]
  const volume = dot(a, cross(b, c))

  return {
    aStar: scale(cross(b, c), 1 / volume),
    bStar: scale(cross(c, a), 1 / volume),
    cStar: scale(cross(a, b), 1 / volume),
  }
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function scale(a: Vec3, factor: number): Vec3 {
  return [a[0] * factor, a[1] * factor, a[2] * factor]
}

function length(a: Vec3): number {
  return Math.sqrt(dot(a, a))
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function formatHkl(h: number, k: number, l: number): string {
  return `${h} ${k} ${l}`
}
