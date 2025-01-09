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
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = '', isExport = 0 } = req.query;
    const { user_id } = req;

    let matchStage = {
        is_approved: _userStatus.pending,
        deletedAt: null,
    };

    if (search) {
        matchStage.orderId = { $regex: search, $options: "i" };
    }

    let aggregationPipeline = [
        { $match: matchStage },
        { $sort: { [sortBy]: 1 } },
        {
            $project: {
                _id: 1,
                'distiller_id': '$user_code',
                'distiller_name': '$basic_details.distiller_details.organization_name',
                'poc': '$basic_details.point_of_contact.name',
                'address': '$address.registered',
                'request_date': '$createdAt',
                'status': '$is_approved'
            }
        }
    ];

    if (paginate == 1) {
        aggregationPipeline.push(
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }

        );
    }

    const records = { count: 0 };
    records.rows = await Distiller.aggregate(aggregationPipeline);
    records.count = await Distiller.countDocuments(matchStage);

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Pending Distiller")
    }));
});

module.exports.getDistillerById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    
    let matchStage = {
        _id: new mongoose.Types.ObjectId(id),
        deletedAt: null,
    };
    
    let aggregationPipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from: "manufacturingunits", // Adjust this to your actual collection name for branches
                localField: "_id",
                foreignField: "distiller_id",
                as: "manufacturingUnit"
            }
        },
        {
            $lookup: {
                from: "storagefacilities", // Adjust this to your actual collection name for branches
                localField: "_id",
                foreignField: "distiller_id",
                as: "storageFacility"
            }
        },
        { $project: {
            _id: 1,
            'distiller_id': '$user_code',
            'distiller_details': '$basic_details.distiller_details',
            'company_owner_info': '$basic_details.company_owner_info',
            'poc': '$basic_details.point_of_contact',
            'registered_address': '$address.registered',
            'operational_address': '$address.operational',
            'request_date': '$createdAt',
            'status': '$is_approved',
            company_details: 1,
            authorised: 1,
            bank_details: 1,
            manufacturingUnit: 1,
            storageFacility: 1
        }}
    ];
    
    const record = await Distiller.aggregate(aggregationPipeline);
    
    if (!record || record.length === 0) {
        return res.status(404).send(new serviceResponse({ 
            status: 404, 
            message: _response_message.notFound("Pending Distiller") 
        }));
    }
    
    return res.status(200).send(new serviceResponse({ 
        status: 200, 
        data: record[0], 
        message: _response_message.found("Pending Distiller") 
    }));
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

    distiller.is_approved = _userStatus.approved,
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

module.exports.updateMouApprovalStatus = asyncErrorHandler(async (req, res) => {
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

    distiller.mou = true,
        distiller.mou_approval = _userStatus.approved,

        await distiller.save();

    return res.send(
        new serviceResponse({
            status: 200,
            message: [{ message: _response_message.updated("Distiller MOU") }],
        })
    );
});
