const {
  eKharidHaryanaProcurementModel,
} = require("@src/v1/models/app/eKharid/procurements");
const {
  _response_message,
  _middleware,
} = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const express = require("express");

// Helper function to handle missing fields with default values
const extractField = (
  field,
  expectedType = "string",
  fallbackString = "NA",
  fallbackNumber = 0
) => {
  if (field !== undefined && field !== null) {
    return expectedType === "number" ? Number(field) || fallbackNumber : field;
  }
  return expectedType === "number" ? fallbackNumber : fallbackString;
};

module.exports.createProcurementOrder = asyncErrorHandler(async (req, res) => {
  try {
    const { session = "NA", procurementDetails = {} } = req.body;
    const { jformID = "" } = procurementDetails;
    if (!jformID)
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          message: _middleware.require("JForm ID"),
        })
      );
    const isExist = await eKharidHaryanaProcurementModel.findOne({
      "procurementDetails.jformID": jformID,
    });
    if (isExist)
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          message: _response_message.allReadyExist("JForm ID"),
        })
      );

    const procurement = {
      agencyName: extractField(procurementDetails.agencyName),
      commodityName: extractField(procurementDetails.commodityName),
      mandiName: extractField(procurementDetails.mandiName),
      gatePassWeightQtl: extractField(
        procurementDetails.gatePassWeightQtl,
        "number"
      ),
      farmerID: extractField(procurementDetails.farmerID),
      gatePassID: extractField(procurementDetails.gatePassID, "number"),
      gatePassDate: extractField(procurementDetails.gatePassDate),
      auctionID: extractField(procurementDetails.auctionID, "number"),
      auctionDate: extractField(procurementDetails.auctionDate),
      commisionAgentName: extractField(procurementDetails.commisionAgentName),
      jformID: extractField(procurementDetails.jformID, "number"),
      jformDate: extractField(procurementDetails.jformDate),
      JformFinalWeightQtl: extractField(
        procurementDetails.JformFinalWeightQtl,
        "number"
      ),
      totalBags: extractField(procurementDetails.totalBags, "number"),
      liftedDate: extractField(procurementDetails.liftedDate),
      destinationWarehouseName: extractField(
        procurementDetails.destinationWarehouseName
      ),
      receivedAtDestinationDate: extractField(
        procurementDetails.receivedAtDestinationDate
      ),
      jformApprovalDate: extractField(procurementDetails.jformApprovalDate),
    };

    const structuredData = {
      session: extractField(session),
      procurementDetails: procurement,
      paymentDetails: {},
    };

    try {
      const record = await eKharidHaryanaProcurementModel.create(
        structuredData
      );
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: record || [],
          message: _response_message.created(),
        })
      );
    } catch (err) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [err.errmsg],
          message: "Unable to save data",
        })
      );
    }
  } catch (error) {
    return res.status(400).send(
      new serviceResponse({
        status: 400,
        errors: [error],
        message: "Something went wrong",
      })
    );
  }
});
module.exports.createPaymentSlip = asyncErrorHandler(async (req, res) => {
  try {
    const {
      jformID,
      transactionId,
      transactionAmount,
      transactionDate,
      transactionStatus,
      reason,
    } = req.body;

    if (!jformID)
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          message: _middleware.require("JForm ID"),
        })
      );

    const existingRecord = await eKharidHaryanaProcurementModel.findOne({
      "procurementDetails.jformID": jformID,
    });

    // If no record is found
    if (!existingRecord) {
      return res.status(404).send(
        new serviceResponse({
          status: 404,
          message: "Record not found for given jformID",
        })
      );
    }

    // Check if paymentDetails exists
    const isPaymentDetailsPresent =
      existingRecord.paymentDetails !== null &&
      typeof existingRecord.paymentDetails === "object";

    // Prepare update data with fallback values
    const paymentUpdate = {
      "paymentDetails.jFormId": extractField(jformID, "number"),
      "paymentDetails.transactionId": extractField(transactionId),
      "paymentDetails.transactionAmount": extractField(
        transactionAmount,
        "number"
      ),
      "paymentDetails.transactionDate": extractField(transactionDate),
      "paymentDetails.transactionStatus": extractField(transactionStatus),
      "paymentDetails.reason": extractField(reason, "string", "NA"),
    };

    try {
      // If paymentDetails is missing, create it
      if (!isPaymentDetailsPresent) {
        await eKharidHaryanaProcurementModel.updateOne(
          { "procurementDetails.jformID": jformID },
          { $set: { paymentDetails: paymentUpdate.paymentDetails } }
        );
      } else {
        // Update existing paymentDetails
        await eKharidHaryanaProcurementModel.updateOne(
          { "procurementDetails.jformID": jformID },
          { $set: paymentUpdate }
        );
      }

      const updatedRecord = await eKharidHaryanaProcurementModel.findOne({
        "procurementDetails.jformID": jformID,
      });

      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: updatedRecord,
          message: _response_message.updated("Payment details"),
        })
      );
    } catch (err) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [err.errmsg],
          message: "Unable to save data",
        })
      );
    }
  } catch (error) {
    return res.status(400).send(
      new serviceResponse({
        status: 400,
        errors: [error],
        message: "Something went wrong",
      })
    );
  }
});
