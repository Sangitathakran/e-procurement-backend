const { _handleCatchErrors, dumpJSONToCSV, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { sendResponse, serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType } = require('@src/v1/utils/constants');
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { getFarmerDetails } = require("../../farmer/individual-farmer/Controller");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const moment = require("moment");
const mongoose = require("mongoose");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { Batch } = require("@src/v1/models/app/procurement/Batch");


module.exports.payment = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', userType, isExport = 0 } = req.query

        const { user_id } = req;

        let query = {
            user_id,
            ...(search ? { reqNo: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        if (userType == _userType.farmer) {
            query.user_type = _userType.farmer;

        } else if (userType == _userType.associate) {
            query.user_type = _userType.associate;
        }

        const records = { count: 0 };
        records.rows = paginate == 1 ? await Payment.find(query)
            .populate({
                path: 'whomToPay', select: '_id associate_id farmer_code name'
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await Payment.find(query).sort(sortBy);

        records.count = await Payment.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Request ID": item?.reqNo || 'NA',
                    "Commodity": item?.commodity || 'NA',
                    "Quantity Purchased": item?.qtyProcured || 'NA',
                    "Status": item?.status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Payment-${userType}.xlsx`,
                    worksheetName: `Payment-record-${userType}`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Payment") }] }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.farmerOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', farmer_id, isExport = 0 } = req.query;

        const { user_id } = req;

        let query = {
            user_id,
            farmer_id: farmer_id,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };
        records.rows = paginate == 1 ? await FarmerOffers.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await FarmerOffers.find(query).sort(sortBy);

        records.count = await FarmerOffers.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Order ID": item?.order_no || 'NA',
                    "Farmer ID": item?.farmer_id || 'NA',
                    "Farmer Name": item?.metaData?.name || 'NA',
                    "Procured On": item?.createdAt ?? 'NA',
                    "Payment Due On": item?.updatedAt ?? 'NA',
                    "Quantity Purchased": item?.offeredQty ?? 'NA',
                    "Amount Payable": item?.net_pay ?? 'NA',
                    "Amount Payable": item?.net_pay ?? 'NA',
                    "Approval Status": item?.status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `FarmerOrder-${'Farmer'}.xlsx`,
                    worksheetName: `FarmerOrder-record-${'Farmer'}`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Payment") }] }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batch = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', userType, isExport = 0 } = req.query

        let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        if (userType == _userType.farmer) {
            query.user_type = 'farmer';

        } else if (userType == _userType.associate) {
            query.user_type = 'associate';
        }

        const records = { count: 0 };
        records.rows = paginate == 1 ? await Payment.find(query)
            .populate({
                path: 'whomToPay', select: '_id associate_id farmer_code name'
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await Payment.find(query).sort(sortBy);

        records.count = await Payment.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Request ID": item?.reqNo || 'NA',
                    "Commodity": item?.commodity || 'NA',
                    "Quantity Purchased": item?.qtyProcured || 'NA',
                    "Status": item?.status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Payment-${userType}.xlsx`,
                    worksheetName: `Payment-record-${userType}`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Payment") }] }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batchList = async (req, res) => {

    try {

        // const { user_id, user_type } = req;

        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        let query = {
            req_id,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });

        records.rows = paginate == 1 ? await Batch.find(query)
            .populate({
                path: 'procurementCenter_id', select: '_id center_name center_code center_type address'
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await Batch.find(query).sort(sortBy);

        records.count = await Batch.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }


        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Batch ID": item?.batchId || 'NA',
                    "procurementCenter_id": item?.procurementCenter_id || 'NA',
                    "Quantity Purchased": item?.qtyProcured || 'NA',
                    "Status": item?.status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Payment-${userType}.xlsx`,
                    worksheetName: `Payment-record-${userType}`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Payment") }] }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getFarmerListById = async (req, res) => {

    try {
        const { user_type } = req; // Retrieve user_id and user_type from request
        const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = 'name', search = '', farmer_id } = req.query;

        // Ensure only `associate` users can access this API
        if (user_type !== _userType.associate) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        // Build query to find farmers associated with the current user (associate)
        let query = {
            _id: new mongoose.Types.ObjectId(farmer_id), // Match farmers under current associate
            // associate_id: user_id, // Match farmers under current associate
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

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('farmer') }))
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.getBill = async (req, res) => {

    try {
        const { batchId } = req.query

        const { user_id, user_type } = req;

        if (user_type !== _userType.associate) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }
       
        const billPayment = await Batch.findOne({ batchId }).select({_id:1, batchId: 1, req_id:1, dispatchedqty:1});

        let totalamount = 0;
        let mspPercentage = 1; // The percentage you want to calculate       

        const reqDetails = await Payment.find({ req_id: billPayment.req_id }).select({ _id: 0, amount: 1 });

        const newdata = await Promise.all(reqDetails.map(async record => {
            totalamount += record.amount;
            // return { ...record.toObject(), billPayment}

        }));
        
        const mspAmount = (mspPercentage / 100) * totalamount; // Calculate the percentage 
       
        let records = { ...billPayment.toObject(), totalamount, mspAmount }

        if (records) {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
        }
        else {
            return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Payment") }] }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}