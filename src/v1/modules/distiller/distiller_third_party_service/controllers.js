
const mongoose = require("mongoose");
const { DistillerDraft } = require("@src/v1/models/app/auth/DistillerDraft");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const {
  ManufacturingUnit,
} = require("@src/v1/models/app/auth/ManufacturingUnit");
const { StorageFacility } = require("@src/v1/models/app/auth/storageFacility");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const {
  _generateOrderNumber,
  dumpJSONToExcel,
  handleDecimal,
  _distillerMsp,
  _taxValue,
  parseDate,
  formatDate,
  _mandiTax,
} = require("@src/v1/utils/helpers");
const {
  _userType,
  _userStatus,
  _statusType,
  _collectionName,
} = require("@src/v1/utils/constants");
const { getStateIdBystateName, getDistrictIdByname } = require("@common/services/stateServices")
const { getStateId, getDistrictId } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");
const { _poBatchPaymentStatus, _poPaymentStatus, _webSocketEvents } = require("@src/v1/utils/constants");
const { MasterUser } = require("@models/master/MasterUser")
const { calculateAmount } = require("@src/v1/utils/helpers/amountCalculation");
const logger = require("@common/logger/logger")

const jwt = require('jsonwebtoken');
const { JWT_SECRET_KEY } = require('@config/index');
const bcrypt = require('bcryptjs');

function replaceUndefinedWithNull(obj) {
  if (Array.isArray(obj)) {
    return obj.map(replaceUndefinedWithNull);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        v === undefined ? null : replaceUndefinedWithNull(v),
      ])
    );
  }
  return obj;
}

