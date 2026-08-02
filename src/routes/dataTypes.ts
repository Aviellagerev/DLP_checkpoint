import { Router } from "express"
import { dataTypeRepository } from "../repositories";
import { validateCreateDataType, validateUpdateDataType } from "../validation/dataTypes";
const router = Router();


router.post("/", async (req, res) => {
    //send req body to the validation
    const result = validateCreateDataType(req.body);
    if (!result.ok) {
        return res.status(400).json({ errors: result.errors });
    }
    //now we know foramting is correct we insert to the table (check for name duplication ?)
    //since uuid is assigned in insertion and as a key 
    //maybe need to clarify this for now we allow duplication names 
    //dont wanna bother them
    const created = await dataTypeRepository.create(result.value);
    //res with the creation of json and done with post
    res.status(201).json(created);
});
//to update i can do put or patch (one full update one partial )
//was asked for crud so its update not patch but patch is alway nice to have 
//if i have time will do both 
router.put("/:id", async (req, res) => {
    //since it full update need to check validity all the same
    //then in the sql do the id check
    
    const result = validateUpdateDataType(req.body);
    if(!result.ok){return res.status(400).json({ errors: result.errors });}
    const id = req.params.id;
    const updated = await dataTypeRepository.update(id,result.value);
    if(!updated){return res.status(404).json({error:"Data type id not found :<"});}
    res.json(updated);
});

//dataTypes delete
router.delete("/:id",async(req,res)=>{
//check id exsistence and send to sql layer
    const id = req.params.id;
    const deleted = await dataTypeRepository.delete(id);
    if(!deleted){return res.status(404).json({error:"Data type id not found :<"});}
    //no content 
    res.status(204).send();

});
//crud create read update delete
router.get("/:id",async(req,res)=>{
const id = req.params.id;
const find = await dataTypeRepository.findById(id);
if(!find){return res.status(404).json({error:"Data type id not found :<"});}
res.status(200).json(find);
});

//get all 
//request is empty _req
router.get("/",async(_req,res)=>{
    const findAll = await dataTypeRepository.findAll();
    res.json(findAll);
})

export default router;


