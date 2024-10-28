const Joi = require('joi');
const { _trader_type } = require('@src/v1/utils/constants');
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module } = require("@src/v1/utils/constants/messages");

const agencySchema = Joi.object({
    
    agent_name: Joi.string().trim().max(100).required().messages({
        'string.empty': _middleware.require('Agent name'),
    }),

    email: Joi.string().trim().email().required().messages({
        'string.email': _response_message.invalid('email'),
        'string.empty': _middleware.require('email'),
    }),
    phone: Joi.string().trim().pattern(/^[0-9]{10}$/).optional().messages({
        'string.pattern.base': _response_message.invalid('mobile number'),
    }),

    ipAddress: Joi.string().trim().max(100).required().messages({
        'string.empty': _middleware.require('Source not confirmed'),
    }),

});

function validateForm(req, res, next) {
    
    const { error, value } = agencySchema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: error.details }));
    }

    req.validatedData = value;
    next();
}

module.exports = {
    validateForm,
};