exports.createDistiller = async (req, res) => {
  const session = await mongoose.startSession();
  const { userId } = req.user;
  
  // IMPROVED: Add request logging
  logger.info(`Creating distiller - User: ${userId}`, {
    userId,
    requestBody: {
      distiller_details: req.body.distiller_details ? 'present' : 'missing',
      po_details: req.body.po_details ? `${req.body.po_details.length} items` : 'missing'
    }
  });

  try {
    const result = await session.withTransaction(async () => {
      let distiller_details = req.body.distiller_details || {};
      distiller_details = {
        ...distiller_details,
        user_type: "8",
        is_mobile_verified: "true",
        is_approved: "approved",
        is_email_verified: "true",
        is_form_submitted: "true",
        is_welcome_email_send: "true",
        is_sms_send: "true",
        term_condition: "true",
        mou: "true",
        mou_document: distiller_details.mou_document,
        mou_approval: distiller_details.mou_approval,
        active: true,
        client_id: distiller_details.client_id || "9877"
      };

      const po_details = req.body.po_details || [];
      const source_by = "NAFED";
      const country = req.body.country || "India";

      // IMPROVED: Validate PO numbers first before any database operations
      if (po_details.length > 0) {
        logger.info(`Validating ${po_details.length} PO numbers`, { userId });
        
        const poNumbers = po_details.map(po => po.poNo).filter(Boolean);
        const duplicatePoNumbers = [];
        
        for (const poNo of poNumbers) {
          const existingPO = await PurchaseOrderModel.findOne({ 
            "purchasedOrder.poNo": poNo 
          }).session(session);
          
          if (existingPO) {
            duplicatePoNumbers.push(poNo);
            logger.warn(`Duplicate PO number found: ${poNo}`, {
              userId,
              poNo,
              existingPOId: existingPO._id
            });
          }
        }
        
        if (duplicatePoNumbers.length > 0) {
          const errorMessage = `PO number(s) already exist: ${duplicatePoNumbers.join(', ')}. Please use different PO numbers.`;
          logger.error(`PO validation failed - duplicate numbers found`, {
            userId,
            duplicatePoNumbers,
            totalPOsRequested: poNumbers.length
          });
          throw new Error(errorMessage);
        }
        
        logger.info(`PO validation successful - all ${poNumbers.length} PO numbers are unique`, { userId });
      }

      // Create draft
      const draft = await DistillerDraft.create([{
        distiller_details,
        po_details,
        source_by,
        country,
        createdBy: userId,
        updatedBy: userId
      }], { session });

      logger.info(`Draft created successfully`, {
        userId,
        draftId: draft[0]._id
      });

      // Mobile number validation
      let mobile_no = distiller_details.phone || distiller_details.mobile_no;
      if (!mobile_no) {
        logger.error(`Mobile number missing in distiller creation`, { userId });
        throw new Error("Mobile number is required in the 'distiller_details.phone' field.");
      }

      // Check existing mobile number
      const existing = await Distiller.findOne({
        "basic_details.distiller_details.phone": mobile_no,
      }).session(session);

      if (existing) {
        logger.warn(`Duplicate mobile number attempted`, {
          userId,
          mobileNo: mobile_no,
          existingDistillerId: existing._id
        });
        throw new Error(`Mobile number '${mobile_no}' already registered. Please use a different mobile_no.`);
      }

      let poc_name = distiller_details.name;
      let poc_email = distiller_details.email;

      const staticFields = {
        user_type: "8",
        is_mobile_verified: "true",
        is_approved: "approved",
        is_email_verified: "true",
        is_form_submitted: "true",
        is_welcome_email_send: "true",
        is_sms_send: "true",
        term_condition: "true",
        mou: "true",
        mou_document: distiller_details.mou_document,
        mou_approval: distiller_details.mou_approval,
        active: true,
        source_by: distiller_details.source_by || "NAFED",
        country: distiller_details.country || "India",
        client_id: distiller_details.client_id || "9877"
      };

      const onboardingWithStatic = { ...distiller_details, ...staticFields };
      let userReq = createDistllerPayload(onboardingWithStatic);
      userReq["createdBy"] = userId;
      userReq["updatedBy"] = userId;

      // Create distiller
      const distillerCreate = await Distiller.create([userReq], { session });
      const newDistiller = distillerCreate[0];

      logger.info(`Distiller created successfully`, {
        userId,
        distillerId: newDistiller._id,
        mobileNo: mobile_no
      });

      // Update distiller
      await Distiller.updateOne(
        { _id: newDistiller._id },
        { $set: { is_form_submitted: "true" } },
        { session }
      );

      // Create master user
      const masterUser = await MasterUser.create(
        [
          {
            firstName: poc_name,
            email: poc_email,
            isAdmin: true,
            isSuperAdmin: false,
            mobile: mobile_no,
            user_type: _userType.distiller,
            portalId: newDistiller._id,
            portalRef: _collectionName.Distiller,
            status: _statusType.active,
            createdBy: userId,
            updatedBy: userId,
            userRole: [new mongoose.Types.ObjectId("67addf7fab0f886017049ed7")],
          },
        ],
        { session }
      );

      logger.info(`Master user created successfully`, {
        userId,
        masterUserId: masterUser[0]._id,
        distillerId: newDistiller._id
      });

      // Manufacturing unit creation
      const manufacturing_address_line1 = onboardingWithStatic.address?.full_address;
      const manufacturing_address_line2 = null;
      const manufacturing_state = onboardingWithStatic.address?.state;
      const manufacturing_district = onboardingWithStatic.address?.district;
      const production_capacity_value = null;
      const production_capacity_unit = null;
      const supply_chain_capabilities = null;
      const product_produced = null;

      if (manufacturing_address_line1 || product_produced) {
        const manufacturingUnit = await ManufacturingUnit.create(
          [
            {
              distiller_id: newDistiller._id,
              manufacturing_address_line1,
              manufacturing_address_line2,
              manufacturing_state: await getStateId(manufacturing_state),
              manufacturing_district: await getDistrictId(manufacturing_district),
              production_capacity: {
                value: production_capacity_value || 0,
                unit: production_capacity_unit || "square meters",
              },
              product_produced,
              supply_chain_capabilities,
              createdBy: userId,
              updatedBy: userId,
            },
          ],
          { session }
        );
        
        logger.info(`Manufacturing unit created successfully`, {
          userId,
          manufacturingUnitId: manufacturingUnit[0]._id,
          distillerId: newDistiller._id
        });
      } else {
        logger.error(`Manufacturing unit creation failed - missing required details`, {
          userId,
          distillerId: newDistiller._id
        });
        throw new Error("Manufacturing unit details are required. Please provide manufacturing address or product produced.");
      }

      // Storage facility creation
      const storage_address_line1 = onboardingWithStatic.address?.full_address;
      const storage_address_line2 = null;
      const storage_state = onboardingWithStatic.address?.state;
      const storage_district = onboardingWithStatic.address?.district;
      const storage_capacity_value = null;
      const storage_condition = null;

      if (storage_address_line1 || storage_condition) {
        const storageFacility = await StorageFacility.create(
          [
            {
              distiller_id: newDistiller._id,
              storage_address_line1,
              storage_address_line2,
              storage_state: await getStateId(storage_state),
              storage_district: await getDistrictId(storage_district),
              storage_capacity: {
                value: storage_capacity_value || 0,
                unit: "Square meters",
              },
              storage_condition: "Cool",
              createdBy: userId,
              updatedBy: userId,
            },
          ],
          { session }
        );
        
        logger.info(`Storage facility created successfully`, {
          userId,
          storageFacilityId: storageFacility[0]._id,
          distillerId: newDistiller._id
        });
      } else {
        logger.error(`Storage facility creation failed - missing required details`, {
          userId,
          distillerId: newDistiller._id
        });
        throw new Error("Storage facility details are required. Please provide storage address or storage condition.");
      }

      // Purchase order processing
      if (po_details.length > 0) {
        logger.info(`Processing ${po_details.length} purchase orders`, {
          userId,
          distillerId: newDistiller._id
        });

        for (let i = 0; i < po_details.length; i++) {
          let index = po_details[i];
          let brachName = `NAFED ${index.devlivery_district} ${index.devlivery_state} Branch`;

          logger.info(`Processing PO ${i + 1}/${po_details.length}`, {
            userId,
            poNo: index.poNo,
            branchName: brachName
          });

          let searchBrachName = await Branches.findOne({ brachName: brachName }).session(session);
          let branch_id 
          const shortCode = generate3LetterCode();

          if (!searchBrachName) {
            let branchData = {
              branchName: brachName,
              "address": index.devlivery_location,
              "district": index.devlivery_district,
              state: index.devlivery_state || null,
              "status": "active",
              "password": "$2b$10$ssCi8PXtT7MH.v8eO2xJCu0kBh50qYDasc0lWkGql1b/.ZKPVZy16",
              "emailAddress": `${index.devlivery_district + shortCode}@gmail.com`,
              "pointOfContact": { "name": "XYZ", "email": `${index.devlivery_district + shortCode}@gmail.com` },
              "isPasswordChanged": false,
              "cityVillageTown": index.devlivery_location || null,
              "status": "active",
              "headOfficeId": new mongoose.Types.ObjectId("6723a9159fed2bd78ef5588a"),
              createdBy: userId,
              updatedBy: userId,
              source_by: "NAFED"
            };

            let createBranch = await Branches.create([branchData], { session });
            console.log("=============================",createBranch)
            branch_id = createBranch[0]._id;
            
            logger.info(`New branch created`, {
              userId,
              branchId: branch_id,
              branchName: brachName
            });
          }else{
            branch_id = searchBrachName?._id;
          }

          let purchasedOrderId = null;
           const { msp, mandiTax, mandiTaxAmount, totalAmount, tokenAmount, advancenAmount, remainingAmount } = await calculateAmount(index.token, index.poQuantity, branch_id,session);

          const purchasedOrderCreate = await PurchaseOrderModel.create([{
            distiller_id: newDistiller._id,
            branch_id: branch_id,
            purchasedOrder: {
              poNo: index.poNo,
              poQuantity: handleDecimal(index.poQuantity),
              poAmount: handleDecimal(totalAmount),
            },
            product: {
              name: index.commodity,
              msp: msp,
            },
            manufacturingLocation: index.manufacturing_location,
            storageLocation: index.storage_location,
            deliveryLocation: {
              location: index.devlivery_location,
              locationDetails: index.devlivery_location
            },
            paymentInfo: {
              token: index.token,
              totalAmount: handleDecimal(totalAmount),
              advancePayment: advancenAmount,
              balancePayment: handleDecimal(remainingAmount),
              tax: mandiTax,
              mandiTax: mandiTax,
              paidAmount: handleDecimal(tokenAmount),
              advancePaymentStatus: index._poAdvancePaymentStatus?.paid || "Paid",
              status: "Completed",
              poStatus: "Approved",
              fulfilledQty: index.fulfilledQty,
              transactionId: index.transactionId
            },
            poStatus :"Approved",
            status:"Completed",
            payment_status: "Paid",
            companyDetails: index.companyDetails,
            additionalDetails: index.additionalDetails,
            qualitySpecificationOfProduct: index.qualitySpecificationOfProduct,
            termsAndConditions: true,
            createdBy: userId,
            updatedBy: userId,
            source_by: "NAFED"
          }], { session });

          purchasedOrderId = purchasedOrderCreate[0]._id;

          logger.info(`Purchase order created successfully`, {
            userId,
            purchaseOrderId: purchasedOrderId,
            poNo: index.poNo,
            distillerId: newDistiller._id
          });

          // Process batch details
          if (index?.batch_details && Array.isArray(index.batch_details)) {
            logger.info(`Processing ${index.batch_details.length} batch details for PO: ${index.poNo}`, {
              userId,
              poNo: index.poNo,
              batchCount: index.batch_details.length
            });

            for (let j = 0; j < index.batch_details.length; j++) {
              let createwarehouse = await createWarehouse(index.batch_details[j], session, userId);

              const data = {
                user_id: newDistiller._id,
                warehouseId: createwarehouse,
                orderId: purchasedOrderId,
                quantityRequired: index.batch_details[j]?.quantity || 0,
                warehouseOwner_Id: new mongoose.Types.ObjectId("6874b9a8516fc15195972cb4"),
                createdBy: userId,
                updatedBy: userId,
              };

              await createBatch(data, session, userId);
              
              logger.info(`Batch ${j + 1}/${index.batch_details.length} processed successfully`, {
                userId,
                poNo: index.poNo,
                warehouseId: createwarehouse,
                quantity: data.quantityRequired
              });
            }
          }
        }
      }

      logger.info(`Distiller creation completed successfully`, {
        userId,
        distillerId: newDistiller._id,
        poCount: po_details.length
      });

      return {
        distiller_details,
        po_details,
        source_by,
        country,
        status: true,
        active: true,
        createdAt: draft[0].createdAt,
        updatedAt: draft[0].updatedAt,
        distiller_id: newDistiller._id
      };
    });

    return sendResponse({
      res,
      status: 201,
      message: "Distiller & MasterUser created successfully.",
      data: result,
    });

  } catch (error) {
    logger.error(`Distiller creation failed`, {
      userId,
      error: error.message,
      stack: error.stack
    });

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error.message.includes("Mobile number is required")) {
      statusCode = 400;
      errorMessage = "Mobile number is required in the 'distiller_details.phone' field.";
    } else if (error.message.includes("already registered")) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes("PO number(s) already exist")) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes("Manufacturing unit details are required")) {
      statusCode = 400;
      errorMessage = "Manufacturing unit details are required.";
    } else if (error.message.includes("Storage facility details are required")) {
      statusCode = 400;
      errorMessage = "Storage facility details are required.";
    }

    return sendResponse({
      res,
      status: statusCode,
      message: errorMessage,
      errors: [{ message: error.message }],
    });
  } finally {
    await session.endSession();
    logger.info(`Database session ended`, { userId });
  }
};

