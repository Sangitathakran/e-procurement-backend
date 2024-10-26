const { _handleCatchErrors, _generateOrderNumber, _addDays } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { _requestStatus, _webSocketEvents, _procuredStatus, _collectionName } = require('@src/v1/utils/constants');
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { _associateOfferStatus, _userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const mongoose = require("mongoose");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { User } = require("@src/v1/models/app/auth/User");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");


module.exports.getProcurement = async (req, res) => {
    try {
        const { user_id } = req;
        const { page, limit, skip, paginate = 1, sortBy, search = '', status } = req.query;

        let query = search ? {
            $or: [
                { "reqNo": { $regex: search, $options: 'i' } },
                { "product.name": { $regex: search, $options: 'i' } },
                { "product.grade": { $regex: search, $options: 'i' } },
            ]
        } : {};

        // Handle status filtering based on offers
        if (status && Object.values(_associateOfferStatus).includes(status)) {
            console.log('status', status)
            // Aggregation pipeline to join with AssociateOffers
            const conditionPipeline = []
            if (status == _associateOfferStatus.ordered) {
                conditionPipeline.push({
                    $lookup: {
                        from: 'batches',
                        localField: '_id',
                        foreignField: 'req_id',
                        as: 'batches',
                    },
                })

                conditionPipeline.push({
                    $addFields: {
                        batchesCount: { $size: '$batches' } // Get the count of batches
                    }
                })
            }
            const pipeline = [
                { $match: query },
                {
                    $lookup: {
                        from: 'associateoffers',
                        localField: '_id',
                        foreignField: 'req_id',
                        as: 'myoffer',
                    },
                },
                ...conditionPipeline,
                { $unwind: '$myoffer' },
                {
                    $match: {
                        'myoffer.seller_id': new mongoose.Types.ObjectId(user_id),
                        ...((status == _associateOfferStatus.pending || status == _associateOfferStatus.rejected) && { 'myoffer.status': status }),
                        ...(status == _associateOfferStatus.accepted && { 'myoffer.status': { $in: [_associateOfferStatus.accepted, _associateOfferStatus.partially_ordered] } }),
                        ...(status == _associateOfferStatus.ordered && { 'myoffer.status': { $in: [_associateOfferStatus.ordered, _associateOfferStatus.partially_ordered] } }),
                    }
                },
                // {
                //     $project: {
                //         _id: 1,
                //         reqNo: 1,
                //         product: 1,
                //         quotedPrice: 1,
                //         deliveryDate: 1,
                //         expectedProcurementDate: 1,
                //         fulfilledQty: 1,
                //         status: 1,
                //         address: 1,
                //         'myoffer.offeredQty': 1,
                //         'myoffer.status': 1,
                //     },
                // },
                { $sort: sortBy ? sortBy : { createdAt: -1 } },
                { $skip: skip ? parseInt(skip) : 0 },
                { $limit: limit ? parseInt(limit) : 10 }
            ];

            const records = {};
            records.rows = await RequestModel.aggregate(pipeline);
            records.count = await RequestModel.countDocuments(query);

            if (paginate == 1) {
                records.page = page;
                records.limit = limit;
                records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
            }

            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));
        } else {
            // Find requests that have no offers or are open
            query.status = _requestStatus.open;
            const offerIds = (await AssociateOffers.find({ seller_id: user_id })).map((offer) => offer.req_id);
            query._id = { $nin: offerIds };


            const records = { count: 0 };
            records.rows = paginate == 1 ? await RequestModel.find(query)
                .sort(sortBy)
                .skip(skip)
                .limit(parseInt(limit)) : await RequestModel.find(query).sort(sortBy);

            records.count = await RequestModel.countDocuments(query);

            if (paginate == 1) {
                records.page = page;
                records.limit = limit;
                records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
            }

            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));
        }

    } catch (error) {
        console.log(error.message);
        _handleCatchErrors(error, res);
    }
};

