const mongoose = require('mongoose');
const moment = require('moment'); // Add this import
const { _webSocketEvents, _status, _poAdvancePaymentStatus, _poBatchPaymentStatus, _poPaymentStatus, _poBatchStatus } = require('@src/v1/utils/constants');
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module, _query } = require("@src/v1/utils/constants/messages");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { ManufacturingUnit } = require('@src/v1/models/app/auth/ManufacturingUnit');
const { StorageFacility } = require('@src/v1/models/app/auth/storageFacility');
const logger = require("@common/logger/logger")
const { getStateIdBystateName, getDistrictIdByname } = require("@common/services/stateServices")
const { formatCheck } = require("@common/services/excelFormateServices")
const { PurchaseOrderModel } = require('@src/v1/models/app/distiller/purchaseOrder');
const { MasterUser } = require('@src/v1/models/master/MasterUser');
const { Branches } = require('@src/v1/models/app/branchManagement/Branches');
const { calculateAmount } = require("@src/v1/utils/helpers/amountCalculation");
const { wareHouseDetails } = require("@models/app/warehouse/warehouseDetailsSchema")
const {BatchOrderProcess}= require("@models/app/distiller/batchOrderProcess")
const {
    _handleCatchErrors,
    _generateOrderNumber,
    dumpJSONToExcel,
    // handleDecimal,
    _distillerMsp,
    _taxValue,
    parseDate,
    formatDate,
    _mandiTax,
} = require("@src/v1/utils/helpers");

function handleDecimal(value) {
    return parseFloat(value) < 0 ? 0 : parseFloat(parseFloat(value).toFixed(3));
}


