// PANalytical XRDML parser.
//
// XRDML is the XML format Empyrean / X'Pert PRO / Aeris instruments
// write by default. The schema is well-documented and stable across
// firmware versions, so we can parse with the browser's built-in
// DOMParser instead of pulling in a multi-100-KB XML library.
//
// Output is synthetic ASCII in the same layout as `xrd-parser-bruker`
// produces, so XRDML uploads ride the same `parseXRD()` pipeline as
// every other text format with zero branching downstream.

export class XrdmlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "XrdmlError"
  }
}

/** Cheap XML sniff — checks the first 512 bytes for the XRDML root
 *  element name. Tolerates UTF-8 BOMs and leading whitespace. */
export function isXrdml(buf: ArrayBuffer): boolean {
  // Most XRDML files are < 2 MB; sniffing the first 512 bytes is
  // enough to find `<xrdMeasurements` even after an XML prolog +
  // namespace declarations. Don't try to UTF-8-decode the whole file
  // here; that's wasted work if it turns out to be binary.
  const head = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 512))
  // Two known root variants: <xrdMeasurements> (modern) and the
  // singular <xrdMeasurement> seen in some older files.
  return /<\s*xrdMeasurements?\b/i.test(head)
}

/** Convert an XRDML buffer to ASCII text in the layout `parseXRD`
 *  expects. Throws `XrdmlError` if the file isn't XRDML, the XML is
 *  malformed, or required elements (intensities / start position) are
 *  missing. */
