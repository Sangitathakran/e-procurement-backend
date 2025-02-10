const {
  _handleCatchErrors,
  _generateOrderNumber,
  dumpJSONToExcel,
  handleDecimal,
} = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {
  _response_message,
  _middleware,
} = require("@src/v1/utils/constants/messages");

const {
  _associateOfferStatus,
  _procuredStatus,
  _batchStatus,
  _userType,
} = require("@src/v1/utils/constants");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { WhrModel } = require("@src/v1/models/app/whr/whrModel");
const moment = require("moment");

//create whr

const createWhr = async (req, res) => {
  try {

    const {

      whr_type,
      state,
      stateAgency,
      district,
      fpoPacks,
      Center,
      year,
      season,
      scheme,
      Commodity,
      warehouse,
      total_dispatch_quantity,
      total_dispatch_bag,
      total_accepted_quantity,
      total_accepted_bag,
      quantity_loss,
      bag_loss,
      quantity_gain,
      bag_gain,
      whr_date,
      whr_number,
      whr_document,
    } = req.body;
    console.log('req.file',req.files)
    const whrExist = await WhrModel.findOne({ whr_number });
    if (whrExist) {
      return res
        .status(200)
        .send(
          new serviceResponse({ status: 400, messsage: "Whr Already Exist" })
        );
    }
    const whrSave = await new WhrModel({
      whr_type,
      state,
      stateAgency,
      district,
      fpoPacks,
      Center,
      year,
      season,
      scheme,
      Commodity,
      warehouse,
      total_dispatch_quantity,
      total_dispatch_bag,
      total_accepted_quantity,
      total_accepted_bag,
      quantity_loss,
      bag_loss,
      quantity_gain,
      bag_gain,
      whr_date,
      whr_number,
      whr_document:req.files[0].originalname,
    }).save();
    if (whrSave) {
      return res
        .status(200)
        .send(
          new serviceResponse({
            status: 200,
            messsage: "Whr Created Successfully",
          })
        );
    } else {
    }
  } catch (err) {
    console.log("Error", err);
    _handleCatchErrors(err);
  }
};

const updateWhrById = async (req, res) => {
  try {
    const id = req.query;
    const {
      batch_id,
      whr_type,
      state,
      stateAgency,
      district,
      fpoPacks,
      Center,
      year,
      season,
      scheme,
      Commodity,
      warehouse,
      total_dispatch_quantity,
      total_dispatch_bag,
      total_accepted_quantity,
      total_accepted_bag,
      quantity_loss,
      bag_loss,
      quantity_gain,
      bag_gain,
      whr_date,
      whr_number,
      whr_document,
    } = req.validateData;
    let whrExist = await WhrModel.findOne({ whr_number });
    if (!whrExist) {
      return res
        .status(200)
        .send(
          new serviceResponse({ status: 400, messsage: "Whr Already Exist" })
        );
    }
    const whrUpdate = await findByIdAndUpdate(
      { id },
      {
        batch_id,
        whr_type,
        state,
        stateAgency,
        district,
        fpoPacks,
        Center,
        year,
        season,
        scheme,
        Commodity,
        warehouse,
        total_dispatch_quantity,
        total_dispatch_bag,
        total_accepted_quantity,
        total_accepted_bag,
        quantity_loss,
        bag_loss,
        quantity_gain,
        bag_gain,
        whr_date,
        whr_number,
        whr_document,
      }
    );
    if (whrUpdate) {
      return res
        .status(200)
        .send(
          new serviceResponse({
            status: 200,
            messsage: "Whr Updated Successfully",
          })
        );
    } else {
    }
  } catch (err) {
    console.log("Error", err);
    _handleCatchErrors(err);
  }
};

module.exports = {
  createWhr,
  updateWhrById,
};