exports.bulkUploadDistiller = async (req, res) => {
    const session = await mongoose.startSession();
    let transactionStarted = false;

    try {
        const { isxlsx = 1 } = req.body;
        const [file] = req.files;

        if (!file) {
            logger.warn("No file provided in the request.");
            return res.status(400).json({
                message: _response_message.notFound("file"),
                status: 400,
            });
        }

        const { records } = await formatCheck(file, isxlsx);
        const errors = [];
        const successResults = [];

        logger.info(`Processing ${records.length} records...`);

        for (const record of records) {
            // Fix phone number field name (with space in CSV)
            const phone = record[" Phone number"]?.toString() || record["Phone number"]?.toString();
            const organization = record["Organization name"];

            if (!phone || !organization) {
                const msg = `Missing phone or organization in record: ${JSON.stringify(record)}`;
                errors.push(msg);
                logger.warn(msg);
                continue;
            }

            try {
                // Step 1: Check if distiller already exists
                let { stateId, districtId } = await getDistrictIdByname(record['state'], record['district']);
                if (!stateId) {
                    const errorMsg = `Invalid or missing state for: ${organization}`;
                    logger.warn(errorMsg);
                    errors.push(errorMsg);
                    continue;
                }

                const existingDistiller = await Distiller.findOne({
                    "basic_details.distiller_details.phone": phone,
                });

                if (existingDistiller) {
                    logger.info(`Distiller already exists: ${organization} with phone ${phone}`);

                    // Step 2: Check if master user exists for this distiller
                    const existingMasterUser = await MasterUser.findOne({
                        mobile: phone,
                        portalId: existingDistiller._id,
                    });

                    if (!existingMasterUser) {
                        logger.info(`Master user not found for existing distiller: ${organization}. Creating master user...`);

                        session.startTransaction();
                        transactionStarted = true;
                        const shortCode = generate3LetterCode(); // e.g., "bqd"
                        try {
                            const userObject = {
                                mobile: phone,
                                isSuperAdmin: false,
                                isAdmin: true,
                                isProfilePicUploaded: false,
                                status: "active",
                                user_type: "8",
                                portalId: existingDistiller._id,
                                portalRef: "Distiller",
                                userRole: [new mongoose.Types.ObjectId("67addf7fab0f886017049ed7")],
                                email: `xyz${shortCode}@gmail.com`
                            };

                            await MasterUser.create([userObject], { session });
                            await session.commitTransaction();
                            transactionStarted = false;
                            logger.info(`Master user created for existing distiller: ${organization}`);
                        } catch (error) {

                            await session.abortTransaction();
                            transactionStarted = false;
                            throw error;
                        }
                    }

                    // Step 3: Check if storage facility exists
                    const existingStorage = await StorageFacility.findOne({
                        distiller_id: existingDistiller._id
                    });

                    if (!existingStorage) {
                        logger.info(`Storage facility not found for distiller: ${organization}. Creating...`);


                        session.startTransaction();
                        transactionStarted = true;

                        try {
                            const storageData = {
                                distiller_id: existingDistiller._id,
                                storage_address_line1: record['Delivery Location ']?.trim() || record['Delivery Location']?.trim() || null,
                                storage_address_line2: "",
                                storage_state: stateId,
                                storage_condition: "Dry",
                            };

                            await StorageFacility.create([storageData], { session });
                            await session.commitTransaction();
                            transactionStarted = false;
                            logger.info(`Storage facility created for existing distiller: ${organization}`);
                        } catch (error) {
                            await session.abortTransaction();
                            transactionStarted = false;
                            throw error;
                        }
                    }

                    // Step 4: Check if manufacturing unit exists
                    const existingManufacturing = await ManufacturingUnit.findOne({
                        distiller_id: existingDistiller._id
                    });

                    if (!existingManufacturing) {
                        logger.info(`Manufacturing unit not found for distiller: ${organization}. Creating...`);

                        const stateFromLocation = extractStateFromLocation(record['Delivery Location '] || record['Delivery Location']);

                        session.startTransaction();
                        transactionStarted = true;

                        try {
                            const manufacturingData = {
                                distiller_id: existingDistiller._id,
                                manufacturing_address_line1: record['Delivery Location ']?.trim() || record['Delivery Location']?.trim() || null,
                                manufacturing_address_line2: record['Delivery Location ']?.trim(),
                                manufacturing_state: stateId,
                                manufacturing_district: districtId,
                                production_capacity: {
                                    value: 456,
                                    unit: "square meters",
                                },
                            };

                            await ManufacturingUnit.create([manufacturingData], { session });
                            await session.commitTransaction();
                            transactionStarted = false;
                            logger.info(`Manufacturing unit created for existing distiller: ${organization}`);
                        } catch (error) {
                            await session.abortTransaction();
                            transactionStarted = false;
                            throw error;
                        }
                    }

                    // Step 5: Handle Purchase Order for existing distiller



                    // Find or create branch with transaction
                    let findBranch = await Branches.findOne({ district: record['district'] });
                    let branch_id;

                    if (!findBranch) {
                        session.startTransaction();
                        transactionStarted = true;

                        try {
                            let obj = {
                                "branchName": `NAFED ${record['district']} ${record['state']} Branch`,
                                "password": "$2b$10$ssCi8PXtT7MH.v8eO2xJCu0kBh50qYDasc0lWkGql1b/.ZKPVZy16",
                                "emailAddress": `${record['district']}bkz@gmail.com`,
                                "pointOfContact": {
                                    "name": `NAFED ${record['district']} ${record['state']} Branch`,
                                    "email": `${record['district']}bkz@gmail.com`
                                },
                                "address": `Pioneer Distillers Unit 2, Barshi Road, ${record['district']}`,
                                "isPasswordChanged": false,
                                "cityVillageTown": record['delivery'],
                                "district": record['district'],
                                "state": record['state'],
                                "status": "active",
                                "headOfficeId": new mongoose.Types.ObjectId("6723a9159fed2bd78ef5588a")
                            };

                            let createBranch = await Branches.create([obj], { session });
                            branch_id = createBranch[0]._id;

                            await session.commitTransaction();
                            transactionStarted = false;
                            logger.info(`Branch created for district: ${record['district']}`);
                        } catch (error) {
                            await session.abortTransaction();
                            transactionStarted = false;
                            throw error;
                        }
                    } else {
                        branch_id = findBranch._id;
                    }
                    const purchaseData = await formatPurchaseOrderRecord(record, branch_id ,session);
                    console.log(purchaseData)
                    if (!purchaseData) {
                        const errorMsg = `Failed to format purchase order for: ${organization}`;
                        errors.push(errorMsg);
                        continue;
                    }

                    purchaseData["branch_id"] = branch_id;
                    purchaseData["distiller_id"] = existingDistiller._id;

                    // Check if PO already exists
                    const findPOnumber = await PurchaseOrderModel.findOne({
                        "purchasedOrder.poNo": purchaseData.purchasedOrder.poNo,
                    });

                    if (findPOnumber) {
                        const errorMsg = `Purchase order already exists: ${purchaseData.purchasedOrder.poNo}`;
                        logger.warn(errorMsg);
                        errors.push(errorMsg);
                    } else {
                        session.startTransaction();
                        transactionStarted = true;

                        try {
                            await PurchaseOrderModel.create([purchaseData], { session });
                            await session.commitTransaction();
                            transactionStarted = false;
                            logger.info(`Purchase Order created for existing distiller: ${organization}`);

                            successResults.push({
                                organization: organization,
                                phone: phone,
                                poNo: purchaseData.purchasedOrder.poNo,
                                action: "PO created for existing distiller"
                            });
                        } catch (error) {
                            await session.abortTransaction();
                            transactionStarted = false;
                            throw error;
                        }
                    }

                } else {
                    // Step 1: Create new distiller
                    logger.info(`Creating new distiller: ${organization}`);

                    session.startTransaction();
                    transactionStarted = true;

                    try {
                        // Create distiller
                        const userData = formatDocument(record);
                        const createdDistiller = await Distiller.create([userData], { session });
                        const distillerId = createdDistiller[0]._id;

                        logger.info(`Created distiller: ${organization}`, { distillerId });

                        // Step 2: Create master user
                        const shortCode = generate3LetterCode(); // e.g., "bqd"


                        const userObject = {
                            mobile: phone,
                            isSuperAdmin: false,
                            isAdmin: true,
                            isProfilePicUploaded: false,
                            status: "active",
                            user_type: "8",
                            portalId: distillerId,
                            portalRef: "Distiller",
                            userRole: [new mongoose.Types.ObjectId("67addf7fab0f886017049ed7")],
                            email: `xyz${shortCode}@gmail.com`
                        };

                        await MasterUser.create([userObject], { session });
                        logger.info(`Master user created for new distiller: ${organization}`);

                        // Step 4: Create storage facility
                        const storageData = {
                            distiller_id: distillerId,
                            storage_address_line1: record['Delivery Location ']?.trim() || record['Delivery Location']?.trim() || null,
                            storage_address_line2: "",
                            storage_state: stateId,
                            storage_condition: "Dry",
                            storage_district: districtId
                        };

                        await StorageFacility.create([storageData], { session });
                        logger.info(`Storage facility created for new distiller: ${organization}`);

                        // Step 5: Create manufacturing unit
                        const manufacturingData = {
                            distiller_id: distillerId,
                            manufacturing_address_line1: record['Delivery Location ']?.trim() || record['Delivery Location']?.trim() || null,
                            manufacturing_address_line2: null,
                            manufacturing_state: stateId,
                            manufacturing_district: districtId,
                            production_capacity: {
                                value: 456,
                                unit: "square meters",
                            },
                        };

                        await ManufacturingUnit.create([manufacturingData], { session });
                        logger.info(`Manufacturing unit created for new distiller: ${organization}`);


                        // Find or create branch with transaction
                        // Find or create branch - FIXED VERSION (around line 280)
                        let findBranch = await Branches.findOne({ district: record['district'] });
                        let branch_id;

                        if (!findBranch) {
                            // REMOVED: session.startTransaction(); - Transaction is already active!
                            // REMOVED: transactionStarted = true;

                            try {
                                let obj = {
                                    "branchName": `NAFED ${record['district']} ${record['state']} Branch`,
                                    "password": "$2b$10$ssCi8PXtT7MH.v8eO2xJCu0kBh50qYDasc0lWkGql1b/.ZKPVZy16",
                                    "emailAddress": `${record['district']}bkz@gmail.com`,
                                    "pointOfContact": {
                                        "name": `NAFED ${record['district']} ${record['state']} Branch`,
                                        "email": `${record['district']}bkz@gmail.com`
                                    },
                                    "address": `Pioneer Distillers Unit 2, Barshi Road, ${record['district']}`,
                                    "isPasswordChanged": false,
                                    "cityVillageTown": null,
                                    "district": record['district'],
                                    "state": record['state'],
                                    "status": "active",
                                    "headOfficeId": new mongoose.Types.ObjectId("6723a9159fed2bd78ef5588a")
                                };
                                let createBranch = await Branches.create([obj], { session });
                                console.log(createBranch);
                                branch_id = createBranch[0]._id;

                                // REMOVED: await session.commitTransaction(); - Don't commit here!
                                // REMOVED: transactionStarted = false;
                                logger.info(`Branch created for district: ${record['district']}`);
                            } catch (error) {
                                // REMOVED: await session.abortTransaction(); - Don't abort here!
                                // REMOVED: transactionStarted = false;
                                throw error; // Re-throw to be handled by the outer try-catch
                            }
                        } else {
                            branch_id = findBranch._id;
                        }
                        // Step 6: Handle Purchase Order
                        let purchaseData = await formatPurchaseOrderRecord(record, branch_id,session);
                        console.log(purchaseData)
                        if (!purchaseData) {
                            throw new Error(`Failed to format purchase order for: ${organization}`);
                        }
                        purchaseData["branch_id"] = branch_id;
                        purchaseData["distiller_id"] = distillerId;

                        // Check if PO already exists
                        const findPOnumber = await PurchaseOrderModel.findOne({
                            "purchasedOrder.poNo": purchaseData.purchasedOrder.poNo,
                        });

                        if (findPOnumber) {
                            const errorMsg = `Purchase order already exists: ${purchaseData.purchasedOrder.poNo}`;
                            logger.warn(errorMsg);
                            errors.push(errorMsg);
                        } else {
                            await PurchaseOrderModel.create([purchaseData], { session });
                            logger.info(`Purchase Order created for new distiller: ${organization}`);

                            successResults.push({
                                organization: organization,
                                phone: phone,
                                poNo: purchaseData.purchasedOrder.poNo,
                                action: "Complete setup created (distiller, user, storage, manufacturing, PO)"
                            });
                        }

                        await session.commitTransaction();
                        transactionStarted = false;

                    } catch (err) {
                        await session.abortTransaction();
                        transactionStarted = false;
                        const errorMsg = `Error creating new distiller setup for ${organization}: ${err.message}`;
                        logger.error(errorMsg, { stack: err.stack });
                        errors.push(errorMsg);
                    }
                }

            } catch (error) {
                if (transactionStarted) {
                    await session.abortTransaction();
                    transactionStarted = false;
                }
                const errorMsg = `Error processing record for ${organization}: ${error.message}`;
                logger.error(errorMsg, { stack: error.stack });
                errors.push(errorMsg);
            }
        }

        logger.info("Bulk upload processing completed.");

        return res.status(200).json({
            status: 200,
            message: "Distillers and Purchase Orders processed.",
            success: successResults.length,
            failed: errors.length,
            successResults,
            errors,
        });

    } catch (error) {
        console.log(error.message);
        logger.error("Unexpected error during bulk upload", { stack: error.stack });

        // Only abort if transaction is active
        if (transactionStarted) {
            await session.abortTransaction();
        }

        _handleCatchErrors(error, res);
    } finally {
        session.endSession();
    }
};

