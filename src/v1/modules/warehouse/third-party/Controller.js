const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { JWT_SECRET_KEY, THIRD_PARTY_JWT_SECRET } = require('@config/index');
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { _batchStatus, received_qc_status, _paymentstatus, _paymentmethod, _userType } = require("@src/v1/utils/constants");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { ExternalBatch } = require("@src/v1/models/app/procurement/ExternalBatch");
const { ExternalOrder } = require("@src/v1/models/app/warehouse/ExternalOrder");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { decryptJwtToken } = require('@src/v1/utils/helpers/jwt');
const jwt = require('jsonwebtoken');
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");
const { generateApiKey, generateApiSecret } = require("../utils/GenerateCred");
const { ClientToken } = require("@src/v1/models/app/warehouse/ClientToken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Joi = require('joi');



module.exports.registerClient = async (req, res) => {
    try {
        const { name, email, phone, role } = req.body;
        if (!name) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require('Name') }));
        }
        const formattedName = name.toLowerCase().replace(/\s+/g, ".");
        const defaultEmail = `${formattedName}@example.com`;
        const finalEmail = email || defaultEmail;

        const apiKey = generateApiKey();
        const { secret, hashedSecret } = await generateApiSecret();

        const newClient = new ClientToken({ 
            name, 
            email : finalEmail,
            phone : phone || "+919999999999", 
            role : role || "admin", 
            apiKey, apiSecret: hashedSecret 
        });

        await newClient.save();
        const response = {
            apiKey : apiKey,
            apiSecret: secret
        }
        return res.status(200).send(new serviceResponse({ message: _query.add('Client Registered'), data: response }));
    } catch (error) {
        console.error("Client Registration Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};



module.exports.createExternalBatch = async (req, res) => {
    try {

        const { batchName, associate_name, procurementCenter, inward_quantity, commodity, warehousedetails_id } = req.body;
        const {_id} = req.client;

        const requiredFields = { batchName, procurementCenter, commodity, warehousedetails_id, associate_name };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require(key.replace(/_/g, ' ')) }));
            }
        }
        let externalBatchExist = await ExternalBatch.findOne({ batchName  })
        if (externalBatchExist) {
            return res.status(200).send(new serviceResponse({ status: 400, message: _response_message.allReadyExist('Batch Name') }));
        }

        const externalBatchData = new ExternalBatch({ 
            batchName, 
            associate_name, 
            procurementCenter, 
            inward_quantity: inward_quantity || 0,
            commodity : commodity || 'Maize',
            warehousedetails_id,
            remaining_quantity : inward_quantity,
            third_party_client : _id
        });

        const response = await externalBatchData.save();

        return res.status(200).send(new serviceResponse({ message: _query.add('External Batch'), data: response }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.dropdownExternalBatchList = async (req, res) => {
    try {
        const {_id} = req.client;
        const batches = await ExternalBatch.find({third_party_client:_id});
        const orders = await ExternalOrder.find({third_party_client:_id})
            .populate({
                path: "external_batch_id",
                select: "batchName",
            })
            .populate({
                path: "warehousedetails_id",
                select: "basicDetails.warehouseName",
            });
            const dataList = {
                batchList : batches,
                orderList : orders
            }
        return res.status(200).send(new serviceResponse({ message: _response_message.found('data'), data: dataList }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.listExternalBatchList = async (req, res) => {
    try {
        const {_id} = req.client;
        const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = "" } = req.query;

        let query = {third_party_client:_id};
        if (search) {
            query["batchName"] = { $regex: search, $options: "i" };
        }

        const records = { count: 0, rows: [] };

        if (paginate == 1) {
            records.rows = await ExternalBatch.find(query)
                .populate({
                    path: "warehousedetails_id",
                    select: "basicDetails.warehouseName",
                })
                .sort(sortBy)
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            records.count = await ExternalBatch.countDocuments(query);
            records.page = parseInt(page);
            records.limit = parseInt(limit);
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        } else {
            records.rows = await ExternalOrder.find(query)
                .populate({
                    path: "warehousedetails_id",
                    select: "basicDetails.warehouseName",
                })
                .sort(sortBy);
        }

        return res.status(200).send(
            new serviceResponse({ status: 200, data: records, message: _response_message.found("ExternalBatch") })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.listExternalOrderList = async (req, res) => {
    try {
        const {_id} = req.client;
        const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = "" } = req.query;

        let query = {third_party_client:_id};
        if (search) {
            query["batchName"] = { $regex: search, $options: "i" };
        }

        const records = { count: 0, rows: [] };

        if (paginate == 1) {
            records.rows = await ExternalOrder.find(query)
                .populate({
                    path: "external_batch_id",
                    select: "batchName",
                })
                .populate({
                    path: "warehousedetails_id",
                    select: "basicDetails.warehouseName",
                })
                .sort(sortBy)
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            records.count = await ExternalOrder.countDocuments(query);
            records.page = parseInt(page);
            records.limit = parseInt(limit);
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        } else {
            records.rows = await ExternalOrder.find(query)
                .populate({
                    path: "external_batch_id",
                    select: "batchName",
                })
                .sort(sortBy);
        }

        return res.status(200).send(
            new serviceResponse({ status: 200, data: records, message: _response_message.found("ExternalOrder") })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.createExternalOrder = async (req, res) => {
    try {
        const { commodity, quantity, external_batch_id, basic_details, address } = req.body;
        const {_id} = req.client;

        if (!commodity || !external_batch_id || !basic_details || !address) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "Missing required fields"
            }));
        }
        const batchExists = await ExternalBatch.findById(external_batch_id);
        if (!batchExists) {
            return res.status(404).json(new serviceResponse({
                status: 404,
                message: "External Batch not found"
            }));
        }
        
        let errors = [];

        if (quantity <= 0) {
            errors.push("Quantity must be greater than zero");
        }
        if (batchExists.remaining_quantity <= 0) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "No remaining quantity available for this batch"
            }));
        }
        if (quantity > batchExists.remaining_quantity) {
            errors.push("Quantity must be less than remaining_quantity");
        }
        if (errors.length > 0) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: errors.join(", ") 
            }));
        }
        batchExists.outward_quantity += quantity;
        batchExists.remaining_quantity = batchExists.inward_quantity - batchExists.outward_quantity;
        await batchExists.save();

        const orderData = {
            commodity,
            quantity: quantity || 0,
            external_batch_id,
            warehousedetails_id : batchExists.warehousedetails_id,
            third_party_client : _id,
            basic_details: {
                buyer_name: basic_details.buyer_name,
                email: basic_details.email?.toLowerCase(),
                phone: basic_details.phone,
                cin_number: basic_details.cin_number,
                gst_number: basic_details.gst_number,
            },
            address: {
                line1: address.line1,
                line2: address.line2,
                state: address.state,
                district: address.district,
                city: address.city,
                tehsil: address.tehsil,
                pinCode: address.pinCode,
            },
        };

        const newExternalOrder = new ExternalOrder(orderData);
        const savedOrder = await newExternalOrder.save();
        
        return res.status(200).send(new serviceResponse({ message: _query.add('External Order'), data: savedOrder }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


module.exports.saveWarehouseOwner= async (req, res) => {
    try {
        const { companyDetails,ownerDetails, bankDetails  } = req.body;
        const {_id} = req.client;
        const warehouseData = {};
        warehouseData.user_type = "WarehouseOwner";
        warehouseData.third_party_client = _id;

        warehouseData.companyDetails = {};
        for (let key in companyDetails) {
            warehouseData.companyDetails[key] = companyDetails[key];
        }

        warehouseData.ownerDetails = {};
        for (let key in ownerDetails) {
            warehouseData.ownerDetails[key] = ownerDetails[key];
        }

        warehouseData.bankDetails = [];
        for (let bank of bankDetails) {
            warehouseData.bankDetails.push({ ...bank });
        }
        

        const newWarehouse = new wareHousev2(warehouseData);
        const savedWarehouse = await newWarehouse.save();

        

        return res.status(200).send(new serviceResponse({ message: _query.add('Warehouse Owner'), data: savedWarehouse }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};