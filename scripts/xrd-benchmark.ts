import { runXRDBenchmark } from "../src/xrd-benchmark"

function main() {
  const summary = runXRDBenchmark()
  const rows = summary.results.map((result) => ({
    status: result.pass ? "PASS" : "FAIL",
    case: result.case.id,
    expected: result.case.requiredPhaseIds.join(", "),
    found: result.foundPhaseIds.join(", ") || "none",
    top: result.topPhaseHit ? "yes" : "no",
    recall: formatPct(result.phaseRecall),
    strongCoverage: formatPct(result.strongCoverage),
    failures: result.failures.join("; "),
  }))

  console.log("\nSciPhys XRD benchmark")
  console.log("=====================\n")
  console.table(rows)
  console.log("")
  console.log(`Cases: ${summary.passedCases}/${summary.caseCount} passed`)
  console.log(`Top-1 accuracy: ${formatPct(summary.top1Accuracy)}`)
  console.log(`Mean phase recall: ${formatPct(summary.meanPhaseRecall)}`)
  console.log(`Mean strong-peak coverage: ${formatPct(summary.meanStrongCoverage)}`)
  console.log(`False-positive rate: ${formatPct(summary.falsePositiveRate)}`)

  if (!summary.pass) {
    console.error("\nXRD benchmark failed. Inspect failed cases before changing phase matching.")
    process.exitCode = 1
  }
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

main()
