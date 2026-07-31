-- Schema for the simplified DLP platform.
--
-- docker-compose mounts this file into /docker-entrypoint-initdb.d/, which Postgres
-- executes automatically the first time the container creates its data volume.
-- To re-run it after changing this file:  docker compose down -v && docker compose up -d
-- (-v drops the volume; without it Postgres sees an initialised cluster and skips this.)

CREATE TYPE data_type_enum AS ENUM ('keywords');

CREATE TABLE data_types (
    id          TEXT           PRIMARY KEY,
    name        TEXT           NOT NULL,
    description TEXT           NOT NULL,
    type        data_type_enum NOT NULL DEFAULT 'keywords',
    content     TEXT[]         NOT NULL DEFAULT '{}',
    threshold   INTEGER        NOT NULL
);

CREATE TABLE data_sets (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- Join table for the many-to-many between data sets and data types.
--
-- The assignment models a Data Set as holding "data_type_ids: ARRAY of DT UUIDs".
-- A real relation is used instead of a TEXT[] column so the database enforces that
-- every referenced data type exists, and cleans up links automatically on delete.
-- The API still presents the relationship as a plain array of ids.
CREATE TABLE data_set_data_types (
    data_set_id  TEXT NOT NULL REFERENCES data_sets(id)  ON DELETE CASCADE,
    data_type_id TEXT NOT NULL REFERENCES data_types(id) ON DELETE CASCADE,
    PRIMARY KEY (data_set_id, data_type_id)
);

-- The primary key already indexes (data_set_id, data_type_id) left-to-right, which
-- covers "which data types are in this set?". This covers the reverse direction:
-- "which sets reference this data type?" — needed when deleting a data type.
CREATE INDEX data_set_data_types_data_type_id_idx
    ON data_set_data_types (data_type_id);
