// End-to-end check for scanText. No database, no server — hand-built rules in, verdict out.
// Run with:  npm run try-scan

import { scanText } from "../src/scan/engine";
import type { DataType, ScanResult } from "../src/domain/types";

let failures = 0;

function pass(label: string, extra = "") {
  console.log(`  ok    ${label}${extra ? "  " + extra : ""}`);
}
function fail(label: string, detail: unknown) {
  failures++;
  console.error(`  FAIL  ${label}  →`, JSON.stringify(detail));
}

/** Build a DataType without repeating the boilerplate fields the engine ignores. */
function rule(name: string, content: string[], threshold: number): DataType {
  return { id: `id-${name}`, name, description: "test rule", type: "keywords", content, threshold };
}

/** Assert the verdict, and which rules fired with what counts (order-independent). */
function expectResult(
  label: string,
  result: ScanResult,
  wanted: { name: string; match_count: number }[] | null
) {
  if (wanted === null) {
    if (result.status !== "not matched") return fail(label, result);
    // The PDF's not-matched payload is exactly { status: "not matched" } and nothing else.
    if ("detected_objects" in result) return fail(label + " (stray detected_objects key)", result);
    return pass(label, '→ { status: "not matched" }');
  }

  if (result.status !== "match") return fail(label, result);
  const got = result.detected_objects
    .map((d) => `${d.name}:${d.match_count}`)
    .sort()
    .join(", ");
  const exp = wanted.map((w) => `${w.name}:${w.match_count}`).sort().join(", ");
  if (got !== exp) return fail(`${label} (wanted ${exp})`, got);
  pass(label, `→ ${got}`);
}

console.log("\nthreshold boundary");
expectResult(
  "count exactly equals threshold matches (>= not >)",
  scanText("secret and confidential", [rule("Sensitive", ["secret", "confidential"], 2)]),
  [{ name: "Sensitive", match_count: 2 }]
);
expectResult(
  "one below threshold does not match",
  scanText("secret only", [rule("Sensitive", ["secret", "confidential"], 2)]),
  null
);
expectResult(
  "above threshold matches and reports the real count",
  scanText("secret secret secret", [rule("Sensitive", ["secret"], 2)]),
  [{ name: "Sensitive", match_count: 3 }]
);

console.log("\nwhole-word matching");
expectResult(
  "'class' does not match 'classified'",
  scanText("classified document", [rule("Codewords", ["class"], 1)]),
  null
);

console.log("\ncase-insensitivity");
expectResult(
  "uppercase text matches lowercase keyword",
  scanText("SECRET Secret secret", [rule("Sensitive", ["secret"], 3)]),
  [{ name: "Sensitive", match_count: 3 }]
);

console.log("\nOR logic across data types");
const creditCard = rule("Credit Card Terms", ["visa", "cvv"], 3);
const medical = rule("Medical Terms", ["diagnosis"], 1);
expectResult(
  "only the rule over its own threshold is reported",
  scanText("diagnosis of the visa", [creditCard, medical]),
  [{ name: "Medical Terms", match_count: 1 }]
);
expectResult(
  "both rules over threshold are both reported",
  scanText("visa cvv diagnosis", [rule("Credit Card Terms", ["visa", "cvv"], 2), medical]),
  [
    { name: "Credit Card Terms", match_count: 2 },
    { name: "Medical Terms", match_count: 1 },
  ]
);
expectResult(
  "no rule over threshold means not matched",
  scanText("nothing interesting here", [creditCard, medical]),
  null
);

console.log("\nedges");
expectResult("empty text", scanText("", [rule("Sensitive", ["secret"], 1)]), null);
expectResult("empty data type list (data set with no types)", scanText("secret", []), null);

console.log("\nreported shape");
const shaped = scanText("secret", [rule("Sensitive", ["secret"], 1)]);
if (shaped.status === "match") {
  const d = shaped.detected_objects[0];
  const keys = Object.keys(d).sort().join(",");
  if (keys === "id,match_count,name") pass("detected object has exactly id, name, match_count");
  else fail("detected object keys", keys);
  if (d.id === "id-Sensitive") pass("detected object carries the data type id");
  else fail("detected object id", d.id);
} else {
  fail("reported shape setup", shaped);
}

console.log(failures === 0 ? "\nall checks passed\n" : `\n${failures} check(s) failed\n`);
process.exitCode = failures === 0 ? 0 : 1;
