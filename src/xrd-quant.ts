/**
 * Quantitative XRD analysis — Scherrer crystallite size, lattice
 * parameters per crystal system, and helpers. Pure functions, no
 * dependencies, fully unit-testable. Used by Findings panel.
 *
 * Why a separate file? Tier-A analysis is the kind of thing every
 * downstream consumer (writeup, ask-AI, papers) wants to reference,
 * so we keep formulas in one place rather than duplicating constants
 * across UI components.
 */

const DEFAULT_WAVELENGTH = 1.5406 // Cu Kα1, Å
const DEFAULT_K = 0.9 // Scherrer shape factor (0.9 is common; 0.94 for spheres)

// ─── Scherrer crystallite size ─────────────────────────────────────

/**
 * Scherrer equation: D = K λ / (β cos θ)
 *
 * Where:
 *   D   — mean crystallite size (returned in nm)
 *   K   — shape factor (typically 0.9)
 *   λ   — X-ray wavelength (Å)
 *   β   — FWHM of the peak (radians, instrument-broadening corrected)
 *   θ   — Bragg angle (= 2θ / 2)
 *
 * NOTE: We do NOT subtract instrumental broadening here — that requires
 * a known instrumental FWHM (typically from a LaB6 or Si standard) which
 * the user must provide separately. Without it, D is a LOWER bound on
 * the true crystallite size. The Findings card surfaces this caveat.
 *
 * Returns null when inputs are invalid or the math diverges.
 */
export function scherrerSize({
  twoTheta,
  fwhm,
  wavelength = DEFAULT_WAVELENGTH,
  shapeFactor = DEFAULT_K,
}: {
  twoTheta: number
  fwhm: number // degrees, FWHM in 2θ
  wavelength?: number // Å
  shapeFactor?: number
}): number | null {
  if (!Number.isFinite(twoTheta) || !Number.isFinite(fwhm) || fwhm <= 0) {
    return null
  }
  if (twoTheta <= 0 || twoTheta >= 180) return null
  const thetaRad = ((twoTheta / 2) * Math.PI) / 180
  const fwhmRad = (fwhm * Math.PI) / 180
  const cosTheta = Math.cos(thetaRad)
  if (cosTheta <= 0) return null
  const dAngstrom = (shapeFactor * wavelength) / (fwhmRad * cosTheta)
  return dAngstrom / 10 // Å → nm
}

// ─── Lattice parameter back-calculation ─────────────────────────────

export type CrystalSystem = "cubic" | "hexagonal" | "tetragonal"

export type LatticeResult =
  | { system: "cubic"; a: number; nUsed: number }
  | { system: "hexagonal"; a: number; c: number; nUsed: number }
  | { system: "tetragonal"; a: number; c: number; nUsed: number }

export type IndexedPeak = {
  dSpacing: number
  hkl: string
}

/**
 * Parse a Miller-index string into [h, k, l]. Accepts:
 *   - 3-digit cubic: "111", "200", "311"
 *   - With negatives: "1-10", "-220" (negative applies to next digit)
 *   - 4-index hexagonal: "11-20" → reduced to (h, k, l) = (1, 1, 0)
 *
 * Returns null if the string can't be parsed.
 */
export function parseHkl(hkl: string): [number, number, number] | null {
  if (!hkl) return null
  const tokens: number[] = []
  for (let i = 0; i < hkl.length; i++) {
    const ch = hkl[i]
    if (ch === "-") {
      const next = hkl[i + 1]
      if (!next || !/\d/.test(next)) return null
      tokens.push(-Number(next))
      i++
    } else if (/\d/.test(ch)) {
      tokens.push(Number(ch))
    } else {
      // Whitespace / commas — skip silently.
      continue
    }
  }
  if (tokens.length === 4) {
    // Bravais-Miller (h k i l) → (h, k, l). The third index 'i' is
    // redundant (i = -h-k) and we drop it for our calculations.
    return [tokens[0], tokens[1], tokens[3]]
  }
  if (tokens.length === 3) {
    return [tokens[0], tokens[1], tokens[2]]
  }
  return null
}

/**
 * Cubic: a = d × √(h² + k² + l²). Single-peak estimate.
 */
function cubicA(d: number, h: number, k: number, l: number): number | null {
  const sum = h * h + k * k + l * l
  if (sum === 0) return null
  return d * Math.sqrt(sum)
}

/**
 * Solve a 2x2 normal-equations problem to find (X, Y) given pairs
 * (A_i, B_i, t_i) such that A·X + B·Y = t. Returns null if singular
 * or if the solution falls outside the physically meaningful X, Y > 0
 * region.
 */
