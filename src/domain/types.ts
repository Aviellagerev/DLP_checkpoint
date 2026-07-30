// Domain types owned by the app — no Prisma imports allowed here.
export type DataTypeKind = "keywords";

export interface DataType{
    id:string; //uuid
    name:string
    description:string;
    type:DataTypeKind;
    content: string[];
    threshold: number;
}
export interface DataSet {
  id: string;
  name: string;
  dataTypeIds: string[];  
}
export interface CreateDataTypeInput {
  name: string;
  description: string;
  type: DataTypeKind;
  content: string[];
  threshold: number;
}
export type UpdateDataTypeInput = CreateDataTypeInput;

export interface CreateDataSetInput {
  name: string;
  dataTypeIds: string[];
}
export type UpdateDataSetInput = CreateDataSetInput;

export interface DetectedObject {
  id: string;
  name: string;
  match_count: number;
}

export type ScanResult =
  | { status: "match"; detected_objects: DetectedObject[] }
  | { status: "not matched" };
