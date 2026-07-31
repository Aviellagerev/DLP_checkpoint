// Dev utility: exercises every repository method against a real Postgres.
// Run with:  npm run smoke      (needs docker compose up -d first)
//
// This verifies the data layer end-to-end without needing any routes to exist yet.
// It cleans up everything it creates. Safe to delete once the API is working.

import "dotenv/config";
import { dataTypeRepository, dataSetRepository } from "../src/repositories";
import { pool } from "../src/repositories/pg/pool";

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}`, detail !== undefined ? detail : "");
  }
}

async function main() {
  console.log("\ndata types");

  const dt = await dataTypeRepository.create({
    name: "Smoke Keywords",
    description: "created by scripts/smoke.ts",
    type: "keywords",
    content: ["secret", "confidential"],
    threshold: 2,
  });
  check("create returns a generated uuid", /^[0-9a-f-]{36}$/.test(dt.id), dt.id);
  check("create round-trips the content array", dt.content.length === 2, dt.content);
  check("threshold comes back as a number", typeof dt.threshold === "number");

  const fetched = await dataTypeRepository.findById(dt.id);
  check("findById finds it", fetched?.id === dt.id);
  check("findById on unknown id returns null", (await dataTypeRepository.findById("nope")) === null);

  const many = await dataTypeRepository.findManyByIds([dt.id, "nonexistent"]);
  check("findManyByIds ignores unknown ids", many.length === 1, many.length);
  check("findManyByIds([]) returns []", (await dataTypeRepository.findManyByIds([])).length === 0);

  const updated = await dataTypeRepository.update(dt.id, {
    name: "Smoke Keywords v2",
    description: "updated",
    type: "keywords",
    content: ["secret"],
    threshold: 1,
  });
  check("update replaces every field", updated?.name === "Smoke Keywords v2" && updated?.content.length === 1);
  check("update on unknown id returns null", (await dataTypeRepository.update("nope", {
    name: "x", description: "x", type: "keywords", content: ["x"], threshold: 1,
  })) === null);

  console.log("\ndata sets");

  const ds = await dataSetRepository.create({ name: "Smoke Set", dataTypeIds: [dt.id] });
  check("create links the data type", ds.dataTypeIds.length === 1, ds.dataTypeIds);

  const dsFetched = await dataSetRepository.findById(ds.id);
  check("findById aggregates linked ids", dsFetched?.dataTypeIds[0] === dt.id, dsFetched?.dataTypeIds);

  // The edge case the COALESCE + FILTER in SELECT_DATA_SETS exists for.
  const empty = await dataSetRepository.create({ name: "Smoke Empty", dataTypeIds: [] });
  const emptyFetched = await dataSetRepository.findById(empty.id);
  check("empty data set reads back as [] not [null]",
    Array.isArray(emptyFetched?.dataTypeIds) && emptyFetched?.dataTypeIds.length === 0,
    emptyFetched?.dataTypeIds);

  // Duplicate ids must not blow up the primary key on the join table.
  const dupes = await dataSetRepository.create({ name: "Smoke Dupes", dataTypeIds: [dt.id, dt.id] });
  check("duplicate ids are de-duplicated", dupes.dataTypeIds.length === 1, dupes.dataTypeIds);

  const dsUpdated = await dataSetRepository.update(ds.id, { name: "Smoke Set v2", dataTypeIds: [] });
  check("update can remove all links", dsUpdated?.dataTypeIds.length === 0, dsUpdated?.dataTypeIds);
  check("update persisted the removal",
    (await dataSetRepository.findById(ds.id))?.dataTypeIds.length === 0);
  check("update on unknown id returns null",
    (await dataSetRepository.update("nope", { name: "x", dataTypeIds: [] })) === null);

  // A bad data type id must be rejected by the foreign key, not silently stored.
  let fkRejected = false;
  try {
    await dataSetRepository.create({ name: "Smoke Bad FK", dataTypeIds: ["does-not-exist"] });
  } catch {
    fkRejected = true;
  }
  check("unknown data type id is rejected by the foreign key", fkRejected);

  console.log("\ncleanup");

  check("delete data set", (await dataSetRepository.delete(ds.id)) === true);
  check("delete is idempotent (second call false)", (await dataSetRepository.delete(ds.id)) === false);
  await dataSetRepository.delete(empty.id);
  await dataSetRepository.delete(dupes.id);
  check("delete data type", (await dataTypeRepository.delete(dt.id)) === true);
  check("delete unknown data type returns false", (await dataTypeRepository.delete("nope")) === false);
}

main()
  .then(() => {
    console.log(failures === 0 ? "\nall checks passed\n" : `\n${failures} check(s) failed\n`);
    process.exitCode = failures === 0 ? 0 : 1;
  })
  .catch((err) => {
    console.error("\nsmoke test crashed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
