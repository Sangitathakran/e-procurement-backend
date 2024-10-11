const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const mongoose = require("mongoose");


module.exports.getProcurementTracking = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query

    const requestIds = (await AssociateOffers.find({})).map((ele) => ele.req_id);

    if (requestIds.length == 0) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: _response_message.notFound("request") }));
    }

    let query = search ? {
        $or: [
            { "pointOfContact.name": { $regex: search, $options: 'i' } },
        ]
    } : {};

    query._id = { $in: requestIds };

    const records = { count: 0 };

    records.rows = await RequestModel.find(query)
        .populate({ path: "branch_id", select: "branchName" })
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit))

    records.count = await RequestModel.countDocuments(query);

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("request") }))

})


module.exports.getAssociateOffers = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', req_id } = req.query

    let query = search ? {
        $or: [
            { "basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
        ]
    } : {};

    query.req_id = new mongoose.Types.ObjectId(req_id);

    const records = { count: 0 };

    records.rows = await AssociateOffers.aggregate([
        { $match: query },
        {
            $lookup: {
                from: "users",
                localField: "seller_id",
                foreignField: "_id",
                as: "associate"
            }
        },
        {
            $lookup: {
                from: "farmerorders",
                localField: "_id",
                foreignField: "associateOffers_id",
                as: "farmerorder",
            }
        },
        {
            $unwind: "$associate"
        },
        {
            $addFields: {
                noOfLot: { $size: "$farmerorder" },
                procurementStatus: {
                    $cond: [
                        {
                            $anyElementTrue: {
                                $map: {
                                    input: '$farmerorder',
                                    as: 'offer',
                                    in: { $eq: ['$$offer.status', 'pending'] }
                                }
                            }
                        },
                        'pending',
                        {
                            $cond: [
                                {
                                    $allElementsTrue: {
                                        $map: {
                                            input: '$farmerorder',
                                            as: 'offer',
                                            in: { $eq: ['$$offer.status', 'Received'] }
                                        }
                                    }
                                },
                                'received',
                                'pending'
                            ]
                        }
                    ]
                }
            }
        }
        ,
        {
            $project: {
                "associate.basic_details.associate_details.associate_name": 1,
                "associate.user_code": 1,
                "offeredQty": 1,
                'status': 1,
                "noOfLot": 1,
                "procurementStatus": 1,
                createdAt: 1,
                updatedAt: 1
            }
        },
        {
            $limit: limit ? parseInt(limit) : 10
        },
        { $sort: sortBy },
        ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : [])
    ])

    records.count = await AssociateOffers.countDocuments(query);


    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("request") }))


})

module.exports.getFarmersByAssocaiteId = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', id } = req.query

    let query = search ? {
        $or: [
            { "metaData.name": { $regex: search, $options: 'i' } }
        ]
    } : {};

    query.associateOffers_id = id;

    const farmerOrders = await FarmerOrders.find(query);

    if (farmerOrders.length == 0) {
        return res.status(200).send(new serviceResponse({ status: 400, errros: [{ message: _response_message.notFound("farmer orders") }] }));
    }

    const records = { count: 0 };

    records.rows = paginate == 1 ? await FarmerOrders.find(query)
        .populate("procurementCenter_id")
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit)) : await FarmerOrders.find(query).populate("procurementCenter_id").sort(sortBy);

    records.count = await FarmerOrders.countDocuments(query);

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("farmer orders") }))
})

module.exports.getFarmersOrdersData = asyncErrorHandler(async (req, res) => {

    const { id } = req.params;

    const records = await FarmerOrders.findOne({ _id: id }).select("tare_weight gross_weight net_weight weight_slip");

    if (!records) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer orders") }] }));
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("farmer order") }));

})