// Helper function to extract state from delivery location
function extractStateFromLocation(location) {
    if (!location) return "Uttar Pradesh"; // Default state

    const stateMap = {
        'Bihar': 'Bihar',
        'Uttar Pradesh': 'Uttar Pradesh',
        'UP': 'Uttar Pradesh',
        'Maharashtra': 'Maharashtra',
        'Gujarat': 'Gujarat',
        'Rajasthan': 'Rajasthan',
        'Haryana': 'Haryana',
        'Punjab': 'Punjab',
        'Madhya Pradesh': 'Madhya Pradesh',
        'MP': 'Madhya Pradesh'
    };

    const locationUpper = location.toUpperCase();

    for (const [key, value] of Object.entries(stateMap)) {
        if (locationUpper.includes(key.toUpperCase())) {
            return value;
        }
    }

    return "Uttar Pradesh"; // Default fallback
}

const formatDocument = (row) => {
    let obj = {
        client_id: "9876",
        basic_details: {
            distiller_details: {
                associate_type: 'Organisation',
                organization_name: row['Organization name']?.trim() || null,
                email: "email@gmail.com",
                phone: row[' Phone number'] ? row[' Phone number'].toString().trim() : (row['Phone number'] ? row['Phone number'].toString().trim() : null),
            },
            point_of_contact: {
                name: row['Distiller name'],
                email: "email@gmail.com",
                mobile: row[' Phone number'],
                designation: null,
                aadhar_number: null,
            },
            company_owner_info: {
                name: row['Distiller name'],
                aadhar_number: null,
                pan_card: null,
            },
            implementation_agency: null,
            cbbo_name: null,
        },

        address: {
            registered: {
                line1: row['Delivery Location ']?.trim() || row['Delivery Location']?.trim() || null,
                line2: null,
                country: "India",
                state: row['state'],
                district: row['district'],
                taluka: null,
                pinCode: null,
                village: null,
            },
        },

        company_details: {
            cin_number: null,
            cin_image: null,
            tan_number: null,
            tan_image: null,
            pan_card: null,
            pan_image: null,
            gst_no: null,
            pacs_reg_date: null,
        },

        manufactoring_storage: {
            manufactoring_details: false,
            storage_details: false,
        },

        authorised: {
            name: row['Distiller name'],
            designation: null,
            phone: row[' Phone number'] ? row[' Phone number'].toString().trim() : (row['Phone number'] ? row['Phone number'].toString().trim() : null),
            email: "email@gmail.com",
            aadhar_number: null,
            aadhar_certificate: {
                front: null,
                back: null,
            },
            pan_card: null,
        },

        bank_details: {
            bank_name: null,
            branch_name: null,
            account_holder_name: null,
            ifsc_code: null,
            account_number: null,
            upload_proof: null,
        },

        distiller_alloc_data: {
            esyq3_ethanol_alloc: null,
            esyq3_maize_req: null,
            esyq4_ethanol_alloc: null,
            esyq4_maize_req: null,
            q3q4_ethanol_alloc: null,
            q3q4_maize_req: null,
        },
        lat_long: null,
        user_code: null,
        user_type: "8",
        is_mobile_verified: "true",
        is_email_verified: "true",
        is_form_submitted: "true",
        is_welcome_email_send: "true",
        is_sms_send: "false",
        term_condition: "true",
        mou: "false",
        mou_document: null,
        mou_approval: 'pending',
        is_approved: 'approved',
        active: "true",
    };
    return obj;
};

