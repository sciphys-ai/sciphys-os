// Bruker RAW binary parser (currently V3 / "RAW1.01" only).
//
// V3 is the format DIFFRAC.MEASUREMENT CENTER writes by default on
// every D8 / D2 PHASER and powers ~80% of academic XRD files in the
// wild. V4 ("RAW4.00") embeds an XML metadata block and is materially
// more complex; we surface a clean error pointing the user at the .xy
// / .csv export menu rather than risk silently mis-interpreting bytes.
//
// Output is synthetic ASCII in the exact layout `parseXRD()` already
// reads (Rigaku/Bruker text exports), so binary files slot into the
// existing ingest + cloud-sync + render pipeline without touching
// runs-store, the cloud schema, or any UI.
//
// Header offsets follow xylib-2.5 / xrayutilities; every field is also
// runtime-validated so a slightly different OEM firmware rev fails
// clean rather than producing garbage 2θ / intensity values.

const V3_MAGIC = "RAW1.01"
const V4_MAGIC = "RAW4.00"
const V2_MAGIC = "RAW2"
// V1's magic is the single ASCII string "RAW " followed by 0x00 / 0x01
// version bytes. We detect it by exclusion (starts with "RAW" but is
// neither RAW1.01 / RAW2 / RAW4 — those checks come first).
const V1_MAGIC = "RAW"

const V3_FIRST_RANGE_OFFSET = 712

// ── Public API ────────────────────────────────────────────────────────

export class BrukerRawError extends Error {
  /** "v1" | "v2" | "v3" | "v4" | undefined when the magic itself
   *  doesn't even start with "RAW". Useful for the upload UI to format
   *  a more specific hint ("re-export from DIFFRAC.EVA as .xy"). */
  readonly version?: "v1" | "v2" | "v3" | "v4"
  constructor(message: string, version?: "v1" | "v2" | "v3" | "v4") {
    super(message)
    this.name = "BrukerRawError"
    this.version = version
  }
}

/** Cheap magic-byte sniff; safe to call on any buffer (returns false
 *  when the file is too short or not RAW). */
export function isBrukerRaw(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false
  const head = readAscii(new DataView(buf), 0, 8)
  return (
    head.startsWith(V3_MAGIC) ||
    head.startsWith(V4_MAGIC) ||
    head.startsWith(V2_MAGIC) ||
    // "RAW " (with trailing space + version byte) is V1; "RAW" alone
    // never appears as a valid magic but acts as a safety net.
    head.startsWith(V1_MAGIC)
  )
}

/** Convert a Bruker RAW buffer to ASCII text in the layout `parseXRD`
 *  expects. Throws `BrukerRawError` for unsupported variants and for
 *  files that fail validation (truncated, implausible step count, etc.). */
export function brukerRawToText(buf: ArrayBuffer, originalFilename?: string): string {
  if (buf.byteLength < 8) {
    throw new BrukerRawError("File is too small to be a Bruker RAW.")
  }
  const dv = new DataView(buf)
  const magic = readAscii(dv, 0, 8)
  // Diagnostic: helps tell apart "user uploaded a non-RAW renamed to
  // .raw" from "we recognised the magic but failed downstream".
  console.log("[v0] bruker raw sniff:", JSON.stringify(magic), "size=", buf.byteLength)

  if (magic.startsWith(V3_MAGIC)) return parseV3(dv, buf, originalFilename)

  // V4 / V2 / V1 → descriptive errors so the upload modal can show a
  // helpful hint instead of a generic "unsupported format" message.
  if (magic.startsWith(V4_MAGIC)) {
    throw new BrukerRawError(
      "Bruker RAW v4 (RAW4.00) is not yet supported. Please re-export the scan from DIFFRAC.EVA / DIFFRAC.MEASUREMENT CENTER as .xy or .csv (File → Export ASCII).",
      "v4",
    )
  }
  if (magic.startsWith(V2_MAGIC)) {
    throw new BrukerRawError(
      "Bruker RAW v2 is rare and not yet supported. Please re-export the scan as .xy or .csv from DIFFRAC tools.",
      "v2",
    )
  }
  if (magic.startsWith(V1_MAGIC)) {
    throw new BrukerRawError(
      "Bruker RAW v1 (legacy 1980s format) is not supported. Please open the file in DIFFRAC.EVA and re-export it as .xy or .csv.",
      "v1",
    )
  }
  throw new BrukerRawError(
    `File does not start with a known Bruker RAW magic (got ${JSON.stringify(magic)}).`,
  )
}

