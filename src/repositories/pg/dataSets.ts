import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "./pool";
import type { DataSetRepository } from "../types";
import type { DataSet } from "../../domain/types";

function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

async function linkDataTypes(
  client: PoolClient,
  dataSetId: string,
  dataTypeIds: string[]
): Promise<void> {
  for (const dataTypeId of dataTypeIds) {
    await client.query(
      `INSERT INTO data_set_data_types (data_set_id, data_type_id) VALUES ($1, $2)`,
      [dataSetId, dataTypeId]
    );
  }
}

export const pgDataSetRepository: DataSetRepository = {
  async findAll() {
    const sets = await pool.query<{ id: string, name: string }>(
      `SELECT id,name FROM data_sets ORDER BY name`
    );
    const links = await pool.query<{ data_set_id: string; data_type_id: string }>(
      `SELECT data_set_id, data_type_id FROM data_set_data_types ORDER BY data_type_id`
    );
    const byDataSet = new Map<string, string[]>();
    for (const row of links.rows) {
      const list = byDataSet.get(row.data_set_id) ?? [];
      list.push(row.data_type_id);
      byDataSet.set(row.data_set_id, list);
    }
    return sets.rows.map((s) => ({
      id: s.id,
      name: s.name,
      dataTypeIds: byDataSet.get(s.id) ?? [],
    }));
  },

  async findById(id) {
    const set = await pool.query<{ id: string; name: string }>(
      `SELECT id,name FROM data_sets WHERE id = $1`, [id]
    );
    if (!set.rows[0]) { return null; }

    const links = await pool.query<{ data_type_id: string }>(
      `SELECT data_type_id FROM data_set_data_types
      WHERE data_set_id = $1
      ORDER BY data_type_id`, [id]
    );
    return {
      id: set.rows[0].id,
      name: set.rows[0].name,
      dataTypeIds: links.rows.map((r) => r.data_type_id),
    };
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
 
    const { rowCount } = await pool.query(`DELETE FROM data_sets WHERE id = $1`, [
      id,
    ]);
    return (rowCount ?? 0) > 0;
  },
};
