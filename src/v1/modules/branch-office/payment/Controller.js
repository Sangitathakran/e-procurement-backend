const { _handleCatchErrors, dumpJSONToCSV, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType, _paymentstatus, _batchStatus } = require('@src/v1/utils/constants');
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { AgentPayment } = require("@src/v1/models/app/procurement/AgentPayment");
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
            const batch = await Batch.findOne({ 'req_id': record.req_id }).select({ batchId: 1, _id: 0 });
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

        if (user_type != _userType.bo) {
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

module.exports.batchApprove = async (req, res) => {

    try {

        const { batchIds } = req.body;
        const { user_type } = req;

        if (user_type != _userType.bo) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const result = await Batch.updateMany(
            { _id: { $in: batchIds } },  // Match any batchIds in the provided array
            { $set: { status: _batchStatus.paymentApproved } } // Set the new status for matching documents
        );

        if (result.matchedCount === 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "No matching Batch found" }] }));
        }

        return res.status(200).send(new serviceResponse({ status: 200, message: `${result.modifiedCount} Batch Approved successfully` }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.qcReport = async (req, res) => {

    try {
        const { id } = req.query;
        const { user_type } = req;

        if (user_type != _userType.bo) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const qcReport = await Batch.findOne({ _id: id })
            .populate({
                path: 'req_id', select: '_id reqNo product address quotedPrice fulfilledQty totalQuantity expectedProcurementDate'
            })
         
            // return res.status(200).send(new serviceResponse({ status: 200, data: qcReport, message: _query.get('Qc Report') }))
        
        if (qcReport) {

            let totalamount = 0;
            let mspPercentage = 1; // The percentage you want to calculate       

            const reqDetails = await Payment.find({
                $and: [
                    { req_id: qcReport.req_id },
                    { user_id: qcReport.seller_id }
                ]
            })
                .select({ _id: 0, amount: 1 });

            const newdata = await Promise.all(reqDetails.map(async record => {
                totalamount += record.amount;
            }));

            const mspAmount = (mspPercentage / 100) * totalamount; // Calculate the percentage 

            let records = { ...qcReport.toObject(), totalamount, mspAmount }

            if (records) {
                return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Qc Report') }))
            }
        }
        else {
            return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Qc Report") }] }))
        }

    }
    catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.paymentApprove = async (req, res) => {

    try {

        const { req_id, associate_id } = req.body;
        const { user_type } = req;

        if (user_type != _userType.bo) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const paymentList = await Payment.findOne({
            $and: [
                { req_id },
                { user_id: associate_id }
            ]
        });

        if (!paymentList) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Payment") }] }))
        }

        paymentList.status = _paymentstatus.approved;

        await paymentList.save();

        return res.status(200).send(new serviceResponse({ status: 200, message: "Payments Approved by admin" }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getBill = async (req, res) => {

    try {
        const { batchId } = req.query

        const { user_id, user_type } = req;

        if (user_type !== _userType.bo) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        const billPayment = await Batch.findOne({ batchId }).select({ _id: 1, batchId: 1, req_id: 1, dispatchedqty: 1, goodsPrice:1, totalPrice:1, dispatched:1 });

        if (billPayment) {

            billPayment.totalPrice;
            let mspPercentage = 1; // The percentage you want to calculate       

            const reqDetails = await Payment.find({ req_id: billPayment.req_id }).select({ _id: 0, amount: 1 });

            // const newdata = await Promise.all(reqDetails.map(async record => {
            //     totalamount += record.amount;
            // }));

            const mspAmount = (mspPercentage / 100) * totalamount; // Calculate the percentage 
            const billQty = (0.8 / 1000);

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

            const farmerDetails = await farmer.findOne({ '_id': record.farmer_id }).select({ name: 1, _id: 0 });

            const farmerName = farmerDetails ? farmerDetails.name : null;
            return { ...record.toObject(), farmerName }
        }));

        records.count = await FarmerOrders.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (records) {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }
        else {
            return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.agentPaymentList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query

        let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        const records = { count: 0 };

        const rows = paginate == 1 ? await AgentPayment.find(query)
            .populate({
                path: 'req_id', select: '_id reqNo product address deliveryDate quotedPrice status'
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await AgentPayment.find(query)
                .sort(sortBy);

        let branchDetails = {}

        records.rows = await Promise.all(rows.map(async record => {

            branchDetails = await RequestModel.findOne({ '_id': record.req_id }).select({ branch_id: 1, _id: 0 })
                .populate({ path: 'branch_id', select: 'branchName branchId' });

            return { ...record.toObject(), branchDetails }
        }));

        records.count = await AgentPayment.countDocuments(query);

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

module.exports.agentBill = async (req, res) => {

    try {
        const { req_id } = req.query

        const { user_type } = req;

        if (user_type != _userType.bo) {
            return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: _response_message.Unauthorized() }] }));
        }

        const billPayment = await AgentPayment.findOne({ req_id })
            .populate({
                path: 'req_id', select: '_id reqNo product address deliveryDate quotedPrice status'
            });

        if (billPayment) {

            let commission = (billPayment.bills.procurementExp + billPayment.bills.driage + billPayment.bills.storageExp * 1) / 100;

            let records = { ...billPayment.toObject(), commission }

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