async function formatPurchaseOrderRecord(record = {}, branch_id ,session) {
    try {
        const poDate = convertExcelDate(record["PO date "] || record["PO date"]);
        const receiptDate = convertExcelDate(record["Receipt Amount Date"]);
        let poQuantity = record["PO Quantity (In Mt)"]
        let token = Number(record["Payment Token (%)"]) || 10
        const { msp, mandiTax, mandiTaxAmount, totalAmount, tokenAmount, advancenAmount, remainingAmount } = await calculateAmount(token, poQuantity, branch_id ,session);

        return {
            product: {
                name: record["Commodity"]?.trim(),
                msp: Number(record["MSP (In Rs)"]) || msp,
            },
            deliveryLocation: {
                location: record["Delivery Location "]?.trim() || record["Delivery Location"]?.trim(),
                locationDetails :record["Delivery Location "]?.trim() || record["Delivery Location"]?.trim(),
            },
            storageLocation: record['state'],
            manufacturingLocation: record['state'],
            paymentInfo: {
                token: token,
                totalAmount: handleDecimal(totalAmount),
                advancePayment: advancenAmount,
                advancePaymentDate: receiptDate,
                advancePaymentUtrNo: record["Receipt Reference No."]?.trim() || null,
                balancePayment: handleDecimal(remainingAmount),
                mandiTax: mandiTax,
                paidAmount: handleDecimal(tokenAmount),
                advancePaymentStatus: "Paid"
            },
            companyDetails: {
                companyName: record["Organization name"]?.trim(),
                phone: (record[" Phone number"] || record["Phone number"])?.toString(),
            },
            purchasedOrder: {
                poNo: record["PO No "] || record["PO No"],
                poQuantity: poQuantity || 0,
                poAmount: handleDecimal(totalAmount),
                poValidity: poDate || null,
            },
            additionalDetails: {
                referenceDate: poDate,
            },
            poStatus: "Approved",
            status: "Completed"
        };
    } catch (error) {
        console.error("Error formatting purchase order record:", record, error.message);
        return null;
    }
}

