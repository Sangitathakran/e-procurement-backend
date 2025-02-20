const {
  _handleCatchErrors,
  _generateOrderNumber,
  dumpJSONToExcel,
  handleDecimal,
} = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const mongoose = require('mongoose');
const {
  _response_message,
  _middleware,
  _query,
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
    // console.log("req.file", whr_type);
    const whrExist = await WhrModel.findOne({ whr_number });
    if (whrExist) {
      return res
        .status(200)
        .send(
          new serviceResponse({ status: 400, message: "Whr Already Exist" })
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
      whr_document,
    }).save();
    
    if (whrSave) {
      return res.status(200).send(new serviceResponse({ message: _query.add('WHR'), data: whrSave }));
    }
  } catch (err) {
    console.log("Error", err);
    _handleCatchErrors(err);
  }
};
const getWhrById = async (req, res) => {
  try {
    const whrDetails = await WhrModel.findById(req.query.id);
    if (whrDetails) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          messsage: "Whr details get Successfully",
          data: whrDetails,
        })
      );
    } else {
      return res
        .status(200)
        .send(
          new serviceResponse({ status: 404, message: "Whr Details not found" })
        );
    }
  } catch (err) {
    console.log("Error", err);
    _handleCatchErrors(err);
  }
};

const updateWhrById = async (req, res) => {
  try {
    const {id} = req.params;
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
    } = req.body;
    let whrExist = await WhrModel.findOne({ whr_number });
    if (!whrExist) {
      return res
        .status(200)
        .send(
          new serviceResponse({ status: 400, messsage: "Whr Already Exist" })
        );
    }
    const whrUpdate = await WhrModel.findByIdAndUpdate(id,
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
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: "Whr Updated Successfully",
        })
      );
    } else {
      return res
      .status(200)
      .send(
        new serviceResponse({ status: 400, messsage: "Something went wrong" })
      );
    }
  } catch (err) {
    console.log("Error", err);
    _handleCatchErrors(err);
  }
};

const batchList = async (req, res) => {

  try {
      const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, isExport = 0 } = req.query


      let query = {
          // associateOffer_id,
          // ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
      };

      const records = { count: 0 };

      records.rows = paginate == 1 ? await Batch.find(query)
          .sort(sortBy)
          .skip(skip)
          .select('_id req_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by status')
          .limit(parseInt(limit)) : await Batch.find(query)
              .select('_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by status')
              .sort(sortBy);

      records.count = await Batch.countDocuments(query);


      if (paginate == 1) {
          records.page = page
          records.limit = limit
          records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
      }

      if (isExport == 1) {

          const record = records.rows.map((item) => {

              return {
                  "Batch Id": item?.batchId || "NA",
                  "Delivery Date": item?.delivered.delivered_at || "NA",
                  "Payment Due Date": item?.payement_approval_at || "NA",
                  "Quantity Purchased": item?.qty || "NA",
                  "Amount Payable": item?.totalPrice || "NA",
                  "Payment Status": item?.status || "NA",
              }
          })

          if (record.length > 0) {

              dumpJSONToExcel(req, res, {
                  data: record,
                  fileName: `Batch-${'Batch'}.xlsx`,
                  worksheetName: `Batch-record-${'Batch'}`
              });
          } else {
              return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Batch") }))
          }

      } else {
          return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Dispatch') }))
      }

  } catch (error) {
      _handleCatchErrors(error, res);
  }
}

const lotList = async (req, res) => {

  try {
      const { batch_id } = req.query;
    
      const record = {}
      record.rows = await Batch.findOne({ _id: batch_id }).select({ _id: 1, farmerOrderIds: 1 }).populate({ path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" });

      if (!record) {
          return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
      }

      return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Farmer") }));


  } catch (error) {
      _handleCatchErrors(error, res);
  }
}


const lotLevelDetailsUpdate = async (req, res) => {

  try {
      if (!Array.isArray(req.body)) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Request body should be an array." }] }));
      }

      
      for (const data of req.body) {
        const { batch_id, accepted_quantity, accepted_bag, rejected_quantity, rejected_bag, quantity_gain, bag_gain } = data;

        if (!mongoose.Types.ObjectId.isValid(batch_id)) {
          return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('batch_id') }] }));
        }

        const batch = await Batch.findById(batch_id);
        if (!batch) {
          return res.status(404).send(new serviceResponse({ status: 404, errors: [{ message: "Batch not found." }] }));
        }
        
        const batch_date = batch.dispatched.dispatched_at;
        const batchId = batch._id;
        for (const lotdata of batch.farmerOrderIds) {
            const lotIds = lotdata.farmerOrder_id;
            const dispatch_quantity = lotdata.qty;
            
        }
        const dispatch_bag = '';
        const dataUpdate = {
          batch_date : batch_date,
          batch_id : batchId,
          lot_id : lotIds,
          farmer_name : "test",
          dispatch_quantity : dispatch_quantity,
          dispatch_bag : 2,
          accepted_quantity,
          accepted_bag,
          rejected_quantity,
          rejected_bag,
          quantity_gain,
          bag_gain
        }
        const whrData = await WhrModel.findOne({batch_id : batchId} );
        if (!whrData) {
          return res.status(404).send(new serviceResponse({ status: 404, errors: [{ message: "whrData not found." }] }));
        }
        whrData.save(dataUpdate)
    }

  } catch (error) {
      _handleCatchErrors(error, res);
  }
}

module.exports = {
  createWhr,
  updateWhrById,
  getWhrById,
  batchList,
  lotList,
  lotLevelDetailsUpdate
};
