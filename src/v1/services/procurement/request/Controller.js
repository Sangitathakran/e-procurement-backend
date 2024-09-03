const { _handleCatchErrors, _generateOrderNumber, _addDays } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { ProcurementRequest } = require("@src/v1/models/app/procurement/ProcurementRequest");
const { _procurementRequestStatus, _webSocketEvents } = require('@src/v1/utils/constants');
const { sellerOffers } = require("@src/v1/models/app/procurement/SellerOffers");
const { contributedFarmers } = require("@src/v1/models/app/procurement/FarmerDetails");
// const Farmer = require("../../../../../models/farmerModel");
// const appStatus = require('../../../../../utils/appStatus');
const { _sellerOfferStatus, userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const mongoose = require("mongoose");

module.exports.createProcurement = async (req, res) => {

    try {
        const { user_id, user_type } = req
        const { organization_id, quotedPrice, deliveryDate, name, category, grade, variety, quantity, deliveryLocation, lat, long, quoteExpiry } = req.body;

        if (user_type && user_type != userType.admin)
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized() }] }))

        const randomVal = _generateOrderNumber();

        const quote_expiry_date = _addDays(quoteExpiry);
        const delivery_date = moment(deliveryDate).format("YYYY-MM-DD");

        if (moment(delivery_date).isBefore(quote_expiry_date)) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid_delivery_date("Delivery date") }] }))
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
        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("procurement") }));

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

        if (user_type == userType.ho || user_type == userType.bo) {
            query.organization_id = organization_id

        } else if (user_type == userType.trader) {
            if (status && Object.values(_sellerOfferStatus).includes(status)) {
                const offerIds = (await sellerOffers.find({ seller_id: user_id, status })).map((offer) => offer.req_id);
                query._id = { $in: offerIds };

            } else {
                query.status = _procurementRequestStatus.open

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

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));

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
            res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("procurement") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("procurement") }));

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
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("procurement") }] }))
        }

        const delivery_date = moment(deliveryDate).format("YYYY-MM-DD");

        if (moment(delivery_date).isBefore(quote_expiry_date)) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid_delivery_date("Delivery date") }] }))
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

        return res.status(200).send(new serviceResponse({ status: 200, data: updatedProcurement, message: _response_message.updated("procurement") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.fpoOffered = async (req, res) => {

    try {

        const { user_id } = req;
        const { req_id, farmer_data = [], qtyOffered } = req.body;

        if (farmer_data.length == 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer data") }] }))
        }
        const existingProcurementRecord = await ProcurementRequest.findOne({ _id: req_id });

        if (!existingProcurementRecord) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }));
        }

        const sumOfFarmerQty = farmer_data.reduce((acc, curr) => {

            acc = acc + parseInt(curr.qty);

            return parseInt(acc);

        }, 0);

        if (sumOfFarmerQty != parseInt(qtyOffered)) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "please check details! quantity mismatched" }] }));
        }

        const { fulfilledQty, product } = existingProcurementRecord;

        if (qtyOffered > (product?.quantity - fulfilledQty)) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "incorrect quantity of request" }] }));
        }

        const sellerOfferRecord = await sellerOffers.create({ seller_id: user_id, req_id: req_id, offeredQty: sumOfFarmerQty, createdBy: user_id });


        const dataToBeInserted = [];

        for (let farmer of farmer_data) {

            const existingFarmer = await Farmer.findOne({ _id: farmer._id });
            // console.log(existingFarmer);

            if (!existingFarmer) {
                return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("farmer") }] }));
            }

            const { name, father_name, address_line, mobile_no } = existingFarmer;

            const metaData = { name, father_name, address_line, mobile_no };

            const contributedFarmerData = {
                sellerOffers_id: sellerOfferRecord._id,
                farmer_id: farmer._id,
                metaData,
                offeredQty: qtyOffered,
                createdBy: user_id,
            }

            dataToBeInserted.push(contributedFarmerData);
        }

        await contributedFarmers.insertMany(dataToBeInserted);

        return res.status(200).send(new serviceResponse({ status: 200, data: sellerOfferRecord, message: "offer submitted" }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getFarmerListById = async (req, res) => {

    try {
        const { user_id, user_type, trader_type } = req
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query;

        let query = {
            // fpo_id: user_id,
            ...(search && { name: { $regex: search, $options: 'i' } })
        };

        if (trader_type != appStatus.traderType.FPO) {
            return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: 'This user is not FPO' }] }))
        }


        let aggregationPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'croprecords',
                    localField: '_id',
                    foreignField: 'farmer_detail_id',
                    as: 'crops'
                }
            },
            {
                $lookup: {
                    from: 'farmerbankdetails',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'bankDetails'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'fpo_id',
                    foreignField: '_id',
                    as: 'fpoDetails',
                    pipeline: [{
                        $project: {
                            fpo_name: '$fpo_name',
                        }
                    }]
                }
            },
            {
                $match: {
                    'crops.0': { $exists: true },
                    'bankDetails.0': { $exists: true },
                }
            },
            { $unwind: '$fpoDetails' },
            { $unwind: '$bankDetails' },
            {
                $sort: sortBy ? { [sortBy]: 1 } : { name: 1 }
            },
        ];

        if (paginate == 1) {
            aggregationPipeline.push({
                $skip: parseInt(skip) || 0
            }, {
                $limit: parseInt(limit) || 10
            })
        }

        const records = {
            count: 0,
            rows: []
        };


        records.count = await Farmer.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'croprecords',
                    localField: '_id',
                    foreignField: 'farmer_detail_id',
                    as: 'crops'
                }
            },
            {
                $lookup: {
                    from: 'farmerbankdetails',
                    localField: '_id',
                    foreignField: 'farmer_id',
                    as: 'bankDetails'
                }
            },
            {
                $match: {
                    'crops.0': { $exists: true },
                    'bankDetails.0': { $exists: true }
                }
            },
            { $count: 'total' }
        ]);
        records.count = records.count[0] ? records.count[0].total : 0;

        records.rows = await Farmer.aggregate(aggregationPipeline);

        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('farmer') }));
    } catch (error) {
        _handleCatchErrors(error, res)
    }
}

