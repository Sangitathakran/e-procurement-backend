const mongoose = require('mongoose');
const {_handleCatchErrors,_generateOrderNumber,dumpJSONToExcel} = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {_response_message,_middleware,_query,} = require("@src/v1/utils/constants/messages");
const { decryptJwtToken } = require('@src/v1/utils/helpers/jwt');
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { _associateOfferStatus, _whr_status, _batchStatus, _userType} = require("@src/v1/utils/constants");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");

const { WhrModel } = require("@src/v1/models/app/whr/whrModel");
const { WhrDetail } = require("@src/v1/models/app/whr/whrDetails");

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
    

    const getToken = req.headers.token || req.cookies.token;
    if (!getToken) {
        return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
    }

    const decode = await decryptJwtToken(getToken);
    const UserId = decode.data.user_id;

    const warehouseIds = [];
    const batchIds = [];

    if (!mongoose.Types.ObjectId.isValid(UserId)) {
        return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
    }
    const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
    const ownerwarehouseIds = warehouseDetails.map(id => new mongoose.Types.ObjectId(id));

    const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
        ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
        : ownerwarehouseIds;

    if (!finalwarehouseIds.length) {
        return res.status(200).send(new serviceResponse({
            status: 200,
            message: "No warehouses found for the user." 
        }));
    }
    
    const batchDetails = await Batch.find({ "warehousedetails_id": { $in: finalwarehouseIds } });
    const batchDetailsIds = batchDetails.map(id => new mongoose.Types.ObjectId(id));

    const finalBatchIds = Array.isArray(batchIds) && batchIds.length
        ? batchIds.filter(id => batchDetailsIds.includes(id))
        : batchDetailsIds;
    

    const whrExist = await WhrModel.findOne({ whr_number });
    if (whrExist) {
      return res
        .status(200)
        .send(
          new serviceResponse({ status: 400, message: "Whr Already Exist" })
        );
    }
    const whrSave = await new WhrModel({
      batch_id : finalBatchIds,
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

const whrList = async (req, res) => {
  try {
      const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = "" } = req.query;

      let query = {
        ...(search ? { "whr_type": { $regex: search, $options: "i" }, deleted: false } : { deleted: false })
      };
      

      const records = { count: 0, rows: [] };

      if (paginate == 1) {
          records.rows = await WhrModel.find(query)
              .sort(sortBy)
              .skip(parseInt(skip))
              .limit(parseInt(limit));

          records.count = await WhrModel.countDocuments(query);
          records.page = parseInt(page);
          records.limit = parseInt(limit);
          records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
      } else {
          records.rows = await WhrModel.find(query)
            .sort(sortBy);
      }

      return res.status(200).send(
          new serviceResponse({ status: 200, data: records, message: _response_message.found("WHR") })
      );
  } catch (error) {
      _handleCatchErrors(error, res);
  }
};

const getWhrById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.query.id)) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('id') }] }));
    }
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
    
    const getToken = req.headers.token || req.cookies.token;
    if (!getToken) {
        return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
    }

    const decode = await decryptJwtToken(getToken);
    const UserId = decode.data.user_id;

    const warehouseIds = [];
    const batchIds = [];

    if (!mongoose.Types.ObjectId.isValid(UserId)) {
        return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
    }
    const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
    const ownerwarehouseIds = warehouseDetails.map(id => new mongoose.Types.ObjectId(id));

    const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
        ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
        : ownerwarehouseIds;

    if (!finalwarehouseIds.length) {
        return res.status(200).send(new serviceResponse({
            status: 200,
            message: "No warehouses found for the user." 
        }));
    }
    
    const batchDetails = await Batch.find({ "warehousedetails_id": { $in: finalwarehouseIds } });
    const batchDetailsIds = batchDetails.map(id => new mongoose.Types.ObjectId(id));

    const finalBatchIds = Array.isArray(batchIds) && batchIds.length
        ? batchIds.filter(id => batchDetailsIds.includes(id))
        : batchDetailsIds;
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
        batch_id : finalBatchIds,
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

      const getToken = req.headers.token || req.cookies.token;
    if (!getToken) {
        return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
    }

    const decode = await decryptJwtToken(getToken);
    const UserId = decode.data.user_id;

    const warehouseIds = [];
    const batchIds = [];

    if (!mongoose.Types.ObjectId.isValid(UserId)) {
        return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
    }
    const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
    const ownerwarehouseIds = warehouseDetails.map(id => new mongoose.Types.ObjectId(id));

    const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
        ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
        : ownerwarehouseIds;

    if (!finalwarehouseIds.length) {
        return res.status(200).send(new serviceResponse({
            status: 200,
            message: "No warehouses found for the user." 
        }));
    }
    
    
      let query = {
          "warehousedetails_id": { $in: finalwarehouseIds},
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
      record.rows = await Batch.findOne({ _id: batch_id }).select({ _id: 1, farmerOrderIds: 1, batchId: 1,  "delivered.delivered_at" : 1  }).populate({ path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" });

      if (!record) {
          return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
      }

      return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Lot") }));

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
      const { batch_id,farmerOrder_id, accepted_quantity, accepted_bags, rejected_quantity, rejected_bags, gain_quantity, gain_bags } = data;

      if (!mongoose.Types.ObjectId.isValid(batch_id)) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('batch_id') }] }));
      }

      const batch = await Batch.findById(batch_id);
      if (!batch) {
        return res.status(404).send(new serviceResponse({ status: 404, errors: [{ message: "Batch not found." }] }));
      }

      const batch_date = batch.dispatched?.dispatched_at;
      const batchId = batch._id;
      const parsedAcceptedQuantity = parseInt(accepted_quantity) || 0;
      const parsedAcceptedBag = parseInt(accepted_bags) || 0;
      const parsedRejectedQuantity = parseInt(rejected_quantity) || 0;
      const parsedRejectedBag = parseInt(rejected_bags) || 0;
      const parsedQuantityGain = parseInt(gain_quantity) || 0;
      const parsedBagGain = parseInt(gain_bags) || 0;
      
      const whrDetails = await WhrModel.findOne({ "batch_id":batchId  });
      const farmerOrder = batch.farmerOrderIds.find(
        (order) => order.farmerOrder_id.toString() === farmerOrder_id
      );

      if (!farmerOrder) {
        return res.status(404).send(new serviceResponse({ status: 404, errors: [{ message: "Farmer order not found in the batch." }] }));
      }

      farmerOrder.rejected_quantity = parsedRejectedQuantity;
      farmerOrder.rejected_bags = parsedRejectedBag;
      farmerOrder.gain_quantity = parsedQuantityGain;
      farmerOrder.gain_bags = parsedBagGain;
      farmerOrder.accepted_quantity = parsedAcceptedQuantity;
      farmerOrder.accepted_bags = parsedAcceptedBag;

      await batch.save();


      const lotDetails = batch.farmerOrderIds.map(lot => ({
        whr_id: whrDetails._id,
        batch_date,
        batch_id: batchId,
        lot_id: lot.farmerOrder_id,
        farmer_name: "Raju",
        dispatch_quantity: lot.qty,
        dispatch_bag: 2,
        accepted_quantity: parsedAcceptedQuantity,
        accepted_bags: parsedAcceptedBag,
        rejected_quantity: parsedRejectedQuantity,
        rejected_bags: parsedRejectedBag,
        gain_quantity: parsedQuantityGain,
        gain_bags: parsedBagGain
      }));

      for (const lot of lotDetails) {
        const WhrDetailData = new WhrDetail(lot);
        await WhrDetailData.save();
      }
      
    }

    return res.status(200).send(new serviceResponse({ status: 200, message: "WHR Lot details updated successfully." }));
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