// IMPROVED: Updated createWarehouse function with logging
async function createWarehouse(data, session, userId) {
  try {
    logger.info(`Creating/Finding warehouse`, {
      userId,
      warehouseName: data.warehouse_name
    });

    let findWarehouse = await wareHouseDetails.findOne({
      "basicDetails.warehouseName": data.warehouse_name
    }).session(session);

    if (findWarehouse) {
      logger.info(`Warehouse found - using existing`, {
        userId,
        warehouseId: findWarehouse._id,
        warehouseName: data.warehouse_name
      });
      return findWarehouse._id;
    }

    let obj = {
      warehouseOwnerId: new mongoose.Types.ObjectId("6874b9a8516fc15195972cb4"),
      basicDetails: {
        warehouseName: data.warehouse_name,
        warehouseCapacity: 4000,
        weighBridge: true,
        storageType: "Dry",
        quantityType: "MT",
      },
      addressDetails: {
        addressLine1: data.warehouse_address,
        state: { state_name: data.warehouse_state },
        district: { district_name: data.warehouse_district },
      },
      authorizedPerson: {},
      bankDetails: {},
      active: true,
      source_by: "NAFED"
    };

    const createWarehouse = await wareHouseDetails.create([obj], { session });
    
    logger.info(`New warehouse created successfully`, {
      userId,
      warehouseId: createWarehouse[0]._id,
      warehouseName: data.warehouse_name
    });

    return createWarehouse[0]._id;
  } catch (error) {
    logger.error(`Warehouse creation failed`, {
      userId,
      warehouseName: data.warehouse_name,
      error: error.message
    });
    throw new Error("Failed to create warehouse: " + error.message);
  }
}