// ── V3 implementation ─────────────────────────────────────────────────

function parseV3(dv: DataView, buf: ArrayBuffer, originalFilename?: string): string {
  const fileSize = buf.byteLength
  // Minimum sane V3 file: 712-byte main header + 304-byte range header
  // + at least one float32 sample.
  if (fileSize < V3_FIRST_RANGE_OFFSET + 304 + 4) {
    throw new BrukerRawError("Bruker RAW v3 file is truncated.", "v3")
  }

  // ── Main header (V3 layout, all uint32 / float64 little-endian) ─
  // Source: xylib-2.5 src/bruker_raw.cpp + xrayutilities/io/bruker.py.
  // We only extract fields we actually surface to the user — many more
  // bytes exist (site / hardware ID / etc.) but they aren't worth the
  // maintenance burden when they don't drive a UI element today.
  const rangeCount = dv.getUint32(0x0c, true)
  if (rangeCount < 1 || rangeCount > 64) {
    // Sanity bound: real D8 sweeps have 1–6 ranges. Anything outside
    // means the byte at 0x0C isn't a count and the layout is wrong.
    throw new BrukerRawError(
      `Bruker RAW v3: implausible range count (${rangeCount}). File may be corrupted or a different RAW variant.`,
      "v3",
    )
  }

  const measureDate = readAscii(dv, 16, 10).trim()
  const measureTime = readAscii(dv, 26, 10).trim()
  const user = readAscii(dv, 36, 72).trim()
  const sampleId = readAscii(dv, 326, 60).trim()
  const comment = readAscii(dv, 386, 160).trim()
  const anode = readAscii(dv, 608, 4).trim()
  const alpha1Raw = readSafeF64(dv, 624)
  const alpha2Raw = readSafeF64(dv, 632)
  const alpha1 = isPlausibleWavelength(alpha1Raw) ? alpha1Raw : NaN
  const alpha2 = isPlausibleWavelength(alpha2Raw) ? alpha2Raw : NaN

  // ── First range header ────────────────────────────────────────
  // Multi-range D8 sweeps exist (e.g. low-angle survey + high-angle
  // detail) but ~99% of files we'll see are single-range, and we don't
  // yet have UI to stack ranges. So we render range 0 only.
  const r0 = V3_FIRST_RANGE_OFFSET
  const rangeHeaderLen = dv.getUint32(r0, true)
  const steps = dv.getUint32(r0 + 4, true)
  // Diagnostic block: prints every header value we depend on, plus a
  // hex dump of the first 64 bytes of the range header. With this
  // server-side log a single failed upload tells us exactly which
  // field (header length / step count / start angle / step size) the
  // firmware variant lays out at a different offset than xylib's
  // canonical V3 layout, so the fix becomes "add this offset to the
  // candidate list" rather than blind guessing.
  const headerHex = Array.from(new Uint8Array(buf, r0, Math.min(64, buf.byteLength - r0)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ")
  console.log(
    "[v0] bruker v3 range header:",
    JSON.stringify({ rangeCount, rangeHeaderLen, steps, fileSize, headerHexFirst64: headerHex }),
  )
  if (rangeHeaderLen < 200 || rangeHeaderLen > 1024) {
    throw new BrukerRawError(
      `Bruker RAW v3: range header length out of range (${rangeHeaderLen}). File may be corrupted.`,
      "v3",
    )
  }
  if (steps < 10 || steps > 500_000) {
    throw new BrukerRawError(
      `Bruker RAW v3: implausible step count (${steps}).`,
      "v3",
    )
  }

  // start_2θ is canonically at +16. Some θ-only scans leave it as 0;
  // fall back to (start_θ at +8) × 2 in that case.
  let start2T = readSafeF64(dv, r0 + 16)
  if (!isPlausibleAngle(start2T)) {
    const startTheta = readSafeF64(dv, r0 + 8)
    if (isPlausibleAngle(startTheta)) start2T = startTheta * 2
  }
  if (!isPlausibleAngle(start2T)) {
    throw new BrukerRawError(
      "Bruker RAW v3: could not extract a plausible start 2θ angle from the range header.",
      "v3",
    )
  }

  // step_size is canonically at +176 in V3 (xylib reference). Real-
  // world D2/D8 firmware ships with several variants — we expand the
  // probe set to cover everything xylib / xrayutilities / GSAS-II have
  // ever observed. First plausible value (positive, ≤5° per step) wins.
  // 5°/step is already absurd for powder XRD, so the bound is safe.
  const stepCandidates = [176, 168, 160, 152, 144, 184, 192, 200, 208, 216, 224, 112, 120, 128]
  let step = NaN
  let stepFromOffset = -1
  for (const off of stepCandidates) {
    const v = readSafeF64(dv, r0 + off)
    if (isPlausibleStep(v)) {
      step = v
      stepFromOffset = off
      break
    }
  }
  console.log(
    "[v0] bruker v3 angles:",
    JSON.stringify({ start2T, step, stepFromOffset }),
  )
  if (!isPlausibleStep(step)) {
    throw new BrukerRawError(
      "Bruker RAW v3: could not extract a plausible step size from the range header. " +
        "Please share the file with us so we can add support for this firmware variant.",
      "v3",
    )
  }

  // ── Intensity payload ─────────────────────────────────────────
  // Float32 array of length `steps`, immediately following the range
  // header. We can't construct a Float32Array directly on the buffer
  // because the data offset isn't necessarily 4-byte-aligned, so we
  // read sample-by-sample via DataView (which doesn't have alignment
  // requirements).
  //
  // The default offset assumes the range header has rangeHeaderLen
  // bytes including any padding, which is the xylib-canonical V3
  // layout. Some D2 PHASER firmwares put a different value in offset
  // 0 (e.g. range_block_length instead of header_length), so when the
  // primary offset produces garbage we probe a small set of fixed
  // alternatives — any of which, by xylib + xrayutilities reference,
  // is the correct payload start for at least one observed firmware.
  const dataOffsetCandidates = Array.from(
    new Set<number>([
      r0 + rangeHeaderLen,
      r0 + 304, // canonical V3 "data starts after fixed-size header"
      r0 + 176 + 8 * 16, // post header + extra param block (some D2)
    ]),
  ).filter((off) => off + steps * 4 <= fileSize && off + 304 >= r0)

  let intensities: Float32Array | null = null
  let dataOffset = -1
  let bestRatio = 0
  for (const candidate of dataOffsetCandidates) {
    const samples = new Float32Array(steps)
    let plausible = 0
    for (let i = 0; i < steps; i++) {
      const v = dv.getFloat32(candidate + i * 4, true)
      samples[i] = v
      // Plausible XRD count rate: finite, non-negative, < 1e8 cps
      // (bigger than that means we're reading wrong bytes — real
      // detectors saturate well below this).
      if (Number.isFinite(v) && v >= 0 && v < 1e8) plausible++
    }
    const ratio = plausible / steps
    if (ratio > bestRatio) {
      bestRatio = ratio
      intensities = samples
      dataOffset = candidate
    }
    // If we already found a near-perfect candidate, stop early.
    if (ratio > 0.99) break
  }
  console.log(
    "[v0] bruker v3 intensity probe:",
    JSON.stringify({
      dataOffsetCandidates,
      chosenOffset: dataOffset,
      plausibleRatio: bestRatio,
      first5: intensities ? Array.from(intensities.slice(0, 5)).map((x) => Number(x.toFixed(2))) : null,
      last5: intensities ? Array.from(intensities.slice(-5)).map((x) => Number(x.toFixed(2))) : null,
    }),
  )
  if (!intensities || bestRatio < 0.5) {
    throw new BrukerRawError(
      `Bruker RAW v3: could not locate the intensity payload (best plausibility ${(
        bestRatio * 100
      ).toFixed(0)}%). This may be an unsupported firmware variant.`,
      "v3",
    )
  }

  return renderSyntheticAscii({
    sourceLabel: "Bruker RAW v3",
    originalFilename,
    sampleId,
    comment,
    user,
    measureDate,
    measureTime,
    anode,
    alpha1,
    alpha2,
    start2T,
    step,
    intensities,
  })
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Read a fixed-length ASCII string, stopping at the first NUL byte
 *  and silently skipping non-printable bytes (Bruker often pads with
 *  random uninitialised memory, so a strict reader produces garbage). */
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

/** Bounds-checked little-endian float64 read; returns NaN on out-of-range. */
function readSafeF64(dv: DataView, offset: number): number {
  if (offset < 0 || offset + 8 > dv.byteLength) return NaN
  return dv.getFloat64(offset, true)
}

function isPlausibleAngle(x: number): boolean {
  return Number.isFinite(x) && x >= -5 && x <= 180
}

function isPlausibleStep(x: number): boolean {
  return Number.isFinite(x) && x > 0 && x <= 5
}

function isPlausibleWavelength(x: number): boolean {
  // X-ray characteristic lines span ~0.5 (Mo) to ~2.3 Å (Cr). Pad ±0.2.
  return Number.isFinite(x) && x > 0.3 && x < 3.0
}

type SynthArgs = {
  sourceLabel: string
  originalFilename?: string
  sampleId: string
  comment: string
  user: string
  measureDate: string
  measureTime: string
  anode: string
  alpha1: number
  alpha2: number
  start2T: number
  step: number
  intensities: Float32Array
}

/** Render a Bruker-style ASCII export from the parsed binary fields.
 *  The layout matches what Rigaku / Bruker's own text-export menus
 *  produce (bare `Key: value` header lines + a `[Data]` separator + a
 *  2-column body), which `parseXRDMetadata` and `parseXRD` already read
 *  cleanly. So binary uploads slot into the existing ingest pipeline
 *  without any branching downstream. */
function renderSyntheticAscii(a: SynthArgs): string {
  const stop = a.start2T + (a.intensities.length - 1) * a.step
  const lines: string[] = []
  if (a.originalFilename) lines.push(`Filename: ${a.originalFilename}`)
  if (a.measureDate)
    lines.push(`File Created: ${[a.measureDate, a.measureTime].filter(Boolean).join(" ")}`)
  if (a.sampleId) lines.push(`Specimen Id: ${a.sampleId}`)
  if (a.user) lines.push(`User: ${a.user}`)
  if (a.comment) lines.push(`Comment: ${a.comment}`)
  lines.push(`Scan Type: 2Theta Scan`)
  lines.push(`Source: ${a.sourceLabel}`)
  if (a.anode) lines.push(`Anode: ${a.anode}`)
  if (Number.isFinite(a.alpha1)) {
    lines.push(`Wavelength: ${a.alpha1.toFixed(6)}`)
    lines.push(`Kalpha1: ${a.alpha1.toFixed(6)}`)
  }
  if (Number.isFinite(a.alpha2)) lines.push(`Kalpha2: ${a.alpha2.toFixed(6)}`)
  lines.push(`Start Angle: ${a.start2T.toFixed(4)}`)
  lines.push(`Stop Angle: ${stop.toFixed(4)}`)
  lines.push(`Step Size: ${a.step.toFixed(6)}`)
  lines.push(`Num Points: ${a.intensities.length}`)
  lines.push(`[Data]`)
  // Body: tab-delimited 2θ \t intensity. Bruker stores intensity as
  // a float (dead-time corrections produce non-integer counts) so we
  // keep 2 decimals to round-trip without lossy truncation.
  //
  // Sanitise the cell value so a stray NaN / ±Infinity in the source
  // never lands in the synthetic ASCII as the literal "NaN" string —
  // `parseXRD` would skip those rows (Number.isFinite check), and a
  // file with even one bad sample per dozen would lose meaningful
  // data. Clamping to 0 is correct here: every real XRD count is
  // non-negative, and a non-finite value at this stage means the
  // header offset for that sample was in a padding/header byte rather
  // than the count payload — i.e. unknown data, treat as zero.
  for (let i = 0; i < a.intensities.length; i++) {
    const angle = a.start2T + i * a.step
    const raw = a.intensities[i]
    const safe = Number.isFinite(raw) && raw >= 0 ? raw : 0
    lines.push(`${angle.toFixed(4)}\t${safe.toFixed(2)}`)
  }
  return lines.join("\n")
}
