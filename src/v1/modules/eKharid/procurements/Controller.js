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
const { default: axios } = require("axios");
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

const KRSH_BWN_FMR_API = process.env.KRSH_BWN_FMR_API;

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
      mspRateMT: extractField(procurementDetails.mspRateMT, "number"),
    };

    const structuredData = {
      session: extractField(session),
      procurementDetails: procurement,
      paymentDetails: {},
      warehouseData: {},
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
      console.log(err);

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

module.exports.getLandData = async (req, res) => {
  try {
    // Extracting date from query params
    const { date } = req.query;

    // Validate if date is provided
    if (!date) {
      return res
        .status(400)
        .json({ message: "Date query parameter is required." });
    }

    const apiUrl = `${KRSH_BWN_FMR_API}?date=${encodeURIComponent(date)}`;

    // Fetching data from external API
    const response = await axios.post(apiUrl);

    console.log(response.data);

    // Sending back the fetched data
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching land data:", error.response.data.Message);
    res.status(error.response.status).json({
      message: "Error fetching land data",
      error: error.response.data.Message || error.message,
    });
  }
};

module.exports.updateWarehouseData = async (req, res) => {
  try {
    const {
      jformID,
      exitGatePassId,
      destinationAddress,
      warehouseName,
      warehouseId,
      inwardDate,
      truckNo,
      driverName,
      transporterName,
    } = req.body;

    if (!jformID) {
      return res
        .status(400)
        .json({ success: false, message: "jformID is required" });
    }

    const existingRecord = await eKharidHaryanaProcurementModel.findOne({
      "procurementDetails.jformID": jformID,
    });

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: "Record not found for given jformID",
      });
    }

    const warehouseUpdate = {
      "warehouseData.jformID": extractField(jformID, "number"),
      "warehouseData.exitGatePassId": extractField(exitGatePassId, "number"),
      "warehouseData.destinationAddress": extractField(destinationAddress),
      "warehouseData.warehouseName": extractField(warehouseName),
      "warehouseData.warehouseId": extractField(warehouseId),
      "warehouseData.inwardDate": extractField(inwardDate),
      "warehouseData.truckNo": extractField(truckNo),
      "warehouseData.driverName": extractField(driverName),
      "warehouseData.transporterName": extractField(transporterName),
    };

    const isWarehouseDataPresent =
      existingRecord.warehouseData !== null &&
      typeof existingRecord.warehouseData === "object";

    if (!isWarehouseDataPresent) {
      await eKharidHaryanaProcurementModel.updateOne(
        { "procurementDetails.jformID": jformID },
        { $set: { warehouseData: warehouseUpdate.warehouseData } }
      );
    } else {
      await eKharidHaryanaProcurementModel.updateOne(
        { "procurementDetails.jformID": jformID },
        { $set: warehouseUpdate }
      );
    }

    const updatedRecord = await eKharidHaryanaProcurementModel.findOne({
      "procurementDetails.jformID": jformID,
    });

    return res.status(200).json({
      success: true,
      message: "Warehouse data updated successfully",
      data: updatedRecord,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};
