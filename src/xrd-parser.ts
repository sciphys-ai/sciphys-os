// XRD data parser — supports .txt, .xy, .csv (two-column: 2θ, intensity)
// Also handles common export formats from Jade, HighScore, etc.

export type XRDMetadata = {
  // Sample identity
  originalFilename?: string // path on the instrument PC, e.g. "C:\yeC\xqy090928#1.raw"
  fileCreated?: string // when the scan was acquired
  specimenId?: string // free-form lab id, often contains power/slit info
  specimenName?: string
  comment?: string

  // Scan geometry
  scanType?: string // e.g. "2Theta Scan"
  scanMode?: string // e.g. "Continuous"
  startAngle?: number // 2θ degrees
  stopAngle?: number // 2θ degrees
  stepSize?: number // 2θ degrees per step (instrument-reported)
  scanRate?: number // depends on instrument; we surface as-is
  numPoints?: number

  // X-ray source
  wavelength?: number // primary wavelength, Å
  kAlpha1?: number
  kAlpha2?: number
  kBeta?: number
  source?: string // friendly source label, e.g. "Cu Kα"

  // Derived: anything we couldn't classify but want to keep around for users
  raw?: Record<string, string>
}

export type XRDData = {
  points: XRDPoint[]
  twoThetaMin: number
  twoThetaMax: number
  intensityMin: number
  intensityMax: number
  stepSize: number // average step in 2θ (computed from data)
  totalPoints: number
  metadata?: XRDMetadata
}

export type XRDPoint = {
  twoTheta: number // 2θ in degrees
  intensity: number // counts or a.u.
}

export type XRDPeak = {
  twoTheta: number
  intensity: number
  fwhm?: number // full width at half maximum
  dSpacing: number // Å, calculated from Bragg's law
  relativeIntensity: number // percentage of max peak
}

// Cu Kα wavelength (most common)
const CU_KA_WAVELENGTH = 1.5406 // Å

/**
 * Map a primary wavelength (Å) onto the human-friendly X-ray source label
 * researchers actually quote in papers: "Cu Kα", "Mo Kα", etc.
 * Tolerant to ±0.01 Å so vendor-specific values still match.
 */
export function wavelengthToSource(lambda?: number): string | undefined {
  if (typeof lambda !== "number" || !Number.isFinite(lambda)) return undefined
  const close = (a: number, b: number) => Math.abs(a - b) < 0.01
  if (close(lambda, 1.5406) || close(lambda, 1.5418) || close(lambda, 1.54056)) return "Cu Kα"
  if (close(lambda, 0.7107) || close(lambda, 0.71073)) return "Mo Kα"
  if (close(lambda, 1.7902) || close(lambda, 1.78897)) return "Co Kα"
  if (close(lambda, 2.2909)) return "Cr Kα"
  if (close(lambda, 1.9373)) return "Fe Kα"
  return undefined
}

/**
 * Parse the metadata header that ships with most XRD exports (Rigaku, Bruker,
 * PANalytical, Jade, HighScore). Handles the loose "Key: value" layout and the
 * occasional inline form like "\Kalpha1: 1.540562  \Kalpha2: 1.544390".
 *
 * We only look at the section *before* the first data marker so we don't waste
 * cycles scanning thousands of data rows.
 */
