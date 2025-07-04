const Joi = require('joi');
const { _trader_type } = require('@src/v1/utils/constants');
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module } = require("@src/v1/utils/constants/messages");

const organizationSchema = Joi.object({
    organization_name: Joi.string().trim().min(2).max(50).required().messages({
        'string.empty': _middleware.require('organization name'),
    }),
});

const basicDetailsSchema = Joi.object({
    associate_details: Joi.object({
        associate_type: Joi.string().required().valid(...Object.values(_trader_type)).default(_trader_type.ORGANISATION),
        associate_name: Joi.string().trim().min(2).max(50).required(),
        email: Joi.string().trim().lowercase().email().required(),
        phone: Joi.string().trim().pattern(/^[6-9][0-9]{9}$/)
            .messages({
                'string.empty': _middleware.require('phone'),
                'string.pattern.base': _response_message.invalid('phone number'),
            }),
        company_logo: Joi.string().trim().required().allow(''),
    }),
    point_of_contact: Joi.object({
        name: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('contact person name'),
        }),
        email: Joi.string().trim().lowercase().email().required().messages({
            'string.empty': _middleware.require('Email'),
        }),
        mobile: Joi.string().trim().trim().pattern(/^[6-9][0-9]{9}$/)
            .messages({
                'string.empty': _middleware.require('phone'),
            }),
        designation: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('designation'),
        }),

        aadhar_number: Joi.string().trim().pattern(/^\d{12}$/).required().messages({
            'string.empty': _middleware.require('aadhar_number'),
            'string.pattern.base': _response_message.invalid('Aadhar number'),
        }),
        aadhar_image: {
            front: Joi.string().required().messages({
                'string.empty': _middleware.require('Aadhar Front Image'),
            }),
            back: Joi.string().required().messages({
                'string.empty': _middleware.require('Aadhar back Image'),
            }),
        }
    }),
    company_owner_info: Joi.object({
        name: Joi.string().trim().min(2).max(50),
        aadhar_number: Joi.string().trim().pattern(/^\d{12}$/).messages({
            'string.pattern.base': _response_message.invalid('Aadhar number'),
        }),
        aadhar_image: {
            front: Joi.string().required().messages({
                'string.empty': _middleware.require('Aadhar Front Image'),
            }),
            back: Joi.string().required().messages({
                'string.empty': _middleware.require('Aadhar back Image'),
            }),
        },
        pan_card: Joi.string().trim().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).messages({
            'string.pattern.base': _response_message.invalid('PAN card format'),
        }),
        pan_image: Joi.string().trim().optional().allow(''),
    }),
    implementation_agency: Joi.string().trim().optional().allow(''),
    cbbo_name: Joi.string().trim().optional().allow(''),

});

const addressSchema = Joi.object({
    registered: Joi.object({
        line1: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('address line1'),
        }),
        line2: Joi.string().trim().optional().allow(''),
        country: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('country'),
        }),
        state: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('state'),
        }),
        district: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('district'),
        }),
        taluka: Joi.string().trim().optional().allow(''),
        pinCode: Joi.string().trim().pattern(/^[1-9][0-9]{5}$/).required().messages({
            'string.empty': _middleware.require('pinCode'),
            'string.pattern.base': _response_message.invalid('PIN code'),
        }),
        village: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('village'),
        }),
    }),

    operational: Joi.object({
        line1: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('address line1'),
        }),
        line2: Joi.string().trim().optional(),
        country: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('country'),
        }),
        state: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('state'),
        }),
        district: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('district'),
        }),
        taluka: Joi.string().trim().optional(),
        pinCode: Joi.string().trim().pattern(/^[1-9][0-9]{5}$/).required().messages({
            'string.empty': _middleware.require('pinCode'),
            'string.pattern.base': _response_message.invalid('PIN code'),
        }),
        village: Joi.string().trim().required().messages({
            'string.empty': _middleware.require('village'),
        }),
    }),
});

const companyDetailsSchema = Joi.object({
    // cin_number: Joi.string().trim().required().pattern(/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/).messages({
    //     'string.empty': _middleware.require('CIN number'),
    //     'string.pattern.base': _response_message.invalid('CIN number format'),
    // }),
    cin_number: Joi.string().trim(),
    cin_image: Joi.string().trim().required().messages({
        'string.empty': _middleware.require('CIN image'),
    }),
    tan_number: Joi.string().trim().pattern(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/).allow('').messages({
        'string.pattern.base': _response_message.invalid('TAN number format'),
    }),
    tan_image: Joi.string().trim().required().allow('').messages({
        'string.empty': _middleware.require('TAN image'),
    }),
    pan_card: Joi.string().trim().required().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).messages({
        'string.empty': _middleware.require('PAN card'),
        'string.pattern.base': _response_message.invalid('PAN card format'),
    }),
    pan_image: Joi.string().trim().optional(),
    gst_no: Joi.string().trim().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9][Z][0-9A-Z]$/).optional().messages({
        'string.pattern.base': _response_message.invalid('GST number format'),
    }),

    // aadhar_number: Joi.string().trim().required().pattern(/^\d{12}$/).messages({
    //     'string.empty': _middleware.require('Aadhar number'),
    //     'string.pattern.base': _response_message.invalid('Aadhar number format'),
    // }),
    // aadhar_certificate: {
    //     front: Joi.string().required().messages({
    //         'string.empty': _middleware.require('Aadhar Front Image'),
    //     }),
    //     back: Joi.string().required().messages({
    //         'string.empty': _middleware.require('Aadhar back Image'),
    //     }),
    // }
});

const authorisedSchema = Joi.object({
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
    pan_card: Joi.string().trim().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional().messages({
        'string.pattern.base': _response_message.invalid('PAN card'),
    }),
    pan_image: Joi.string().trim().optional(),
});

const bankDetailsSchema = Joi.object({
    bank_name: Joi.string().trim().required().messages({
        'string.empty': _middleware.require('bank_name'),
    }),
    branch_name: Joi.string().trim().required().messages({
        'string.empty': _middleware.require('branch_name'),
    }),
    account_holder_name: Joi.string().trim().required().messages({
        'string.empty': _middleware.require('account_holder_name'),
    }),
    ifsc_code: Joi.string().trim().required().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).messages({
        'string.empty': _middleware.require('ifsc_code'),
        'string.pattern.base': _response_message.invalid('IFSC code'),
    }),
    account_number: Joi.string().trim().required().pattern(/^\d{9,18}$/).messages({
        'string.empty': _middleware.require('account_number'),
        'string.pattern.base': _response_message.invalid('account number'),
    }),
    upload_proof: Joi.string().trim().required().messages({
        'string.empty': _middleware.require('Cheque'),
    }),
});


function validateForm(req, res, next) {
    const { formName } = req.body;
    if (!formName) {
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.require('formName') }));
    }
    let schema;

    switch (formName) {
        case 'organization':
            schema = organizationSchema;
            break;
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
        case 'bank_details':
            schema = bankDetailsSchema;
            break;
        default:
            return res.status(400).send(new serviceResponse({ status: 400, errors: `Invalid form name: ${formName}` }));
    }

    const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: error.details }));
    }

    req.validatedData = value;
    next();
}

module.exports = {
    validateForm,
};
