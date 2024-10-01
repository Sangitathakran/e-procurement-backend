const { _handleCatchErrors, dumpJSONToCSV, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType, _paymentstatus } = require('@src/v1/utils/constants');
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const mongoose = require("mongoose");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");

module.exports.payment = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', user_type, isExport = 0 } = req.query

        let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        if (user_type == _userType.farmer) {
            query.user_type = _userType.farmer;
        } else if (user_type == _userType.associate) {
            query.user_type = _userType.associate;
        }
        else if (user_type == _userType.agent) {
            query.user_type = _userType.agent;
        }

        const records = { count: 0 };
        records.rows = paginate == 1 ? await Payment.find(query)
            .populate({
                path: 'whomToPay', select: '_id associate_id farmer_code name',
                path: 'req_id', select: 'product farmer_code name'
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await Payment.find(query)
            .sort(sortBy);

            let batchId = {}
            records.rows = await Promise.all(records.rows.map(async record => {
                const batch = await Batch.findOne({'req_id':record.req_id}).select({batchId: 1, _id: 0});
                 batchId = batch?.batchId;
                return { ...record.toObject(), batchId }
            }));

        records.count = await Payment.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Order ID": item?.reqNo || 'NA',
                    "Batch ID": item?.batchId || 'NA',
                    "Commodity": item?.commodity || 'NA',
                    "Quantity Purchased": item?.qtyProcured || 'NA',
                    "Payment Status": item?.payment_status ?? 'NA',
                    "Approval Status": item?.status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Payment-record.xlsx`,
                    worksheetName: `Payment-record`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.associateOrders = async (req, res) => {

    try {       
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const { user_type } = req;

        if (user_type != _userType.agent) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        let query = {
            req_id,
            user_type: _userType.associate,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };
        
        const records = { count: 0 };
        records.rows = paginate == 1 ? await Payment.find(query)
            .populate({
                path: 'whomToPay', select: '_id associate_id farmer_code name',
                path: 'user_id', select: '_id user_code basic_details.associate_details'
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
                    "Associate ID": item?.user_id.user_code || 'NA',
                    "Associate Type": item?.user_id.basic_details.associate_details.associate_name || 'NA',
                    "Associate Name": item?.user_id.basic_details.associate_details.associate_type || 'NA',
                    "Quantity Purchased": item?.qtyProcured || 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate-orders.xlsx`,
                    worksheetName: `Associate-orders`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batchList = async (req, res) => {

    try {
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


module.exports.lot_list = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', farmerOrderId } = req.query;

        let query = {
            _id: farmerOrderId,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };
        records.rows = paginate == 1 ? await FarmerOrders.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await FarmerOrders.find(query)
            .sort(sortBy);

        let farmerName = {}
        
        records.rows = await Promise.all(records.rows.map(async record => {
            
            const farmerDetails = await farmer.findOne({'_id':record.farmer_id}).select({name: 1, _id: 0});
    
            const farmerName = farmerDetails ? farmerDetails.name : null;
            return { ...record.toObject(), farmerName }
        }));

        records.count = await FarmerOrders.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }
 
        if(records) {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }
        else{
            return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.farmerOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffers_id, isExport = 0 } = req.query;

        let query = {
            associateOffers_id,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };
        records.rows = paginate == 1 ? await FarmerOrders.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await FarmerOrders.find(query).sort(sortBy);

        records.count = await FarmerOrders.countDocuments(query);

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
                    "Payment Due On": item?.payment_date ?? 'NA',
                    "Quantity Purchased": item?.offeredQty ?? 'NA',
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
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.paymentApprove = async (req, res) => {

    try {

        const { req_id } = req.body;
        const { user_type } = req;

        if (user_type != _userType.agent) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const paymentList = await Payment.find({ req_id });

        if (!paymentList) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Payment") }] }))
        }

        paymentList.status = _paymentstatus.approved;

        await paymentList.save();

        return res.status(200).send(new serviceResponse({ status: 200, data: existingRequest, message: "Payment Approved by admin" }))


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getBill = async (req, res) => {

    try {
        const { batchId } = req.query

        const { user_id, user_type } = req;

        if (user_type !== _userType.associate) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        const billPayment = await Batch.findOne({ batchId }).select({ _id: 1, batchId: 1, req_id: 1, dispatchedqty: 1 });

        if(billPayment){
                
            let totalamount = 0;
            let mspPercentage = 1; // The percentage you want to calculate       

            const reqDetails = await Payment.find({ req_id: billPayment.req_id }).select({ _id: 0, amount: 1 });

            const newdata = await Promise.all(reqDetails.map(async record => {
                totalamount += record.amount;
            }));

            const mspAmount = (mspPercentage / 100) * totalamount; // Calculate the percentage 

            let records = { ...billPayment.toObject(), totalamount, mspAmount }

            if (records) {
                return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
            }
        }
        else {
            return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Payment") }] }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.proceedToPay = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query

        const { user_type } = req;

        if (user_type != _userType.agent) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        let query = {
            status: _paymentstatus.approved,
            ...(search ? { reqNo: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

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

        // return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }));

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
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.associateOrdersProceedToPay = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const { user_type } = req;

        if (user_type != _userType.agent) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        let query = {
            req_id,
            status: _paymentstatus.approved,
            user_type: _userType.associate,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };
        `   `
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
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batchListProceedToPay = async (req, res) => {

    try {

        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query
        
        const { user_type } = req;

        if (user_type != _userType.agent) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        let query = {
            req_id,
            status: _paymentstatus.approved,
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

module.exports.getBillProceedToPay = async (req, res) => {

    try {
        const { batchId } = req.query

        const { user_type } = req;

        if (user_type !== _userType.agent) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized("User") }] }));
        }

        const billPayment = await Batch.findOne({ batchId }).select({ _id: 1, batchId: 1, req_id: 1, dispatchedqty: 1 });

        if(billPayment){
            let totalamount = 0;
            let mspPercentage = 1; // The percentage you want to calculate     
            
            const reqDetails = await Payment.find({ req_id: billPayment.req_id, status: _paymentstatus.approved }).select({ _id: 0, amount: 1 });

            const newdata = await Promise.all(reqDetails.map(async record => {
                totalamount += record.amount;
            }));

            const mspAmount = (mspPercentage / 100) * totalamount; // Calculate the percentage 
            const billQty = (0.8/1000); 

            let records = { ...billPayment.toObject(), totalamount, mspAmount, billQty }

            if (records) {
                return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
            }
        }
        else {
            return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Payment") }] }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}