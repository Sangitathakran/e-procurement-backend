const Joi = require('joi');
const { _trader_type } = require('@src/v1/utils/constants');
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module } = require("@src/v1/utils/constants/messages");


const schema = Joi.object({
    // batch_id: Joi.array().items(Joi.string()).default([]), // Ensures batch_id is an array of strings
    whr_type: Joi.string().trim().required(),
    state: Joi.string().trim().required(),
    stateAgency: Joi.string().trim().required(),
    district: Joi.string().trim().required(),
    fpoPacks: Joi.string().trim().required(),
    Center: Joi.string().trim().required(),
    year: Joi.string().trim().length(4).required(), // Ensures year is exactly 4 characters
    season: Joi.string().trim().required(),
    scheme: Joi.string().trim().required(),
    Commodity: Joi.string().trim().required(),
    warehouse: Joi.string().trim().required(),
    
    total_dispatch_quantity: Joi.number().min(0).required(), // Ensures it's a positive number
    total_dispatch_bag: Joi.number().min(0).required(),
    total_accepted_quantity: Joi.number().min(0).required(),
    total_accepted_bag: Joi.number().min(0).required(),
    quantity_loss: Joi.number().min(0).allow(''), // Allows empty string or a number
    bag_loss: Joi.number().min(0).allow(''),
    // quantity_gain: Joi.number().min(0).allow(''),
    // bag_gain: Joi.number().min(0).allow(''),
    
    whr_date: Joi.date().iso().required(), // Ensures ISO format date
    whr_number: Joi.string().trim().required(),
    whr_document: Joi.string().trim()
});

function validateForm(req, res, next) {
    
    const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: error.details.map(item=>({message:item.message})) }));
    }
    req.validatedData = value;
    next();
}

module.exports = {
    validateForm,
};
