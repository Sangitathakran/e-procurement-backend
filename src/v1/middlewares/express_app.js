
const { rateLimit } = require("express-rate-limit");
const { sendResponse } = require("../utils/helpers/api_response");

module.exports = {
    handleRouteNotFound: (req, res) => {
        try {
            return sendResponse({ res, status: 404, errors: [{ message: "Route not found." }] })
        } catch (err) {
            return sendResponse({ res, status: 404, errors: [{ message: err.message }] })
        }
    },

    handleCors: (req, res, next) => {
        try {
            // res.setHeader('Access-Control-Allow-Origin', '*');
            // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-Width, Content-Type, Accept, Authorization');
            res.setHeader('Access-Control-Allow-Credentials', true);
            next();
        } catch (err) {
            return sendResponse({ res, status: 404, errors: err.message })
        }
    },

    handlePagination: (req, res, next) => {
        const escapeRegExp = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        try {
            let maxLimit = 50;
            let { limit, page, paginate = 1, sort_by = 'createdAt', sort_order = -1, search = "" } = req.query;
            let skip = 0;
            if (limit && page) {
                limit = limit <= maxLimit ? limit : maxLimit
                skip = (page - 1) * limit
            }
            req.query.limit = limit ? parseInt(limit) : 10;
            req.query.page = page ? parseInt(page) : 1;
            req.query.search = search ? escapeRegExp(search) : "";
            req.query.skip = skip ? parseInt(skip) : 0;
            req.query.paginate = paginate == 0 ? 0 : 1;
            req.query.sortBy = {
                [sort_by]: parseInt(sort_order)
            }
            /*  #swagger.parameters['skip'] = {in:'query', description: 'please do not add this field...',type: 'number'} */
            next();
        } catch (err) {
            return sendResponse({ res, status: 404, errors: err.message })
        }
    },

    handleRateLimit: rateLimit({
        windowMs: 60 * 1000,       // 1 minute
        max: 200,                   // Limit each IP to 50 requests per 1 minute
        standardHeaders: false,    // Do NOT return modern RateLimit-* headers
        legacyHeaders: true,       // Send old X-RateLimit-* headers
        handler: (req, res, next, options) => {
            return sendResponse({
                res,
                status: options.statusCode,
                errors: [{ message: options.message }]
            });
        }
    }),

    RequestPerMinute: rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 3,
        message: {
            status: 400,
            "data": {},
            message: "Too many requests. Please try again after a minute.",
            "event": {},
            "errorCode": "",
            "errors": [],
            "version": "1.0"
        },
        standardHeaders: false,
        legacyHeaders: false,
    }),

    loginRequestPerMinute: rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 6,
        message: {
            status: 400,
            "data": {},
            message: "Too many requests. Please try again after a minute.",
            "event": {},
            "errorCode": "",
            "errors": [],
            "version": "1.0"
        },
        standardHeaders: false,
        legacyHeaders: false,
    })
}