const whrLotDetailsUpdate = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Request body should be an array." }] }));
    }

    for (const data of req.body) {
      const { batch_id, farmerOrder_id, accepted_quantity, accepted_bags, rejected_quantity, rejected_bags, gain_quantity, gain_bags } = data;

      if (!mongoose.Types.ObjectId.isValid(batch_id)) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('batch_id') }] }));
      }

      const batch = await Batch.findById(batch_id);
      if (!batch) {
        return res.status(404).send(new serviceResponse({ status: 404, errors: [{ message: "Batch not found." }] }));
      }

      const batch_date = batch.dispatched?.dispatched_at;
      const batchId = batch._id;

      const parsedAcceptedQuantity = parseInt(accepted_quantity) || 0;
      const parsedAcceptedBag = parseInt(accepted_bags) || 0;
      const parsedRejectedQuantity = parseInt(rejected_quantity) || 0;
      const parsedRejectedBag = parseInt(rejected_bags) || 0;
      const parsedQuantityGain = parseInt(gain_quantity) || 0;
      const parsedBagGain = parseInt(gain_bags) || 0;

      const whrDetails = await WhrModel.findOne({ batch_id: batchId });
      if (!whrDetails) {
        return res.status(404).send(new serviceResponse({ status: 404, errors: [{ message: "WHR details not found for the batch." }] }));
      }
      
      const farmerOrder = batch.farmerOrderIds.find(
        (order) => order.farmerOrder_id.toString() === farmerOrder_id
      );

      if (!farmerOrder) {
        return res.status(404).send(new serviceResponse({ status: 404, errors: [{ message: "Farmer order not found in the batch." }] }));
      }

      farmerOrder.rejected_quantity = parsedRejectedQuantity;
      farmerOrder.rejected_bags = parsedRejectedBag;
      farmerOrder.gain_quantity = parsedQuantityGain;
      farmerOrder.gain_bags = parsedBagGain;
      farmerOrder.accepted_quantity = parsedAcceptedQuantity;
      farmerOrder.accepted_bags = parsedAcceptedBag;

      await batch.save();

      const lotDetails = batch.farmerOrderIds.map(lot => ({
        whr_id: whrDetails._id,
        batch_date,
        batch_id: batchId,
        lot_id: lot.farmerOrder_id,
        farmer_name: "Raju",
        dispatch_quantity: lot.qty,
        dispatch_bag: 2,
        accepted_quantity: parsedAcceptedQuantity,
        accepted_bags: parsedAcceptedBag,
        rejected_quantity: parsedRejectedQuantity,
        rejected_bags: parsedRejectedBag,
        gain_quantity: parsedQuantityGain,
        gain_bags: parsedBagGain
      }));

      for (const lot of lotDetails) {
        await WhrDetail.updateOne(
          { batch_id: lot.batch_id, lot_id: lot.lot_id },
          { $set: lot },
          { upsert: true }
        );
      }
    }

    return res.status(200).send(new serviceResponse({ status: 200, message: "WHR Lot details updated successfully." }));
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

