// Rigaku SmartLab binary RAW parser.
//
// This is the compact binary ".raw" produced by Rigaku SmartLab exports. It is
// not related to Bruker's RAW1/RAW4 family even though the extension is the
// same. The sample files observed so far have:
//   - "FI" at byte 0
//   - instrument strings such as "SmartLab" in the fixed header
//   - scan parameters stored as little-endian float32 triples
//   - one float32 intensity payload at the end of the file
//
// As with the Bruker parser, the output is synthetic ASCII accepted by
// parseXRD(), so downstream charting, peak picking, cloud sync and AI analysis
// stay unchanged.

export class RigakuRawError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RigakuRawError"
  }
}

type ScanParams = {
  start2T: number
  stop2T: number
  step: number
  points: number
  offset: number
}

type Payload = {
  offset: number
  intensities: Float32Array
  plausibleRatio: number
}

export function isRigakuSmartLabRaw(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 512) return false
  const dv = new DataView(buf)
  const head = readAscii(dv, 0, 4)
  if (!head.startsWith("FI")) return false
  return asciiWindow(dv, 0, Math.min(buf.byteLength, 4096)).includes("SmartLab")
}

export function rigakuSmartLabRawToText(buf: ArrayBuffer, originalFilename?: string): string {
  if (buf.byteLength < 1024) {
    throw new RigakuRawError("Rigaku SmartLab RAW file is too small to contain a scan.")
  }

  const dv = new DataView(buf)
  if (!isRigakuSmartLabRaw(buf)) {
    throw new RigakuRawError("File does not look like a Rigaku SmartLab RAW scan.")
  }

  const pointCandidates = getPointCountCandidates(dv, buf.byteLength)
  const scan = findScanParams(dv, buf.byteLength, pointCandidates)
  if (!scan) {
    throw new RigakuRawError(
      "Rigaku SmartLab RAW: could not locate a plausible 2theta range in the header.",
    )
  }

  const payload = readPayload(dv, buf.byteLength, scan.points)
  if (!payload || payload.plausibleRatio < 0.95) {
    throw new RigakuRawError("Rigaku SmartLab RAW: could not locate the intensity payload.")
  }

  const wavelength = findWavelength(dv, Math.min(payload.offset, 4096))
  return renderSyntheticAscii({
    originalFilename,
    sampleName: sampleNameFromFilename(originalFilename),
    start2T: scan.start2T,
    stop2T: scan.stop2T,
    step: scan.step,
    wavelength,
    intensities: payload.intensities,
  })
}

function getPointCountCandidates(dv: DataView, fileSize: number): number[] {
  const out = new Set<number>()

  // In the observed SmartLab file, offset 0x0c stores the number of intervals
  // in the low word: 2000 intervals -> 2001 measured points.
  if (dv.byteLength >= 0x10) {
    const lowWord = dv.getUint16(0x0c, true)
    if (isPlausiblePointCount(lowWord + 1, fileSize)) out.add(lowWord + 1)

    const rawU32 = dv.getUint32(0x0c, true)
    if (isPlausiblePointCount(rawU32, fileSize)) out.add(rawU32)
    if (isPlausiblePointCount(rawU32 + 1, fileSize)) out.add(rawU32 + 1)
  }

  return [...out]
}

function findScanParams(
  dv: DataView,
  fileSize: number,
  pointCandidates: number[],
): ScanParams | null {
  let best: ScanParams | null = null
  let bestScore = Number.POSITIVE_INFINITY

  const consider = (points: number, start2T: number, stop2T: number, step: number, off: number) => {
    const payloadOffset = fileSize - points * 4
    if (payloadOffset < 512 || payloadOffset > fileSize - 40) return
    if (off >= payloadOffset) return

    const impliedPoints = Math.round((stop2T - start2T) / step) + 1
    const pointError = Math.abs(impliedPoints - points)
    if (pointError > Math.max(2, points * 0.002)) return

    // Prefer exact point matches, normal powder-XRD step sizes, and scan
    // triples near the payload. This avoids accidentally selecting a slit
    // width or other instrument parameter that happens to look numeric.
    const stepPenalty = step <= 0.2 ? 0 : 10
    const distancePenalty = Math.max(0, payloadOffset - off) / 100000
    const score = pointError * 100 + stepPenalty + distancePenalty
    if (score < bestScore) {
      bestScore = score
      best = { start2T, stop2T, step, points, offset: off }
    }
  }

  const searchEnd = Math.min(fileSize, 8192)
  for (let off = 0; off + 12 <= searchEnd; off++) {
    const start2T = dv.getFloat32(off, true)
    const stop2T = dv.getFloat32(off + 4, true)
    const step = dv.getFloat32(off + 8, true)
    if (!isPlausibleRange(start2T, stop2T, step)) continue

    const impliedPoints = Math.round((stop2T - start2T) / step) + 1
    const candidates = new Set(pointCandidates)
    if (isPlausiblePointCount(impliedPoints, fileSize)) {
      candidates.add(impliedPoints)
    }

    for (const points of candidates) {
      consider(points, start2T, stop2T, step, off)
    }
  }

  return best
}

