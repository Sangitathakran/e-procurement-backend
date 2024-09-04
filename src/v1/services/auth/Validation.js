const Joi = require('joi');
const { _trader_type } = require('@src/v1/utils/constants');
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {  _response_message, _middleware, _auth_module } = require("@src/v1/utils/constants/messages");

const basicDetailsSchema = Joi.object({
    associate_details: Joi.object({
        associate_type: Joi.string().valid(...Object.values(_trader_type)).default(_trader_type.ORGANISATION),
        organization_name: Joi.string().trim().optional(),
        associate_name: Joi.string().trim().optional(),
        email: Joi.string().trim().lowercase().email().optional(),
        phone: Joi.string().trim().optional(),
    }),
    point_of_contact: Joi.object({
        name: Joi.string().trim().optional(),
        email: Joi.string().trim().lowercase().email().optional(),
        mobile: Joi.string().trim().optional(),
        designation: Joi.string().trim().optional(),
        aadhar_number: Joi.string().trim().optional(),
        aadhar_image: Joi.array().items(Joi.string().trim()).optional(),
    }),
});

const addressSchema = Joi.object({
    registered: Joi.object({
        line1: Joi.string().trim().optional(),
        line2: Joi.string().trim().optional(),
        country: Joi.string().trim().optional(),
        state: Joi.string().trim().optional(),
        district: Joi.string().trim().optional(),
        taluka: Joi.string().trim().optional(),
        pinCode: Joi.string().trim().optional(),
        village: Joi.string().trim().optional(),
    }),
    operational: Joi.object({
        line1: Joi.string().trim().optional(),
        line2: Joi.string().trim().optional(),
        country: Joi.string().trim().optional(),
        state: Joi.string().trim().optional(),
        district: Joi.string().trim().optional(),
        taluka: Joi.string().trim().optional(),
        pinCode: Joi.string().trim().optional(),
        village: Joi.string().trim().optional(),
    }),
});

const companyDetailsSchema = Joi.object({
    cin_number: Joi.string().trim().optional(),
    cin_image: Joi.string().trim().optional(),
    tan_number: Joi.string().trim().optional(),
    tan_image: Joi.string().trim().optional(),
    pan_card: Joi.string().trim().optional(),
    pan_image: Joi.string().trim().optional(),
    aadhar_number: Joi.string().trim().optional(),
    aadhar_certificate: Joi.array().items(Joi.string().trim()).optional(),
});

const authorisedSchema = Joi.object({
    name: Joi.string().trim().optional(),
    designation: Joi.string().trim().optional(),
    phone: Joi.string().trim().optional(),
    email: Joi.string().trim().optional(),
    aadhar_number: Joi.string().trim().optional(),
    aadhar_certificate: Joi.array().items(Joi.string().trim()).optional(),
    pan_card: Joi.string().trim().optional(),
    pan_image: Joi.string().trim().optional(),
});

function validateForm(req, res, next) {
    const { formName } = req.body;
    if (!formName) {
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.require('formName') }));
    }
    let schema;

    switch (formName) {
        case 'basic_details':
            schema = basicDetailsSchema;
            break;
        case 'address':
            schema = addressSchema;
            break;
        case 'company_details':
            schema = companyDetailsSchema;
            break;
        case 'authorised':
            schema = authorisedSchema;
            break;
        default:
            // return res.status(400).json({ error: `Invalid form name: ${formName}` });
            return res.status(400).send(new serviceResponse({ status: 400, errors: `Invalid form name: ${formName}` }));
    }

    const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) {
        // return res.status(400).json({ error: error.details });
        return res.status(400).send(new serviceResponse({ status: 400, errors: error.details }));
    }

    req.validatedData = value;
    next();
}

module.exports = {
    validateForm,
};