function convertExcelDate(excelDate) {
    try {
        const parsed = Number(excelDate);
        if (!parsed || isNaN(parsed)) return null;

        const jsDate = new Date((parsed - 25569) * 86400 * 1000);
        return moment(jsDate).toDate();
    } catch (error) {
        console.error("Error converting Excel date:", excelDate, error.message);
        return null;
    }
}


function generate3LetterCode() {
    let letters = "abcdefghijklmnopqrstuvwxyz";
    let code = "";
    for (let i = 0; i < 3; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
}

// Excel column mapping based on your headers
const EXCEL_COLUMNS = {
    PO_ID: "PO ID",
    DISTILLER_NAME: "Distiller name",
    DISTILLER_NUMBER: "Distiller Number",
    WAREHOUSE_NAME: "Warehouse Name",
    WAREHOUSE_DISTRICT: "Warehouse District",
    WAREHOUSE_NUMBER: "Warehouse number",
    WAREHOUSE_STATE: "Warehouse state",
    PROCUREMENT_PARTNER: "Procurement Partner",
    STOCK: "Stock",
    PURCHASE_ID: "Purchase Id",
    QUANTITY_LIFTED: "Quantity Lifted",
    SCHEDULED_PICKUP_DATE: "Scheduled Pickup Date",
    ACTUAL_PICKUP_DATE: "Actual Pickup Date",
    BALANCE_QUANTITY: "Balance Quantity",
    REMAINING_AMOUNT: "Remaining Amount",
    PICKUP_STATUS: "Pickup Status",
    PAYMENT_ID: "Payment Id",
    BATCH_AMOUNT: "Batch amount",
    PAYMENT_STATUS: "Payment status",
    PAYMENT_PROOF: "Payment Proof",
    PAYMENT_DATE: "Payment Date",
    BATCHES: "Batches"
};

exports.bulkUploadBatch = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { isxlsx = 1 } = req.body;
        const [file] = req.files;

        if (!file) {
            logger.warn("Bulk upload attempted without file", {
                userId: req.user?.user_id,
                timestamp: new Date().toISOString()
            });
            return res.status(400).json({
                message: _response_message.notFound("file"),
                status: 400,
            });
        }

        logger.info("Starting bulk upload process", {
            fileName: file.originalname,
            fileSize: file.size,
            userId: req.user?.user_id,
            timestamp: new Date().toISOString()
        });

        const { records } = await formatCheck(file, isxlsx);
        const errors = [];
        const successResults = [];
        const user_id = "";

        if (!records || records.length === 0) {
            logger.warn("No records found in uploaded file", {
                fileName: file.originalname,
                userId: user_id
            });
            return res.status(400).json({
                message: "No records found in the uploaded file",
                status: 400,
            });
        }

        logger.info(`Processing ${records.length} records for bulk upload`, {
            totalRecords: records.length,
            userId: user_id
        });

        await session.startTransaction();

        for (let i = 0; i < records.length; i++) {
            let record = records[i];
            const rowNumber = i + 1;

            const trimmedRecord = {};
            for (const key in record) {
                const trimmedKey = key.trim();
                const value = record[key];
                trimmedRecord[trimmedKey] = typeof value === "string" ? value.trim() : value;
            }
            record = trimmedRecord;

            logger.info(`Processing record ${rowNumber}/${records.length}`, {
                rowNumber,
                poId: record[EXCEL_COLUMNS.PO_ID],
                distillerNumber: record[EXCEL_COLUMNS.DISTILLER_NUMBER]
            });

            try {
                await processRecord(record, rowNumber, user_id, session, successResults, errors);
            } catch (error) {
                logger.error(`Error processing record ${rowNumber}`, {
                    rowNumber,
                    error: error.message,
                    stack: error.stack,
                    record: record
                });

                errors.push({
                    row: rowNumber,
                    error: error.message,
                    data: record
                });
            }
        }

        if (successResults.length > 0) {
            await session.commitTransaction();
            logger.info("Bulk upload completed successfully", {
                totalRecords: records.length,
                successCount: successResults.length,
                errorCount: errors.length,
                userId: user_id
            });
        } else {
            await session.abortTransaction();
            logger.warn("Bulk upload aborted - no successful records", {
                totalRecords: records.length,
                errorCount: errors.length,
                userId: user_id
            });
        }

        return res.status(200).json({
            message: `Bulk upload completed. ${successResults.length} records processed successfully, ${errors.length} errors.`,
            status: 200,
            data: {
                successCount: successResults.length,
                errorCount: errors.length,
                successResults,
                errors
            }
        });

    } catch (error) {
        logger.error("Bulk upload process failed", {
            error: error.message,
            stack: error.stack,
            userId: req.user?.user_id,
            timestamp: new Date().toISOString()
        });

        await session.abortTransaction();

        return res.status(500).json({
            message: "Internal server error during bulk upload",
            status: 500,
            error: error.message
        });
    } finally {
        await session.endSession();
    }
};

