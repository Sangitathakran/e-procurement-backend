const { _handleCatchErrors, _generateOrderNumber, _addDays } = require("@src/v1/utils/helpers")
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { ProcurementRequest } = require("@src/v1/models/app/procurement/ProcurementRequest");
const { _procurementRequestStatus, _webSocketEvents, _procuredStatus } = require('@src/v1/utils/constants');
const { SellerOffers } = require("@src/v1/models/app/procurement/SellerOffers");
const { ContributedFarmers } = require("@src/v1/models/app/procurement/ContributedFarmer");
// const appStatus = require('../../../../../utils/appStatus'); 
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { _sellerOfferStatus, _userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const mongoose = require("mongoose");
const { AssociateOrders } = require("@src/v1/models/app/procurement/AssociateOrders");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");

module.exports.createProcurement = async (req, res) => {

    try {
        const { user_id, user_type } = req
        const { organization_id, quotedPrice, deliveryDate, name, category, grade, variety, quantity, deliveryLocation, lat, long, quoteExpiry } = req.body;

        if (user_type && user_type != _userType.admin)
            return sendResponse({ status: 400, errors: [{ message: _response_message.Unauthorized() }] })

        const randomVal = _generateOrderNumber();

        const quote_expiry_date = _addDays(quoteExpiry);
        const delivery_date = moment(deliveryDate).format("YYYY-MM-DD");

        if (moment(delivery_date).isBefore(quote_expiry_date)) {
            return sendResponse({ status: 400, errors: [{ message: _response_message.invalid_delivery_date("Delivery date") }] })
        }

        const record = await ProcurementRequest.create({
            organization_id,
            reqNo: randomVal,
            quotedPrice, deliveryDate: delivery_date,
            product: { name, category, grade, variety, quantity },
            address: { deliveryLocation, lat, long },
            quoteExpiry: _addDays(quoteExpiry),
            createdBy: user_id
        });

        eventEmitter.emit(_webSocketEvents.procurement, { ...record, method: "created" })
        return sendResponse({ status: 200, data: record, message: _response_message.created("procurement") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.getProcurement = async (req, res) => {

    try {
        const { organization_id, user_type, user_id } = req;
        const { id } = req.params;

        const { page, limit, skip, paginate = 1, sortBy, search = '', status } = req.query

        let query = search ? {
            $or: [
                { "reqNo": { $regex: search, $options: 'i' } },
                { "product.name": { $regex: search, $options: 'i' } },
                { "product.grade": { $regex: search, $options: 'i' } },
                { "product.variety": { $regex: search, $options: 'i' } },
                { "product.category": { $regex: search, $options: 'i' } },
            ]
        } : {};


        if (user_type == _userType.ho || user_type == _userType.bo) {
            query.organization_id = organization_id

        } else if (user_type == _userType.associate) {
            if (status && Object.values(_sellerOfferStatus).includes(status)) {
                const offerIds = (await SellerOffers.find({ seller_id: user_id, status })).map((offer) => offer.req_id);
                query._id = { $in: offerIds };

            } else {
                query.status = _procurementRequestStatus.open
                const offerIds = (await SellerOffers.find({ seller_id: user_id })).map((offer) => offer.req_id);
                query._id = { $nin: offerIds };
            }
        }

        const records = { count: 0 };

        records.rows = paginate == 1 ? await ProcurementRequest.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await ProcurementRequest.find(query).sort(sortBy);

        records.count = await ProcurementRequest.countDocuments(query);


        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return sendResponse({ status: 200, data: records, message: _response_message.found("procurement") });

    } catch (error) {
        console.log(error.message);
        _handleCatchErrors(error, res);
    }
}

module.exports.getProcurementById = async (req, res) => {

    try {

        const { id } = req.params;

        const record = await ProcurementRequest.findOne({ _id: id });

        if (!record) {
            sendResponse({ status: 400, errors: [{ message: _response_message.notFound("procurement") }] })
        }

        return sendResponse({ status: 200, data: record, message: _response_message.found("procurement") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.updateProcurement = async (req, res) => {

    try {
        const { user_id } = req;
        const { id, quotedPrice, deliveryDate, name, category, grade, variety, quantity, deliveryLocation, lat, long } = req.body;

        const existingRecord = await ProcurementRequest.findOne({ _id: id });

        if (!existingRecord) {
            return sendResponse({ status: 400, errors: [{ message: _response_message.notFound("procurement") }] })
        }

        const delivery_date = moment(deliveryDate).format("YYYY-MM-DD");

        if (moment(delivery_date).isBefore(quote_expiry_date)) {
            return sendResponse({ status: 400, errors: [{ message: _response_message.invalid_delivery_date("Delivery date") }] })
        }

        const update = {
            quotedPrice,
            deliveryDate: delivery_date,
            product: { name, category, grade, variety, quantity },
            address: { deliveryLocation, lat, long },
            updated_by: user_id
        }

        const updatedProcurement = await ProcurementRequest.findOneAndUpdate({ _id: id }, update, { new: true });

        eventEmitter.emit(_webSocketEvents.procurement, { ...updatedProcurement, method: "updated" })

        return sendResponse({ status: 200, data: updatedProcurement, message: _response_message.updated("procurement") })

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.associateOffer = async (req, res) => {

    try {

        const { user_id } = req;
        const { req_id, farmer_data = [], qtyOffered } = req.body;

        if (farmer_data.length == 0) {
            return sendResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer data") }] })
        }
        const existingProcurementRecord = await ProcurementRequest.findOne({ _id: req_id });

        if (!existingProcurementRecord) {
            return sendResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] });
        }

        const existingRecord = await SellerOffers.findOne({ seller_id: user_id, req_id: req_id });

        if (existingRecord) {
            return sendResponse({ status: 400, errors: [{ message: _response_message.allReadyExist("offer") }] });
        }

        const sumOfFarmerQty = farmer_data.reduce((acc, curr) => {

            acc = acc + parseInt(curr.qty);

            return parseInt(acc);

        }, 0);

        if (sumOfFarmerQty != parseInt(qtyOffered)) {
            return sendResponse({ status: 400, errors: [{ message: "please check details! quantity mismatched" }] });
        }

        const { fulfilledQty, product } = existingProcurementRecord;

        if (qtyOffered > (product?.quantity - fulfilledQty)) {
            return sendResponse({ status: 400, errors: [{ message: "incorrect quantity of request" }] });
        }

        const sellerOfferRecord = await SellerOffers.create({ seller_id: user_id, req_id: req_id, offeredQty: sumOfFarmerQty, createdBy: user_id });


        const dataToBeInserted = [];

        for (let harvester of farmer_data) {

            const existingFarmer = await farmer.findOne({ _id: harvester._id });

            if (!existingFarmer) {
                return sendResponse({ status: 200, errors: [{ message: _response_message.notFound("farmer") }] });
            }

            const farmerBankDetails = await Bank.findOne({ farmer_id: harvester._id });

            const { account_no, ifsc_code, bank_name, account_holder_name } = farmerBankDetails;
            const { name, father_name, address_line, mobile_no } = existingFarmer;

            const metaData = { name, father_name, address_line, mobile_no, account_no, ifsc_code, bank_name, account_holder_name, bank_name };

            const contributedFarmerData = {
                sellerOffers_id: sellerOfferRecord._id,
                farmer_id: harvester._id,
                metaData,
                offeredQty: harvester.qty,
                createdBy: user_id,
            }

            dataToBeInserted.push(contributedFarmerData);
        }

        await ContributedFarmers.insertMany(dataToBeInserted);

        return sendResponse({ status: 200, data: sellerOfferRecord, message: "offer submitted" });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getFarmerListById = async (req, res) => {

    try {
        const { user_id, user_type } = req; // Retrieve user_id and user_type from request
        const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = 'name', search = '' } = req.query;

        // Ensure only `associate` users can access this API
        if (user_type !== _userType.associate) {
            return res.status(401).send(sendResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        // Build query to find farmers associated with the current user (associate)
        let query = {
            associate_id: new mongoose.Types.ObjectId(user_id), // Match farmers under current associate
            ...(search && { name: { $regex: search, $options: 'i' } }) // Search functionality
        };

        // Build aggregation pipeline
        let aggregationPipeline = [
            { $match: query }, // Match by associate_id and optional search
            {
                $lookup: {
                    from: 'crops',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'crops',
                    pipeline: [{
                        $project: {
                            _id: 1,
                            associate_id: 1,
                            farmer_id: 1,
                            sowing_date: 1,
                            harvesting_date: 1,
                            crops_name: 1,
                            production_quantity: 1,
                            yield: 1,
                            insurance_worth: 1,
                            status: 1
                        }
                    }]
                }
            },
            {
                $lookup: {
                    from: 'lands',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'lands',
                    pipeline: [{
                        $project: {
                            _id: 1,
                            farmer_id: 1,
                            associate_id: 1,
                            total_area: 1,
                            area_unit: 1,
                            khasra_no: 1,
                            khatauni: 1,
                            sow_area: 1,
                            land_address: 1,
                            soil_type: 1,
                            soil_tested: 1,
                            soil_health_card: 1,
                            lab_distance_unit: 1,
                            status: 1,
                        }
                    }]
                }

            },
            {
                $lookup: {
                    from: 'banks',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'bankDetails',
                    pipeline: [{
                        $project: {
                            _id: 1,
                            farmer_id: 1,
                            associate_id: 1,
                            bank_name: 1,
                            account_no: 1,
                            ifsc_code: 1,
                            account_holder_name: 1,
                            branch_address: 1,
                            status: 1,
                        }
                    }]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'associate_id',
                    foreignField: '_id',
                    as: 'associateDetails',
                    pipeline: [{
                        $project: {
                            organization_name: '$basic_details.associate_details.organization_name', // Project only the required fields
                        }
                    }]
                }
            },
            {
                $match: {
                    'crops.0': { $exists: true }, // Ensure farmers have at least one crop
                    'bankDetails.0': { $exists: true } // Ensure farmers have bank details
                }
            },
            { $unwind: '$associateDetails' }, // Unwind to merge associate details
            { $unwind: '$bankDetails' }, // Unwind to merge bank details
            {
                $project: {
                    farmer_code: 1,
                    title: 1,
                    mobile_no: 1,
                    name: 1,
                    parents: 1,
                    dob: 1,
                    gender: 1,
                    address: 1,
                    crops: 1,
                    bankDetails: 1,
                    lands: 1
                }
            },
            {
                $sort: { [sortBy]: 1 } // Sort by the `sortBy` field, default to `name`
            }
        ];

        // Apply pagination if `paginate` is enabled
        if (paginate == 1) {
            aggregationPipeline.push({
                $skip: parseInt(skip) || (parseInt(page) - 1) * parseInt(limit)
            }, {
                $limit: parseInt(limit)
            });
        }

        // Fetch count of farmers
        const countPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'crops',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'crops'
                }
            },
            {
                $lookup: {
                    from: 'banks',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'bankDetails'
                }
            },
            {
                $match: {
                    'crops.0': { $exists: true }, // Farmers with crops
                    'bankDetails.0': { $exists: true } // Farmers with bank details
                }
            },
            { $count: 'total' } // Count total records matching the criteria
        ];

        // Execute the count query
        const countResult = await farmer.aggregate(countPipeline);
        const totalRecords = countResult[0] ? countResult[0].total : 0;

        // Execute the main aggregation query
        const rows = await farmer.aggregate(aggregationPipeline);

        const records = {
            count: totalRecords,
            rows: rows
        };

        // If pagination is enabled, add pagination metadata
        if (paginate == 1) {
            records.page = parseInt(page);
            records.limit = parseInt(limit);
            records.pages = limit != 0 ? Math.ceil(totalRecords / limit) : 0;
        }

        return sendResponse({
            status: 200,
            data: records,
            message: _query.get('farmer')
        });
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


module.exports.requestApprove = async (req, res) => {

    try {

        const { sellerOffers_id, status } = req.body;
        const { user_type } = req;

        if (user_type != _userType.admin) {
            return sendResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] })
        }

        const sellerOffered = await SellerOffers.findOne({ _id: sellerOffers_id });

        if (!sellerOffered) {
            return sendResponse({ status: 400, errors: [{ message: _response_message.notFound("seller offer") }] });
        }

        if (status == _sellerOfferStatus.rejected) {
            sellerOffered.status = _sellerOfferStatus.rejected;
        }
        else if (status == _sellerOfferStatus.accepted) {

            const existingRequest = await ProcurementRequest.findOne({ _id: sellerOffered.req_id });

            if (!existingRequest) {
                return sendResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] });
            }

            existingRequest.fulfilledQty += sellerOffered.offeredQty;

            if (existingRequest.fulfilledQty == existingRequest?.product?.quantity) {
                existingRequest.status = _procurementRequestStatus.fulfilled;
            } else if (existingRequest.fulfilledQty < existingRequest?.product?.quantity) {
                existingRequest.status = _procurementRequestStatus.partially_fulfulled;
            } else {
                return sendResponse({ status: 400, errors: [{ message: "this request cannot be processed! quantity exceeds" }] });
            }

            await sellerOffered.save();
            await existingRequest.save();

            return sendResponse({ status: 200, data: existingRequest, message: "order accepted by admin" });
        }

    } catch (error) {
        console.log(error.message);
        _handleCatchErrors(error, res);
    }
}


module.exports.offeredFarmerList = async (req, res) => {

    try {
        const { user_id, user_type } = req;
        const { page, limit, skip, sortBy, search = '', req_id } = req.query

        const offerIds = (await SellerOffers.find({ req_id, ...(user_type == _userType.associate && { seller_id: user_id }) })).map((ele) => ele._id);

        if (offerIds.length == 0) {
            return sendResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] });
        }

        let query = search ? {
            $or: [
                { "metaData.name": { $regex: search, $options: 'i' } },
                { "metaData.father_name": { $regex: search, $options: 'i' } },
                { "metaData.mobile_no": { $regex: search, $options: 'i' } },
            ]
        } : {};

        query.sellerOffers_id = { $in: offerIds };
        const records = { count: 0 };

        records.rows = await ContributedFarmers.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit))

        records.count = await ContributedFarmers.countDocuments(query);

        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0

        return sendResponse({ status: 200, data: records, message: _response_message.found() });


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.getAcceptedProcurement = async (req, res) => {
    try {
        const { user_id } = req;
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
        let query = search ? {} : { status: _sellerOfferStatus.accepted, seller_id: user_id };
        const records = { count: 0 };
        records.rows = paginate == 1 ? await SellerOffers.find(query).populate({ path: 'req_id' })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await SellerOffers.find(query).populate({ path: 'req_id' }).sort(sortBy);
        records.count = await SellerOffers.countDocuments(query);
        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }
        return sendResponse({ status: 200, data: records, message: _response_message.found("accepted procurement") });
    } catch (error) {
        console.log(error.message);
        _handleCatchErrors(error, res);
    }
}


