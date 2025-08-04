const {
  _generateOrderNumber,
  dumpJSONToExcel,
  handleDecimal,
  _distillerMsp,
  _taxValue,
  parseDate,
  formatDate,
  _mandiTax, _advancePayment
} = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {
  _query,
  _response_message,
} = require("@src/v1/utils/constants/messages");
const {
  _webSocketEvents,
  _poAdvancePaymentStatus,
  _poRequestStatus,
  _poPaymentStatus,
  _userStatus, _status, _userType
} = require("@src/v1/utils/constants");
// const { _userType } = require("@src/v1/utils/constants");
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const {
  PurchaseOrderModel,
} = require("@src/v1/models/app/distiller/purchaseOrder");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { default: mongoose } = require("mongoose");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { StateTaxModel } = require('@src/v1/models/app/distiller/stateTax');
const { calculateAmount } = require("@src/v1/utils/helpers/amountCalculation");

module.exports.amountCalculation = asyncErrorHandler(async (req, res) => {
  const { token, poQuantity, branch_id } = req.body;

  const missingFields = [];
  if (!token) missingFields.push("token");
  if (!poQuantity) missingFields.push("poQuantity");
  if (!branch_id) missingFields.push("branch_id");

  if (missingFields.length > 0) {
    return res.status(400).send(
      new serviceResponse({
        status: 400,
        errors: missingFields.map((field) => ({
          message: _response_message.notFound(field),
        })),
      })
    );
  }

  try {
    const amountDetails = await calculateAmount(token, poQuantity, branch_id);

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: amountDetails,
        message: _response_message.found("amount calculation"),
      })
    );
  } catch (err) {
    console.error("Amount calculation error:", err.message);
    return res.status(500).send(
      new serviceResponse({
        status: 500,
        errors: [{ message: "Internal server error during amount calculation" }],
      })
    );
  }
});
/*
module.exports.createPurchaseOrder = asyncErrorHandler(async (req, res) => {
  const { organization_id, user_id, user_type } = req
  const {
    branch_id,
    name,
    grade,
    grade_remark,
    material_code,
    poQuantity,
    quantityDuration,
    manufacturingLocation,
    storageLocation,
    location,
    lat,
    long,
    locationUrl,
    locationDetails,
    companyDetails,
    additionalDetails,
    qualitySpecificationOfProduct,
    termsAndConditions,
    comment,
  } = req.body;

  if (user_type && user_type != _userType.distiller) {
    return res.send(
      new serviceResponse({
        status: 400,
        errors: [{ message: _response_message.Unauthorized() }],
      })
    );
  }

  let randomVal;

  // Generate a sequential order number
  const lastOrder = await PurchaseOrderModel.findOne()
    .sort({ createdAt: -1 })
    .select("purchasedOrder.poNo")
    .lean();
  if (lastOrder && lastOrder.purchasedOrder?.poNo) {
    // Extract the numeric part from the last order's poNo and increment it
    const lastNumber = parseInt(
      lastOrder.purchasedOrder.poNo.replace(/\D/g, ""),
      10
    ); // Remove non-numeric characters
    randomVal = `OD${lastNumber + 1}`;
  } else {
    // Default starting point if no orders exist
    randomVal = "OD1001";
  }

  const msp = _distillerMsp();
  const totalAmount = handleDecimal(msp * poQuantity);
  const tax = _mandiTax(totalAmount);
  const mandiTax = handleDecimal(tax);
  const advancePayment = _advancePayment();
  const tokenAmount = handleDecimal(((totalAmount * advancePayment) / 100) + mandiTax);
  console.log("tokenAmount", tokenAmount);
  // const remainingAmount = handleDecimal((totalAmount - tokenAmount) - mandiTax);
  const remainingAmount = handleDecimal(totalAmount - tokenAmount);

  const record = await PurchaseOrderModel.create({
    distiller_id: organization_id._id,
    branch_id,
    purchasedOrder: {
      poNo: randomVal,
      poQuantity: handleDecimal(poQuantity),
      poAmount: handleDecimal(totalAmount),
    },
    product: {
      name,
      grade,
      grade_remark,
      material_code,
      msp: _distillerMsp(),
      quantityDuration,
    },
    manufacturingLocation,
    storageLocation,
    deliveryLocation: {
      location,
      lat,
      long,
      locationUrl,
      locationDetails
    },
    paymentInfo: {
      totalAmount: handleDecimal(totalAmount), // Assume this is calculated during the first step
      advancePayment: handleDecimal(tokenAmount), // Auto-calculated: 10% of totalAmount
      balancePayment: handleDecimal(remainingAmount), // Auto-calculated: 90% of totalAmount
      tax: _taxValue(),
      // paidAmount: handleDecimal(tokenAmount), // this val
      // advancePaymentStatus:_poAdvancePaymentStatus.pending
      // advancePaymentStatus:_poAdvancePaymentStatus.paid
    },
    companyDetails,
    additionalDetails,
    qualitySpecificationOfProduct,
    termsAndConditions,
    comments: {
      user_id,
      comment,
    },
    createdBy: user_id,
  });

  eventEmitter.emit(_webSocketEvents.procurement, {
    ...record,
    method: "created",
  });

  return res.status(200).send(
    new serviceResponse({
      status: 200,
      data: record,
      message: _response_message.created("procurement"),
    })
  );
});
*/