function generateRandomMobile() {
    const start = ['6', '7', '8', '9'];
    let mobile = start[Math.floor(Math.random() * start.length)];
    for (let i = 0; i < 9; i++) {
        mobile += Math.floor(Math.random() * 10);
    }
    return mobile;
}


async function processRecord(record, rowNumber, user_id, session, successResults, errors) {
    try {
        logger.info(`Starting to process record ${rowNumber}`, {
            rowNumber,
            poId: record[EXCEL_COLUMNS.PO_ID],
            distillerNumber: record[EXCEL_COLUMNS.DISTILLER_NUMBER]
        });

        // Validate required fields
        const requiredFields = [
            EXCEL_COLUMNS.PO_ID,
            EXCEL_COLUMNS.DISTILLER_NUMBER,
            EXCEL_COLUMNS.QUANTITY_LIFTED,
            EXCEL_COLUMNS.WAREHOUSE_NAME,
            EXCEL_COLUMNS.WAREHOUSE_STATE,
            EXCEL_COLUMNS.WAREHOUSE_DISTRICT
        ];

        for (const field of requiredFields) {
            if (!record[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Find Purchase Order
        let poRecord;
        try {
            poRecord = await PurchaseOrderModel.findOne({
                "purchasedOrder.poNo": record[EXCEL_COLUMNS.PO_ID]
            }).session(session);

            if (!poRecord) {
                throw new Error(`Purchase Order not found for PO ID: ${record[EXCEL_COLUMNS.PO_ID]}`);
            }

            logger.info(`Found PO record`, {
                poId: record[EXCEL_COLUMNS.PO_ID],
                orderId: poRecord._id,
                rowNumber
            });
        } catch (error) {
            logger.error(`Error finding Purchase Order`, {
                poId: record[EXCEL_COLUMNS.PO_ID],
                error: error.message,
                rowNumber
            });
            throw new Error(`Database error while finding PO: ${error.message}`);
        }

        // Find Distiller
        let distillerFind;
        try {
            distillerFind = await Distiller.findOne({
                "basic_details.distiller_details.phone": record[EXCEL_COLUMNS.DISTILLER_NUMBER]
            }).session(session);

            if (!distillerFind) {
                throw new Error(`Distiller not found for phone: ${record[EXCEL_COLUMNS.DISTILLER_NUMBER]}`);
            }

            logger.info(`Found distiller`, {
                distillerId: distillerFind._id,
                phone: record[EXCEL_COLUMNS.DISTILLER_NUMBER],
                rowNumber
            });
        } catch (error) {
            logger.error(`Error finding Distiller`, {
                phone: record[EXCEL_COLUMNS.DISTILLER_NUMBER],
                error: error.message,
                rowNumber
            });
            throw new Error(`Database error while finding distiller: ${error.message}`);
        }

        // Handle Warehouse
        let warehouseId;
        try {
            warehouseId = await findOrCreateWarehouse(record, session, rowNumber);
        } catch (error) {
            logger.error(`Error handling warehouse`, {
                warehouseName: record[EXCEL_COLUMNS.WAREHOUSE_NAME],
                error: error.message,
                rowNumber
            });
            throw new Error(`Warehouse processing error: ${error.message}`);
        }

        // Validate quantity
        const quantityRequired = parseFloat(record[EXCEL_COLUMNS.QUANTITY_LIFTED]);
        if (isNaN(quantityRequired) || quantityRequired <= 0) {
            throw new Error(`Invalid quantity lifted: ${record[EXCEL_COLUMNS.QUANTITY_LIFTED]}`);
        }

        // Validate PO quantity
        const { branch_id, purchasedOrder, fulfilledQty, paymentInfo } = poRecord;

        if (quantityRequired > purchasedOrder.poQuantity) {
            throw new Error(`Quantity ${quantityRequired} exceeds PO quantity ${purchasedOrder.poQuantity}`);
        }

        // Check existing batches
        let existBatch;
        try {
            existBatch = await BatchOrderProcess.find({
                distiller_id: distillerFind._id,
                orderId: poRecord._id
            }).session(session);

            if (existBatch.length > 0) {
                const addedQty = existBatch.reduce((sum, b) => sum + b.quantityRequired, 0);
                if (addedQty >= purchasedOrder.poQuantity) {
                    throw new Error("Cannot create more batches, quantity already fulfilled");
                }
                const remainingQty = handleDecimal(purchasedOrder.poQuantity - addedQty);
                if (quantityRequired > remainingQty) {
                    throw new Error(`Quantity ${quantityRequired} exceeds remaining quantity ${remainingQty}`);
                }
            }
        } catch (error) {
            logger.error(`Error checking existing batches`, {
                distillerId: distillerFind._id,
                orderId: poRecord._id,
                error: error.message,
                rowNumber
            });
            throw new Error(`Batch validation error: ${error.message}`);
        }

        // Calculate payment details
        let amountToBePaid = 0;
        let batchPaymentStatus = _poBatchPaymentStatus.pending;

        try {
            const msp = _distillerMsp();
            const totalAmount = handleDecimal(paymentInfo.totalAmount);
            const tokenAmount = handleDecimal(paymentInfo.advancePayment);

            const addedQty = existBatch.reduce((sum, b) => sum + b.quantityRequired, 0);
            const newFulfilledQty = handleDecimal(addedQty + quantityRequired);
            const isLastBatch = newFulfilledQty === purchasedOrder.poQuantity;

            if (paymentInfo.token == 100) {
                amountToBePaid = 0;
                batchPaymentStatus = _poBatchPaymentStatus.paid;
            } else {
                amountToBePaid = handleDecimal(msp * quantityRequired);
                const { stateWiseMandiTax } = await calculateAmount(paymentInfo.token, quantityRequired, branch_id);

                if (existBatch.length === 0) {
                    amountToBePaid = handleDecimal(amountToBePaid - tokenAmount);
                }

                if (paymentInfo.token == 10 && isLastBatch) {
                    const mandiTaxAmount = handleDecimal((totalAmount * stateWiseMandiTax) / 100);
                    amountToBePaid = handleDecimal(amountToBePaid + mandiTaxAmount);
                }
            }
        } catch (error) {
            logger.error(`Error calculating payment details`, {
                error: error.message,
                rowNumber
            });
            throw new Error(`Payment calculation error: ${error.message}`);
        }

        // Generate purchase ID
        let randomVal;
        try {
            randomVal = await generatePurchaseId(session);
        } catch (error) {
            logger.error(`Error generating purchase ID`, {
                error: error.message,
                rowNumber
            });
            throw new Error(`Purchase ID generation error: ${error.message}`);
        }

        // Create batch record
        let batchRecord;
        try {
            const batchData = {
                distiller_id: distillerFind._id,
                warehouseId,
                warehouseOwnerId: warehouseId, // Assuming this is the same as warehouseId
                orderId: poRecord._id,
                purchaseId: randomVal,
                quantityRequired: handleDecimal(quantityRequired),
                'payment.amount': amountToBePaid,
                "payment.amount":record[EXCEL_COLUMNS.PAYMENT_ID],
                'payment.status': "Completed",
                 source_by:"NCCF",
                scheduledPickupDate: record[EXCEL_COLUMNS.SCHEDULED_PICKUP_DATE] ? new Date(record[EXCEL_COLUMNS.SCHEDULED_PICKUP_DATE]) : null,
                actualPickupDate: record[EXCEL_COLUMNS.ACTUAL_PICKUP_DATE] ? new Date(record[EXCEL_COLUMNS.ACTUAL_PICKUP_DATE]) : null,
                pickupStatus: record[EXCEL_COLUMNS.PICKUP_STATUS] || 'pending'
            };

            batchRecord = await BatchOrderProcess.create([batchData], { session });

            logger.info(`Created batch record`, {
                batchId: batchRecord[0]._id,
                purchaseId: randomVal,
                quantity: quantityRequired,
                amount: amountToBePaid,
                rowNumber
            });
        } catch (error) {
            logger.error(`Error creating batch record`, {
                error: error.message,
                purchaseId: randomVal,
                rowNumber
            });
            throw new Error(`Batch creation error: ${error.message}`);
        }

        // Update PO record
        try {
            poRecord.fulfilledQty = handleDecimal(fulfilledQty + quantityRequired);
            poRecord.paymentInfo.paidAmount = handleDecimal(poRecord.paymentInfo.paidAmount + amountToBePaid);
            poRecord.paymentInfo.balancePayment = handleDecimal(poRecord.paymentInfo.totalAmount - poRecord.paymentInfo.paidAmount);

            if (poRecord.paymentInfo.totalAmount === poRecord.paymentInfo.paidAmount) {
                poRecord.payment_status = _poPaymentStatus.paid;
            }

            await poRecord.save({ session });

            logger.info(`Updated PO record`, {
                poId: record[EXCEL_COLUMNS.PO_ID],
                fulfilledQty: poRecord.fulfilledQty,
                paidAmount: poRecord.paymentInfo.paidAmount,
                rowNumber
            });
        } catch (error) {
            logger.error(`Error updating PO record`, {
                poId: record[EXCEL_COLUMNS.PO_ID],
                error: error.message,
                rowNumber
            });
            throw new Error(`PO update error: ${error.message}`);
        }

        successResults.push({
            row: rowNumber,
            purchaseId: randomVal,
            quantity: quantityRequired,
            amount: amountToBePaid,
            batchId: batchRecord[0]._id
        });

        logger.info(`Successfully processed record ${rowNumber}`, {
            rowNumber,
            purchaseId: randomVal,
            batchId: batchRecord[0]._id
        });

    } catch (error) {
        logger.error(`Failed to process record ${rowNumber}`, {
            rowNumber,
            error: error.message,
            stack: error.stack,
            poId: record[EXCEL_COLUMNS.PO_ID],
            distillerNumber: record[EXCEL_COLUMNS.DISTILLER_NUMBER]
        });
        throw error; // Re-throw to be caught by the main loop
    }
}

async function findOrCreateWarehouse(record, session, rowNumber) {
    try {
        const warehouseName = record[EXCEL_COLUMNS.WAREHOUSE_NAME];
        const warehouseState = record[EXCEL_COLUMNS.WAREHOUSE_STATE];
        const warehouseDistrict = record[EXCEL_COLUMNS.WAREHOUSE_DISTRICT];

        // Validate warehouse data
        if (!warehouseName || !warehouseState || !warehouseDistrict) {
            throw new Error("Warehouse name, state, and district are required");
        }

        // Try to find existing warehouse
        let warehouse;
        try {
            warehouse = await wareHouseDetails.findOne({
                "basicDetails.warehouseName": warehouseName,
            }).session(session);

            if (warehouse) {
                logger.info(`Found existing warehouse`, {
                    warehouseId: warehouse._id,
                    warehouseName,
                    rowNumber
                });
                return warehouse._id;
            }
        } catch (error) {
            logger.error(`Error searching for existing warehouse`, {
                warehouseName,
                error: error.message,
                rowNumber
            });
            throw new Error(`Database error while searching warehouse: ${error.message}`);
        }

        // Create new warehouse if not found
        try {
            logger.info(`Creating new warehouse`, {
                warehouseName,
                warehouseState,
                warehouseDistrict,
                rowNumber
            });

            const warehouseData = {
                warehouseOwnerId: new mongoose.Types.ObjectId("686cd61a54ffcd1d4dd8964a"),
                basicDetails: {
                    warehouseName: warehouseName,
                    warehouseCapacity: 4000,
                    weighBridge: true,
                    storageType: "Dry",
                    quantityType: "MT",
                },
                addressDetails: {
                    addressLine1: warehouseState,
                    state: { state_name: warehouseState },
                    district: { district_name: warehouseDistrict },
                },
                bankDetails: {},
                active: true,
                "inventory": {
                    "stock": 4000,
                    "requiredStock": 55
                },
                "authorizedPerson": {
                    "name": warehouseName,
                    "designation": "qa",
                    "mobile": generateRandomMobile(),
                    "email": "bnb23@gmail.com",
                    "pointOfContactSame": true,
                },
                "bankDetails": {
                    "bankName": "ICICI BANK",
                    "branchName": "NOIDA",
                    "accountHolderName": "MANJEET",
                    "accountNumber": "9876576788989",
                    "ifscCode": "ICIC0009876",
                },
                "servicePricing": [
                    {
                        "area": 20,
                        "unit": "Acres",
                        "price": 3000,
                    }
                ],
            };

            const [createdWarehouse] = await wareHouseDetails.create([warehouseData], { session });
            warehouse = createdWarehouse;

            logger.info(`Successfully created new warehouse`, {
                warehouseId: warehouse._id,
                warehouseName,
                rowNumber
            });

            return warehouse._id;
        } catch (error) {
            logger.error(`Error creating new warehouse`, {
                warehouseName,
                error: error.message,
                rowNumber
            });
            throw new Error(`Database error while creating warehouse: ${error.message}`);
        }

    } catch (error) {
        logger.error(`Warehouse processing failed`, {
            warehouseName: record[EXCEL_COLUMNS.WAREHOUSE_NAME],
            error: error.message,
            stack: error.stack,
            rowNumber
        });
        throw error; // Re-throw to be caught by processRecord
    }
}

async function generatePurchaseId(session) {
    try {
        logger.info(`Generating new purchase ID`);

        const lastOrder = await BatchOrderProcess.findOne()
            .sort({ createdAt: -1 })
            .select("purchaseId")
            .session(session)
            .lean();

        let purchaseId;
        if (lastOrder && lastOrder?.purchaseId) {
            try {
                const lastNumber = parseInt(lastOrder.purchaseId.replace(/\D/g, ''), 10);
                if (isNaN(lastNumber)) {
                    logger.warn(`Invalid purchase ID format found: ${lastOrder.purchaseId}, using default`);
                    purchaseId = "PO1001";
                } else {
                    purchaseId = `PO${lastNumber + 1}`;
                }
            } catch (error) {
                logger.error(`Error parsing last purchase ID`, {
                    lastPurchaseId: lastOrder.purchaseId,
                    error: error.message
                });
                purchaseId = "PO1001";
            }
        } else {
            purchaseId = "PO1001";
        }

        logger.info(`Generated purchase ID: ${purchaseId}`);
        return purchaseId;

    } catch (error) {
        logger.error(`Error generating purchase ID`, {
            error: error.message,
            stack: error.stack
        });

        // Fallback to timestamp-based ID if database query fails
        const timestamp = Date.now().toString().slice(-6);
        const fallbackId = `PO${timestamp}`;

        logger.warn(`Using fallback purchase ID: ${fallbackId}`);
        return fallbackId;
    }
}