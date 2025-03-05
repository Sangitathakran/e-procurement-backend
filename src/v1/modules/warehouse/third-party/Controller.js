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
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");

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

module.exports.listWarehouseOwner = async (req, res) => {
    try {
        const {_id} = req.client;
        const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = "" } = req.query;

        let query = {third_party_client:_id};
        if (search) {
            query["companyDetails.name"] = { $regex: search, $options: "i" };
        }

        const records = { count: 0, rows: [] };

        if (paginate == 1) {
            records.rows = await wareHousev2.find(query)
                .populate({
                    path: "third_party_client",
                    select: "name",
                })
                .sort(sortBy)
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            records.count = await wareHousev2.countDocuments(query);
            records.page = parseInt(page);
            records.limit = parseInt(limit);
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        } else {
            records.rows = await wareHousev2.find(query)
                .populate({
                    path: "third_party_client",
                    select: "name",
                })
                .sort(sortBy);
        }

        return res.status(200).send(
            new serviceResponse({ status: 200, data: records, message: _response_message.found("Warehouse Owner") })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.saveWarehouseDetails = async (req, res) => {
    try {
        const { warehouseOwnerId, basicDetails, addressDetails, inventory, documents, authorizedPerson, bankDetails, servicePricing, procurement_partner } = req.body;
        const {_id} = req.client;
        if (!warehouseOwnerId || !basicDetails || !addressDetails) {
            return res.status(400).json(new serviceResponse({ 
                success: false, 
                message: "Missing required fields" 
            }));
        }

        const warehouseData = new wareHouseDetails({
            warehouseOwnerId,
            basicDetails,
            addressDetails,
            inventory,
            documents,
            authorizedPerson,
            bankDetails,
            servicePricing,
            procurement_partner,
            third_party_client : _id
        });
        const savedWarehouse = await warehouseData.save();
        
        return res.status(200).send(new serviceResponse({ message: _query.add('Warehouse Details'), data: savedWarehouse }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.listWarehouseDetails = async (req, res) => {
    try {
        const {_id} = req.client;
        const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "_id", search = "" } = req.query;

        let query = {third_party_client:_id};
        if (search) {
            query["basicDetails.warehouseName"] = { $regex: search, $options: "i" };
        }

        const records = { count: 0, rows: [] };

        if (paginate == 1) {
            records.rows = await wareHouseDetails.find(query)
                .populate({
                    path: "third_party_client",
                    select: "name",
                })
                .sort(sortBy)
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            records.count = await wareHouseDetails.countDocuments(query);
            records.page = parseInt(page);
            records.limit = parseInt(limit);
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        } else {
            records.rows = await wareHouseDetails.find(query)
                .populate({
                    path: "third_party_client",
                    select: "name",
                })
                .sort(sortBy);
        }

        return res.status(200).send(
            new serviceResponse({ status: 200, data: records, message: _response_message.found("Warehouse Details") })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.saveAgribidDetails = async (req, res) => {
    try {
        const warehouses = req.body;
        const { _id } = req.client;

        const savedWarehouses = [];

        for (const warehouseData of warehouses) {
            const { 
                warehouseName, 
                commodityName, 
                capacityInQTL, 
                procuredQtyInQTL, 
                dispatchQtyInQTL, 
                remainingQtyInQTL, 
                warehouseAddress, 
                state, 
                district,
                city,
                villageName,
                pinCode,
                latitude,
                longitude,
                procurementPartner, 
            } = warehouseData;

            const existingWarehouse = await wareHouseDetails.findOne({ warehouseName });
            if (existingWarehouse) {
                return res.status(400).send(new serviceResponse({ 
                    status: 400, 
                    message: `Warehouse with the name ${warehouseName} already exists.`
                }));
            }

            const requiredFields = { warehouseName, commodityName, capacityInQTL, procuredQtyInQTL, remainingQtyInQTL, warehouseAddress, state, district, city, villageName, pinCode, procurementPartner };

            for (const [key, value] of Object.entries(requiredFields)) {
                if (key !== "remainingQtyInQTL" && !value) {
                    return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require(key.replace(/_/g, ' ')) }));
                }
            }

            if (remainingQtyInQTL === null || remainingQtyInQTL === undefined || remainingQtyInQTL === '') {  
                return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require('remaining quantity in QTL') }));
            }

            if (capacityInQTL <= 0 || procuredQtyInQTL <= 0) {
                return res.status(400).send(new serviceResponse({ 
                    status: 400, 
                    message: "Capacity, Procured Quantity, and Dispatch Quantity must be greater than zero." 
                }));
            }

            const capacityInMT = capacityInQTL ? capacityInQTL * 0.1 : 0;
            const procuredQtyInMT = procuredQtyInQTL ? procuredQtyInQTL * 0.1 : 0;
            const dispatchQtyInMT = dispatchQtyInQTL ? dispatchQtyInQTL * 0.1 : 0;
            const remainingQtyInMT = remainingQtyInQTL ? remainingQtyInQTL * 0.1 : 0;

            if (procuredQtyInQTL > capacityInQTL) {
                return res.status(200).send(new serviceResponse({ status: 401, errors: [{ message: "Procured Quantity must be less than or equal to warehouse capacity." }] }));
            }

            const warehouse = new wareHouseDetails({
                warehouseOwnerId: "67a9f35a617e73a4055c6614",
                basicDetails: {
                    warehouseName: warehouseName,
                    warehouseCapacity: capacityInMT,
                    quantityType: "MT",
                    weighBridge: true,
                    storageType: "Dry"
                },
                addressDetails: {
                    addressLine1: warehouseAddress,
                    addressLine2: villageName,
                    pincode: pinCode,
                    city: city,
                    tehsil: "Tehsil A",
                    location_url: "https://maps.google.com/?q=28.7041,77.1025",
                    lat: latitude,
                    long: longitude,
                    state: {
                        state_name: state,
                        lat: latitude,
                        long: longitude,
                        locationUrl: `https://maps.google.com/?q=${latitude},${longitude}`
                    },
                    district: {
                        district_name: district,
                        lat: latitude,
                        long: longitude,
                        locationUrl: `https://maps.google.com/?q=${latitude},${longitude}`
                    }
                },
                inventory: {
                    stock: 2000,
                    requiredStock: 500,
                    warehouse_timing: "9 AM - 6 PM"
                },
                documents: {
                    licenseNumber: "LIC123456",
                    insuranceNumber: "INS789101",
                    insurancePhoto: "https://example.com/insurance.jpg",
                    ownershipType: "Owner",
                    ownershipProof: "https://example.com/ownership_proof.jpg"
                },
                authorizedPerson: {
                    name: "Rajesh Kumar",
                    designation: "Manager",
                    mobile: "9876543210",
                    email: "rajesh.kumar@example.com",
                    aadharNumber: "123412341234",
                    aadhar_back: "https://example.com/aadhar_back.jpg",
                    aadhar_front: "https://example.com/aadhar_front.jpg",
                    panNumber: "ABCDE1234F",
                    panImage: "https://example.com/pan.jpg",
                    pointOfContactSame: false,
                    pointOfContact: {
                        name: "Suresh Gupta",
                        designation: "Assistant Manager",
                        mobileNumber: "9123456789",
                        email: "suresh.gupta@example.com",
                        aadharNumber: "432143214321",
                        aadhar_back: "https://example.com/poc_aadhar_back.jpg",
                        aadhar_front: "https://example.com/poc_aadhar_front.jpg",
                        panNumber: "FGHIJ5678K",
                        panImage: "https://example.com/poc_pan.jpg"
                    }
                },
                bankDetails: {
                    bankName: "HDFC Bank",
                    branchName: "Connaught Place",
                    accountHolderName: "Rajesh Kumar",
                    accountNumber: "123456789012",
                    ifscCode: "HDFC0000123",
                    passbookProof: "https://example.com/passbook.jpg"
                },
                servicePricing: [
                    {
                        area: 1000,
                        unit: "Sq. Ft.",
                        price: 5000
                    }
                ],
                procurement_partner: procurementPartner,
                third_party_client: _id
            });

            const savedWarehouse = await warehouse.save();
            savedWarehouses.push(savedWarehouse);

            const externalBatchData = new ExternalBatch({ 
                batchName: "Test Batch", 
                associate_name: "RajKumar", 
                procurementCenter: "Center A", 
                inward_quantity: procuredQtyInMT || 0,
                commodity: commodityName,
                warehousedetails_id: savedWarehouse._id,
                remaining_quantity: remainingQtyInMT,
                third_party_client: _id
            });
            await externalBatchData.save();

            const batchExists = await ExternalBatch.findById(externalBatchData._id);
            if (!batchExists) {
                return res.status(404).json(new serviceResponse({
                    status: 404,
                    message: "External Batch not found"
                }));
            }

            batchExists.outward_quantity += dispatchQtyInMT;
            batchExists.remaining_quantity = batchExists.inward_quantity - batchExists.outward_quantity;
            await batchExists.save();

            const orderData = {
                commodity: commodityName,
                quantity: dispatchQtyInMT,
                external_batch_id: externalBatchData._id,
                warehousedetails_id: savedWarehouse._id,
                third_party_client: _id,
                basic_details: {
                    buyer_name: "Test Buyer",
                    email: "test@gmail.com",
                    phone: "+918789878987",
                    cin_number: "L12345DL2023PLC678901",
                    gst_number: "22AAAAA0000A1Z5",
                },
                address: {
                    line1: "123, Warehouse Road",
                    line2: "Near Industrial Area",
                    state: "Maharashtra",
                    district: "Pune",
                    city: "Pune",
                    tehsil: "Haveli",
                    pinCode: "411001"
                },
            };

            const newExternalOrder = new ExternalOrder(orderData);
            await newExternalOrder.save();
        }

        return res.status(200).send(new serviceResponse({ message: _query.add('Warehouse Details'), data: savedWarehouses }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.updateAgribidDetails = async (req, res) => {
    try {
        const updates = req.body;
        const { _id } = req.client;
        const results = [];
        const errors = [];

        for (const update of updates) {
            const {
                warehouseName,
                commodityName,
                capacityInQTL,
                procuredQtyInQTL,
                dispatchQtyInQTL,
                remainingQtyInQTL,
                warehouseAddress,
                state,
                district,
                city,
                villageName,
                pinCode,
                latitude,
                longitude,
                procurementPartner,
                external_batch_id,
            } = update;

            const requiredFields = { warehouseName, commodityName, capacityInQTL, procuredQtyInQTL, warehouseAddress, state, district, city, villageName, pinCode, procurementPartner, external_batch_id };

            for (const [key, value] of Object.entries(requiredFields)) {
                if (!value) {
                    errors.push({ message: _middleware.require(key.replace(/_/g, ' ')), item: update });
                    continue;
                }
            }

            const capacityInMT = capacityInQTL ? capacityInQTL * 0.1 : 0;
            const procuredQtyInMT = procuredQtyInQTL ? procuredQtyInQTL * 0.1 : 0;
            const dispatchQtyInMT = dispatchQtyInQTL ? dispatchQtyInQTL * 0.1 : 0;
            const remainingQtyInMT = remainingQtyInQTL ? remainingQtyInQTL * 0.1 : 0;

            const batchExists = await ExternalBatch.findById(external_batch_id);

            if (!batchExists) {
                errors.push({ message: "External Batch not found", item: update });
                continue;
            }

            let itemErrors = [];

            // if (dispatchQtyInMT <= 0) {
            //     itemErrors.push("Quantity must be greater than zero");
            // }
            if (batchExists.remaining_quantity <= 0) {
                itemErrors.push("No remaining quantity available for this batch");
            }
            if (dispatchQtyInMT > batchExists.remaining_quantity) {
                itemErrors.push("Quantity must be less than remaining_quantity");
            }
            if (itemErrors.length > 0) {
                errors.push({ message: itemErrors.join(", "), item: update });
                continue;
            }

            batchExists.outward_quantity += dispatchQtyInMT;
            batchExists.remaining_quantity = batchExists.inward_quantity - batchExists.outward_quantity;
            await batchExists.save();

            const orderData = {
                commodity: commodityName,
                quantity: dispatchQtyInMT || 0,
                external_batch_id: external_batch_id,
                warehousedetails_id: batchExists.warehousedetails_id,
                third_party_client: _id,
                basic_details: {
                    buyer_name: "Test Buyer",
                    email: "test@gmail.com",
                    phone: "+918789878987",
                    cin_number: "L12345DL2023PLC678901",
                    gst_number: "22AAAAA0000A1Z5",
                },
                address: {
                    line1: "123, Warehouse Road",
                    line2: "Near Industrial Area",
                    state: "Maharashtra",
                    district: "Pune",
                    city: "Pune",
                    tehsil: "Haveli",
                    pinCode: "411001"
                },
            };

            const newExternalOrder = new ExternalOrder(orderData);
            const savedOrder = await newExternalOrder.save();
            results.push(savedOrder);
        }

        if (errors.length > 0) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "Some items failed to update",
                errors: errors,
                data: results
            }));
        }

        return res.status(200).send(new serviceResponse({ message: _query.update('Updated'), data: results }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

