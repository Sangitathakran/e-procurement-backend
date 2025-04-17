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
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
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
    const UserId = decode.data.organization_id;
    
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
    const UserId = decode.data.organization_id;

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
    const UserId = decode.data.organization_id;

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
      record.rows = await Batch.findOne({ _id: batch_id })
      .select({ _id: 1, farmerOrderIds: 1, batchId: 1,  "delivered.delivered_at" : 1, dispatched: 1  })
      .populate({
          path: "farmerOrderIds.farmerOrder_id",
          select: "metaData.name order_no farmer_id",
          populate: {
              path: "farmer_id",
              select: "name"
          }
      });

      if (!record) {
          return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
      }

      return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Lot") }));

  } catch (error) {
      _handleCatchErrors(error, res);
  }
}


// const lotLevelDetailsUpdate = async (req, res) => {
//   try {
//     if (!Array.isArray(req.body)) {
//       return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Request body should be an array." }] }));
//     }

//     for (const data of req.body) {
//       const { batch_id,farmerOrder_id, accepted_quantity, accepted_bags, rejected_quantity, rejected_bags, gain_quantity, gain_bags } = data;

//       if (!mongoose.Types.ObjectId.isValid(batch_id)) {
//         return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('batch_id') }] }));
//       }

//       const batch = await Batch.findById(batch_id);
//       if (!batch) {
//         return res.status(404).send(new serviceResponse({ status: 404, errors: [{ message: "Batch not found." }] }));
//       }

//       const batch_date = batch.dispatched?.dispatched_at;
//       const batchId = batch._id;
//       const parsedAcceptedQuantity = parseInt(accepted_quantity) || 0;
//       const parsedAcceptedBag = parseInt(accepted_bags) || 0;
//       const parsedRejectedQuantity = parseInt(rejected_quantity) || 0;
//       const parsedRejectedBag = parseInt(rejected_bags) || 0;
//       const parsedQuantityGain = parseInt(gain_quantity) || 0;
//       const parsedBagGain = parseInt(gain_bags) || 0;
      
//       const whrDetails = await WhrModel.findOne({ "batch_id":batchId  });
//       const farmerOrder = batch.farmerOrderIds.find(
//         (order) => order.farmerOrder_id.toString() === farmerOrder_id
//       );

//       if (!farmerOrder) {
//         return res.status(404).send(new serviceResponse({ status: 404, errors: [{ message: "Farmer order not found in the batch." }] }));
//       }

//       farmerOrder.rejected_quantity = parsedRejectedQuantity;
//       farmerOrder.rejected_bags = parsedRejectedBag;
//       farmerOrder.gain_quantity = parsedQuantityGain;
//       farmerOrder.gain_bags = parsedBagGain;
//       farmerOrder.accepted_quantity = parsedAcceptedQuantity;
//       farmerOrder.accepted_bags = parsedAcceptedBag;

//       await batch.save();


//       const lotDetails = batch.farmerOrderIds.map(lot => ({
//         whr_id: whrDetails._id,
//         batch_date,
//         batch_id: batchId,
//         lot_id: lot.farmerOrder_id,
//         farmer_name: "Raju",
//         dispatch_quantity: lot.qty,
//         dispatch_bag: 2,
//         accepted_quantity: parsedAcceptedQuantity,
//         accepted_bags: parsedAcceptedBag,
//         rejected_quantity: parsedRejectedQuantity,
//         rejected_bags: parsedRejectedBag,
//         gain_quantity: parsedQuantityGain,
//         gain_bags: parsedBagGain
//       }));

//       for (const lot of lotDetails) {
//         const WhrDetailData = new WhrDetail(lot);
//         await WhrDetailData.save();
//       }
      
//     }

//     return res.status(200).send(new serviceResponse({ status: 200, message: "WHR Lot details updated successfully." }));
//   } catch (error) {
//     _handleCatchErrors(error, res);
//   }
// };


