const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module, _query } = require("@src/v1/utils/constants/messages");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { Auth, decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _userStatus } = require('@src/v1/utils/constants');
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");

module.exports.getPendingDistillers = asyncErrorHandler(async (req, res) => {
    const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
    const { user_id } = req;
    let query = {
        is_approved: _userStatus.pending,
        ...(search ? { orderId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
    };
    const records = { count: 0 };
    records.rows = paginate == 1 ? await Distiller.find(query)
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit)) : await Distiller.find(query).sort(sortBy);
    records.count = await Distiller.countDocuments(query);
    if (paginate == 1) {
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }
    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Pending Distiller") }))
});

module.exports.updateApprovalStatus = asyncErrorHandler(async (req, res) => {
    const { id } = req.query;
    const distiller = await Distiller.findOne({ _id: id });
   
    if (!distiller) {
        return res.send(
            new serviceResponse({
                status: 400,
                errors: [{ message: _response_message.notFound("Distiller") }],
            })
        );
    }
    
    distiller.is_approved= _userStatus.approved,
    await distiller.save();
    return res.send(
        new serviceResponse({
            status: 200,
            message: [{ message: _response_message.updated("Distiller") }],
        })
    );
});

module.exports.getPendingMouList = asyncErrorHandler(async (req, res) => {
    const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
    const { user_id } = req;
    let query = {
        is_approved: _userStatus.approved,
        ...(search ? { orderId: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
    };
    const records = { count: 0 };
    records.rows = paginate == 1 ? await Distiller.find(query)
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit)) : await Distiller.find(query).sort(sortBy);
    records.count = await Distiller.countDocuments(query);
    if (paginate == 1) {
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }
    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Pending Distiller") }))
});


module.exports.updateApprovalStatus = asyncErrorHandler(async (req, res) => {
    const { id } = req.query;
    const distiller = await Distiller.findOne({ _id: id });
   
    if (!distiller) {
        return res.send(
            new serviceResponse({
                status: 400,
                errors: [{ message: _response_message.notFound("Distiller") }],
            })
        );
    }

    distiller.mou= true,
    distiller.mou_approval= _userStatus.approved,

    await distiller.save();

    return res.send(
        new serviceResponse({
            status: 200,
            message: [{ message: _response_message.updated("Distiller MOU") }],
        })
    );
});
