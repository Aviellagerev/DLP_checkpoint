import { Router } from "express";
import { dataSetRepository, dataTypeRepository } from "../repositories";
import { validateScan } from "../validation/scan";
import { scanText } from "../scan/engine"
const router = Router();
router.post("/",async(req,res)=>{
//we ger {text:"some text","dataSetId":"id"}
//check text and dataSetId from engine 
//then we use scan text (after dataSet id checkout to exsist)
const result = validateScan(req.body);
if(!result.ok){return res.status(400).json({ errors: result.errors }); }
//text is checked
//check dataset exsistence;
const dataSet = await dataSetRepository.findById(result.value.dataSetId);
 if (!dataSet) return res.status(404).json({ error: "Data set not found :<" });
//now check datatype exsistence
const dataTypes = await dataTypeRepository.findManyByIds(dataSet.dataTypeIds);


if (dataTypes.length !== dataSet.dataTypeIds.length) {
  const foundIds = new Set(dataTypes.map((dt) => dt.id));
  const missing = dataSet.dataTypeIds.filter((id) => !foundIds.has(id));
  console.warn(
    `[scan] data set ${dataSet.id} references data types that no longer exist: ` +
      `${missing.join(", ")} — scanning with ${dataTypes.length}/${dataSet.dataTypeIds.length} rules`
  );
}

 res.json(scanText(result.value.text, dataTypes));
});


export default router;
