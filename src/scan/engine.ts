// Pure keyword matching logic. No DB, no Express — testable on its own.
import type { DataType, DetectedObject, ScanResult } from "../domain/types";


//regular input validation check 
function escapeRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


export function countMatches(text:string,keywords:string[]):number{
    let totalSum=0;
    const cleaned = [...new Set(keywords)].filter(k=>k.length>0);
    for(const keyword of cleaned){
    const escaped   = escapeRegex(keyword);
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    const count = (text.match(re) ?? []).length;
    totalSum +=count;
    }
    return totalSum;

}
export function scanText(text:string,dataTypes:DataType[]) : ScanResult{
    const detected: DetectedObject[] = []
    for(const type of dataTypes){
        const count = countMatches(text,type.content);
        if(count>=type.threshold){
            detected.push({id:type.id,name:type.name,match_count:count});
        }
    }
    return detected.length>0 ? {status:"match",detected_objects:detected}:{status:"not matched"};
}