export function parseXRDMetadata(text: string): XRDMetadata {
  // Cap to first 8KB — metadata always lives at the top.
  const headerCutoff = Math.min(text.length, 8000)
  let header = text.slice(0, headerCutoff)
  const dataMarker = header.match(/^\s*(Datas:|Range\s+\d+\s*-+>|\[Data\]|\[Scan points\])\s*$/im)
  if (dataMarker && typeof dataMarker.index === "number") {
    header = header.slice(0, dataMarker.index)
  }

  const meta: XRDMetadata = { raw: {} }
  const num = (s: string | undefined): number | undefined => {
    if (!s) return undefined
    const v = Number.parseFloat(s.replace(/[^\d.\-+eE]/g, ""))
    return Number.isFinite(v) ? v : undefined
  }

  // Walk a few common patterns. Many Rigaku/Bruker exports put the value on
  // the *next* line under the key, so we also try a 2-line lookahead.
  const lines = header.split(/\r?\n/).map((l) => l.trim())
  const findValueAfter = (label: RegExp): string | undefined => {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(label)
      if (!m) continue
      // Inline value on the same line
      const inline = lines[i].replace(label, "").trim()
      if (inline && !/^[:\s]*$/.test(inline)) return inline.replace(/^[:\s]+/, "")
      // Otherwise the next non-empty line
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (lines[j]) return lines[j]
      }
    }
    return undefined
  }

  meta.originalFilename = findValueAfter(/^Filename\s*:?/i)
  meta.fileCreated = findValueAfter(/^File Created\s*:?/i)
  meta.specimenId = findValueAfter(/^Specimen Id\s*:?/i)
  meta.specimenName = findValueAfter(/^Specimen Name\s*:?/i)
  meta.comment = findValueAfter(/^Comment\s*:?/i)

  for (const line of lines) {
    const kv = line.match(/^([A-Za-z][A-Za-z0-9 _-]*)\s*:\s*(.+)$/)
    if (!kv) continue
    const key = kv[1].toLowerCase()
    const val = kv[2].trim()
    meta.raw![kv[1]] = val
    if (/^scan type$/.test(key)) meta.scanType = val
    else if (/^scan mode$/.test(key)) meta.scanMode = val
    else if (/^start angle$/.test(key)) meta.startAngle = num(val)
    else if (/^stop angle$/.test(key)) meta.stopAngle = num(val)
    else if (/^step size$/.test(key)) meta.stepSize = num(val)
    else if (/^scan rate$/.test(key)) meta.scanRate = num(val)
    else if (/^num points$/.test(key)) meta.numPoints = num(val)
    else if (/^wavelength$/.test(key)) meta.wavelength = num(val)
  }

  // Inline "\Kalpha1: 1.540562  \Kalpha2: 1.544390  \Kbeta: 1.392218"
  const ka1 = header.match(/Kalpha1\s*:?\s*([\d.]+)/i)
  const ka2 = header.match(/Kalpha2\s*:?\s*([\d.]+)/i)
  const kb = header.match(/Kbeta\s*:?\s*([\d.]+)/i)
  if (ka1) meta.kAlpha1 = num(ka1[1])
  if (ka2) meta.kAlpha2 = num(ka2[1])
  if (kb) meta.kBeta = num(kb[1])

  // Fallback: if Wavelength isn't tagged but Kα1 is, treat it as the primary λ.
  if (meta.wavelength === undefined && meta.kAlpha1 !== undefined) {
    meta.wavelength = meta.kAlpha1
  }
  meta.source = wavelengthToSource(meta.wavelength)

  return meta
}

/**
 * Parse XRD text data. Supports:
 *   - 2-column: "2θ  intensity"           (.xy, .csv, simple .txt)
 *   - 3-column: "2θ  intensity  esd"      (Rigaku/Bruker .raw text export)
 *   - Files with metadata headers and data-section markers like
 *     "Datas:" or "Range 1 ---> Iteration 1" (Rigaku/Jade exports)
 *
 * Delimiters: tab, comma, space (one or more), or semicolon.
 */