// IMPROVED: Updated createBatch function with logging
async function createBatch(data, session, userId) {
  try {
    const { user_id, warehouseId, orderId, quantityRequired, warehouseOwner_Id } = data;

    logger.info(`Creating batch`, {
      userId,
      orderId,
      quantityRequired,
      warehouseId
    });

    const poRecord = await PurchaseOrderModel.findOne({
      _id: orderId,
      deletedAt: null
    }).session(session);

    if (!poRecord) {
      logger.error(`PO not found for batch creation`, {
        userId,
        orderId
      });
      throw new Error("PO not found");
    }

    const { purchasedOrder, fulfilledQty = 0, paymentInfo } = poRecord;

    if (quantityRequired > purchasedOrder.poQuantity) {
      logger.error(`Quantity exceeds PO quantity`, {
        userId,
        orderId,
        quantityRequired,
        poQuantity: purchasedOrder.poQuantity
      });
      throw new Error("Quantity should not exceed PO Qty.");
    }

    const existBatch = await BatchOrderProcess.find({
      distiller_id: user_id,
      orderId
    }).session(session);

    const addedQty = existBatch.reduce((sum, b) => sum + b.quantityRequired, 0);

    if (addedQty >= purchasedOrder.poQuantity) {
      logger.error(`Cannot create more batches - quantity already fulfilled`, {
        userId,
        orderId,
        addedQty,
        poQuantity: purchasedOrder.poQuantity
      });
      throw new Error("Cannot create more Batch, Qty already fulfilled.");
    }

    const remainingQty = handleDecimal(purchasedOrder.poQuantity - addedQty);
    if (quantityRequired > remainingQty) {
      logger.error(`Quantity exceeds remaining PO quantity`, {
        userId,
        orderId,
        quantityRequired,
        remainingQty
      });
      throw new Error("Quantity exceeds PO remaining quantity.");
    }

    const msp = _distillerMsp();
    const totalAmount = handleDecimal(paymentInfo.totalAmount);
    const tokenAmount = handleDecimal(paymentInfo.advancePayment);

    let amountToBePaid = existBatch.length > 0
      ? handleDecimal(msp * quantityRequired)
      : handleDecimal(msp * quantityRequired - tokenAmount);

    const lastOrder = await BatchOrderProcess.findOne()
      .sort({ createdAt: -1 })
      .select("purchaseId")
      .lean()
      .session(session);

    const randomVal = lastOrder?.purchaseId
      ? `PO${parseInt(lastOrder.purchaseId.replace(/\D/g, ""), 10) + 1}`
      : "PO1001";

    let currentDate = new Date();

    const record = await BatchOrderProcess.create(
      [{
        distiller_id: user_id,
        warehouseId,
        warehouseOwnerId: warehouseOwner_Id,
        orderId,
        purchaseId: randomVal,
        quantityRequired: handleDecimal(quantityRequired),
        "payment.amount": amountToBePaid,
        "payment.status": _poBatchPaymentStatus.paid,
        scheduledPickupDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        createdBy: data.createdBy,
        source_by: "NAFED",
      }],
      { session }
    );

    // Update PO record
    poRecord.fulfilledQty = handleDecimal(fulfilledQty + quantityRequired);
    poRecord.paymentInfo.paidAmount = handleDecimal(poRecord.paymentInfo.paidAmount + amountToBePaid);
    poRecord.paymentInfo.balancePayment = handleDecimal(poRecord.paymentInfo.totalAmount - poRecord.paymentInfo.paidAmount);

    if (poRecord.paymentInfo.totalAmount == poRecord.paymentInfo.paidAmount) {
      poRecord.payment_status = _poPaymentStatus.paid;
    }

    await poRecord.save({ session });

    logger.info(`Batch created successfully`, {
      userId,
      batchId: record[0]._id,
      purchaseId: randomVal,
      orderId,
      quantityRequired
    });

    // Event emission after successful transaction
    eventEmitter.emit(_webSocketEvents.procurement, { ...record[0].toObject(), method: "created" });

    return record[0];
  } catch (error) {
    logger.error(`Batch creation failed`, {
      userId,
      orderId: data.orderId,
      error: error.message
    });
    throw new Error("Failed to create batch: " + error.message);
  }
}