const lotLevelDetailsUpdate = async (req, res) => {
  try {
    const {
      warehouse, state, district, fpoPacks, batch_id, scheme, Commodity,
      whr_date, whr_number, total_accepted_quantity, total_accepted_bag,
      total_quantity_loss, total_bag_loss, total_quantity_gain, total_bag_gain,
      whr_type,whr_document, rows
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(batch_id)) {
      return res.status(400).send(new serviceResponse({
        status: 400,
        errors: [{ message: "Invalid batch_id in request." }]
      }));
    }

    const batch = await Batch.findById(batch_id).lean();
    if (!batch) {
      return res.status(404).send(new serviceResponse({
        status: 404,
        errors: [{ message: `Batch not found for batch_id: ${batch_id}` }]
      }));
    }

    let whrDetails = await WhrModel.findOne({ batch_id });
    console.log('whrDetails',whrDetails)
    // const whr_document = rows.length > 0 ? rows[0].whr_document || null : null;
    const lotDetailsBulkInsert = [];

    const whr_status = whr_type ? _whr_status.completed : _whr_status.pending;
    
    // WHR document exists, update it
    if (whrDetails) {
      await WhrModel.findByIdAndUpdate(whrDetails._id, {
        warehouse, state, district, fpoPacks, scheme, Commodity,
        whr_date, whr_number, total_accepted_quantity, total_accepted_bag,
        total_quantity_loss, total_bag_loss, total_quantity_gain, total_bag_gain,
        whr_type, whr_document
      });
    } else {
      // Create a new WHR document if it does not exist
      whrDetails = await new WhrModel({
        batch_id, warehouse, state, district, fpoPacks, scheme, Commodity,
        whr_date, whr_number, total_accepted_quantity, total_accepted_bag,
        total_quantity_loss, total_bag_loss, total_quantity_gain, total_bag_gain,
        whr_type, whr_document
      }).save();
    }

    for (const row of rows) {
      const {
        lot_id, farmer_name, quantity_purchase, dispatch_date, dispatch_quantity,
        dispatch_bags, accepted_quantity, accepted_bags, rejected_quantity, rejected_bags,
        quantity_gain, bag_gain
      } = row;

      const farmerOrder = batch.farmerOrderIds.find(order => order.farmerOrder_id.toString() === lot_id);
      if (!farmerOrder) {
        return res.status(404).send(new serviceResponse({
          status: 404,
          errors: [{ message: `Farmer order not found in batch for lot_id: ${lot_id}` }]
        }));
      }

      farmerOrder.rejected_quantity = parseInt(rejected_quantity) || 0;
      farmerOrder.rejected_bags = parseInt(rejected_bags) || 0;
      farmerOrder.gain_quantity = parseInt(quantity_gain) || 0;
      farmerOrder.gain_bags = parseInt(bag_gain) || 0;
      farmerOrder.accepted_quantity = parseInt(accepted_quantity) || 0;
      farmerOrder.accepted_bags = parseInt(accepted_bags) || 0;
      farmerOrder.dispatch_quantity = parseInt(dispatch_quantity) || 0;
      farmerOrder.dispatch_bags = parseInt(dispatch_bags) || 0;

      lotDetailsBulkInsert.push({
        whr_id: whrDetails._id,
        batch_date: dispatch_date,
        batch_id: batch._id,
        farmerOrder_id: lot_id,
        farmer_name,
        dispatch_quantity: parseInt(dispatch_quantity) || 0,
        dispatch_bag: parseInt(dispatch_bags) || 0,
        accepted_quantity: parseInt(accepted_quantity) || 0,
        accepted_bags: parseInt(accepted_bags) || 0,
        rejected_quantity: parseInt(rejected_quantity) || 0,
        rejected_bags: parseInt(rejected_bags) || 0,
        gain_quantity: parseInt(quantity_gain) || 0,
        gain_bags: parseInt(bag_gain) || 0,
        // whr_document: whr_document || "default-doc.png",
      });
    }

    // await Batch.findByIdAndUpdate(batch_id, { farmerOrderIds: batch.farmerOrderIds });
    await Batch.findByIdAndUpdate(batch_id, { 
      farmerOrderIds: batch.farmerOrderIds,
      whr_status
    });
    if (lotDetailsBulkInsert.length) {
      await WhrDetail.insertMany(lotDetailsBulkInsert);
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
    const UserId = decode.data.organization_id;

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
    const UserId = decode.data.organization_id;
    // console.log('wareHouseId',wareHouseId);
    console.log('userId-->', UserId)
    const batchIds = [];

    if (!mongoose.Types.ObjectId.isValid(UserId)) {
        return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
    }
  
    let query = {
      "warehousedetails_id": { $in: wareHouseId},
    };
    
    const batchDetails = await Batch.find(query)
          .populate({
            path: "req_id",
            select: "product.schemeId",
            populate: {
                path: "product.schemeId",
                model: "Scheme",
                select: "schemeName",
            },
        })
        .populate("warehousedetails_id", "basicDetails.warehouseName wareHouse_code")
        .select('_id req_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by status procurementCenter_id');
    // console.log('batchDetails',batchDetails);
    const procurementCenterIds = batchDetails.map(data => data.procurementCenter_id);
    const requestIds = batchDetails.map(data => data.req_id);
    const batchIdsList = batchDetails.map(data => data._id);
    
    const procurementDetails = await ProcurementCenter.find({ "_id": { $in: procurementCenterIds } });
    
    const commodityDetails = await RequestModel.find({ "_id": { $in: requestIds } });
    
    // const whrModelData = await WhrModel.findOne({ "batch_id": batchIdsList  });
    const whrModelData = await WhrModel.findOne({ batch_id: { $in: batchIdsList } });
    // console.log('batchIdsList',batchIdsList);
    console.log('whrModelData',whrModelData);
    

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
      commodityNames : commodityNames,
      whr_date : whrModelData?.whr_date || null,
      whr_number: whrModelData?.whr_number || null,
      whr_document: whrModelData?.whr_document || null
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

// const getWarehouseManagementList = asyncErrorHandler(async (req, res) => {
  
//     const { page = 1, limit = 10, sortBy = "createdAt", search = '', isExport = 0, status, productName, warehouse_name } = req.query;
//     const { warehouseIds = [] } = req.body;

//     try { 
//         const getToken = req.headers.token || req.cookies.token;
//         if (!getToken) {
//             return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
//         }

//         const decode = await decryptJwtToken(getToken);
//         const UserId = decode.data.user_id;

//         if (!mongoose.Types.ObjectId.isValid(UserId)) {
//             return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
//         }

//         const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: new mongoose.Types.ObjectId(UserId) });
//         const ownerwarehouseIds = warehouseDetails.map(id => new mongoose.Types.ObjectId(id));
 
//         const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
//             ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
//             : ownerwarehouseIds;
        
//         if (!finalwarehouseIds.length) {
//             return res.status(200).send(new serviceResponse({
//                 status: 200,
//                 data: { records: { rows: [], count: 0, page, limit, pages: 0 }, message: "No warehouses found for the user." }
//             }));
//         }

//         const searchRegex = search ? new RegExp(search, 'i') : null;

//         const pipeline = [
//             {
//                 $lookup: {
//                     from: 'warehousedetails',
//                     localField: 'warehousedetails_id',
//                     foreignField: '_id',
//                     as: 'warehousedetails_id'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'procurementcenters',
//                     localField: 'procurementCenter_id',
//                     foreignField: '_id',
//                     as: 'procurementCenter_id'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'users',
//                     localField: 'seller_id',
//                     foreignField: '_id',
//                     as: 'seller_id'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'requests',
//                     localField: 'req_id',
//                     foreignField: '_id',
//                     as: 'req_id'
//                 }
//             },
            

//             { $unwind: { path: "$req_id", preserveNullAndEmptyArrays: true } },
//             { $unwind: { path: "$warehousedetails_id", preserveNullAndEmptyArrays: true } },
//             { $unwind: { path: "$procurementCenter_id", preserveNullAndEmptyArrays: true } },
//             { $unwind: { path: "$seller_id", preserveNullAndEmptyArrays: true } },
//             {
//                 $match: {
//                    "warehousedetails_id._id": { $in: finalwarehouseIds },
//                    ...(warehouse_name && { "warehousedetails_id.basicDetails.warehouseName": warehouse_name }),
                 
//                     ...(search && searchRegex && {
//                         $or: [
//                             { batchId: { $regex: searchRegex } },
//                             { "seller_id.basic_details.associate_details.associate_name": { $regex: searchRegex } },
//                             { "seller_id.basic_details.associate_details.organization_name": { $regex: searchRegex } },
//                             { "procurementCenter_id.center_name": { $regex: searchRegex } },
//                             { "warehousedetails_id.wareHouse_code": { $regex: searchRegex } },
//                         ]
//                     }),
//                     ...(status && {
//                         "final_quality_check.status": status
//                     }),
//                     ...(productName && { "req_id.product.name": productName})
//                 }
//             },
//             {
//                 $project: {
//                     batchId: 1,
//                     qty: 1,
//                     received_on: 1,
//                     qc_report: 1,
//                     wareHouse_code: 1,
//                     //status: 1,
//                     commodity: 1,

//                     "final_quality_check.status":1,
//                     "final_quality_check.product_images":1,
//                     "final_quality_check.qc_images":1,
//                     "final_quality_check.rejected_reason":1,
//                     "final_quality_check.whr_receipt":1,
//                     "final_quality_check.whr_receipt_image":1,
//                     "req_id.product.name":1,
//                     "req_id._id":1,
//                     "req_id.deliveryDate":1,
//                     "receiving_details.received_on": 1,
//                     "receiving_details.vehicle_details": 1,
//                     "receiving_details.document_pictures": 1,
//                     "receiving_details.bag_weight_per_kg": 1,
//                     "receiving_details.no_of_bags": 1,
//                     "receiving_details.quantity_received": 1,
//                     "receiving_details.truck_photo": 1,
//                     "final_quality_check.whr_receipt": 1,
//                     "warehousedetails_id.basicDetails.warehouseName": 1,
//                     "warehousedetails_id.wareHouse_code": 1,
//                     "warehousedetails_id._id": 1,
//                     "procurementCenter_id.center_name": 1,
//                     "procurementCenter_id._id": 1,
//                     "seller_id.basic_details.associate_details.associate_name": 1,
//                     "seller_id.basic_details.associate_details.organization_name": 1,
//                     "seller_id._id": 1,
//                     wareHouse_approve_status: 1,
//                     createdAt: 1,
//                     farmerOrderIds: {
//                       $map: {
//                           input: "$farmerOrderIds",
//                           as: "farmerOrder",
//                           in: {
//                               farmerOrder_id: "$$farmerOrder.farmerOrder_id",
//                               qty: "$$farmerOrder.qty",
//                               amt: "$$farmerOrder.amt",
//                               rejected_quantity: "$$farmerOrder.rejected_quantity",
//                               rejected_bags: "$$farmerOrder.rejected_bags",
//                               gain_quantity: "$$farmerOrder.gain_quantity",
//                               gain_bags: "$$farmerOrder.gain_bags",
//                               accepted_quantity: "$$farmerOrder.accepted_quantity",
//                               accepted_bags: "$$farmerOrder.accepted_bags"
//                           }
//                       }
//                   }
//                 }
//             },
//             { $sort: { [sortBy]: 1 } },
//             { $skip: (page - 1) * limit },
//             { $limit: parseInt(limit) }
//         ];

//         const rows = await Batch.aggregate(pipeline);
//         const totalCountPipeline = [
//             {
//                 $lookup: {
//                     from: 'warehousedetails',
//                     localField: 'warehousedetails_id',
//                     foreignField: '_id',
//                     as: 'warehousedetails_id'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'procurementcenters',
//                     localField: 'procurementCenter_id',
//                     foreignField: '_id',
//                     as: 'procurementCenter_id'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'users',
//                     localField: 'seller_id',
//                     foreignField: '_id',
//                     as: 'seller_id'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'requests',
//                     localField: 'req_id',
//                     foreignField: '_id',
//                     as: 'req_id'
//                 }
//             },
//             { $unwind: { path: "$req_id", preserveNullAndEmptyArrays: true } },
//             { $unwind: { path: "$warehousedetails_id", preserveNullAndEmptyArrays: true } },
//             { $unwind: { path: "$procurementCenter_id", preserveNullAndEmptyArrays: true } },
//             { $unwind: { path: "$seller_id", preserveNullAndEmptyArrays: true } },
//             {
//                 $match: {
//                     "warehousedetails_id._id": { $in: finalwarehouseIds },
//                     ...(warehouse_name && { "warehousedetails_id.basicDetails.warehouseName": warehouse_name }),
//                     wareHouse_approve_status: 'Received',
//                     ...(search && searchRegex && {
//                         $or: [
//                             { batchId: { $regex: searchRegex } },
//                             { "seller_id.basic_details.associate_details.associate_name": { $regex: searchRegex } },
//                             { "seller_id.basic_details.associate_details.organization_name": { $regex: searchRegex } },
//                             { "procurementCenter_id.center_name": { $regex: searchRegex } },
//                             { "warehousedetails_id.wareHouse_code": { $regex: searchRegex } },
//                         ]
//                     }),
//                     ...(status && {
//                         "final_quality_check.status": status
//                     }),
//                     ...(productName && { "req_id.product.name": productName })
//                 }
//             },
//             { $count: "totalCount" }
//         ];
        
//         const totalCountResult = await Batch.aggregate(totalCountPipeline);
//         const totalCount = totalCountResult.length > 0 ? totalCountResult[0].totalCount : 0;
        
//         const query = {
//             "warehousedetails_id._id": { $in: finalwarehouseIds },
//             ...(warehouse_name && { "warehousedetails_id.basicDetails.warehouseName": warehouse_name }),
//             wareHouse_approve_status: 'Received',
//             ...(search && searchRegex && {
//                 $or: [
//                     { batchId: { $regex: searchRegex } },
//                     { "seller_id.basic_details.associate_details.associate_name": { $regex: searchRegex } },
//                     { "seller_id.basic_details.associate_details.organization_name": { $regex: searchRegex } },
//                     { "procurementCenter_id.center_name": { $regex: searchRegex } },
//                     { "warehousedetails_id.wareHouse_code": { $regex: searchRegex } },
//                 ]
//             }),
//             ...(status && {
//                 "final_quality_check.status": status
//             }),
//             ...(productName && { "req_id.product.name": productName})
//         };

//         // Export functionality
//         if (isExport == 1) {
//             const exportData = rows.map(item => ({
//                 "Batch ID": item.batchId || 'NA',
//                 "Associate Name": item.seller_id?.basic_details?.associate_details?.associate_name || 'NA',
//                 "Organization Name": item.seller_id?.basic_details?.associate_details?.organization_name || 'NA',
//                 "Procurement Center": item.procurementCenter_id?.center_name || 'NA',
//                 "Warehouse": item.warehousedetails_id?.basicDetails?.warehouseName || 'NA',
//                 "Quantity": item.qty || 'NA',
//                 "Status": item.wareHouse_approve_status || 'NA'
//             }));

//             if (exportData.length) {
//                 return dumpJSONToExcel(req, res, {
//                     data: exportData,
//                     fileName: `Warehouse-Batches.xlsx`,
//                     worksheetName: `Batches`
//                 });
//             }
//             return res.status(200).send(new serviceResponse({ status: 200, message: "No data available for export" }));
//         }

//         return res.status(200).send(new serviceResponse({
//             status: 200,
//             data: {
//                 records: {
//                     rows,
//                     count: totalCount,
//                     page,
//                     limit,
//                     pages: Math.ceil(totalCount / limit),
//                 }
//             },
//             message: "Warehouse Management List fetched successfully"
//         }));

//     } catch (error) {
//         console.error(error);
//         return res.status(500).send(new serviceResponse({ status: 500, message: "Error fetching batches", error: error.message }));
//     }
// });

  // 67b57284054396b7ff9cbfce

const getWarehouseManagementList = asyncErrorHandler(async (req, res) => {
  const { page = 1, limit = 10, sortBy = "createdAt", search = '', isExport = 0, status,batch_code, productName, warehouse_name } = req.query;
  const { warehouseIds = [] } = req.body;

  try {
      const getToken = req.headers.token || req.cookies.token;
      if (!getToken) {
          return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
      }

      const decode = await decryptJwtToken(getToken);
      const UserId = decode.data.organization_id;
      

      if (!mongoose.Types.ObjectId.isValid(UserId)) {
          return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
      }

      const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: UserId }, '_id');
      const ownerwarehouseIds = warehouseDetails.map(wh => wh._id);
      
      const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
          ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
          : ownerwarehouseIds;

      if (!finalwarehouseIds.length) {
          return res.status(200).send(new serviceResponse({
              status: 200,
              data: { records: { rows: [], count: 0, page, limit, pages: 0 }, message: "No warehouses found for the user." }
          }));
      }

      const searchRegex = search ? new RegExp(search, 'i') : null;

      console.log('finalwarehouseIds',finalwarehouseIds)
      const query = {
          warehousedetails_id: { $in: finalwarehouseIds },
          ...(warehouse_name && { "warehousedetails_id.basicDetails.warehouseName": warehouse_name }),
          ...(status && { whr_status: status }),
          ...(batch_code && { batchId: batch_code }),
          ...(productName && { "req_id.product.name": productName }),
      };

      const rows = await Batch.find(query)
          .populate("warehousedetails_id", "basicDetails.warehouseName wareHouse_code")
          .populate("procurementCenter_id", "center_name")
          .populate("seller_id", "basic_details.associate_details.associate_name basic_details.associate_details.organization_name")
          .populate({
            path: "req_id",
            select: "product.name deliveryDate product.schemeId",
            populate: {
                path: "product.schemeId",
                model: "Scheme",
                select: "schemeName",
            },
        })
        .select("_id batchId qty received_on qc_report commodity final_quality_check wareHouse_code receiving_details farmerOrderIds createdAt whr_status")


      const batchIds = rows.map(row => row._id);
      const whrData = await WhrModel.find({ batch_id: { $in: batchIds } })
          .select("batch_id whr_type whr_number whr_date whr_document");

      const whrMap = {};
      whrData.forEach(whr => {
        whr.batch_id.forEach(id => {
            whrMap[id.toString()] = { 
                whr_type: whr.whr_type, 
                whr_number: whr.whr_number,
                whr_date : whr.whr_date,
                whr_document : whr.whr_document 
            };
        });
      });

      

      const modifiedRows = rows.map(row => ({
          ...row.toObject(),
          whr_type: whrMap[row._id.toString()] || null,
          whr_number: whrMap[row._id.toString()]?.whr_number || null,
      }));
      
      const totalCount = await Batch.countDocuments(query);

      if (isExport == 1) {
        const batchIds = rows.map(row => row._id);
        const whrData = await WhrModel.find({ batch_id: { $in: batchIds } }).select("batch_id whr_type whr_number");

        const whrMap = {};
        whrData.forEach(whr => {
            whr.batch_id.forEach(id => {
                whrMap[id.toString()] = { 
                    whr_type: whr.whr_type, 
                    whr_number: whr.whr_number 
                };
            });
        });

        const modifiedRows = rows.map(row => {
            const farmerOrders = row.farmerOrderIds || [];

            const totalQty = farmerOrders.reduce((sum, order) => sum + (order.qty || 0), 0);
            const totalAmt = farmerOrders.reduce((sum, order) => sum + (order.amt || 0), 0);
            const totalRejectedQty = farmerOrders.reduce((sum, order) => sum + (order.rejected_quantity || 0), 0);
            const totalRejectedBags = farmerOrders.reduce((sum, order) => sum + (order.rejected_bags || 0), 0);
            const totalGainQty = farmerOrders.reduce((sum, order) => sum + (order.gain_quantity || 0), 0);
            const totalGainBags = farmerOrders.reduce((sum, order) => sum + (order.gain_bags || 0), 0);
            const totalAcceptedQty = farmerOrders.reduce((sum, order) => sum + (order.accepted_quantity || 0), 0);
            const totalAcceptedBags = farmerOrders.reduce((sum, order) => sum + (order.accepted_bags || 0), 0);
            const totalDispatchQty = farmerOrders.reduce((sum, order) => sum + (order.dispatch_quantity || 0), 0);
            const totalDispatchBags = farmerOrders.reduce((sum, order) => sum + (order.dispatch_bags || 0), 0);

            return {
                ...row.toObject(),
                whr_type: whrMap[row._id.toString()] || null,
                whr_number: whrMap[row._id.toString()]?.whr_number || null,
                totalQty,
                totalAmt,
                totalRejectedQty,
                totalRejectedBags,
                totalGainQty,
                totalGainBags,
                totalAcceptedQty,
                totalAcceptedBags,
                totalDispatchQty,
                totalDispatchBags
            };
        });

        const exportData = modifiedRows.map(item => ({
            "Batch ID": item.batchId || 'NA',
            "Associate Name": item.seller_id?.basic_details?.associate_details?.associate_name || 'NA',
            "Organization Name": item.seller_id?.basic_details?.associate_details?.organization_name || 'NA',
            "Procurement Center": item.procurementCenter_id?.center_name || 'NA',
            "Warehouse": item.warehousedetails_id?.basicDetails?.warehouseName || 'NA',
            "Quantity": item.qty || 'NA',
            "Status": item.wareHouse_approve_status || 'NA',
            "WHR Number": item.whr_number || 'NA',
            "Scheme": item.req_id.product?.schemeId?.schemeName || 'NA',
            "Commodity": item.req_id.product?.name || 'NA',
            "Warehouse Name": item.warehousedetails_id.basicDetails?.warehouseName || 'NA',
            "WHR Status": item.whr_status || 'NA',
            "Received Qty": item.totalQty || 0,
            "Accepted Qty": item.totalAcceptedQty || 0,
            "Accepted Bags": item.totalAcceptedBags || 0,
            "Rejected Qty": item.totalRejectedQty || 0,
            "Rejected Bags": item.totalRejectedBags || 0,
            "Gain Qty": item.totalGainQty || 0,
            "Gain Bags": item.totalGainBags || 0,
          }));

        

          if (exportData.length) {
              return dumpJSONToExcel(req, res, {
                  data: exportData,
                  fileName: `Warehouse-Batches.xlsx`,
                  worksheetName: `Batches`
              });
          }
          return res.status(200).send(new serviceResponse({ status: 200, message: "No data available for export" }));
      }


      return res.status(200).send(new serviceResponse({
          status: 200,
          data: {
              records: {
                  rows: modifiedRows,
                  count: totalCount,
                  page,
                  limit,
                  pages: Math.ceil(totalCount / limit)
              }
          }
      }));
  } catch (error) {
      return res.status(500).send(new serviceResponse({ status: 500, message: error.message }));
  }
});

const filterDropdownList = asyncErrorHandler(async (req, res) => {
  
  try {
    const { warehouseIds = [] } = req.body;
    const getToken = req.headers.token || req.cookies.token;
      if (!getToken) {
          return res.status(401).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
      }

      const decode = await decryptJwtToken(getToken);
      const UserId = decode.data.organization_id;

      if (!mongoose.Types.ObjectId.isValid(UserId)) {
          return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
      }

      const warehouseDetails = await wareHouseDetails.find({ warehouseOwnerId: UserId }, '_id');
      const ownerwarehouseIds = warehouseDetails.map(wh => wh._id);

      const finalwarehouseIds = Array.isArray(warehouseIds) && warehouseIds.length
          ? warehouseIds.filter(id => ownerwarehouseIds.includes(id))
          : ownerwarehouseIds;

      if (!finalwarehouseIds.length) {
          return res.status(200).send(new serviceResponse({
              status: 200,
              data: { records: { rows: [], count: 0, page, limit, pages: 0 }, message: "No warehouses found for the user." }
          }));
      }

    const batchIds = [];

    if (!mongoose.Types.ObjectId.isValid(UserId)) {
        return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
    }
  
    let query = {
      "warehousedetails_id": { $in: finalwarehouseIds},
    };
    
    const batchDetails = await Batch.find(query)
          .populate({
            path: "req_id",
            select: "product.schemeId",
            populate: {
                path: "product.schemeId",
                model: "Scheme",
                select: "schemeName",
            },
        })
        .select('_id batchId');
    
    


    const data = {
      batchDetails : batchDetails,
    }
    
    return res.status(200).send(new serviceResponse({ status: 200, data: data, message: _response_message.found("data") }));

} catch (error) {
    _handleCatchErrors(error, res);
}
  
});


const viewBatchDetails = async (req, res) => {
    try {
        const { batch_id } = req.query;

        if (!batch_id) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                errors: [{ message: "Batch ID is required" }]
            }));
        }

        const batch = await Batch.findById(batch_id)
            .populate([
                { path: "procurementCenter_id", select: "center_name" },
                { path: "seller_id", select: "basic_details.associate_details.associate_name basic_details.associate_details.organization_name" },
                { path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" },
                { path: "warehousedetails_id", select: "basicDetails.warehouseName basicDetails.addressDetails wareHouse_code" },
                { path: "req_id", select: "product.name deliveryDate" },
            ])

        if (!batch) {
            return res.status(404).send(new serviceResponse({
                status: 404,
                errors: [{ message: "Batch not found" }]
            }));
        }
        console.log('batch',batch)
        const response = {
            basic_details : {
                batch_id: batch.batchId,
                fpoName: batch.seller_id,
                commodity: batch.req_id || "NA",
                intransit: batch.intransit || "NA",
                receivingDetails: batch.receiving_details || "NA",
                procurementDate: batch.procurementDate,
                procurementCenter: batch.procurementCenter_id?.center_name || "NA",
                warehouse: batch.warehousedetails_id,
                msp: batch.msp || "NA",
                final_quality_check : batch.final_quality_check,
                dispatched : batch.dispatched, 
                delivered : batch.delivered
            },
            
            lotDetails: batch.farmerOrderIds.map(order => ({
                lotId: order.farmerOrder_id?.order_no || "NA",
                farmerName: order.farmerOrder_id?.metaData?.name || "NA",
                quantityPurchased: order.qty || "NA"
            })),
            
            document_pictures : {
                document_pictures : batch.document_pictures
            },
            
        };

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: response,
            batch: batch,
            message: "Batch details fetched successfully"
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};



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
  whrLotDetailsUpdate,
  getWarehouseManagementList,
  filterDropdownList,
  viewBatchDetails
};
