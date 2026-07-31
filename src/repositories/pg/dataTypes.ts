// Postgres implementation of DataTypeRepository.

import { randomUUID } from "node:crypto";
import { pool } from "./pool";
import type { DataTypeRepository } from "../types";
import type { DataType, DataTypeKind } from "../../domain/types";

// Shape of a row from data_types. node-postgres maps TEXT[] to string[] and
// INTEGER to number, so this lines up with the domain type one-for-one.
interface DataTypeRow {
  id: string;
  name: string;
  description: string;
  type: DataTypeKind;
  content: string[];
  threshold: number;
}

function toDomain(row: DataTypeRow): DataType {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    content: row.content,
    threshold: row.threshold,
  };
}

// A fixed literal, never built from user input — safe to interpolate into SQL.
// Every value below is passed as a $n parameter instead.
const COLUMNS = "id, name, description, type, content, threshold";

export const pgDataTypeRepository: DataTypeRepository = {
  async findAll() {
    const { rows } = await pool.query<DataTypeRow>(
      `SELECT ${COLUMNS} FROM data_types ORDER BY name`
    );
    return rows.map(toDomain);
  },

  async findById(id) {
    const { rows } = await pool.query<DataTypeRow>(
      `SELECT ${COLUMNS} FROM data_types WHERE id = $1`,
      [id]
    );
    return rows[0] ? toDomain(rows[0]) : null;
  },

  async findManyByIds(ids) {
    if (ids.length === 0) return [];
    // = ANY($1) takes the whole array as a single parameter, so there is no
    // dynamically built IN (...) list and no injection surface.
    const { rows } = await pool.query<DataTypeRow>(
      `SELECT ${COLUMNS} FROM data_types WHERE id = ANY($1::text[])`,
      [ids]
    );
    return rows.map(toDomain);
  },

  async create(input) {
    const { rows } = await pool.query<DataTypeRow>(
      `INSERT INTO data_types (id, name, description, type, content, threshold)
            VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${COLUMNS}`,
      [
        randomUUID(),
        input.name,
        input.description,
        input.type,
        input.content,
        input.threshold,
      ]
    );
    return toDomain(rows[0]);
  },

  async update(id, input) {
    // Full replace (PUT semantics): every column is overwritten.
    const { rows } = await pool.query<DataTypeRow>(
      `UPDATE data_types
          SET name = $2, description = $3, type = $4, content = $5, threshold = $6
        WHERE id = $1
    RETURNING ${COLUMNS}`,
      [id, input.name, input.description, input.type, input.content, input.threshold]
    );
    return rows[0] ? toDomain(rows[0]) : null;
  },

  async delete(id) {
    // Links in data_set_data_types are removed by ON DELETE CASCADE.
    const { rowCount } = await pool.query(
      `DELETE FROM data_types WHERE id = $1`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  },
};
