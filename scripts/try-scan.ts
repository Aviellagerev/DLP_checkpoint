

import { scanText } from "../src/scan/engine";
import type { DataType } from "../src/domain/types";
import { check, report } from "./check";

/** Build a DataType without repeating the fields the engine ignores. */
function rule(name: string, content: string[], threshold: number): DataType {
  return { id: `id-${name}`, name, description: "", type: "keywords", content, threshold };
}

/** The exact not-matched payload — note it carries no detected_objects key at all. */
const NOT_MATCHED = { status: "not matched" };

/** Shorthand for the matched payload with a single rule reported. */
const matched = (name: string, count: number) => ({
  status: "match",
  detected_objects: [{ id: `id-${name}`, name, match_count: count }],
});

const card = rule("Credit Card", ["visa", "cvv"], 3);
const medical = rule("Medical", ["diagnosis"], 1);

console.log("\nthreshold");
// >= not > : a count exactly equal to the threshold must match.
check(
  "count equals threshold matches",
  scanText("secret and confidential", [rule("Sensitive", ["secret", "confidential"], 2)]),
  matched("Sensitive", 2)
);
check(
  "one below threshold does not match",
  scanText("secret only", [rule("Sensitive", ["secret", "confidential"], 2)]),
  NOT_MATCHED
);
check(
  "match_count reports the real count",
  scanText("secret secret secret", [rule("Sensitive", ["secret"], 2)]),
  matched("Sensitive", 3)
);

console.log("\nmatching rules");
check(
  "whole-word only",
  scanText("classified document", [rule("Codeword", ["class"], 1)]),
  NOT_MATCHED
);
check(
  "case-insensitive",
  scanText("SECRET Secret secret", [rule("Sensitive", ["secret"], 3)]),
  matched("Sensitive", 3)
);

console.log("\nOR logic across data types");

check(
  "only the rule over its own threshold is reported",
  scanText("diagnosis of the visa", [card, medical]),
  matched("Medical", 1)
);
check("no rule over threshold", scanText("nothing here", [card, medical]), NOT_MATCHED);
check("two rules can fire at once", scanText("visa cvv diagnosis", [rule("Credit Card", ["visa", "cvv"], 2), medical]), {
  status: "match",
  detected_objects: [
    { id: "id-Credit Card", name: "Credit Card", match_count: 2 },
    { id: "id-Medical", name: "Medical", match_count: 1 },
  ],
});

console.log("\nedges");
check("empty text", scanText("", [medical]), NOT_MATCHED);
// A data set with no data types resolves to an empty array here.
check("no data types at all", scanText("diagnosis", []), NOT_MATCHED);

report();
