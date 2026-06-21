/**
 * Pseudo-Voigt single-peak fitting via Levenberg-Marquardt.
 *
 * Why pV?  It's the universal go-to in XRD profile analysis: the
 * mixing parameter η linearly interpolates between a pure Gaussian
 * (η = 0) and a pure Lorentzian (η = 1), which together cover almost
 * every real powder-XRD line shape (instrumental + size + strain).
 *
 *   pV(x; A, x0, w, η) = A · [η·L(x; x0, w) + (1-η)·G(x; x0, w)]
 *   L(x) = 1 / (1 + ((x - x0) / (w/2))²)            // Lorentzian
 *   G(x) = exp(-(x - x0)² · 4·ln(2) / w²)            // Gaussian
 *
 * Both shapes are normalized to peak height 1 at x = x0 with FWHM = w,
 * so A is the actual fitted peak height above baseline. Integrated
 * intensity (area under the peak) is reported as well.
 *
 * Implementation: textbook Levenberg-Marquardt with NUMERICAL Jacobian.
 * The analytical Jacobian saves a factor of ~5 in cost-evaluations but
 * adds ~80 lines of error-prone math; for the ~30-peaks-per-pattern
 * load XRD typically has, 10-30ms per fit (numerical) is fine. Pure
 * function with no React / browser deps so it can run in a worker
 * later if we add multi-pattern queues.
 */

// ─── Profile functions ──────────────────────────────────────────────

/** Lorentzian normalised to height 1 at x0, FWHM = w. */
function lorentzian(x: number, x0: number, w: number): number {
  const u = (x - x0) / (w / 2)
  return 1 / (1 + u * u)
}

/** Gaussian normalised to height 1 at x0, FWHM = w. */
function gaussian(x: number, x0: number, w: number): number {
  const u = (x - x0) / w
  return Math.exp(-u * u * 4 * Math.LN2)
}

/** Pseudo-Voigt evaluated at x given parameters [A, x0, w, η]. */
export function pseudoVoigt(x: number, p: readonly [number, number, number, number]): number {
  const [A, x0, w, eta] = p
  if (w <= 0) return 0
  return A * (eta * lorentzian(x, x0, w) + (1 - eta) * gaussian(x, x0, w))
}

/** Integrated area under a pseudo-Voigt curve (closed form). */
export function pseudoVoigtArea(p: readonly [number, number, number, number]): number {
  const [A, , w, eta] = p
  // Lorentzian area = A · π·w/2; Gaussian area = A · w · √(π/(4·ln2))
  const lArea = A * (Math.PI * w) / 2
  const gArea = A * w * Math.sqrt(Math.PI / (4 * Math.LN2))
  return eta * lArea + (1 - eta) * gArea
}

// ─── Linear baseline (leftmost ↔ rightmost endpoints) ───────────────

/**
 * Fit a y = m·x + b linear baseline through the median of the leftmost
 * 3 and rightmost 3 window samples. Subtracting this gives the peak's
 * intensity above local background — the part the pseudo-Voigt models.
 */
function fitLinearBaseline(
  xs: readonly number[],
  ys: readonly number[],
): { m: number; b: number } {
  const n = xs.length
  if (n < 4) return { m: 0, b: 0 }
  const k = Math.min(3, Math.floor(n / 4))
  const left = ys.slice(0, k)
  const right = ys.slice(n - k)
  const yL = median(left)
  const yR = median(right)
  const xL = xs[Math.floor((k - 1) / 2)]
  const xR = xs[n - 1 - Math.floor((k - 1) / 2)]
  if (xR === xL) return { m: 0, b: yL }
  const m = (yR - yL) / (xR - xL)
  const b = yL - m * xL
  return { m, b }
}

function median(arr: readonly number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  const n = s.length
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}

// ─── Levenberg-Marquardt (numerical Jacobian) ───────────────────────

type Vec4 = [number, number, number, number]

const PARAM_DELTAS: Vec4 = [1e-4, 1e-4, 1e-4, 1e-4]