function readPayload(dv: DataView, fileSize: number, points: number): Payload | null {
  const offset = fileSize - points * 4
  if (offset < 0 || offset + points * 4 !== fileSize) return null

  const intensities = new Float32Array(points)
  let plausible = 0
  for (let i = 0; i < points; i++) {
    const v = dv.getFloat32(offset + i * 4, true)
    intensities[i] = v
    if (Number.isFinite(v) && v >= 0 && v < 1e8) plausible++
  }

  return { offset, intensities, plausibleRatio: plausible / points }
}

function findWavelength(dv: DataView, headerEnd: number): number | undefined {
  const known = [1.54056, 1.540593, 1.5418, 0.71073, 1.78897, 2.2897]
  let best: number | undefined
  let bestDistance = Number.POSITIVE_INFINITY

  for (let off = 0; off + 8 <= headerEnd; off++) {
    const v = dv.getFloat64(off, true)
    if (!Number.isFinite(v) || v < 0.3 || v > 3.0) continue
    const distance = Math.min(...known.map((k) => Math.abs(k - v)))
    if (distance < bestDistance) {
      best = v
      bestDistance = distance
    }
  }

  return bestDistance < 0.05 ? best : undefined
}

function isPlausiblePointCount(points: number, fileSize: number): boolean {
  if (!Number.isInteger(points) || points < 10 || points > 500_000) return false
  const offset = fileSize - points * 4
  return offset >= 512 && offset < fileSize
}

function isPlausibleRange(start2T: number, stop2T: number, step: number): boolean {
  if (!Number.isFinite(start2T) || !Number.isFinite(stop2T) || !Number.isFinite(step)) return false
  if (start2T < -5 || start2T > 180) return false
  if (stop2T <= start2T || stop2T > 180) return false
  if (step <= 0 || step > 5) return false
  return stop2T - start2T >= 0.5
}

function readAscii(dv: DataView, offset: number, length: number): string {
  let out = ""
  for (let i = 0; i < length; i++) {
    if (offset + i >= dv.byteLength) break
    const b = dv.getUint8(offset + i)
    if (b === 0) break
    if (b >= 0x20 && b < 0x7f) out += String.fromCharCode(b)
  }
  return out
}

function asciiWindow(dv: DataView, offset: number, length: number): string {
  let out = ""
  for (let i = 0; i < length; i++) {
    if (offset + i >= dv.byteLength) break
    const b = dv.getUint8(offset + i)
    out += b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "\n"
  }
  return out
}

function sampleNameFromFilename(filename?: string): string {
  if (!filename) return ""
  const base = filename.split(/[\\/]/).pop() ?? filename
  return base.replace(/\.[^.]+$/, "")
}

type SynthArgs = {
  originalFilename?: string
  sampleName: string
  start2T: number
  stop2T: number
  step: number
  wavelength?: number
  intensities: Float32Array
}

function renderSyntheticAscii(a: SynthArgs): string {
  const lines: string[] = []
  if (a.originalFilename) lines.push(`Filename: ${a.originalFilename}`)
  if (a.sampleName) lines.push(`Specimen Name: ${a.sampleName}`)
  lines.push("Scan Type: 2Theta Scan")
  lines.push("Source: Rigaku SmartLab RAW")
  if (Number.isFinite(a.wavelength)) {
    lines.push(`Wavelength: ${a.wavelength!.toFixed(6)}`)
    lines.push(`Kalpha1: ${a.wavelength!.toFixed(6)}`)
  }
  lines.push(`Start Angle: ${a.start2T.toFixed(4)}`)
  lines.push(`Stop Angle: ${a.stop2T.toFixed(4)}`)
  lines.push(`Step Size: ${a.step.toFixed(6)}`)
  lines.push(`Num Points: ${a.intensities.length}`)
  lines.push("[Data]")

  for (let i = 0; i < a.intensities.length; i++) {
    const angle = a.start2T + i * a.step
    const raw = a.intensities[i]
    const safe = Number.isFinite(raw) && raw >= 0 ? raw : 0
    lines.push(`${angle.toFixed(4)}\t${safe.toFixed(2)}`)
  }

  return lines.join("\n")
}
