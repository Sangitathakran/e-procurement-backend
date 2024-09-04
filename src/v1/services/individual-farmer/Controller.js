const {IndividualFarmer} = require("../../models/app/farmer/IndividualFarmer");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const Joi=require('joi');
//update
module.exports.saveFarmerDetails = async (req, res) => {
    try{
        const {screenName } = req.query;
        const {id:farmer_id}=req.params;
        if(!screenName) return res.status(400).send({message:'Please Provide Screen Name'});
        const { error,message } = await validateIndividualFarmer(req.body, screenName);
        if(error) return res.status(400).send({error:message})
        const farmerDetails = await IndividualFarmer.findById(farmer_id).select(
          `${screenName}`
        );
        if (farmerDetails) {
          farmerDetails[screenName] = req.body[screenName];

          await farmerDetails.save();
          return res.status(200).send(new serviceResponse({message:_response_message.updated(screenName)}))
        } else {
          return res.status(400).send(new serviceResponse({status:400,message:_response_message.notFound('Farmer')}));
        }
    }catch(err){
        console.log('error',err)
        _handleCatchErrors(error, res);
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