const listWarehouseDropdown = async (req, res) => {
  try {
    
    const getToken = req.headers.token || req.cookies.token;
    if (!getToken) {
        return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
    }

    const decode = await decryptJwtToken(getToken);
    const UserId = decode.data.user_id;

    const warehouseIds = [];
    
    if (!mongoose.Types.ObjectId.isValid(UserId)) {
        return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
    }
    const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
    const ownerwarehouseIds = warehouseDetails.map(id => new mongoose.Types.ObjectId(id));
    
    const wareHouseData = warehouseDetails.map(data => ({
      warehouseName: data.basicDetails.warehouseName,
      wareHouseId: data._id,
      wareHouseCode: data.wareHouse_code
    }));
    
    const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
        ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
        : ownerwarehouseIds;
    
    if (!finalwarehouseIds.length) {
        return res.status(200).send(new serviceResponse({
            status: 200,
            message: "No warehouses found for the user." 
        }));
    }

    const data = { warehouses: wareHouseData}
    
    return res.status(200).send(new serviceResponse({ status: 200, data: data, message: _response_message.found("data") }));

} catch (error) {
    _handleCatchErrors(error, res);
}
};

const listWHRForDropdown = async (req, res) => {
  try {
    const {wareHouseId} = req.params;
    const getToken = req.headers.token || req.cookies.token;
    if (!getToken) {
        return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
    }

    const decode = await decryptJwtToken(getToken);
    const UserId = decode.data.user_id;

    const batchIds = [];

    if (!mongoose.Types.ObjectId.isValid(UserId)) {
        return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
    }
  
    let query = {
      "warehousedetails_id": { $in: wareHouseId},
    };
    
    const batchDetails = await Batch.find(query).select('_id req_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by status procurementCenter_id');
    
    const procurementCenterIds = batchDetails.map(data => data.procurementCenter_id);
    const requestIds = batchDetails.map(data => data.req_id);
    
    const procurementDetails = await ProcurementCenter.find({ "_id": { $in: procurementCenterIds } });
    const commodityDetails = await RequestModel.find({ "_id": { $in: requestIds } });
    

    const procurementCenterNames = procurementDetails.map(data => ({
      procurementCenterId: data._id,
      centerName: data.center_name,
      address: {
        stateName: data.address.state,
        districtName: data.address.district,
        cityName: data.address.city,
        pinCode: data.address.postalCode
      }
    }));

    const commodityNames = commodityDetails.map(data => ({
      commodityName: data.product.name,
    }));


    const data = {
      batchDetails : batchDetails,
      procurementCenters: procurementCenterNames,
      commodityNames : commodityNames
    }
    
    return res.status(200).send(new serviceResponse({ status: 200, data: data, message: _response_message.found("data") }));

} catch (error) {
    _handleCatchErrors(error, res);
}
};

const deleteWhr = async (req, res) => {
  try {
      const { whrId } = req.body;

      if (!whrId) {
          return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require('whrId') }));
      }
      const response = await WhrModel.findOneAndUpdate(
          { _id: whrId, deleted: false },
          { $set: { deleted: true, status: _whr_status.deleted } },
          { new: true }
      );

      if (!response) {
          return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('WHR') }));
      } else {
          return res.status(200).send(new serviceResponse({ status: 200, message: _query.delete("WHR"), data: response }));
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
  lotLevelDetailsUpdate,
  whrList,
  listWHRForDropdown,
  deleteWhr,
  listWarehouseDropdown,
  whrLotDetailsUpdate
};
