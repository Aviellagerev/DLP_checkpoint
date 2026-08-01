// Domain types owned by the app — no database or framework imports allowed here.
// This file sits at the bottom of the dependency graph and imports nothing.
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

// A scan request names one data set; the data types it references are resolved
// from the database by the route before the engine ever sees them.
export interface ScanInput {
  text: string;
  dataSetId: string;
}

export interface DetectedObject {
  id: string;
  name: string;
  match_count: number;
}

export type ScanResult =
  | { status: "match"; detected_objects: DetectedObject[] }
  | { status: "not matched" };
