
import { pgDataTypeRepository } from "./pg/dataTypes";
import { pgDataSetRepository } from "./pg/dataSets";
import type { DataTypeRepository, DataSetRepository } from "./types";

export const dataTypeRepository: DataTypeRepository = pgDataTypeRepository;
export const dataSetRepository: DataSetRepository = pgDataSetRepository;

export type { DataTypeRepository, DataSetRepository } from "./types";