module.exports.editFarmerOffer = async (req, res) => {

    try {

        const { id, receving_date, qtyProcured, procurementCenter_id, weighbridge_name, weighbridge_no, tare_weight, gross_weight, net_weight, weight_slip, status = _procuredStatus.received } = req.body;
        const { user_id } = req;

        const record = await ContributedFarmers.findOne({ _id: id });

        if (!record) {
            return sendResponse({ status: 400, errors: [{ message: _response_message.notFound() }] });
        }

        record.receving_date = receving_date;
        record.qtyProcured = qtyProcured;
        record.procurementCenter_id = procurementCenter_id;
        record.weighbridge_name = weighbridge_name;
        record.weighbridge_no = weighbridge_no;
        record.tare_weight = tare_weight;
        record.gross_weight = gross_weight;
        record.net_weight = net_weight;
        record.weight_slip = weight_slip;
        record.status = status;
        record.updatedBy = user_id;

        await record.save();

        if (status == _sellerOfferStatus.received) {
            const sellerOfferRecord = await SellerOffers.findOne({ _id: record?.sellerOffers_id });
            sellerOfferRecord.procuredQty += qtyProcured;
            await sellerOfferRecord.save();

        }

        return sendResponse({ status: 200, data: record, message: _response_message.updated("farmer") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.approveRejectOfferByAgent = asyncErrorHandler(async (req, res) => {


    const { user_type, user_id } = req;

    // if (user_type != _userType.admin) {
    //     return sendResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }));
    // }

    const { sellerOffer_id, status, comment } = req.body;

    const offer = await SellerOffers.findOne({ _id: sellerOffer_id });

    if (!offer) {
        return sendResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] });
    }

    if (!Object.values(_sellerOfferStatus).includes(status)) {
        return sendResponse({ status: 400, errors: [{ message: _response_message.invalid("status") }] });
    }

    if (status == _sellerOfferStatus.rejected && comment) {
        offer.comments.push({ user_id: user_id, comment });
    }

    offer.status = status;
    await offer.save();

    return sendResponse({ status: 200, data: offer, message: _response_message.found("offer") });

})


module.exports.getAssociateOffers = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', req_id } = req.query

    const { user_type, user_id } = req;

    let query = search ? {
        $or: []
    } : {};

    if (user_type == _userType.associate) {
        query.seller_id = user_id;
    }

    query.req_id = req_id;

    const records = { count: 0 };

    records.rows = paginate == 1 ? await SellerOffers.find(query)
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit)) : await SellerOffers.find(query).sort(sortBy);

    records.count = await SellerOffers.countDocuments(query);


    if (paginate == 1) {
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }

    return sendResponse({ status: 200, data: records, message: _response_message.found("seller offer") });
})