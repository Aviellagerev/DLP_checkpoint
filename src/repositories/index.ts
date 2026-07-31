// The swap point: exports the chosen repository implementation.
// Everything outside src/repositories/ imports from this file only.
//
// To move to a different persistence layer, write another folder alongside pg/ that
// satisfies the interfaces in ./types and change the two assignments below. No route,
// validator, or domain file needs to change.
//
// The explicit type annotations are load-bearing: they make TypeScript verify at build
// time that the implementation actually satisfies the contract.

import { pgDataTypeRepository } from "./pg/dataTypes";
import { pgDataSetRepository } from "./pg/dataSets";
import type { DataTypeRepository, DataSetRepository } from "./types";

export const dataTypeRepository: DataTypeRepository = pgDataTypeRepository;
export const dataSetRepository: DataSetRepository = pgDataSetRepository;

export type { DataTypeRepository, DataSetRepository } from "./types";
