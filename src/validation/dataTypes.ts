import type { CreateDataTypeInput } from "../domain/types";
import { type ValidationResult, isPlainObject, isNonEmptyString } from "./result";

export function validateCreateDataType(body: unknown): ValidationResult<CreateDataTypeInput> {
    //cehck if plain object {gets name,des,type,contet,threshold}
    if (!isPlainObject(body)) {
        return { ok: false, errors: ["body must be a JSON object"] };
    }
    //so body is okay now we check each value inside so body.name is unkown
    //body.name check for string + not empty
    const errors: string[] = [];
    if (!isNonEmptyString(body.name)) {
        errors.push("name must be a non-empty string");
    }
    //des can be empty 
    if (typeof body.description !== "string") {
        errors.push("description must be a string");
    }

    // { "name": "  Credit Card Terms  ", "description": "PCI", "type": "keywords",
    //   "content": ["visa", "cvv"], "threshold": 2 }
    //tpye must be only keywords so typeof is not needed
    if (body.type !== "keywords") {
        errors.push("type must be a keywoeds");
    }
    //check array string && len>0 and each value is a string

    if (!Array.isArray(body.content) || body.content.length === 0 || !body.content.every(isNonEmptyString)) {
        errors.push("content must be a non-empty array of non-empty strings");
    }
    if (typeof body.threshold !== "number" || !Number.isInteger(body.threshold) || body.threshold < 1) {
        errors.push("threshold must be an integer larger then 0");
    }
    if (errors.length > 0) { return { ok: false, errors } }
    //we need to trim strings and type is keywords and threshold to be a number in return;
    return {
        ok: true,
        value: {
            name: (body.name as string).trim(),
            description: (body.description as string).trim(),
            type: "keywords",
            content: (body.content as string[]).map((c) => c.trim()),
            threshold: body.threshold as number,
        },
    };
}
export const validateUpdateDataType = validateCreateDataType;
