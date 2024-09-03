const {IndividualFarmer} = require("../../models/app/farmer/IndividualFarmer");
const Joi=require('joi');
//update
module.exports.saveFarmerDetails = async (req, res) => {
    try{
        const { farmer_id, screenName } = req.query;
        if(!farmer_id)  return res.status(400).send({message:"Farmer id required"})
        const { error } = await validateIndividualFarmer(req.body, screenName);
        if(error) return res.status(400).send({error:error.message})
        const farmerDetails = await IndividualFarmer.findById(farmer_id).select(
          `${screenName}`
        );
        if (farmerDetails) {
          farmerDetails[screenName] = req.body[screenName];
        } else {
          return res.status(400).send({ message: "Farmer not Found" });
        }
    }catch(err){
        console.log('error',err)
        return res.status(500).send({ message: err });
    }
 
};

async function validateIndividualFarmer(data, screenName) {
  let schema = {};
  switch (screenName) {
    case "basic_details":
      schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().required(),
        father_husband_name: Joi.string().required(),
        mobile_no: Joi.string().required(),
        category: Joi.string().required(),
        dob: Joi.string().required(),
        farmer_type: Joi.string().required(),
        gender: Joi.string().required(),
      });
      break;
      case "address":
      schema = Joi.object({
        address_line_1: Joi.string().required(),
        address_line_2: Joi.string().required(),
        country: Joi.string().required(),
        state: Joi.string().required(),
        district: Joi.string().required(),
        block: Joi.string().required(),
        village: Joi.string().required(),
        pinCode: Joi.string().required(),
      });
      break;
      case "land_details":
        schema = Joi.object({
            area: Joi.string().required(),
            pinCode: Joi.string().required(),
            state: Joi.string().required(),
            district: Joi.string().required(),
            village: Joi.string().required(),
            block: Joi.string().required(),
            ghat_number: Joi.string().required(),
            khasra_number: Joi.string().required(),
        });
        break;
      case "documents":
      schema = Joi.object({
        aadhar_number: Joi.string().required(),
        pan_number: Joi.string().required(),
      });
      break;
      case "bank_details":
        schema = Joi.object({
            bank_name: Joi.string().required(),
            branch_name: Joi.string().required(),
            account_holder_name: Joi.string().required(),
            ifsc_code: Joi.string().required(),
            account_no: Joi.string().required(),
            pinCode: Joi.string().required(),
            proof_doc: Joi.string().required(),
            kharif_crops: Joi.string().required(),
        });
        break;
    default:
      schema = {};
      break;
  }
  return schema.validate(data[screenName]);
}
