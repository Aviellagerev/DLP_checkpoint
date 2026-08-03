
import type {  CreateDataSetInput } from "../domain/types";
import { type ValidationResult, isPlainObject, isNonEmptyString } from "./result";

export function validateCreateDataSet(body:unknown) : ValidationResult<CreateDataSetInput>{
    //again need to check body is object
       if (!isPlainObject(body)) {
        return { ok: false, errors: ["body must be a JSON object"] };
    }
    const errors: string[] = [];
    if(!isNonEmptyString(body.name)){
       errors.push("name must be a non-empty string");
    }
    // The PDF names this field data_type_ids. Accept that as well as the camelCase
    // form so a request written straight from the spec isn't rejected. 
    const rawIds = body.data_type_ids ?? body.dataTypeIds;

    if (!Array.isArray(rawIds) || !rawIds.every(isNonEmptyString)) {
         errors.push("data_type_ids must be an array of non-empty strings");
    }
    if(errors.length>0){
        return {ok:false,errors};
    }
    return{ok:true,value:{
        name:(body.name as string).trim(),
        dataTypeIds: (rawIds as string[]).map((c) => c.trim()),
     },};
}
export const validateUpdateDataSet = validateCreateDataSet;

