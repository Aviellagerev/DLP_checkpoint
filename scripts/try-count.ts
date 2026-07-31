// Quick check for countMatches. No database, no server — pure function in, number out.
// Run with:  npm run try-count

import { countMatches } from "../src/scan/engine";

let failures = 0;

function expect(label: string, actual: number, wanted: number) {
  if (actual === wanted) {
    console.log(`  ok    ${label}  → ${actual}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}  → got ${actual}, wanted ${wanted}`);
  }
}

console.log("\ncounting");
expect("single keyword, one hit", countMatches("the visa card", ["visa"]), 1);
expect("single keyword, repeated", countMatches("visa and visa again", ["visa"]), 2);
expect("sums across keywords", countMatches("visa card, cvv 123", ["visa", "cvv"]), 2);
expect("keyword absent", countMatches("nothing here", ["visa"]), 0);

console.log("\nwhole-word matching");
expect("substring does NOT match", countMatches("classified document", ["class"]), 0);
expect("trailing punctuation still matches", countMatches("the secret, ok", ["secret"]), 1);
expect("plural does NOT match singular", countMatches("two visas", ["visa"]), 0);
expect("multi-word keyword", countMatches("a credit card here", ["credit card"]), 1);

console.log("\ncase-insensitivity");
expect("mixed case all count", countMatches("SECRET Secret secret", ["secret"]), 3);
expect("keyword cased differently", countMatches("the secret", ["SECRET"]), 1);

console.log("\nkeyword list hygiene");
expect("duplicates counted once", countMatches("visa", ["visa", "visa"]), 1);
expect("empty keyword ignored", countMatches("the visa card", ["visa", ""]), 1);
expect("empty keyword list", countMatches("the visa card", []), 0);

console.log("\nregex safety");
expect("dot is literal, not wildcard", countMatches("axb", ["a.b"]), 0);
expect("dot matches a real dot", countMatches("a.b", ["a.b"]), 1);

let threw = false;
try {
  countMatches("c++ code", ["c++"]);
} catch {
  threw = true;
}
expect("metacharacter keyword does not throw", threw ? 1 : 0, 0);

console.log("\nedges");
expect("empty text", countMatches("", ["visa"]), 0);
expect("keyword longer than text", countMatches("hi", ["hello there"]), 0);

console.log(failures === 0 ? "\nall checks passed\n" : `\n${failures} check(s) failed\n`);
process.exitCode = failures === 0 ? 0 : 1;