export function parseXRD(text: string): XRDData {
  const metadata = parseXRDMetadata(text)
  let body = text

  // If the file has a clear "data starts here" marker, skip everything before it.
  // This is critical for Rigaku/Bruker exports that have 30+ lines of header.
  const markers = [
    /^\s*Range\s+\d+\s*-+>\s*Iteration\s+\d+\s*$/im, // Rigaku
    /^\s*Datas:\s*$/im, // Rigaku
    /^\s*\[Data\]\s*$/im, // Bruker
    /^\s*\[Scan points\]\s*$/im, // PANalytical
    /^\s*Pos\s*\[deg\].*Rate\s*\[CPS\]/im, // column header line
  ]
  for (const re of markers) {
    const m = body.match(re)
    if (m && typeof m.index === "number") {
      // Cut everything up to and including the matched line
      const cutAt = body.indexOf("\n", m.index + m[0].length)
      if (cutAt > -1) {
        body = body.slice(cutAt + 1)
        break
      }
    }
  }

  const lines = body.split(/\r?\n/)
  const points: XRDPoint[] = []
  const delimiter = /[\t,;\s]+/

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Skip comment / header lines
    if (/^[#*\\]/.test(trimmed)) continue
    if (/^[a-zA-Z]/.test(trimmed)) continue
    if (!/^[\d.+-]/.test(trimmed)) continue

    const tokens = trimmed.split(delimiter).filter(Boolean)
    if (tokens.length < 2) continue

    const twoTheta = Number.parseFloat(tokens[0])
    const intensity = Number.parseFloat(tokens[1])

    if (!Number.isFinite(twoTheta) || !Number.isFinite(intensity)) continue
    if (twoTheta < 0 || twoTheta > 180) continue // sanity check
    if (intensity < 0) continue // negative intensities = parsing error

    points.push({ twoTheta, intensity })
  }

  if (points.length === 0) {
    return {
      points: [],
      twoThetaMin: 0,
      twoThetaMax: 0,
      intensityMin: 0,
      intensityMax: 0,
      stepSize: 0,
      totalPoints: 0,
      metadata,
    }
  }

  // Sort by 2θ (in case data isn't ordered)
  points.sort((a, b) => a.twoTheta - b.twoTheta)

  // Calculate stats
  let intensityMin = Number.POSITIVE_INFINITY
  let intensityMax = Number.NEGATIVE_INFINITY
  for (const p of points) {
    if (p.intensity < intensityMin) intensityMin = p.intensity
    if (p.intensity > intensityMax) intensityMax = p.intensity
  }

  const twoThetaMin = points[0].twoTheta
  const twoThetaMax = points[points.length - 1].twoTheta
  const stepSize = points.length > 1 ? (twoThetaMax - twoThetaMin) / (points.length - 1) : 0

  return {
    points,
    twoThetaMin,
    twoThetaMax,
    intensityMin,
    intensityMax,
    stepSize,
    totalPoints: points.length,
    metadata,
  }
}

/**
 * Bragg's law: nλ = 2d·sin(θ)
 * d = λ / (2·sin(θ))
 */
export function twoThetaToDSpacing(twoTheta: number, wavelength = CU_KA_WAVELENGTH): number {
  const theta = (twoTheta / 2) * (Math.PI / 180)
  const sinTheta = Math.sin(theta)
  if (sinTheta <= 0) return 0
  return wavelength / (2 * sinTheta)
}

/**
 * Simple peak detection using local maxima + prominence filtering.
 * Returns peaks sorted by intensity (highest first). When the parsed file
 * carried a wavelength in its metadata, d-spacings use that wavelength;
 * otherwise we fall back to Cu Kα.
 */
export function detectPeaks(
  data: XRDData,
  options: {
    minProminence?: number // minimum prominence as fraction of max intensity
    minDistance?: number // minimum distance between peaks in 2θ degrees
    maxPeaks?: number
    wavelength?: number // override Cu Kα default
  } = {}
): XRDPeak[] {
  const { minProminence = 0.03, minDistance = 0.3, maxPeaks = 30 } = options
  const { points, intensityMax, intensityMin } = data
  const lambda = options.wavelength ?? data.metadata?.wavelength ?? CU_KA_WAVELENGTH

  if (points.length < 3) return []

  const threshold = intensityMin + (intensityMax - intensityMin) * minProminence
  const candidates: XRDPeak[] = []

  // Find local maxima
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].intensity
    const curr = points[i].intensity
    const next = points[i + 1].intensity

    if (curr > prev && curr > next && curr > threshold) {
      // Estimate prominence against local valleys, not adjacent samples.
      // XRD peaks are often smooth and sampled densely; using only immediate
      // neighbours makes a real tall peak look artificially "low prominence".
      const prominence = estimateLocalProminence(points, i)
      if (prominence > (intensityMax - intensityMin) * minProminence) {
        // FWHM via half-max walk: estimate the local baseline as the
        // smaller of the two flanks' minima within ±2° (so background
        // tilt doesn't inflate β), then find where the peak descends to
        // (curr + baseline) / 2 on each side. Linear interpolation
        // between samples gives sub-step resolution. Returns undefined
        // when either flank can't be resolved (e.g. the peak sits on
        // the data edge or never drops to half-max within the search
        // window — common for broad merged peaks).
        const fwhm = estimatePeakFwhm(points, i, intensityMax)
        candidates.push({
          twoTheta: points[i].twoTheta,
          intensity: curr,
          fwhm,
          dSpacing: twoThetaToDSpacing(points[i].twoTheta, lambda),
          relativeIntensity: (curr / intensityMax) * 100,
        })
      }
    }
  }

  // Sort by intensity (highest first)
  candidates.sort((a, b) => b.intensity - a.intensity)

  // Filter by minimum distance
  const peaks: XRDPeak[] = []
  for (const candidate of candidates) {
    const tooClose = peaks.some((p) => Math.abs(p.twoTheta - candidate.twoTheta) < minDistance)
    if (!tooClose) {
      peaks.push(candidate)
      if (peaks.length >= maxPeaks) break
    }
  }

  return peaks
}

function estimateLocalProminence(
  points: { twoTheta: number; intensity: number }[],
  i: number,
): number {
  const peakTheta = points[i].twoTheta
  const peakI = points[i].intensity
  const SEARCH_DEG = 2.0
  let leftMin = peakI
  let rightMin = peakI

  for (let j = i - 1; j >= 0 && peakTheta - points[j].twoTheta <= SEARCH_DEG; j--) {
    if (points[j].intensity < leftMin) leftMin = points[j].intensity
  }
  for (let j = i + 1; j < points.length && points[j].twoTheta - peakTheta <= SEARCH_DEG; j++) {
    if (points[j].intensity < rightMin) rightMin = points[j].intensity
  }

  return peakI - Math.max(leftMin, rightMin)
}

