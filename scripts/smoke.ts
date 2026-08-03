// Tests the repositories against a real Postgres.
//
// This is the only script that touches a database. It verifies that the SQL in
// src/repositories/pg/ actually works — the two-table assembly for data sets, the
// transactions, and the foreign key — without needing any routes or HTTP.
//
// Everything it creates is deleted at the end.
//
//   docker compose up -d
//   npm run smoke

import "dotenv/config";
import { dataTypeRepository, dataSetRepository } from "../src/repositories";
import { pool } from "../src/repositories/pg/pool";
import { check, report } from "./check";

async function main() {
  console.log("\ndata types");

  const dt = await dataTypeRepository.create({
    name: "Smoke Keywords",
    description: "created by scripts/smoke.ts",
    type: "keywords",
    content: ["secret", "confidential"],
    threshold: 2,
  });
  check("create generates a uuid", dt.id.length, 36);
  check("create round-trips the keyword array", dt.content, ["secret", "confidential"]);
  check("threshold comes back as a number", typeof dt.threshold, "number");

  check("findById returns the row", (await dataTypeRepository.findById(dt.id))?.name, "Smoke Keywords");
  check("findById on unknown id is null", await dataTypeRepository.findById("nope"), null);

  // findManyByIds is the bulk lookup the scan flow uses. Unknown ids are simply absent
  // from the result rather than an error.
  const many = await dataTypeRepository.findManyByIds([dt.id, "nope"]);
  check("findManyByIds skips unknown ids", many.length, 1);
  check("findManyByIds([]) returns []", await dataTypeRepository.findManyByIds([]), []);

  // Update is a full replace: every column is overwritten.
  const updated = await dataTypeRepository.update(dt.id, {
    name: "Smoke v2",
    description: "updated",
    type: "keywords",
    content: ["secret"],
    threshold: 1,
  });
  check("update replaces every field", [updated?.name, updated?.content, updated?.threshold], ["Smoke v2", ["secret"], 1]);
  check(
    "update on unknown id is null",
    await dataTypeRepository.update("nope", { name: "x", description: "", type: "keywords", content: ["x"], threshold: 1 }),
    null
  );

  console.log("\ndata sets");

  const ds = await dataSetRepository.create({ name: "Smoke Set", dataTypeIds: [dt.id] });
  check("create links the data type", ds.dataTypeIds, [dt.id]);
  check("findById reassembles the links", (await dataSetRepository.findById(ds.id))?.dataTypeIds, [dt.id]);

  // A data set with no links must read back as [] — the reason findAll/findById group
  // the join rows in application code rather than relying on a SQL aggregate.
  const empty = await dataSetRepository.create({ name: "Smoke Empty", dataTypeIds: [] });
  check("empty data set reads back as []", (await dataSetRepository.findById(empty.id))?.dataTypeIds, []);

  // Duplicates are removed before insert, so they cannot violate the join table's
  // composite primary key.
  const dupes = await dataSetRepository.create({ name: "Smoke Dupes", dataTypeIds: [dt.id, dt.id] });
  check("duplicate ids are de-duplicated", dupes.dataTypeIds, [dt.id]);

  // Update replaces the links wholesale (DELETE then INSERT), so removal works.
  const cleared = await dataSetRepository.update(ds.id, { name: "Smoke v2", dataTypeIds: [] });
  check("update can remove all links", cleared?.dataTypeIds, []);
  check("the removal persisted", (await dataSetRepository.findById(ds.id))?.dataTypeIds, []);
  check("update on unknown id is null", await dataSetRepository.update("nope", { name: "x", dataTypeIds: [] }), null);

  // The foreign key is the last line of defence: a data set can never reference a data
  // type that does not exist, even if the route check were bypassed.
  let rejected = false;
  try {
    await dataSetRepository.create({ name: "Smoke Bad", dataTypeIds: ["does-not-exist"] });
  } catch {
    rejected = true;
  }
  check("foreign key rejects an unknown data type id", rejected, true);

  console.log("\ncleanup");

  check("delete returns true", await dataSetRepository.delete(ds.id), true);
  check("deleting again returns false", await dataSetRepository.delete(ds.id), false);
  await dataSetRepository.delete(empty.id);
  await dataSetRepository.delete(dupes.id);
  check("delete data type", await dataTypeRepository.delete(dt.id), true);
  check("delete unknown data type returns false", await dataTypeRepository.delete("nope"), false);
}

main()
  .then(report)
  .catch((err) => {
    console.error("\nsmoke test crashed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
