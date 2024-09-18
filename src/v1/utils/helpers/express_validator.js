const { validationResult } = require('express-validator');
const { sendResponse } = require('./api_response');

const errorFormatter = ({ location, msg, param }) => {
    return {
        "message": msg,
        "param": param,
        "location": location
    }
};

exports.validateErrors = (req, res, next) => {
    const errors = validationResult(req).formatWith(errorFormatter);
   // console.log('errors',errors)
    if (!errors.isEmpty()) {
        return sendResponse({res, status: 400, errors: errors.array({ onlyFirstError: true }) })
    }

    /* deleting unaccessable fields */
    // delete req.body.created_at;
    // delete req.body.updated_at;
    // delete req.body.deleted_at;
    // delete req.body.created_by;
    // delete req.body.updated_by;
    // delete req.body.deleted_by;
    next();
}