module.exports.getProcurementById = async (req, res) => {

    try {

        const { id } = req.params;

        const record = await RequestModel.findOne({ _id: id }).lean();

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("procurement") }] }))
        }

        record.myOffer = await AssociateOffers.findOne({ req_id: id });

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("procurement") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.updateProcurement = async (req, res) => {

    try {
        const { user_id } = req;
        const { id, quotedPrice, deliveryDate, name, category, grade, variety, quantity, deliveryLocation, lat, long } = req.body;

        const existingRecord = await RequestModel.findOne({ _id: id });

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

        const updatedProcurement = await RequestModel.findOneAndUpdate({ _id: id }, update, { new: true });

        eventEmitter.emit(_webSocketEvents.procurement, { ...updatedProcurement, method: "updated" })

        return res.status(200).send(new serviceResponse({ status: 200, data: updatedProcurement, message: _response_message.updated("procurement") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.associateOffer = async (req, res) => {

    try {

        const { user_id } = req;
        const { req_id, farmer_data = [], qtyOffered } = req.body;

        if (farmer_data.length == 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer data") }] }))
        }
        const existingProcurementRecord = await RequestModel.findOne({ _id: req_id });

        if (!existingProcurementRecord) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }))
        }

        const existingRecord = await AssociateOffers.findOne({ seller_id: user_id, req_id: req_id });

        if (existingRecord) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.allReadyExist("offer") }] }))
        }

        const sumOfFarmerQty = farmer_data.reduce((acc, curr) => {

            acc = acc + parseInt(curr.qty);

            return parseInt(acc);

        }, 0);

        if (sumOfFarmerQty != parseInt(qtyOffered)) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "please check details! quantity mismatched" }] }))
        }

        const { fulfilledQty, product } = existingProcurementRecord;

        if (qtyOffered > (product?.quantity - fulfilledQty)) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "incorrect quantity of request" }] }))
        }

        for (let harvester of farmer_data) {
            if (!(await farmer.findOne({ _id: harvester._id })))
                return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("farmer") }] }))
        }

        const associateOfferRecord = await AssociateOffers.create({ seller_id: user_id, req_id: req_id, offeredQty: sumOfFarmerQty, createdBy: user_id });

        const dataToBeInserted = [];

        for (let harvester of farmer_data) {

            const existingFarmer = await farmer.findOne({ _id: harvester._id });
            const { name, father_name, address_line, mobile_no, farmer_code } = existingFarmer;

            const metaData = { name, father_name, address_line, mobile_no, farmer_code };

            const FarmerOfferData = {
                associateOffers_id: associateOfferRecord._id,
                farmer_id: harvester._id,
                metaData,
                offeredQty: harvester.qty,
                createdBy: user_id,
            }

            dataToBeInserted.push(FarmerOfferData);
        }

        await FarmerOffers.insertMany(dataToBeInserted);

        return res.status(200).send(new serviceResponse({ status: 200, data: associateOfferRecord, message: "offer submitted" }))

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
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        // Build query to find farmers associated with the current user (associate)
        let query = {
            associate_id: new mongoose.Types.ObjectId(user_id), // Match farmers under current associate
            ...(search && { name: { $regex: search, $options: 'i' } }) // Search functionality
        };

        // Build aggregation pipeline
        let aggregationPipeline = [
            { $match: query }, // Match by associate_id and optional search
            // {
            //     $lookup: {
            //         from: 'crops',
            //         localField: '_id',
            //         foreignField: 'farmer_id',
            //         as: 'crops',
            //         pipeline: [{
            //             $project: {
            //                 _id: 1,
            //                 associate_id: 1,
            //                 farmer_id: 1,
            //                 sowing_date: 1,
            //                 harvesting_date: 1,
            //                 crops_name: 1,
            //                 production_quantity: 1,
            //                 yield: 1,
            //                 insurance_worth: 1,
            //                 status: 1
            //             }
            //         }]
            //     }
            // },
            // {
            //     $lookup: {
            //         from: 'lands',
            //         localField: '_id',
            //         foreignField: 'farmer_id',
            //         as: 'lands',
            //         pipeline: [{
            //             $project: {
            //                 _id: 1,
            //                 farmer_id: 1,
            //                 associate_id: 1,
            //                 total_area: 1,
            //                 area_unit: 1,
            //                 khasra_no: 1,
            //                 khatauni: 1,
            //                 sow_area: 1,
            //                 land_address: 1,
            //                 soil_type: 1,
            //                 soil_tested: 1,
            //                 soil_health_card: 1,
            //                 lab_distance_unit: 1,
            //                 status: 1,
            //             }
            //         }]
            //     }

            // },
            // {
            //     $lookup: {
            //         from: 'banks',
            //         localField: '_id',
            //         foreignField: 'farmer_id',
            //         as: 'bankDetails',
            //         pipeline: [{
            //             $project: {
            //                 _id: 1,
            //                 farmer_id: 1,
            //                 associate_id: 1,
            //                 bank_name: 1,
            //                 account_no: 1,
            //                 ifsc_code: 1,
            //                 account_holder_name: 1,
            //                 branch_address: 1,
            //                 status: 1,
            //             }
            //         }]
            //     }
            // },
            // {
            //     $lookup: {
            //         from: 'users',
            //         localField: 'associate_id',
            //         foreignField: '_id',
            //         as: 'associateDetails',
            //         pipeline: [{
            //             $project: {
            //                 organization_name: '$basic_details.associate_details.organization_name', // Project only the required fields
            //             }
            //         }]
            //     }
            // },
            // {
            //     $match: {
            //         'crops.0': { $exists: true }, // Ensure farmers have at least one crop
            //         'bankDetails.0': { $exists: true } // Ensure farmers have bank details
            //     }
            // },
            // { $unwind: '$associateDetails' }, // Unwind to merge associate details
            // { $unwind: '$bankDetails' }, // Unwind to merge bank details
            // {
            //     $project: {
            //         farmer_code: 1,
            //         title: 1,
            //         mobile_no: 1,
            //         name: 1,
            //         parents: 1,
            //         dob: 1,
            //         gender: 1,
            //         address: 1,
            //         crops: 1,
            //         bankDetails: 1,
            //         lands: 1
            //     }
            // },
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
            // {
            //     $lookup: {
            //         from: 'crops',
            //         localField: '_id',
            //         foreignField: 'farmer_id',
            //         as: 'crops'
            //     }
            // },
            // {
            //     $lookup: {
            //         from: 'banks',
            //         localField: '_id',
            //         foreignField: 'farmer_id',
            //         as: 'bankDetails'
            //     }
            // },
            // {
            //     $match: {
            //         'crops.0': { $exists: true }, // Farmers with crops
            //         'bankDetails.0': { $exists: true } // Farmers with bank details
            //     }
            // },
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

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('farmer') }))
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


