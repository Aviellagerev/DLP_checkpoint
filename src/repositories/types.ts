
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

  findManyByIds(ids: string[]): Promise<DataType[]>;
  create(input: CreateDataTypeInput): Promise<DataType>;

  update(id: string, input: UpdateDataTypeInput): Promise<DataType | null>;

  delete(id: string): Promise<boolean>;
}

export interface DataSetRepository {
  findAll(): Promise<DataSet[]>;
  findById(id: string): Promise<DataSet | null>;
  create(input: CreateDataSetInput): Promise<DataSet>;

  update(id: string, input: UpdateDataSetInput): Promise<DataSet | null>;

  delete(id: string): Promise<boolean>;
}
