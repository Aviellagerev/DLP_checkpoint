// Postgres implementation of DataSetRepository.
//
// A data set spans two tables (data_sets + data_set_data_types), so reads aggregate
// the linked ids back into an array and writes run inside a transaction.

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "./pool";
import type { DataSetRepository } from "../types";
import type { DataSet } from "../../domain/types";

interface DataSetRow {
  id: string;
  name: string;
  data_type_ids: string[];
}

function toDomain(row: DataSetRow): DataSet {
  return { id: row.id, name: row.name, dataTypeIds: row.data_type_ids };
}

// A data set with no links LEFT JOINs to one all-NULL row, and a bare array_agg would
// turn that into [null]. FILTER drops the NULL, and COALESCE turns the now-empty
// aggregate into '{}' so the caller always gets a real array.
const SELECT_DATA_SETS = `
  SELECT ds.id,
         ds.name,
         COALESCE(
           array_agg(link.data_type_id ORDER BY link.data_type_id)
             FILTER (WHERE link.data_type_id IS NOT NULL),
           '{}'
         ) AS data_type_ids
    FROM data_sets ds
    LEFT JOIN data_set_data_types link ON link.data_set_id = ds.id
`;

// Reads sort the aggregated ids, so writes store a sorted, de-duplicated list. That
// way the body returned by POST/PUT is identical to what a later GET produces.
function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

async function linkDataTypes(
  client: PoolClient,
  dataSetId: string,
  dataTypeIds: string[]
): Promise<void> {
  if (dataTypeIds.length === 0) return;
  // unnest expands the array into one row per id, so this inserts N links in a
  // single round trip instead of a loop of queries.
  await client.query(
    `INSERT INTO data_set_data_types (data_set_id, data_type_id)
          SELECT $1, unnest($2::text[])`,
    [dataSetId, dataTypeIds]
  );
}

export const pgDataSetRepository: DataSetRepository = {
  async findAll() {
    const { rows } = await pool.query<DataSetRow>(
      `${SELECT_DATA_SETS} GROUP BY ds.id, ds.name ORDER BY ds.name`
    );
    return rows.map(toDomain);
  },

  async findById(id) {
    const { rows } = await pool.query<DataSetRow>(
      `${SELECT_DATA_SETS} WHERE ds.id = $1 GROUP BY ds.id, ds.name`,
      [id]
    );
    return rows[0] ? toDomain(rows[0]) : null;
  },

  async create(input) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const id = randomUUID();
      const dataTypeIds = normalizeIds(input.dataTypeIds);

      await client.query(`INSERT INTO data_sets (id, name) VALUES ($1, $2)`, [
        id,
        input.name,
      ]);
      // Throws on a foreign key violation if an id does not exist. Routes are
      // expected to reject unknown ids with a 400 before calling this.
      await linkDataTypes(client, id, dataTypeIds);

      await client.query("COMMIT");
      return { id, name: input.name, dataTypeIds };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      // Must run on every path, or the connection leaks and the pool eventually
      // hangs with no error.
      client.release();
    }
  },

  async update(id, input) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rowCount } = await client.query(
        `UPDATE data_sets SET name = $2 WHERE id = $1`,
        [id, input.name]
      );
      if (rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      // Full replace: drop the existing links, then insert the new set.
      const dataTypeIds = normalizeIds(input.dataTypeIds);
      await client.query(
        `DELETE FROM data_set_data_types WHERE data_set_id = $1`,
        [id]
      );
      await linkDataTypes(client, id, dataTypeIds);

      await client.query("COMMIT");
      return { id, name: input.name, dataTypeIds };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async delete(id) {
    // Links are removed by ON DELETE CASCADE, so this needs no transaction.
    const { rowCount } = await pool.query(`DELETE FROM data_sets WHERE id = $1`, [
      id,
    ]);
    return (rowCount ?? 0) > 0;
  },
};