module.exports.requestApprove = async (req, res) => {

    try {

        const { sellerOffers_id, status } = req.body;
        const { user_type } = req;

        if (user_type != userType.admin) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const sellerOffered = await sellerOffers.findOne({ _id: sellerOffers_id });

        if (!sellerOffered) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("seller offer") }] }));
        }

        if (status == _sellerOfferStatus.rejected) {
            sellerOffered.status = _sellerOfferStatus.rejected;
        }
        else if (status == _sellerOfferStatus.accepted) {

            const existingRequest = await ProcurementRequest.findOne({ _id: sellerOffered.req_id });

            if (!existingRequest) {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }));
            }

            existingRequest.fulfilledQty += sellerOffered.offeredQty;

            if (existingRequest.fulfilledQty == existingRequest?.product?.quantity) {
                existingRequest.status = _procurementRequestStatus.fulfilled;
            } else if (existingRequest.fulfilledQty < existingRequest?.product?.quantity) {
                existingRequest.status = _procurementRequestStatus.partially_fulfulled;
            } else {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "this request cannot be processed! quantity exceeds" }] }));
            }

            await sellerOffered.save();
            await existingRequest.save();

            return res.status(200).send(new serviceResponse({ status: 200, data: existingRequest, message: "order accepted by admin" }));
        }

    } catch (error) {
        console.log(error.message);
        _handleCatchErrors(error, res);
    }
}


module.exports.getPendingOfferedList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
        const { user_id } = req
        let query = {
            seller_id: user_id,
            status: _sellerOfferStatus.pending,
            ...(search ? { name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = paginate == 1 ? await sellerOffers.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await sellerOffers.find(query).sort(sortBy);

        records.count = await sellerOffers.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}


module.exports.offeredFarmerList = async (req, res) => {

    try {
        const { user_id = "66cc78b0364d77179d938996" } = req;
        const { page, limit, skip, sortBy, search = '', req_id } = req.query

        const offer = await sellerOffers.findOne({ req_id, seller_id: user_id });

        if (!offer) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
        }

        let query = search ? {
            $or: [
                { "metaData.name": { $regex: search, $options: 'i' } },
                { "metaData.father_name": { $regex: search, $options: 'i' } },
                { "metaData.mobile_no": { $regex: search, $options: 'i' } },
            ]
        } : {};

        query.sellerOffers_id = offer._id;
        const records = { count: 0 };

        records.rows = await contributedFarmers.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit))

        records.count = await contributedFarmers.countDocuments(query);

        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found() }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getRejectOfferedList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
        const { user_id } = req
        let query = {
            seller_id: user_id,
            status: _sellerOfferStatus.rejected,
            ...(search ? { name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = paginate == 1 ? await sellerOffers.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await sellerOffers.find(query).sort(sortBy);

        records.count = await sellerOffers.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}


module.exports.getAcceptedOfferList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
        const { user_id } = req
        let query = {
            seller_id: user_id,
            status: _sellerOfferStatus.accepted,
            ...(search ? { name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = paginate == 1 ? await sellerOffers.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await sellerOffers.find(query).sort(sortBy);

        records.count = await sellerOffers.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));

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
        records.rows = paginate == 1 ? await sellerOffers.find(query).populate({ path: 'req_id' })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await sellerOffers.find(query).populate({ path: 'req_id' }).sort(sortBy);
        records.count = await sellerOffers.countDocuments(query);
        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("accepted procurement") }));
    } catch (error) {
        console.log(error.message);
        _handleCatchErrors(error, res);
    }
}