// IMPROVED: No changes needed here, function looks good
function createDistllerPayload(input) {
  let {
    client_id,
    basic_details = {},
    address = {},
    mou_document,
    user_type = "8",
    is_approved = "approved",
    user_code = "DIST_" + Date.now(),
    is_mobile_verified = "true",
    is_email_verified = "true",
    is_form_submitted = "true",
    is_welcome_email_send = true,
    is_sms_send = true,
    term_condition = "true",
    mou = "true",
    mou_approval = "approved",
    active = true,
    name, organization_name, email, phone, aadhar_number, pan_card
  } = input;
  console.log(input, "============================")
  const {
    distiller_details = {},
    point_of_contact = {},
    company_owner_info = {},
    implementation_agency = null,
    cbbo_name = null,
  } = basic_details;

  const { registered = {}, operational = {} } = address;

  let payload = {
    client_id: "9877",
    basic_details: {
      distiller_details: {
        associate_type: distiller_details.associate_type,
        organization_name: organization_name,
        email: email,
        phone: phone,
        company_logo: distiller_details.company_logo || null,
      },
      point_of_contact: {
        name: name || null,
        email: email || null,
        mobile: phone || null,
        designation: point_of_contact.designation,
        aadhar_number: aadhar_number,
      },
      company_owner_info: {
        name: company_owner_info.name || null,
        aadhar_number: aadhar_number || null,
        pan_card: pan_card,
      },
      implementation_agency,
      cbbo_name,
    },
    address: {
      registered: {
        line1: registered.line1 || null,
        line2: registered.line2 || null,
        country: "India",
        state: registered.state,
        district: registered.district,
        taluka: registered.taluka,
        pinCode: registered.pinCode || null,
        village: registered.village,
        ar_circle: registered.ar_circle || null,
      },
      operational: {
        line1: operational.line1 || null,
        line2: operational.line2 || null,
        country: operational.country || null,
        state: operational.state || null,
        district: operational.district || null,
        taluka: operational.taluka || null,
        pinCode: operational.pinCode || null,
        village: operational.village || null,
      },
    },
    company_details: input.company_details || {
      cin_number: null,
      cin_image: null,
      tan_number: null,
      tan_image: null,
      pan_card: pan_card,
      pan_image: null,
      gst_no: null,
      pacs_reg_date: null,
    },
    manufactoring_storage: input.manufactoring_storage || {
      manufactoring_details: false,
      storage_details: false,
    },
    authorised: input.authorised || {
      name: name,
      designation: null,
      phone: phone,
      email: email,
      aadhar_number: aadhar_number,
      aadhar_certificate: { front: null, back: null },
      pan_card: pan_card,
      pan_image: null,
    },
    bank_details: input.bank_details || {
      bank_name: null,
      branch_name: null,
      account_holder_name: null,
      ifsc_code: null,
      account_number: null,
      upload_proof: null,
    },
    user_type: "8",
    is_mobile_verified: "true",
    is_approved: "approved",
    is_email_verified: "true",
    is_form_submitted: "true",
    is_welcome_email_send: "true",
    is_sms_send: "true",
    term_condition: "true",
    mou: "true",
    mou_document: null,
    mou_approval: null,
    active: true,
    source_by: "NAFED",
  };

  return replaceUndefinedWithNull(payload);
}


function generate3LetterCode() {
  let letters = "abcdefghijklmnopqrstuvwxyz";
  let code = "";
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}



exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await MasterUser.findOne({ email: email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const payload = {
      userId: user._id,
      email: user.email,
      username: user.username,
    };

    const token = await jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: '1h' });

    return res.status(200).json({ token });
  } catch (error) {
    console.log(error.message)
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await jwt.verify(token, JWT_SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Forbidden: Invalid token' });
  }
};