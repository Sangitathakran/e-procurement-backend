const { _handleCatchErrors, dumpJSONToCSV, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType } = require('@src/v1/utils/constants');
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");

module.exports.payment = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', userType, isExport = 0  } = req.query
    
        let query = search ? { reqNo: { $regex: search, $options: 'i' } }  : {};

        if (userType == _userType.farmer) {
            query.user_type = _userType.farmer;

        } else if (userType == _userType.associate) {
            query.user_type = _userType.associate;
        }
        else if (userType == _userType.agent) {
            query.user_type = _userType.agent;
        }

        // query.status = _paymentstatus.completed;

        const records = { count: 0 };
        records.rows = paginate == 1 ? await Payment.find(query)
            .populate({ 
                path: 'whomToPay', select:'_id associate_id farmer_code name'
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

module.exports.farmerOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', farmer_id, isExport = 0  } = req.query;
       
        let query = search ? { order_no: { $regex: search, $options: 'i' } }  : {};

        query.farmer_id = farmer_id;

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
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batch = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', userType, isExport = 0  } = req.query
     
        let query = search ? { reqNo: { $regex: search, $options: 'i' } }  : {};

        if (userType == _userType.farmer) {
            query.user_type = 'farmer';

        } else if (userType == _userType.associate) {
            query.user_type = 'associate';
        }

        const records = { count: 0 };
        records.rows = paginate == 1 ? await Payment.find(query)
            .populate({ 
                path: 'whomToPay', select:'_id associate_id farmer_code name'
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