module.exports.createPurchaseOrder = asyncErrorHandler(async (req, res) => {
  const { organization_id, user_id, user_type } = req
  const {
    branch_id,
    token,
    name,
    grade,
    grade_remark,
    material_code,
    poQuantity,
    quantityDuration,
    manufacturingLocation,
    storageLocation,
    location,
    lat,
    long,
    locationUrl,
    locationDetails,
    companyDetails,
    additionalDetails,
    qualitySpecificationOfProduct,
    termsAndConditions,
    comment,
  } = req.body;

  if (user_type && user_type != _userType.distiller) {
    return res.send(
      new serviceResponse({
        status: 400,
        errors: [{ message: _response_message.Unauthorized() }],
      })
    );
  }

  let randomVal;

  // Generate a sequential order number
  const lastOrder = await PurchaseOrderModel.findOne()
    .sort({ createdAt: -1 })
    .select("purchasedOrder.poNo")
    .lean();
  if (lastOrder && lastOrder.purchasedOrder?.poNo) {
    // Extract the numeric part from the last order's poNo and increment it
    const lastNumber = parseInt(
      lastOrder.purchasedOrder.poNo.replace(/\D/g, ""),
      10
    ); // Remove non-numeric characters
    randomVal = `OD${lastNumber + 1}`;
  } else {
    // Default starting point if no orders exist
    randomVal = "OD1001";
  }

  // Calculate amounts
  const { msp, mandiTax, mandiTaxAmount, totalAmount, tokenAmount, advancenAmount, remainingAmount } = await calculateAmount(token, poQuantity, branch_id);

  const record = await PurchaseOrderModel.create({
    distiller_id: organization_id._id,
    branch_id,
    purchasedOrder: {
      poNo: randomVal,
      poQuantity: handleDecimal(poQuantity),
      poAmount: handleDecimal(totalAmount),
    },
    product: {
      name,
      grade,
      grade_remark,
      material_code,
      // msp: _distillerMsp(),
      msp,
      quantityDuration,
    },
    manufacturingLocation,
    storageLocation,
    deliveryLocation: {
      location,
      lat,
      long,
      locationUrl,
      locationDetails
    },
    paymentInfo: {
      token,
      totalAmount, // Assume this is calculated during the first step
      mandiTax, // Auto-calculated: 10% of totalAmount
      advancePayment: handleDecimal(advancenAmount), // Auto-calculated: 10% of totalAmount
      balancePayment: handleDecimal(remainingAmount), // Auto-calculated: 90% of totalAmount
      tax: _taxValue(),
    },
    companyDetails,
    additionalDetails,
    qualitySpecificationOfProduct,
    termsAndConditions,
    comments: {
      user_id,
      comment,
    },
    createdBy: user_id,
  });

  eventEmitter.emit(_webSocketEvents.procurement, {
    ...record,
    method: "created",
  });

  // start of sangita code
  const distillerDetails = await Distiller.findOne({ _id: organization_id._id }).select({
    "basic_details.distiller_details": 1,
    _id: 0,
  });
  // console.log(distillerDetails);
  const organization_name = distillerDetails?.basic_details?.distiller_details?.organization_name;
  const distillerPhone = distillerDetails?.basic_details?.distiller_details?.phone;
  const distiller_contact_number = `+91 ${distillerPhone}`;
  const distiller_name = organization_name;
  const delivery_location = record.deliveryLocation.location;
  const emailData = {
    order_date: formatDate(record.paymentInfo.advancePaymentDate),
    msp: `₹${_distillerMsp()}`,
    total_amount: `₹${record.purchasedOrder.poAmount}`,
    advance_payment: `₹${record.paymentInfo.advancePayment}`,
    advance_payment_date: formatDate(record.paymentInfo.advancePaymentDate),
    distiller_name: distiller_name,
    delivery_location,
    contact_number: distiller_contact_number,
    receiver_name: "Team NCCF",
  };
  const subject = `New Purchase Order Received! (Order ID:${emailData.po_number})`;
  const receiver = process.env.PO_RECEPIENT_ADDRESS;

  // emailService.sendPurchaseOrderConfirmation(receiver, emailData, subject);
  // end of sangita code

  return res.status(200).send(
    new serviceResponse({
      status: 200,
      data: record,
      message: _response_message.created("procurement"),
    })
  );
});