module.exports.requestApprove = async (req, res) => {

    try {

        const { associateOffers_id, status } = req.body;
        const { user_type } = req;

        if (user_type != _userType.admin) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const associateOffered = await AssociateOffers.findOne({ _id: associateOffers_id });

        if (!sellerOffered) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("seller offer") }] }))
        }

        if (status == _associateOfferStatus.rejected) {
            associateOffered.status = _associateOfferStatus.rejected;
        }
        else if (status == _associateOfferStatus.accepted) {

            const existingRequest = await RequestModel.findOne({ _id: associateOffered.req_id });

            if (!existingRequest) {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }))
            }

            existingRequest.fulfilledQty += associateOffered.offeredQty;

            if (existingRequest.fulfilledQty == existingRequest?.product?.quantity) {
                existingRequest.status = _requestStatus.fulfilled;
            } else if (existingRequest.fulfilledQty < existingRequest?.product?.quantity) {
                existingRequest.status = _requestStatus.partially_fulfulled;
            } else {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "this request cannot be processed! quantity exceeds" }] }))
            }

            await associateOffered.save();
            await existingRequest.save();

            return res.status(200).send(new serviceResponse({ status: 200, data: existingRequest, message: "order accepted by admin" }))
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

        const offerIds = (await AssociateOffers.find({ req_id, ...(user_type == _userType.associate && { seller_id: user_id }) })).map((ele) => ele._id);

        if (offerIds.length == 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }))
        }

        let query = search ? {
            $or: [
                { "metaData.name": { $regex: search, $options: 'i' } },
                { "metaData.father_name": { $regex: search, $options: 'i' } },
                { "metaData.mobile_no": { $regex: search, $options: 'i' } },
            ]
        } : {};

        query.associateOffers_id = { $in: offerIds };
        const records = { count: 0 };

        records.rows = await FarmerOffers.find(query)
            .sort(sortBy)
            .skip(skip)
            .populate("farmer_id")
            .limit(parseInt(limit))

        records.count = await FarmerOffers.countDocuments(query);
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found() }))


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}