function solveTwoVar(
  rows: Array<{ A: number; B: number; t: number }>,
): { X: number; Y: number } | null {
  let sAA = 0,
    sAB = 0,
    sBB = 0,
    sAt = 0,
    sBt = 0
  for (const r of rows) {
    sAA += r.A * r.A
    sAB += r.A * r.B
    sBB += r.B * r.B
    sAt += r.A * r.t
    sBt += r.B * r.t
  }
  const det = sAA * sBB - sAB * sAB
  if (Math.abs(det) < 1e-15) return null
  const X = (sBB * sAt - sAB * sBt) / det
  const Y = (sAA * sBt - sAB * sAt) / det
  if (X <= 0 || Y <= 0) return null
  return { X, Y }
}

/**
 * Estimate lattice parameters for the given crystal system from a list
 * of indexed peaks (each carrying d-spacing + Miller indices).
 *
 * Cubic     — needs ≥1 peak with non-zero (h²+k²+l²)
 * Hexagonal — 1/d² = (4/3)(h² + hk + k²)/a² + l²/c²; needs ≥2 peaks
 *             with linearly independent (A=(4/3)(h²+hk+k²), B=l²)
 * Tetragonal — 1/d² = (h² + k²)/a² + l²/c²; needs ≥2 peaks similarly
 *
 * Returns null when there isn't enough data or the linear system is
 * degenerate (e.g. all peaks have l=0 in hexagonal — can't fit c).
 */
export function fitLattice(
  system: CrystalSystem,
  peaks: readonly IndexedPeak[],
): LatticeResult | null {
  const indexed = peaks
    .map((p) => ({ d: p.dSpacing, idx: parseHkl(p.hkl) }))
    .filter((x): x is { d: number; idx: [number, number, number] } => x.idx !== null)
  if (indexed.length === 0) return null

  if (system === "cubic") {
    // Average the per-peak estimates rather than rely on one — this
    // self-corrects small fitting errors and gives a more robust value.
    const aValues: number[] = []
    for (const p of indexed) {
      const a = cubicA(p.d, ...p.idx)
      if (a && Number.isFinite(a)) aValues.push(a)
    }
    if (aValues.length === 0) return null
    const a = aValues.reduce((s, v) => s + v, 0) / aValues.length
    return { system: "cubic", a, nUsed: aValues.length }
  }

  if (indexed.length < 2) return null

  if (system === "hexagonal") {
    const rows = indexed.map((p) => {
      const [h, k, l] = p.idx
      return {
        A: (4 / 3) * (h * h + h * k + k * k),
        B: l * l,
        t: 1 / (p.d * p.d),
      }
    })
    const sol = solveTwoVar(rows)
    if (!sol) return null
    return {
      system: "hexagonal",
      a: 1 / Math.sqrt(sol.X),
      c: 1 / Math.sqrt(sol.Y),
      nUsed: indexed.length,
    }
  }

  // Tetragonal
  const rows = indexed.map((p) => {
    const [h, k, l] = p.idx
    return {
      A: h * h + k * k,
      B: l * l,
      t: 1 / (p.d * p.d),
    }
  })
  const sol = solveTwoVar(rows)
  if (!sol) return null
  return {
    system: "tetragonal",
    a: 1 / Math.sqrt(sol.X),
    c: 1 / Math.sqrt(sol.Y),
    nUsed: indexed.length,
  }
}

/**
 * Heuristic: pull the crystal system from a phase's free-form notes
 * string (which the AI returns alongside identification). We match
 * common indicator words / space groups. Returns null if uncertain
 * — Findings will then skip the lattice card rather than guessing.
 */
export function detectCrystalSystem(notes?: string): CrystalSystem | null {
  if (!notes) return null
  const t = notes.toLowerCase()
  // Hexagonal first because "wurtzite (P63mc)" matches both 'hex' and
  // potential cubic terms in some compound notes.
  if (
    /wurtzite|hexagonal|h\.?c\.?p\.?|\bp6[_\d]*[\/_]?\d*\b|\bp\s*6\s*3\s*mc\b|graphit/.test(t)
  ) {
    return "hexagonal"
  }
  if (/tetragonal|rutile|anatase|p4[_\d]*[\/_]?\d*|i4[_\d]*[\/_]?\d*/.test(t)) {
    return "tetragonal"
  }
  if (
    /\bcubic\b|f\.?c\.?c\.?|b\.?c\.?c\.?|fluorite|rocksalt|rock-salt|nacl|spinel|pm-?3m|fm-?3m|im-?3m|pa-?3|fd-?3m|perovskite/.test(
      t,
    )
  ) {
    return "cubic"
  }
  return null
}

/**
 * Find the dominant peak (highest intensity) that has a usable FWHM.
 * Used as the input to a single-peak Scherrer estimate.
 */
export function pickScherrerPeak<P extends { intensity: number; fwhm?: number }>(
  peaks: readonly P[],
): P | null {
  const sorted = [...peaks].sort((a, b) => b.intensity - a.intensity)
  for (const p of sorted) {
    if (typeof p.fwhm === "number" && p.fwhm > 0) return p
  }
  return null
}
