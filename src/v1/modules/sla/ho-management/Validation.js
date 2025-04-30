const Joi = require('joi');
const { _trader_type } = require('@src/v1/utils/constants');
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module } = require("@src/v1/utils/constants/messages");

const headOfficeSchema = Joi.object({
    
    company_details: Joi.object({
        name: Joi.string().trim().max(100).required().messages({
            'string.empty': _middleware.require('company name'),
        }),
        pan_card: Joi.string().trim().required().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).messages({
            'string.empty': _middleware.require('PAN card'),
            'string.pattern.base': _response_message.invalid('PAN card format'),
        }),
        pan_image: Joi.string().trim().optional(),
        agreement: Joi.string().trim().optional(),
    }),
    point_of_contact: Joi.object({
        name: Joi.string().trim().max(50).required().messages({
            'string.empty': _middleware.require('company name'),
        }),
        email: Joi.string().trim().email().required().messages({
            'string.email': _response_message.invalid('email'),
            'string.empty': _middleware.require('email'),
        }),
        mobile: Joi.string().trim().pattern(/^[0-9]{10}$/).optional().messages({
            'string.pattern.base': _response_message.invalid('mobile number'),
        }),
        designation: Joi.string().trim().max(50).optional().messages({
            'string.empty': _middleware.require('designation'),
        }),
        aadhar_number: Joi.string().trim().required().pattern(/^\d{12}$/).messages({
            'string.empty': _middleware.require('Aadhar number'),
            'string.pattern.base': _response_message.invalid('Aadhar number format'),
        }),
        aadhar_image: Joi.object({
            front: Joi.string().trim().optional(),
            back: Joi.string().trim().optional(),
        }),
    }),
    address: Joi.object({
        line1: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('address line1'),
        }),
        // line2: Joi.string().trim().optional(),
        line2: Joi.string().optional().allow(null, ''),
        state: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('state'),
        }),
        district: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('district'),
        }),
        city: Joi.string().trim().optional(),
        pinCode: Joi.string().trim().pattern(/^[1-9][0-9]{5}$/).required().messages({
            'string.empty': _middleware.require('pinCode'),
            'string.pattern.base': _response_message.invalid('PIN code'),
        }),
    }),
    authorised: Joi.object({
        name: Joi.string().trim().min(2).max(50).required().messages({
            'string.empty': _middleware.require('name'),
        }),
        designation: Joi.string().trim().min(2).max(50).required().messages({
            'string.empty': _middleware.require('designation'),
        }),
        phone: Joi.string().trim().pattern(/^[6-9][0-9]{9}$/).messages({
            'string.pattern.base': _response_message.invalid('phone number'),
        }),
        email: Joi.string().trim().lowercase().email().required().messages({
            'string.empty': _middleware.require('Email'),
            'string.email': _response_message.invalid('email format'),
        }),
        aadhar_number: Joi.string().trim().pattern(/^\d{12}$/).required().messages({
            'string.empty': _middleware.require('aadhar_number'),
            'string.pattern.base': _response_message.invalid('Aadhar number'),
        }),
        aadhar_certificate: {
            front: Joi.string().required().messages({
                'string.empty': _middleware.require('Aadhar Front Image'),
            }),
            back: Joi.string().required().messages({
                'string.empty': _middleware.require('Aadhar back Image'),
            }),
        },
    }),
});

function validateForm(req, res, next) {
    
    const { error, value } = headOfficeSchema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: error.details }));
    }

    req.validatedData = value;
    next();
}

module.exports = {
    validateForm,
};
