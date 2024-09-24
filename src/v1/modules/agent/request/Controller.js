const { _generateOrderNumber, _addDays } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { _webSocketEvents, _associateOfferStatus, _status } = require('@src/v1/utils/constants');
const { _userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { default: mongoose } = require("mongoose");

module.exports.createProcurement = asyncErrorHandler(async (req, res) => {
    const { user_id, user_type } = req
    const { quotedPrice, deliveryDate, name, commodityImage, grade, quantity, deliveryLocation, lat, long, quoteExpiry, head_office_id, branch_id, expectedProcurementDate } = req.body;

    if (user_type && user_type != _userType.agent)
        return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized() }] }))

    let randomVal
    let isUnique = false;

    while (!isUnique) {
        randomVal = _generateOrderNumber();
        const existingReq = await RequestModel.findOne({ reqNo: randomVal });
        if (!existingReq) {
            isUnique = true;
        }
    }

    const delivery_date = moment(deliveryDate).format("YYYY-MM-DD");

    if (moment(delivery_date).isBefore(quoteExpiry)) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid_delivery_date("Delivery date") }] }))
    }

    const record = await RequestModel.create({
        head_office_id,
        branch_id,
        reqNo: randomVal,
        expectedProcurementDate,
        quotedPrice, deliveryDate: delivery_date,
        product: { name, commodityImage, grade, quantity },
        address: { deliveryLocation, lat, long },
        quoteExpiry: moment(quoteExpiry).toDate(),
        createdBy: user_id
    });

    eventEmitter.emit(_webSocketEvents.procurement, { ...record, method: "created" })
    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("procurement") }));
})

module.exports.getProcurement = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
    let query = search ? {
        $or: [
            { "reqNo": { $regex: search, $options: 'i' } },
            { "product.name": { $regex: search, $options: 'i' } },
            { "product.grade": { $regex: search, $options: 'i' } },
        ]
    } : {};

    const records = { count: 0 };

    records.rows = paginate == 1 ? await RequestModel.find(query)
        .sort(sortBy)
        .skip(skip).populate({ path: "branch_id", select: "_id branchName branchId" })
        .limit(parseInt(limit)) : await RequestModel.find(query).sort(sortBy);

    records.count = await RequestModel.countDocuments(query);


    if (paginate == 1) {
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }))
})

