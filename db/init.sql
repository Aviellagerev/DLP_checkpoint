
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
CREATE TABLE data_set_data_types (
    data_set_id  TEXT NOT NULL REFERENCES data_sets(id)  ON DELETE CASCADE,
    data_type_id TEXT NOT NULL REFERENCES data_types(id) ON DELETE CASCADE,
    PRIMARY KEY (data_set_id, data_type_id)
);
CREATE INDEX data_set_data_types_data_type_id_idx
    ON data_set_data_types (data_type_id);
