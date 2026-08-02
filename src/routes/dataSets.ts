// /api/datasets router.
import { Router } from "express"
import { dataSetRepository, dataTypeRepository } from "../repositories";
import { validateCreateDataSet,validateUpdateDataSet } from "../validation/dataSets";
const router = Router();


async function findMissingDataTypeIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const found = await dataTypeRepository.findManyByIds(ids);
    if (found.length === ids.length) return [];
    const foundIds = new Set(found.map((dt) => dt.id));
    return ids.filter((id) => !foundIds.has(id));
}
//create
router.post("/",async(req,res)=>{
    const result = validateCreateDataSet(req.body);
    if(!result.ok){return res.status(400).json({ errors: result.errors});}
    const missing = await findMissingDataTypeIds(result.value.dataTypeIds);
    if(missing.length>0){return res.status(400).json({ errors: [`unknown data type ids: ${missing.join(", ")}`] });}
    //now we send it
    const create = await dataSetRepository.create(result.value);
      res.status(201).json(create);
});
//read
router.get("/:id",async(req,res)=>{
    const id = req.params.id;
    const find = await dataSetRepository.findById(id);
    if(!find){return res.status(404).json({error:"Data set not found :<"});} 
    res.status(200).json(find);
});
//read all
router.get("/",async(_req,res)=>{
    const findAll = await dataSetRepository.findAll();
    res.json(findAll);
})
//update
router.put("/:id",async(req,res)=>{
   const result = validateUpdateDataSet(req.body);
    if(!result.ok){return res.status(400).json({ errors: result.errors });}
    const missing = await findMissingDataTypeIds(result.value.dataTypeIds);
    if(missing.length>0){return res.status(400).json({ errors: [`unknown data type ids: ${missing.join(", ")}`] });}
    const id = req.params.id;
    const updated = await dataSetRepository.update(id,result.value);
    if(!updated){return res.status(404).json({error:"Data set not found :<"});}
    res.json(updated);
});
//delete
router.delete("/:id",async(req,res)=>{
    const id = req.params.id;
    const deleted = await dataSetRepository.delete(id);
    if(!deleted){return res.status(404).json({error:"Data set not found :<"});}
    res.status(204).send();
})
export default router;