module.exports.getAssociateOffer = asyncErrorHandler(async (req, res) => {
    const { page, limit, skip, paginate = 1, sortBy, search = '', req_id } = req.query;

    // Building the query
    let query = search ? {
        $or: [
            { "associate.user_code": { $regex: search, $options: 'i' } },
            { "associate.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
        ]
    } : {};

    query.req_id = new mongoose.Types.ObjectId(req_id); // Add req_id filter if present

    const records = { count: 0 };

    // Aggregate the data
    records.rows = await AssociateOffers.aggregate([
        // Lookup FarmerOrders
        {
            $lookup: {
                from: 'farmerorders',
                localField: '_id',
                foreignField: 'associateOffers_id',
                as: 'farmerorders'
            }
        },
        // Lookup FarmerOffers (before moving to FarmerOrders)
        {
            $lookup: {
                from: 'farmeroffers',
                localField: '_id',
                foreignField: 'associateOffers_id',
                as: 'farmeroffers'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'seller_id',
                foreignField: '_id',
                as: 'associate'
            }
        },
        {
            $addFields: {
                numberOfFarmerOffers: { $size: '$farmeroffers' }, // Count of FarmerOffers
                // Procurement status based on FarmerOrders or FarmerOffers
                procurementStatus: {
                    $cond: [
                        // If the status is Ordered, set procurementStatus to 'received'
                        { $eq: ['$status', 'Ordered'] },
                        'received',
                        {
                            $cond: [
                                // If the status is Rejected, set procurementStatus to 'rejected'
                                { $eq: ['$status', 'Rejected'] },
                                'rejected',
                                {
                                    $cond: [
                                        // If the status is Pending, set procurementStatus to 'pending'
                                        { $eq: ['$status', 'Pending'] },
                                        'pending',
                                        {
                                            $cond: [
                                                // If all farmer orders are received, set procurementStatus to 'received'
                                                { $allElementsTrue: { $map: { input: '$farmerorders', as: 'offer', in: { $eq: ['$$offer.status', 'received'] } } } },
                                                'received',
                                                // If any farmer order is pending, set procurementStatus to 'pending'
                                                {
                                                    $cond: [
                                                        { $anyElementTrue: { $map: { input: '$farmerorders', as: 'offer', in: { $eq: ['$$offer.status', 'pending'] } } } },
                                                        'pending',
                                                        'in_progress' // Default procurementStatus if no other condition is met
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        },
        { $unwind: '$associate' },
        {
            $project: {
                _id: 1,
                offeredQty: 1,
                status: 1,
                numberOfFarmerOffers: 1, // Include the count of FarmerOffers
                procurementStatus: 1, // Include the calculated procurementStatus
                req_id: 1,
                // associate: { $arrayElemAt: ['$associate', 0] },
                'associate._id': 1,
                'associate.user_code': 1,
                'associate.basic_details.associate_details.associate_name': 1,
            }
        },
        { $match: query }, // Apply query
        { $sort: sortBy },  // Sort by specified parameter
        { $skip: skip },    // Skip records for pagination
        { $limit: parseInt(limit) }, // Limit for pagination
    ]);

    records.count = records.rows.length;

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));
});

module.exports.associateOfferbyid = asyncErrorHandler(async (req, res) => {
    const { id } = req.params

    const record = await AssociateOffers.findOne({ _id: id })
        .populate({ path: 'req_id', select: '_id product.name product.grade product.commodityImage reqNo deliveryDate' })
        .populate({ path: 'seller_id', select: '_id basic_details.associate_details.associate_name user_code' })
        .select('_id seller_id req_id offeredQty status procuredQty')

    if (!record) {
        return res.send(new serviceResponse({ status: 400, data: record, message: _response_message.notFound() }))
    }
    return res.send(new serviceResponse({ status: 200, data: record, message: _response_message.found() }))
})

module.exports.getofferedFarmers = asyncErrorHandler(async (req, res) => {
    const { page, limit, skip, sortBy, search = '', associateOffers_id } = req.query

    let query = search ? {
        $or: [
            { "metaData.name": { $regex: search, $options: 'i' } },
            { "metaData.father_name": { $regex: search, $options: 'i' } },
            { "metaData.mobile_no": { $regex: search, $options: 'i' } },
        ]
    } : {};

    query.associateOffers_id = associateOffers_id;
    const records = { count: 0 };

    records.rows = await FarmerOffers.find(query)
        .sort(sortBy)
        .skip(skip)
        .populate({ path: 'farmer_id', select: '_id farmer_code parents address' })
        .limit(parseInt(limit))
        .select('_id associateOffers_id farmer_id metaData offeredQty')

    records.count = await FarmerOffers.countDocuments(query);
    records.page = page
    records.limit = limit
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found() }))
})


module.exports.approveRejectOfferByAgent = asyncErrorHandler(async (req, res) => {
    const { user_id } = req;

    const { associateOffer_id, status, comment } = req.body;

    const offer = await AssociateOffers.findOne({ _id: associateOffer_id });

    if (!offer) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }))
    }

    if (!Object.values(_associateOfferStatus).includes(status)) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("status") }] }))
    }

    if (status == _associateOfferStatus.rejected && comment) {
        offer.comments.push({ user_id: user_id, comment });
    }

    offer.status = status;

    const farmerOffer = await FarmerOffers.find({ associateOffers_id: associateOffer_id, status: _status.active });

    for (let offered of farmerOffer) {

        const { associateOffers_id, farmer_id, metaData, offeredQty, qtyProcured } = offered;
        const newFarmerOrder = new FarmerOrders({ associateOffers_id, farmer_id, metaData, offeredQty, qtyProcured, order_no: "OD" + _generateOrderNumber() });

        await newFarmerOrder.save();
    }

    await offer.save();

    return res.status(200).send(new serviceResponse({ status: 200, data: offer, message: _response_message.updated("offer") }))

})