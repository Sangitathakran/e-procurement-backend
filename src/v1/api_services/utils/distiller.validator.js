const Joi = require('joi');

class DistillerValidator {
  static createSchema() {
    return Joi.object({
      organization_name: Joi.string().required().label("Organization Name"),
      mobile_no: Joi.string().pattern(/^[0-9]{10}$/).required().label("Mobile Number"),
      email: Joi.string().email().optional().label("Email"),
      associate_type: Joi.string().valid('INDIVIDUAL', 'ORGANISATION').optional(),

      poc_name: Joi.string().optional(),
      poc_email: Joi.string().email().optional(),
      designation: Joi.string().optional(),

      state: Joi.string().required(),
      district: Joi.string().required(),
      taluka: Joi.string().optional(),
      village: Joi.string().optional(),


    }).unknown(true); 
  }
}

module.exports = DistillerValidator;