export function xrdmlToText(buf: ArrayBuffer, originalFilename?: string): string {
  // We're always called from a browser context (upload modal / drop
  // overlay), so DOMParser is available. If we ever invoke this in
  // SSR (e.g. during cloud rehydrate), we'd swap in `@xmldom/xmldom`
  // — but synthetic ASCII is what's stored, not the original XML, so
  // the SSR path doesn't actually need to parse XRDML.
  if (typeof DOMParser === "undefined") {
    throw new XrdmlError("XRDML parser requires a browser DOMParser; called from non-browser context.")
  }

  const xml = new TextDecoder("utf-8").decode(buf)
  const doc = new DOMParser().parseFromString(xml, "text/xml")

  // Browsers wrap parse errors in a `<parsererror>` element rather
  // than throwing — promote it to a real exception so callers can
  // pattern-match.
  const parseError = doc.querySelector("parsererror")
  if (parseError) {
    throw new XrdmlError(
      `XRDML XML is malformed: ${parseError.textContent?.slice(0, 200) ?? "unknown error"}`,
    )
  }

  // ── Wavelength ────────────────────────────────────────────────
  // Schema gives us kAlpha1 / kAlpha2 directly under <usedWavelength>.
  // If for some reason both are missing we leave the field NaN and let
  // downstream code default to Cu Kα.
  const alpha1 = readChildNum(doc, "kAlpha1")
  const alpha2 = readChildNum(doc, "kAlpha2")

  // ── Sample / scan metadata ────────────────────────────────────
  const sampleEl = doc.querySelector("sample")
  const sampleId = sampleEl?.getAttribute("id")?.trim() ?? ""
  const sampleName = sampleEl?.querySelector("name")?.textContent?.trim() ?? ""
  const operator = doc.querySelector("operator name")?.textContent?.trim() ?? ""
  const startTimeStamp = doc.querySelector("startTimeStamp")?.textContent?.trim() ?? ""
  const comment =
    doc.querySelector("comment")?.textContent?.trim() ??
    doc.querySelector("entry comment")?.textContent?.trim() ??
    ""
  const anode =
    doc.querySelector("usedWavelength")?.getAttribute("intended") ??
    doc.querySelector("anode")?.textContent ??
    ""

  // ── First scan with a dataPoints payload ─────────────────────
  // XRDML files can contain multiple <scan> elements (e.g. an
  // alignment pre-scan + the main pattern). We pick the first one
  // that actually has intensities — covers the 95% case where there
  // *is* only one, plus older files that emit a tiny calibration
  // scan first.
  const scans = Array.from(doc.querySelectorAll("scan"))
  const scan = scans.find((s) => s.querySelector("intensities")) ?? scans[0]
  if (!scan) {
    throw new XrdmlError("XRDML file contains no <scan> elements.")
  }
  const dataPoints = scan.querySelector("dataPoints")
  if (!dataPoints) {
    throw new XrdmlError("XRDML <scan> has no <dataPoints> block.")
  }

  // 2θ axis position. Some PANalytical files have multiple <positions>
  // siblings (e.g. omega + 2theta scans) — pick the one whose
  // axis attribute mentions "2Theta". Falls back to the first
  // <positions> element when nothing matches (older files).
  const positionsList = Array.from(dataPoints.querySelectorAll("positions"))
  const twoThetaPos =
    positionsList.find((p) => /2theta|2θ/i.test(p.getAttribute("axis") ?? "")) ??
    positionsList[0]
  if (!twoThetaPos) {
    throw new XrdmlError("XRDML <dataPoints> has no <positions> describing the 2θ axis.")
  }
  const startPosition = readChildNum(twoThetaPos, "startPosition")
  const endPosition = readChildNum(twoThetaPos, "endPosition")
  if (!Number.isFinite(startPosition) || !Number.isFinite(endPosition)) {
    throw new XrdmlError("XRDML <positions> missing startPosition / endPosition.")
  }
  if (startPosition === endPosition) {
    throw new XrdmlError("XRDML scan has zero angular range (startPosition == endPosition).")
  }

  // ── Intensity payload ─────────────────────────────────────────
  // <intensities>123 456 789 ...</intensities>  — whitespace-
  // delimited integers (counts). Empyrean files sometimes emit them
  // with newline separators every ~100 values which reads fine via
  // split(/\s+/).
  const intensitiesText = dataPoints.querySelector("intensities")?.textContent ?? ""
  if (!intensitiesText.trim()) {
    throw new XrdmlError("XRDML <intensities> element is empty.")
  }
  const intensities = intensitiesText
    .trim()
    .split(/\s+/)
    .map((tok) => Number.parseFloat(tok))
    .filter((v) => Number.isFinite(v))
  if (intensities.length < 10) {
    throw new XrdmlError(
      `XRDML scan has too few data points (${intensities.length}) — file may be a calibration / alignment scan rather than a real pattern.`,
    )
  }

  // Step is computed from start/end + the count. PANalytical also
  // exposes <commonCountingTime> but counting time isn't needed by
  // any UI today, so we don't surface it.
  const step = (endPosition - startPosition) / (intensities.length - 1)

  return renderSyntheticAscii({
    sourceLabel: "PANalytical XRDML",
    originalFilename,
    sampleId: sampleName ? `${sampleName}${sampleId ? ` (${sampleId})` : ""}` : sampleId,
    comment,
    user: operator,
    measureDate: startTimeStamp,
    anode,
    alpha1: Number.isFinite(alpha1) ? alpha1 : NaN,
    alpha2: Number.isFinite(alpha2) ? alpha2 : NaN,
    start2T: startPosition,
    step,
    intensities,
  })
}

// ── Helpers ───────────────────────────────────────────────────────────

function readChildNum(parent: ParentNode, tagName: string): number {
  const el = parent.querySelector(tagName)
  if (!el?.textContent) return NaN
  const v = Number.parseFloat(el.textContent.trim())
  return Number.isFinite(v) ? v : NaN
}

type SynthArgs = {
  sourceLabel: string
  originalFilename?: string
  sampleId: string
  comment: string
  user: string
  measureDate: string
  anode: string
  alpha1: number
  alpha2: number
  start2T: number
  step: number
  intensities: number[]
}

function renderSyntheticAscii(a: SynthArgs): string {
  const stop = a.start2T + (a.intensities.length - 1) * a.step
  const lines: string[] = []
  if (a.originalFilename) lines.push(`Filename: ${a.originalFilename}`)
  if (a.measureDate) lines.push(`File Created: ${a.measureDate}`)
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
  for (let i = 0; i < a.intensities.length; i++) {
    const angle = a.start2T + i * a.step
    lines.push(`${angle.toFixed(4)}\t${a.intensities[i].toFixed(2)}`)
  }
  return lines.join("\n")
}