/**
 * Estimate FWHM (in degrees 2θ) for a peak located at sample index `i`
 * by walking outward to half-max on each flank with linear interpolation.
 * Local baseline = min within ±2° to avoid background-tilt inflation.
 * Returns undefined when either flank can't be resolved.
 */
function estimatePeakFwhm(
  points: { twoTheta: number; intensity: number }[],
  i: number,
  globalMax: number,
): number | undefined {
  const peakTheta = points[i].twoTheta
  const peakI = points[i].intensity
  const SEARCH_DEG = 2.0

  // Local baseline (2° window each side, take min)
  let leftMin = peakI
  let rightMin = peakI
  for (let j = i - 1; j >= 0 && peakTheta - points[j].twoTheta <= SEARCH_DEG; j--) {
    if (points[j].intensity < leftMin) leftMin = points[j].intensity
  }
  for (let j = i + 1; j < points.length && points[j].twoTheta - peakTheta <= SEARCH_DEG; j++) {
    if (points[j].intensity < rightMin) rightMin = points[j].intensity
  }
  const baseline = Math.min(leftMin, rightMin)

  // Tiny peaks vs noise — half-max walk would be unstable
  if (peakI - baseline < (globalMax - baseline) * 0.05) return undefined

  const halfMax = baseline + (peakI - baseline) / 2

  // Left crossing
  let leftTheta: number | undefined
  for (let j = i - 1; j >= 0 && peakTheta - points[j].twoTheta <= SEARCH_DEG; j--) {
    if (points[j].intensity <= halfMax) {
      const a = points[j]
      const b = points[j + 1]
      const span = b.intensity - a.intensity
      const t = span !== 0 ? (halfMax - a.intensity) / span : 0
      leftTheta = a.twoTheta + t * (b.twoTheta - a.twoTheta)
      break
    }
  }

  // Right crossing
  let rightTheta: number | undefined
  for (let j = i + 1; j < points.length && points[j].twoTheta - peakTheta <= SEARCH_DEG; j++) {
    if (points[j].intensity <= halfMax) {
      const a = points[j - 1]
      const b = points[j]
      const span = b.intensity - a.intensity
      const t = span !== 0 ? (halfMax - a.intensity) / span : 0
      rightTheta = a.twoTheta + t * (b.twoTheta - a.twoTheta)
      break
    }
  }

  if (leftTheta === undefined || rightTheta === undefined) return undefined
  const w = rightTheta - leftTheta
  return w > 0 ? w : undefined
}

/**
 * Format peak list as a string for AI prompt
 */
export function formatPeaksForPrompt(peaks: XRDPeak[]): string {
  if (peaks.length === 0) return "No significant peaks detected."

  const lines = peaks
    .slice(0, 15) // top 15 peaks
    .map(
      (p, i) =>
        `${i + 1}. 2θ=${p.twoTheta.toFixed(2)}° (d=${p.dSpacing.toFixed(3)}Å, I=${p.relativeIntensity.toFixed(0)}%)`
    )

  return lines.join("\n")
}

/**
 * Generate XRD metadata string for sidebar display.
 * Prefers values reported by the instrument header when present; falls back
 * to values computed from the actual data points.
 */
export function getXRDMeta(data: XRDData): string {
  const m = data.metadata
  const lo = m?.startAngle ?? data.twoThetaMin
  const hi = m?.stopAngle ?? data.twoThetaMax
  const range = `${lo.toFixed(0)}–${hi.toFixed(0)}°`
  const source = m?.source ?? wavelengthToSource(m?.wavelength)
  const step = m?.stepSize ?? data.stepSize
  const stepStr = step > 0 ? `${step.toFixed(2)}° step` : null
  return [range, source, stepStr].filter(Boolean).join(" · ")
}

// Demo XRD data: simulated ZnO wurtzite pattern
export const DEMO_XRD_TEXT = `# Simulated ZnO wurtzite XRD pattern (Cu Kα)
# 2theta	Intensity
10.0	120
15.0	135
20.0	150
25.0	180
31.77	850
34.42	1000
36.25	520
47.54	380
56.60	320
62.86	280
66.38	150
67.96	420
69.10	180
72.56	120
76.95	95
81.37	85
89.60	70
`.trim()
