// Minimal assertion helper shared by the test scripts.
//
// No test framework on purpose: for a project this size, small scripts that print one
// line per assertion and exit non-zero on failure are enough, and they need no config
// to read or run.

let failures = 0;

/**
 * Compare two values and print the result.
 *
 * Comparison is by JSON string, which handles numbers, strings, arrays and objects
 * with one rule. Note that means object key ORDER matters — write the expected
 * literal with its keys in the same order the code produces them.
 */
export function check(label: string, actual: unknown, expected: unknown): void {
  const got = JSON.stringify(actual);
  const want = JSON.stringify(expected);

  if (got === want) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}`);
    console.error(`          got:    ${got}`);
    console.error(`          wanted: ${want}`);
  }
}

/** Print the tally and set the exit code. Call once, at the end of a script. */
export function report(): void {
  if (failures === 0) {
    console.log("\nall checks passed\n");
    process.exitCode = 0;
  } else {
    console.log(`\n${failures} check(s) failed\n`);
    process.exitCode = 1;
  }
}
