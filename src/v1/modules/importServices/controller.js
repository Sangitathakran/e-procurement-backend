const mongoose = require('mongoose');
const moment = require('moment'); // Add this import
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
                    const purchaseData = await formatPurchaseOrderRecord(record, branch_id);
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
                        let purchaseData = await formatPurchaseOrderRecord(record, branch_id);
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

async function formatPurchaseOrderRecord(record = {}, branch_id) {
    try {
        const poDate = convertExcelDate(record["PO date "] || record["PO date"]);
        const receiptDate = convertExcelDate(record["Receipt Amount Date"]);
        let poQuantity = record["PO Quantity (In Mt)"]
        let token = Number(record["Payment Token (%)"]) || 10
        const { msp, mandiTax, mandiTaxAmount, totalAmount, tokenAmount, advancenAmount, remainingAmount } = await calculateAmount(token, poQuantity, branch_id);
        
        return {
            product: {
                name: record["Commodity"]?.trim(),
                msp: Number(record["MSP (In Rs)"]) || msp,
            },
            deliveryLocation: {
                location: record["Delivery Location "]?.trim() || record["Delivery Location"]?.trim(),
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
            poStatus :"Approved",
            status:"Completed"
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
