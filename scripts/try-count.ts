// Tests countMatches — the keyword counting rule, in isolation.
//
// countMatches(text, keywords) answers: "how many times does this rule's vocabulary
// appear in this document?" Whole-word, case-insensitive, counting TOTAL occurrences
// across all the keywords (not the number of distinct keywords that matched).
//
// Needs no database and no server, because it is a pure function.
//
//   npm run try-count

import { countMatches } from "../src/scan/engine";
import { check, report } from "./check";

console.log("\ncounting");
check("one keyword, one hit", countMatches("the visa card", ["visa"]), 1);
check("one keyword, repeated", countMatches("visa and visa again", ["visa"]), 2);
check("sums across keywords", countMatches("visa card, cvv 123", ["visa", "cvv"]), 2);
check("keyword absent", countMatches("nothing here", ["visa"]), 0);

console.log("\nwhole-word matching");
// The \b boundaries: 'class' must not match inside 'classified'.
check("substring does not match", countMatches("classified doc", ["class"]), 0);
check("plural does not match singular", countMatches("two visas", ["visa"]), 0);
check("punctuation still bounds a word", countMatches("the secret, ok", ["secret"]), 1);
check("multi-word keyword", countMatches("a credit card here", ["credit card"]), 1);

console.log("\ncase-insensitivity");
check("mixed case all count", countMatches("SECRET Secret secret", ["secret"]), 3);
check("keyword cased differently", countMatches("the secret", ["SECRET"]), 1);

console.log("\nkeyword list hygiene");
// The list is de-duplicated and empties dropped before matching, so a sloppy keyword
// list cannot inflate the count or match at every word boundary.
check("duplicates counted once", countMatches("visa", ["visa", "visa"]), 1);
check("empty keyword ignored", countMatches("the visa card", ["visa", ""]), 1);
check("empty keyword list", countMatches("the visa card", []), 0);

console.log("\nregex safety");
// Keywords are user input and go into a RegExp, so they are escaped first. Unescaped,
// 'a.b' would match 'axb', and 'c++' would throw and turn a scan into a 500.
check("dot is literal, not a wildcard", countMatches("axb", ["a.b"]), 0);
check("dot matches a real dot", countMatches("a.b", ["a.b"]), 1);
check("metacharacters do not throw", countMatches("c++ code", ["c++"]), 0);

console.log("\nedges");
check("empty text", countMatches("", ["visa"]), 0);
check("keyword longer than text", countMatches("hi", ["hello there"]), 0);

report();