module.exports.farmerOrderList = async (req, res) => {

    try {
        const { user_id, user_type } = req;
        const { page, limit, skip, sortBy, search = '', req_id, status } = req.query

        const offerIds = [(await AssociateOffers.findOne({ req_id, seller_id: user_id }))?._id];

        if (offerIds.length == 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }))
        }

        let query = search ? {
            $or: [
                { "metaData.name": { $regex: search, $options: 'i' } },
                { "metaData.father_name": { $regex: search, $options: 'i' } },
                { "metaData.mobile_no": { $regex: search, $options: 'i' } },
            ]
        } : {};

        query.associateOffers_id = { $in: offerIds };


        if (status) {
            query.status = status;
        }

        const records = { count: 0 };

        records.rows = await FarmerOrders.find(query)
            .sort(sortBy)
            .skip(skip)
            .populate("farmer_id")
            .populate("procurementCenter_id")
            .limit(parseInt(limit))

        records.count = await FarmerOrders.countDocuments(query);

        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found() }))


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.getAcceptedProcurement = async (req, res) => {
    try {
        const { user_id } = req;
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
        let query = search ? {} : { status: _associateOfferStatus.accepted, seller_id: user_id };
        const records = { count: 0 };
        records.rows = paginate == 1 ? await AssociateOffers.find(query).populate({ path: 'req_id' })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await AssociateOffers.find(query).populate({ path: 'req_id' }).sort(sortBy);
        records.count = await AssociateOffers.countDocuments(query);
        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("accepted procurement") }))
    } catch (error) {
        console.log(error.message);
        _handleCatchErrors(error, res);
    }
}


module.exports.editFarmerOffer = async (req, res) => {

    try {

        const { id, receving_date, qtyProcured, procurementCenter_id, weighbridge_name, weighbridge_no, tare_weight, gross_weight, net_weight, weight_slip, status = _procuredStatus.received } = req.body;
        const { user_id } = req;

        const record = await FarmerOrders.findOne({ _id: id });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound() }] }))
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

        if (status == _procuredStatus.received) {
            const associateOfferRecord = await AssociateOffers.findOne({ _id: record?.associateOffers_id });
            associateOfferRecord.procuredQty += qtyProcured;
            await associateOfferRecord.save();

        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("farmer") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


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

    records.rows = paginate == 1 ? await AssociateOffers.find(query)
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit)) : await AssociateOffers.find(query).sort(sortBy);

    records.count = await AssociateOffers.countDocuments(query);


    if (paginate == 1) {
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("seller offer") }))
})


module.exports.hoBoList = async (req, res) => {
    try {
        const { search = '', user_type } = req.query

        if (!user_type) {
            return res.status(200).send(new serviceResponse({ status: 400, message: _middleware.require('user_type') }));
        }

        let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        if (user_type == _userType.ho) {
            query.user_type = _userType.ho;

        } else if (user_type == _userType.bo) {
            query.user_type = _userType.bo;
        }

        const response = await User.find(query).select({ _id: 1, basic_details: 1 });
        // const response = await User.find(query);

        if (!response) {
            return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("User") }] }))
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.found("User") }] }))
        }

    } catch (error) {

        _handleCatchErrors(error, res);
    }

}