function applyBounds(p: Vec4, lo: Vec4, hi: Vec4): Vec4 {
  return [
    Math.max(lo[0], Math.min(hi[0], p[0])),
    Math.max(lo[1], Math.min(hi[1], p[1])),
    Math.max(lo[2], Math.min(hi[2], p[2])),
    Math.max(lo[3], Math.min(hi[3], p[3])),
  ]
}

function residuals(xs: readonly number[], ys: readonly number[], p: Vec4): number[] {
  const r: number[] = new Array(xs.length)
  for (let i = 0; i < xs.length; i++) r[i] = ys[i] - pseudoVoigt(xs[i], p)
  return r
}

function chiSq(rs: readonly number[]): number {
  let s = 0
  for (const r of rs) s += r * r
  return s
}

/** Build numerical Jacobian: rows = data points, cols = params. */
function jacobian(xs: readonly number[], p: Vec4): number[][] {
  const J: number[][] = new Array(xs.length)
  for (let i = 0; i < xs.length; i++) J[i] = [0, 0, 0, 0]
  for (let k = 0; k < 4; k++) {
    const dp = PARAM_DELTAS[k] * (Math.abs(p[k]) + 1)
    const pp = [...p] as Vec4
    const pm = [...p] as Vec4
    pp[k] += dp
    pm[k] -= dp
    for (let i = 0; i < xs.length; i++) {
      // ∂pV/∂p = (pV(p+dp) − pV(p−dp)) / (2·dp); residual derivative is the negation
      J[i][k] = -(pseudoVoigt(xs[i], pp) - pseudoVoigt(xs[i], pm)) / (2 * dp)
    }
  }
  return J
}

/** Solve a 4x4 symmetric positive-definite linear system via Cholesky. */
function solve4(A: number[][], b: number[]): number[] | null {
  const L: number[][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j]
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k]
      if (i === j) {
        if (sum <= 0) return null
        L[i][j] = Math.sqrt(sum)
      } else {
        L[i][j] = sum / L[j][j]
      }
    }
  }
  // Forward solve L·y = b
  const y: number[] = [0, 0, 0, 0]
  for (let i = 0; i < 4; i++) {
    let s = b[i]
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k]
    y[i] = s / L[i][i]
  }
  // Back solve L^T·x = y
  const x: number[] = [0, 0, 0, 0]
  for (let i = 3; i >= 0; i--) {
    let s = y[i]
    for (let k = i + 1; k < 4; k++) s -= L[k][i] * x[k]
    x[i] = s / L[i][i]
  }
  return x
}

export type FitResult = {
  /** [A, x0, w, η] best-fit parameters */
  params: Vec4
  /** Coefficient of determination, 0..1 (1 = perfect fit). */
  rSquared: number
  /** Integrated peak area (above baseline). */
  area: number
  /** Linear baseline subtracted before fitting (returned so the caller
   *  can draw the baseline + fit if they want to). */
  baseline: { m: number; b: number }
  /** Number of L-M iterations executed. */
  iterations: number
}

/**
 * Fit a pseudo-Voigt to the points (xs[i], ys[i]) with a linear
 * baseline. Returns null if the fit can't be evaluated (insufficient
 * data, baseline degenerate, no peak signal).
 *
 * `initial` is the starting guess [A, x0, w, η]. We strongly recommend
 * deriving (x0, w) from the peak finder's outputs, A from the peak
 * height above local minimum, and η = 0.5 as the unbiased start.
 */
