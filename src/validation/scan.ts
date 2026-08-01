import type { ScanInput } from "../domain/types";
import { type ValidationResult, isPlainObject, isNonEmptyString } from "./result";

export function validateScan(body: unknown): ValidationResult<ScanInput> {
    if (!isPlainObject(body)) {
        return { ok: false, errors: ["body must be a JSON object"] };
    }
    const errors: string[] = [];


    if (typeof body.text !== "string") {
        errors.push("text must be a string");
    }

    // An empty id, by contrast, names no data set at all.
    if (!isNonEmptyString(body.dataSetId)) {
        errors.push("dataSetId must be a non-empty string");
    }
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return {
        ok: true,
        value: {
            text: body.text as string,
            dataSetId: (body.dataSetId as string).trim(),
        },
    };
}
