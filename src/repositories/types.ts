// Repository contracts — interfaces only, no implementation.
//
// Every signature below is written in domain types. Nothing from a database driver
// appears here, which is what lets the implementation be swapped without touching
// any caller. "Not found" is expressed as null / false rather than a thrown error,
// so driver-specific exception types never reach the routes.

import type {
  DataType,
  CreateDataTypeInput,
  UpdateDataTypeInput,
  DataSet,
  CreateDataSetInput,
  UpdateDataSetInput,
} from "../domain/types";

export interface DataTypeRepository {
  findAll(): Promise<DataType[]>;
  findById(id: string): Promise<DataType | null>;
  /** Bulk lookup used by the scan flow to resolve a data set's referenced types. */
  findManyByIds(ids: string[]): Promise<DataType[]>;
  create(input: CreateDataTypeInput): Promise<DataType>;
  /** Resolves to null when no row has this id. */
  update(id: string, input: UpdateDataTypeInput): Promise<DataType | null>;
  /** True if a row was deleted, false if nothing matched. */
  delete(id: string): Promise<boolean>;
}

export interface DataSetRepository {
  findAll(): Promise<DataSet[]>;
  findById(id: string): Promise<DataSet | null>;
  create(input: CreateDataSetInput): Promise<DataSet>;
  /** Resolves to null when no row has this id. Replaces the linked data types wholesale. */
  update(id: string, input: UpdateDataSetInput): Promise<DataSet | null>;
  /** True if a row was deleted, false if nothing matched. */
  delete(id: string): Promise<boolean>;
}