export function fitPseudoVoigt(
  xs: readonly number[],
  ys: readonly number[],
  initial: Vec4,
  options: { maxIters?: number; tol?: number } = {},
): FitResult | null {
  const maxIters = options.maxIters ?? 60
  const tol = options.tol ?? 1e-7
  if (xs.length < 5) return null

  // Subtract baseline before fitting so A directly represents peak
  // height above the local background.
  const baseline = fitLinearBaseline(xs, ys)
  const ysBg = ys.map((y, i) => y - (baseline.m * xs[i] + baseline.b))

  // Bounds chosen to keep params physically meaningful AND keep the
  // numerical Jacobian well-conditioned. They're loose enough that
  // a reasonable initial guess always sits well inside.
  const x0Init = initial[1]
  const wInit = Math.max(initial[2], 1e-3)
  const aInit = Math.max(initial[0], Math.max(...ysBg) * 0.1)
  const span = xs[xs.length - 1] - xs[0]
  const lo: Vec4 = [0, x0Init - 0.5 * span, wInit / 8, 0]
  const hi: Vec4 = [aInit * 20, x0Init + 0.5 * span, span * 2, 1]
  let p: Vec4 = applyBounds([aInit, x0Init, wInit, initial[3]], lo, hi)

  let lambda = 1e-3
  let prevChi = chiSq(residuals(xs, ysBg, p))
  let iter = 0

  for (; iter < maxIters; iter++) {
    const r = residuals(xs, ysBg, p)
    const J = jacobian(xs, p)

    // Build normal equations: (JᵀJ + λ·diag(JᵀJ))·δ = -Jᵀr
    const JTJ: number[][] = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]
    const JTr: number[] = [0, 0, 0, 0]
    for (let i = 0; i < xs.length; i++) {
      for (let a = 0; a < 4; a++) {
        JTr[a] += J[i][a] * r[i]
        for (let b = 0; b <= a; b++) {
          JTJ[a][b] += J[i][a] * J[i][b]
        }
      }
    }
    // Symmetrize + add LM damping on diagonal
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < a; b++) JTJ[b][a] = JTJ[a][b]
      JTJ[a][a] *= 1 + lambda
    }

    const delta = solve4(JTJ, JTr.map((v) => -v))
    if (!delta) {
      // System singular — bump damping and try again
      lambda *= 10
      if (lambda > 1e10) break
      continue
    }
    const pNew = applyBounds(
      [p[0] - delta[0], p[1] - delta[1], p[2] - delta[2], p[3] - delta[3]] as Vec4,
      lo,
      hi,
    )
    const chiNew = chiSq(residuals(xs, ysBg, pNew))

    if (chiNew < prevChi) {
      const rel = (prevChi - chiNew) / Math.max(prevChi, 1e-20)
      p = pNew
      prevChi = chiNew
      lambda = Math.max(lambda / 10, 1e-12)
      if (rel < tol) break
    } else {
      lambda *= 10
      if (lambda > 1e10) break
    }
  }

  // Coefficient of determination on the BACKGROUND-SUBTRACTED data —
  // i.e. how well pV explains the peak shape on top of baseline.
  const yMean = ysBg.reduce((s, v) => s + v, 0) / ysBg.length
  let ssTot = 0
  for (const y of ysBg) ssTot += (y - yMean) ** 2
  const rSquared = ssTot > 0 ? 1 - prevChi / ssTot : 0

  return {
    params: p,
    rSquared: Math.max(0, Math.min(1, rSquared)),
    area: pseudoVoigtArea(p),
    baseline,
    iterations: iter,
  }
}

// ─── Window selection helper ────────────────────────────────────────

/**
 * Slice a fit window from a full pattern: ±`halfWidthFwhm` × FWHM
 * around the given center 2θ. Falls back to ±1° if FWHM is unknown.
 * Returns null if fewer than 5 samples land in the window — too few
 * for a stable 4-parameter fit.
 */
export function pickFitWindow(
  points: readonly { twoTheta: number; intensity: number }[],
  centerTwoTheta: number,
  fwhm: number | undefined,
  halfWidthFwhm = 2.5,
): { xs: number[]; ys: number[] } | null {
  const halfDeg = (fwhm ?? 0.4) * halfWidthFwhm
  const xs: number[] = []
  const ys: number[] = []
  for (const pt of points) {
    if (Math.abs(pt.twoTheta - centerTwoTheta) <= halfDeg) {
      xs.push(pt.twoTheta)
      ys.push(pt.intensity)
    }
  }
  if (xs.length < 5) return null
  return { xs, ys }
}