module.exports.getPurchaseOrder = asyncErrorHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy, search = '', isExport = 0 } = req.query;
    const { user_id, organization_id } = req;
    console.log(organization_id);

    // Validate search input
    if (/[.*+?^${}()|[\]\\]/.test(search)) {
      return sendResponse({
        res,
        status: 400,
        errorCode: 400,
        errors: [{ message: "Do not use any special character" }],
        message: "Do not use any special character"
      });
    }

    const pageInt = Math.max(parseInt(page) || 1, 1);
    const limitInt = Math.max(parseInt(limit) || 10, 1);
    const skipInt = (pageInt - 1) * limitInt;
    const sortField = typeof sortBy === 'string' ? sortBy : "createdAt";

    const pipeline = [
      {
        $match: {
          "paymentInfo.advancePaymentStatus": _poAdvancePaymentStatus.paid,
          distiller_id: new mongoose.Types.ObjectId(
            typeof organization_id === 'string' ? organization_id : organization_id._id
          ),
          deletedAt: null,
          ...(search
            ? {
              $or: [
                { 'purchasedOrder.poNo': { $regex: search, $options: "i" } },
              ]
            }
            : {})
        }
      },

      {
        $group: {
          _id: null,
          allDocs: { $push: "$$ROOT" },
          totalCount: { $sum: 1 },
          totalAmount: { $sum: { $add: ["$paymentInfo.advancePayment", "$paymentInfo.balancePayment"] } },
          poAmount: { $sum: "$paymentInfo.advancePayment" },
          balanceAmount: { $sum: "$paymentInfo.balancePayment" }
        }
      },

      {
        $project: {
          allDocs: 1,
          totalCount: 1,
          totalAmount: 1,
          poAmount: 1,
          balanceAmount: 1
        }
      },

      {
        $facet: {
          metadata: [
            {
              $project: {
                total: "$totalCount",
                totalAmount: "$totalAmount",
                poAmount: "$poAmount",
                balanceAmount: "$balanceAmount"
              }
            }
          ],
          data: [
            { $unwind: "$allDocs" },
            { $replaceRoot: { newRoot: "$allDocs" } },
            { $sort: { [sortField]: -1, _id: -1 } },
            { $skip: skipInt },
            { $limit: limitInt }
          ]
        }
      }
    ];

    const result = await PurchaseOrderModel.aggregate(pipeline);

    const metadata = result[0]?.metadata[0] || {};
    const records = {
      count: metadata.total || 0,
      totalAmount: metadata.totalAmount || 0,
      poAmount: metadata.poAmount || 0,
      balanceAmount: metadata.balanceAmount || 0,
      rows: result[0]?.data || [],
    };

    if (!isExport) {
      records.page = pageInt;
      records.limit = limitInt;
      records.pages = limitInt !== 0 ? Math.ceil(records.count / limitInt) : 0;

      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("procurement")
        })
      );
    } else {
      // Prepare Excel export
      const record = (records.rows || []).map(item => {
        try {
          return {
            "PO Number": item?.purchasedOrder?.poNo || "NA",
            "PO Date": item?.createdAt || "NA",
            "Commodity": item?.product?.name || "NA",
            "MSP": _distillerMsp() || "NA",
            "Quantity": item?.paymentInfo?.token || "NA",
            "PO(%)": item?.purchasedOrder?.poQuantity || "NA",
            "MandiTax": item?.paymentInfo?.mandiTax || "NA",
            "Advance Payment": item?.paymentInfo?.advancePayment || "NA",
            "Balance Payment": item?.paymentInfo?.balancePayment || "NA",
            "Total Amount": (item?.paymentInfo?.advancePayment + item?.paymentInfo?.balancePayment) || "NA"
          };
        } catch (e) {
          console.error("Error mapping export row:", e);
          return {};
        }
      });

      if (record.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Requirement-record.xlsx`,
          worksheetName: `Requirement-record`
        });
      } else {
        return res.status(200).send(
          new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.notFound("procurement")
          })
        );
      }
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});



module.exports.getPurchaseOrderById = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid item ID" });
  }

  const record = await PurchaseOrderModel.findOne({ _id: id });

  if (!record) {
    return res.status(400).send(
      new serviceResponse({
        status: 400,
        errors: [{ message: _response_message.notFound("purchase order") }],
      })
    );
  }

  return res.status(200).send(
    new serviceResponse({
      status: 200,
      data: record,
      message: _response_message.found("purchase order"),
    })
  );
});

module.exports.updatePurchaseOrder = asyncErrorHandler(async (req, res) => {
  const { user_id, organization_id } = req;

  const {
    id,
    branch_id,
    name,
    grade,
    grade_remark,
    poQuantity,
    quantityDuration,
    manufacturingLocation,
    storageLocation,
    deliveryLocation,
    companyDetails,
    additionalDetails,
    qualitySpecificationOfProduct,
    paymentInfo,
  } = req.body;

  const record = await PurchaseOrderModel.findOne({ _id: id }).populate(
    "branch_id"
  );

  const branch_office_location = `${record.branch_id.state}`;

  if (!record) {
    return res.status(400).send(
      new serviceResponse({
        status: 400,
        message: _response_message.notFound("request"),
      })
    );
  }

  // Calculate amounts
  const { msp, mandiTax, mandiTaxAmount, totalAmount, tokenAmount, advancenAmount, remainingAmount } = await calculateAmount(token, poQuantity, branch_id);


  (record.branch_id = branch_id || record.branch_id),
    // Update product details
    (record.product.name = name || record.product.name);
  record.product.grade = grade || record.product.grade;
  record.product.grade = grade_remark || record.product.grade_remark;
  record.product.quantityDuration =
    quantityDuration || record.product.quantityDuration;
  // Update locations
  record.manufacturingLocation =
    manufacturingLocation || record.manufacturingLocation;
  record.storageLocation = storageLocation || record.storageLocation;
  record.deliveryLocation = deliveryLocation || record.deliveryLocation;
  // Update company details
  record.companyDetails.companyName =
    companyDetails.companyName || record.companyDetails.companyName;
  record.companyDetails.registeredAddress =
    companyDetails.registeredAddress || record.companyDetails.registeredAddress;
  record.companyDetails.phone =
    companyDetails.phone || record.companyDetails.phone;
  record.companyDetails.faxNo =
    companyDetails.faxNo || record.companyDetails.faxNo;
  record.companyDetails.email =
    companyDetails.email || record.companyDetails.email;
  record.companyDetails.pan = companyDetails.pan || record.companyDetails.pan;
  record.companyDetails.gstin =
    companyDetails.gstin || record.companyDetails.gstin;
  record.companyDetails.cin = companyDetails.cin || record.companyDetails.cin;
  // Update purchase order reference
  record.purchasedOrder.poQuantity = poQuantity ? handleDecimal(poQuantity) : record.purchasedOrder.poQuantity;
  record.purchasedOrder.poAmount = totalAmount ? handleDecimal(totalAmount) : record.purchasedOrder.poAmount;
  // Update additional details
  record.additionalDetails.indentNumber = additionalDetails.indentNumber || record.additionalDetails.indentNumber;
  record.additionalDetails.indentDate = additionalDetails.indentDate || record.additionalDetails.indentDate;
  record.additionalDetails.referenceDate = additionalDetails.referenceDate || record.additionalDetails.referenceDate;
  record.additionalDetails.contactPerson = additionalDetails.contactPerson || record.additionalDetails.contactPerson;
  record.additionalDetails.transportDetails = additionalDetails.transportDetails || record.additionalDetails.transportDetails;
  record.additionalDetails.termsOfDelivery = additionalDetails.termsOfDelivery || record.additionalDetails.termsOfDelivery;
  record.additionalDetails.digitalSignature = additionalDetails.digitalSignature || record.additionalDetails.digitalSignature;
  // Update quality specification
  record.qualitySpecificationOfProduct.moisture = qualitySpecificationOfProduct.moisture || record.qualitySpecificationOfProduct.moisture;
  record.qualitySpecificationOfProduct.broken = qualitySpecificationOfProduct.broken || record.qualitySpecificationOfProduct.broken;
  // Payment Info
  (record.paymentInfo.advancePaymentDate = paymentInfo?.advancePaymentDate || record?.paymentInfo?.advancePaymentDate),
    (record.paymentInfo.totalAmount = totalAmount || record?.paymentInfo?.totalAmount),
    (record.paymentInfo.balancePayment = remainingAmount || record?.paymentInfo?.balancePayment),
    (record.paymentInfo.advancePayment = advancenAmount || record?.paymentInfo?.advancePayment),
    (record.paymentInfo.mandiTax = mandiTax || record?.paymentInfo?.mandiTax),
    (record.paymentInfo.advancePaymentUtrNo = paymentInfo?.advancePaymentUtrNo || record?.paymentInfo?.advancePaymentUtrNo),
    (record.paymentInfo.payment_proof = paymentInfo?.payment_proof || record?.paymentInfo?.payment_proof),
    (record.paymentInfo.advancePaymentStatus = record?.paymentInfo?.advancePaymentStatus || "NA");

  // Save the updated record
  await record.save();

  const distillerDetails = await Distiller.findOne({ _id: organization_id._id }).select({
    "basic_details.distiller_details": 1,
    _id: 0,
  });
  // console.log(distillerDetails);
  const organization_name = distillerDetails?.basic_details?.distiller_details?.organization_name;
  const distillerPhone = distillerDetails?.basic_details?.distiller_details?.phone;
  const distiller_contact_number = `+91 ${distillerPhone}`;
  const distiller_name = organization_name;
  const delivery_location = record.deliveryLocation.location;
  const emailData = {
    order_date: formatDate(record.paymentInfo.advancePaymentDate),
    msp: `₹${_distillerMsp()}`,
    total_amount: `₹${record.purchasedOrder.poAmount}`,
    advance_payment: `₹${record.paymentInfo.advancePayment}`,
    advance_payment_date: formatDate(record.paymentInfo.advancePaymentDate),
    distiller_name: distiller_name,
    delivery_location,
    contact_number: distiller_contact_number,
    receiver_name: "Team NCCF",
  };
  const subject = `New Purchase Order Received! (Order ID:${emailData.po_number})`;
  const receiver = process.env.PO_RECEPIENT_ADDRESS;

  emailService.sendPurchaseOrderConfirmation(receiver, emailData, subject);
  return res.status(200).send(
    new serviceResponse({
      status: 200,
      data: record,
      message: _response_message.updated("Request"),
    })
  );
});

module.exports.deletePurchaseOrder = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid item ID" });
  }

  const record = await PurchaseOrderModel.findOne({ _id: id });

  if (!record) {
    return res.status(400).send(
      new serviceResponse({
        status: 400,
        errors: [{ message: _response_message.notFound("Requirement") }],
      })
    );
  }

  await record.deleteOne();

  return res.status(200).send(
    new serviceResponse({
      status: 200,
      message: _response_message.deleted("Requirement"),
    })
  );
});

module.exports.branchList = asyncErrorHandler(async (req, res) => {
  try {
    const { state } = req.query;
    const record = await Branches.find({ state: state, status: _status.active });

    if (!record) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("Branch") }],
        })
      );
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: record,
        message: _response_message.found("Branches"),
      })
    );
  } catch (err) {
    return res
      .status(500)
      .send(
        new serviceResponse({ status: 500, errors: [{ message: err.message }] })
      );
  }
});
