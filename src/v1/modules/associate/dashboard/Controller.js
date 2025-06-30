const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { wareHouse } = require("@src/v1/models/app/warehouse/warehouseSchema");
const { User } = require("@src/v1/models/app/auth/User");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const moment = require("moment");
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const mongoose = require("mongoose");
const { eKharidHaryanaProcurementModel } = require("@src/v1/models/app/eKharid/procurements");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const { LexRuntimeV2 } = require("aws-sdk");
const { escapeRegex } = require("@src/v1/utils/helpers/regex");
const logger = require("@src/common/logger/logger")
const { getDistrict } = require("@src/v1/utils/helpers/index");
const { exist } = require("joi");
//widget listss

// module.exports.dashboardWidgetList = asyncErrorHandler(async (req, res) => {
//   try {

//     const { user_id, portalId } = req;
//     let widgetDetails = {};

//     widgetDetails.farmertotal = await farmer.countDocuments({ associate_id: new mongoose.Types.ObjectId(user_id) });
//     widgetDetails.rocurementCenter = await ProcurementCenter.countDocuments({ user_id: new mongoose.Types.ObjectId(user_id) });

//     const totalPurchased = await Batch.aggregate([
//       { $match: { seller_id: new mongoose.Types.ObjectId(user_id) } },
//       { $group: { _id: null, totalQty: { $sum: "$qty" } } }
//     ]);
//     widgetDetails.totalPurchased = totalPurchased[0]?.totalQty || 0;

//     const totalLifting = await Batch.aggregate([
//       { $match: { seller_id: new mongoose.Types.ObjectId(user_id), intransit: { $exists: true, $ne: null } } },
//       { $group: { _id: null, totalQty: { $sum: "$qty" } } }
//     ]);

//     widgetDetails.totalLifting = totalLifting[0]?.totalQty || 0;

//     const batches = await Batch.find({ seller_id: new mongoose.Types.ObjectId(user_id), intransit: { $exists: true, $ne: null } })
//       .populate('req_id', 'createdAt') // populate only createdAt from Request
//       .select('qty updatedAt req_id'); // fetch only necessary fields

//     // Step 2: Calculate totalQty and totalDays
//     let totalQty = 0;
//     let totalDays = 0;

//     for (const batch of batches) {
//       totalQty += batch.qty || 0;

//       const createdAt = batch.req_id?.createdAt;
//       const updatedAt = batch.req_id?.updatedAt;

//       if (createdAt && updatedAt) {
//         const diffMs = updatedAt - createdAt;
//         const days = Math.round(diffMs / (1000 * 60 * 60 * 24)); // convert to days
//         totalDays += days;
//       }
//     }

//     widgetDetails.totalDaysLifting = totalDays;


//     return sendResponse({
//       res,
//       status: 200,
//       message: _query.get("Widget List"),
//       data: widgetDetails,
//     });
//   } catch (error) {
//     console.error("Error in widgetList:", error);
//     return sendResponse({
//       res,
//       status: 500,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// });

module.exports.dashboardWidgetList = asyncErrorHandler(async (req, res) => {
  try {
    const { user_id } = req;
    const { schemeName, commodity, district = [] } = req.body;
    const userObjectId = new mongoose.Types.ObjectId(user_id);

    logger.info(`[WidgetList] user_id: ${user_id}`);
    logger.info(`[WidgetList] Query Params:`, { schemeName, commodity, district });

    const parseObjectIds = (input) => {
      if (!input) return [];
      const items = Array.isArray(input) ? input : JSON.parse(input);
      return items
        .map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null)
        .filter(Boolean);
    };

    const schemeIds = parseObjectIds(schemeName);
    const commodityIds = parseObjectIds(commodity);
    const districtIds = parseObjectIds(district);

    const widgetDetails = {};

    // ========== Get district titles ==========
   let validDistrictTitles = [];

if (districtIds.length) {
  const filterdata = await Promise.all(
    districtIds.map(async (x) => {
      try {
        const districtData = await getDistrict(x);
        return districtData?.district_title || null;
      } catch (err) {
        logger.error(`[WidgetList] Error fetching district for ID ${x}: ${err.message}`);
        return null;
      }
    })
  );

  validDistrictTitles = filterdata.filter(Boolean);

  if (validDistrictTitles.length === 0) {
    logger.warn(`[WidgetList] No valid district titles found for given IDs:`, district);
    return sendResponse({
      res,
      status: 400,
      message: "Invalid district(s) provided. No matching districts found.",
      error: "Districts not found"
    });
  }
}


    // ========== Farmer Count ==========
    const requestFilter = {};
    if (commodityIds.length) requestFilter["product.commodity_id"] = { $in: commodityIds };
    if (schemeIds.length) requestFilter["product.schemeId"] = { $in: schemeIds };

    const requestIds = await RequestModel.find(requestFilter).distinct('_id');
    widgetDetails.farmertotal = await farmerCount(req);

    // ========== Procurement Center Count ==========
    const batchPOCIds = requestIds.length
      ? await Batch.find({ req_id: { $in: requestIds } }).distinct('procurementCenter_id')
      : [];

    const procurementCenterQuery = {
      user_id: userObjectId,
      _id: { $in: batchPOCIds },
    };
    if (validDistrictTitles.length) {
      procurementCenterQuery['address.district'] = { $in: validDistrictTitles };
    }

    widgetDetails.procurementCenter = await ProcurementCenter.countDocuments(procurementCenterQuery);

    // ========== Total Purchased Quantity ==========
    const purchasedMatch = {
      seller_id: userObjectId,
      req_id: { $in: requestIds },
    };
    if (validDistrictTitles.length) {
      purchasedMatch['$expr'] = {
        $in: [
          "$procurementCenter.address.district",
          validDistrictTitles
        ]
      };
    }

    const purchase = await Batch.aggregate([
      {
        $lookup: {
          from: "procurementcenters",
          localField: "procurementCenter_id",
          foreignField: "_id",
          as: "procurementCenter"
        }
      },
      { $unwind: "$procurementCenter" },
      { $match: purchasedMatch },
      { $group: { _id: null, totalQty: { $sum: "$qty" } } }
    ]);
    widgetDetails.totalPurchased = purchase[0]?.totalQty ? Number(purchase[0].totalQty.toFixed(3)) : 0;

    // ========== Total Lifting Quantity ==========
    const liftingMatch = {
      seller_id: userObjectId,
      intransit: { $exists: true, $ne: null },
      req_id: { $in: requestIds },
    };
    if (validDistrictTitles.length) {
      liftingMatch['$expr'] = {
        $in: [
          "$procurementCenter.address.district",
          validDistrictTitles
        ]
      };
    }

    const lifting = await Batch.aggregate([
      {
        $lookup: {
          from: "procurementcenters",
          localField: "procurementCenter_id",
          foreignField: "_id",
          as: "procurementCenter"
        }
      },
      { $unwind: "$procurementCenter" },
      { $match: liftingMatch },
      { $group: { _id: null, totalQty: { $sum: "$qty" } } }
    ]);
    widgetDetails.totalLifting = lifting[0]?.totalQty ? Number(lifting[0].totalQty.toFixed(3)) : 0;

    // ========== Today's Purchase & Lifting ==========
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const startOfDayIST = new Date(now.setUTCHours(0, 0, 0, 0) - istOffset);
    const endOfDayIST = new Date(startOfDayIST.getTime() + 86400000 - 1);

    const dayPurchaseMatch = {
      seller_id: userObjectId,
      delivered: { $exists: true, $ne: null },
      updatedAt: { $gte: startOfDayIST, $lt: endOfDayIST },
      req_id: { $in: requestIds }
    };
    if (validDistrictTitles.length) {
      dayPurchaseMatch['$expr'] = {
        $in: [
          "$procurementCenter.address.district",
          validDistrictTitles
        ]
      };
    }

    const dayPurchase = await Batch.aggregate([
      {
        $lookup: {
          from: "procurementcenters",
          localField: "procurementCenter_id",
          foreignField: "_id",
          as: "procurementCenter"
        }
      },
      { $unwind: "$procurementCenter" },
      { $match: dayPurchaseMatch },
      { $group: { _id: null, totalQty: { $sum: "$qty" } } }
    ]);
    widgetDetails.totalDayPurchase = dayPurchase[0]?.totalQty || 0;

    const dayLiftingMatch = {
      seller_id: userObjectId,
      intransit: { $exists: true, $ne: null },
      updatedAt: { $gte: startOfDayIST, $lt: endOfDayIST },
      req_id: { $in: requestIds }
    };
    if (validDistrictTitles.length) {
      dayLiftingMatch['$expr'] = {
        $in: [
          "$procurementCenter.address.district",
          validDistrictTitles
        ]
      };
    }

    const todayLifting = await Batch.aggregate([
      {
        $lookup: {
          from: "procurementcenters",
          localField: "procurementCenter_id",
          foreignField: "_id",
          as: "procurementCenter"
        }
      },
      { $unwind: "$procurementCenter" },
      { $match: dayLiftingMatch },
      { $group: { _id: null, totalQty: { $sum: "$qty" } } }
    ]);
    widgetDetails.totalDaysLifting = todayLifting[0]?.totalQty || 0;

    // ========== Final Response ==========
    return sendResponse({
      res,
      status: 200,
      message: _query.get("Widget List"),
      data: widgetDetails
    });

  } catch (error) {
    logger.error(`[WidgetList] Error: ${error.message}`, { stack: error.stack });
    return sendResponse({
      res,
      status: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
});




async function farmerCount(req) {
  try {
    const { user_id } = req;
    const { schemeName, commodity, district } = req.body;
    const userObjectId = new mongoose.Types.ObjectId(user_id);

    logger.info(`[WidgetList] User ID: ${user_id}`);
    logger.info(`[WidgetList] Query Params:`, { schemeName, commodity, district });

    // Utility: safely parse ObjectId arrays from query
    const parseObjectIds = (input) => {
      if (!input) return [];
      const values = Array.isArray(input) ? input : JSON.parse(input);
      return values
        .map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null)
        .filter(Boolean);
    };

    const schemeIds = parseObjectIds(schemeName);
    const commodityIds = parseObjectIds(commodity);
    const districtIds = parseObjectIds(district);

    logger.info(`[WidgetList] Parsed Filters`, { schemeIds, commodityIds, districtIds });

    let farmerQuery = { associate_id: userObjectId };
    const hasCommodityOrScheme = commodityIds.length || schemeIds.length;

    if (hasCommodityOrScheme > 0) {
      const requestFilter = {};
      if (commodityIds.length) requestFilter['product.commodity_id'] = { $in: commodityIds };
      if (schemeIds.length) requestFilter['product.schemeId'] = { $in: schemeIds };


      logger.info(`[WidgetList] Request filter:`, requestFilter);

      const requestIds = await RequestModel.find(requestFilter).distinct('_id');
      logger.info(`[WidgetList] Matching Request IDs: ${requestIds.length}`);

      if (requestIds.length) {
        const paidFarmerIds = await Payment.find({ req_id: { $in: requestIds } }).distinct('farmer_id');
        logger.info(`[WidgetList] Paid Farmer IDs: ${paidFarmerIds.length}`);

        if (paidFarmerIds.length) {
          const farmerFilter = { _id: { $in: paidFarmerIds } };
          if (districtIds.length) {
            farmerFilter['address.district_id'] = { $in: districtIds };
          }
          console.log(farmerFilter)
          const finalFarmerIds = await farmer.find(farmerFilter).distinct('_id');
          logger.info(`[WidgetList] Final Filtered Farmer IDs: ${finalFarmerIds.length}`);
          farmerQuery._id = { $in: finalFarmerIds };
        } else {
          logger.warn(`[WidgetList] No farmers found after payment filtering.`);
          farmerQuery._id = { $in: [] };
        }
      } else {
        logger.warn(`[WidgetList] No request IDs matched filters.`);
        farmerQuery._id = { $in: [] };
      }
    } else if (districtIds.length) {
      farmerQuery['address.district_id'] = { $in: districtIds };
      console.log(districtIds)
      logger.info(`[WidgetList] Only District filter applied to farmer query.`);
    }
    console.log(farmerQuery)
    const farmerCount = await farmer.countDocuments(farmerQuery);
    logger.info(`[WidgetList] Farmer Count: ${farmerCount}`);
    return farmerCount
  } catch (error) {
    logger.error(`[WidgetList] Error: ${error.message}`, { stack: error.stack });
    return error.meesage
  }
}




// module.exports.mandiWiseProcurement = async (req, res) => {
//   try {
//     const { user_id, portalId , commodity, district, schemeName} = req;
//     let commodityArray = Array.isArray(commodity) ? commodity : [commodity];
//     const regexCommodity = commodityArray.map(name => new RegExp(name, 'i'));

//     let districtArray = Array.isArray(district) ? district : [district];
//     const regexDistrict = districtArray.map(name => new RegExp(name, 'i'));


//     let page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     let skip = (page - 1) * limit;
//     const isExport = parseInt(req.query.isExport) === 1;
//     const centerNames = req.query.search?.trim();
//     const searchDistrict = req.query.districtNames
//       ? Array.isArray(req.query.districtNames)
//         ? req.query.districtNames
//         : req.query.districtNames.split(',').map(c => c.trim())
//       : null;

//     const payments = await Payment.find().lean();
//     const batchIdSet = [...new Set(payments.map(p => String(p.batch_id)).filter(Boolean))];
//     //console.log("Batch IDs:", batchIdSet.length);

//     const pipeline = [
//       {
//         $match: {
//           _id: { $in: batchIdSet.map(id => new mongoose.Types.ObjectId(id)) },
//           seller_id: new mongoose.Types.ObjectId(user_id)
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "seller_id",
//           foreignField: "_id",
//           as: "seller",
//         },
//       },
//       { $unwind: "$seller" },
//       {
//         $lookup: {
//           from: "procurementcenters",
//           localField: "procurementCenter_id",
//           foreignField: "_id",
//           as: "center",
//         },
//       },
//       { $unwind: "$center" },
//       {
//         $lookup: {
//           from: "associateoffers",
//           localField: "seller_id",
//           foreignField: "seller_id",
//           as: "associateOffer",
//         },
//       },
//       {
//         $unwind: {
//           path: "$associateOffer",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "requests",
//           localField: "req_id",
//           foreignField: "_id",
//           as: "relatedRequest",
//         },
//       },
//       {
//         $unwind: {
//           path: "$relatedRequest",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $addFields: {
//           liftedDataDays: {
//             $cond: [
//               { $and: ["$createdAt", "$relatedRequest.createdAt"] },
//               {
//                 $dateDiff: {
//                   startDate: "$relatedRequest.createdAt",
//                   endDate: "$createdAt",
//                   unit: "day",
//                 },
//               },
//               null,
//             ],
//           },
//           purchaseDays: {
//             $cond: [
//               { $and: ["$updatedAt", "$relatedRequest.createdAt"] },
//               {
//                 $dateDiff: {
//                   startDate: "$relatedRequest.createdAt",
//                   endDate: "$updatedAt",
//                   unit: "day",
//                 },
//               },
//               null,
//             ],
//           },
//         },
//       },
//       {
//         $group: {
//           _id: "$procurementCenter_id",
//           centerName: { $first: "$center.center_name" },
//           Status: { $first: "$center.active" },
//           centerId: { $first: "$center._id" },
//           district: { $first: "$seller.address.registered.district" },
//           associate_name: {
//             $first: "$seller.basic_details.associate_details.associate_name",
//           },
//           liftedQty: { $sum: "$qty" },
//           offeredQty: { $first: { $ifNull: ["$associateOffer.offeredQty", 0] } },
//           liftedDataDays: { $first: "$liftedDataDays" },
//           purchaseDays: { $first: "$purchaseDays" },
//           productName: { $first: "$relatedRequest.product.name" },
//         },
//       },
//       {
//         $addFields: {
//           balanceMandi: { $subtract: ["$offeredQty", "$liftedQty"] },
//           liftingPercentage: {
//             $cond: {
//               if: { $gt: ["$offeredQty", 0] },
//               then: {
//                 $round: [
//                   {
//                     $multiply: [
//                       { $divide: ["$liftedQty", "$offeredQty"] },
//                       100,
//                     ],
//                   },
//                   2,
//                 ],
//               },
//               else: 0,
//             },
//           },
//         },
//       },
//     ];

//     if (searchDistrict) {
//       pipeline.push({
//         $match: {
//           district: { $in: searchDistrict },
//         },
//       });
//       //   page = 1;
//       //   skip = 0;
//     }

//     if (centerNames?.length) {
//       pipeline.push({
//         $match: {
//           centerName: { $regex: centerNames, $options: 'i' },
//         },
//       });
//       page = 1;
//       skip = 0;
//     }

//     pipeline.push({ $sort: { centerName: 1 } });

//     const aggregated = await Batch.aggregate(pipeline);

//     if (isExport == 1) {
//       const exportRows = aggregated.map(item => ({
//         "Center Name": item?.centerName || 'NA',
//         "District": item?.district || 'NA',
//         "Associate Name": item?.associate_name || 'NA',
//         "Product Name": item?.productName || 'NA',
//         "Offered Qty": item?.offeredQty || 0,
//         "Lifted Qty": item?.liftedQty || 0,
//         "Balance Qty": item?.balanceMandi || 0,
//         "Lifting %": item?.liftingPercentage + "%" || '0%',
//         "Lifted Days": item?.liftedDataDays ?? 'NA',
//         "Purchase Days": item?.purchaseDays ?? 'NA',
//         "Status": item?.Status ? 'Active' : 'Inactive',
//       }));

//       if (exportRows.length > 0) {
//         return dumpJSONToExcel(req, res, {
//           data: exportRows,
//           fileName: `MandiWiseProcurementData.xlsx`,
//           worksheetName: `Mandi Data`
//         });
//       } else {
//         return res.status(404).json(new serviceResponse({
//           status: 404,
//           message: _response_message.notFound("Mandi Procurement Not Found")
//         }));
//       }
//     }
//     const totalRecords = aggregated.length;
//     const totalPages = Math.ceil(totalRecords / limit);
//     const paginatedData = aggregated.slice(skip, skip + limit);

//     return res.status(200).json(new serviceResponse({
//       status: 200,
//       data: {
//         page,
//         limit,
//         totalPages,
//         totalRecords,
//         data: paginatedData,
//         message: _response_message.found("Mandi Procurement Data Fetched")
//       }
//     }));

//   } catch (error) {
//     _handleCatchErrors(error, res);
//   }
// }


// module.exports.mandiWiseProcurement = async (req, res) => {
//   try {
//     const { user_id } = req;
//     const { commodity, district, schemeName, search } = req.body;

//     // Normalize query params to arrays or empty arrays
//     const commodityArray = commodity
//       ? Array.isArray(commodity)
//         ? commodity
//         : commodity.split(',').map((c) => c.trim())
//       : [];
//     const districtArray = district
//       ? Array.isArray(district)
//         ? district
//         : district.split(',').map((d) => d.trim())
//       : [];
//     const schemeArray = schemeName
//       ? Array.isArray(schemeName)
//         ? schemeName
//         : schemeName.split(',').map((s) => s.trim())
//       : [];

//     // Pagination
//     let page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;
//     const isExport = parseInt(req.query.isExport) === 1;
//     const centerSearch = req.query.search?.trim();




//     // Get payment batch IDs
//     const payments = await Payment.find().lean();
//     const batchIdSet = [...new Set(payments.map((p) => String(p.batch_id)).filter(Boolean))];


//       const pipeline = [
//           {
//             $match: {
//               _id: { $in: batchIdSet.map((id) => new mongoose.Types.ObjectId(id)) },
//               seller_id: new mongoose.Types.ObjectId(user_id),
//             },
//           },
//           {
//             $lookup: {
//               from: "users",
//               localField: "seller_id",
//               foreignField: "_id",
//               as: "seller",
//             },
//           },
//           { $unwind: "$seller" },
//           {
//             $lookup: {
//               from: "procurementcenters",
//               localField: "procurementCenter_id",
//               foreignField: "_id",
//               as: "center",
//             },
//           },
//           { $unwind: "$center" },
//           {
//             $lookup: {
//               from: "associateoffers",
//               localField: "seller_id",
//               foreignField: "seller_id",
//               as: "associateOffer",
//             },
//           },
//           {
//             $unwind: {
//               path: "$associateOffer",
//               preserveNullAndEmptyArrays: true,
//             },
//           },
//           {
//             $lookup: {
//               from: "requests",
//               localField: "req_id",
//               foreignField: "_id",
//               as: "relatedRequest",
//             },
//           },
//           {
//             $unwind: {
//               path: "$relatedRequest",
//               preserveNullAndEmptyArrays: true,
//             },
//           },
//           {
//             $addFields: {
//               liftedDataDays: {
//                 $cond: [
//                   { $and: ["$createdAt", "$relatedRequest.createdAt"] },
//                   {
//                     $dateDiff: {
//                       startDate: "$relatedRequest.createdAt",
//                       endDate: {
//                         $cond: [
//                           { $ifNull: ["$deliveryDate", false] },
//                           "$deliveryDate",
//                           "$updatedAt",
//                         ],
//                       },
//                       unit: "day",
//                     },
//                   },
//                   0,
//                 ],
//               },
//               purchaseDays: {
//                 $cond: [
//                   { $and: ["$updatedAt", "$relatedRequest.createdAt"] },
//                   {
//                     $dateDiff: {
//                       startDate: "$relatedRequest.createdAt",
//                       endDate: "$updatedAt",
//                       unit: "day",
//                     },
//                   },
//                   0,
//                 ],
//               },

//               liftedDataValid: {
//                 $cond: [
//                   { $and: ["$createdAt", "$relatedRequest.createdAt"] },
//                   true,
//                   false,
//                 ],
//               },

//               purchaseDataValid: {
//                 $cond: [
//                   { $and: ["$updatedAt", "$relatedRequest.createdAt"] },
//                   true,
//                   false,
//                 ],
//               },

//               liftedQty: {
//                 $cond: [
//                   { $ne: [{ $ifNull: ["$intransit", null] }, null] },
//                   "$qty",
//                   0,
//                 ],
//               },
//             },
//           },
//           {
//             $group: {
//               _id: "$procurementCenter_id",
//               centerName: { $first: "$center.center_name" },
//               Status: { $first: "$center.active" },
//               centerId: { $first: "$center._id" },
//               district: { $first: "$center.address.district" },
//               associate_name: {
//                 $first: "$seller.basic_details.associate_details.associate_name",
//               },
//               offeredQty: {
//                 $first: { $ifNull: ["$associateOffer.offeredQty", 0] },
//               },
//               productName: { $first: "$relatedRequest.product.name" },
//               schemeId: { $first: "$relatedRequest.product.schemeId" },

//               totalPurchaseQty: { $sum: "$qty" },
//                totalLiftedQty: {
//                 $sum: {
//                   $cond: [
//                     { $ne: [{ $ifNull: ["$intransit", null] }, null] },
//                     "$qty",
//                     0,
//                   ],
//                 },
//               },
//               liftedDataDays: {
//                 $sum: {
//                   $cond: [{ $eq: ["$liftedDataValid", true] }, "$qty", 0],
//                 },
//               },
//               purchaseDays: {
//                 $sum: {
//                   $cond: [{ $eq: ["$purchaseDataValid", true] }, "$qty", 0],
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               balanceMandi: { $subtract: ["$offeredQty", "$totalLiftedQty"] },
//               liftingPercentage: {
//                 $cond: {
//                   if: { $gt: ["$offeredQty", 0] },
//                   then: {
//                     $round: [
//                       {
//                         $multiply: [
//                           { $divide: ["$totalLiftedQty", "$offeredQty"] },
//                           100,
//                         ],
//                       },
//                       2,
//                     ],
//                   },
//                   else: 0,
//                 },
//               },
//             },
//           },
//         ];


//     // Apply filters **after grouping** on grouped fields
//     const filterMatch = {};
//     if (districtArray.length > 0) {
//       // filterMatch.district = { $in: districtArray };
//     }

//     if (commodityArray.length > 0) {
//       filterMatch.productName =  {$in: commodityArray.map(name => new RegExp(escapeRegex(name), 'i'))}
//     }

//     if (schemeArray.length > 0) {
//       filterMatch.schemeId = { $in: schemeArray };
//     }

//     if (Object.keys(filterMatch).length > 0) {
//       pipeline.push({ $match: filterMatch });
//     }

//     // Center name search filter if any
//     if (centerSearch && centerSearch.length > 0) {
//       const searchRegex = new RegExp(centerSearch, "i");
//       pipeline.push({
//         // $match: { centerName: { $regex: centerSearch, $options: "i" } },
//         $match: {
//           $or: [
//             { centerName: { $regex: searchRegex } },
//             { productName: { $regex: searchRegex } },
//             { district: { $regex: searchRegex } },
//           ],
//         },
//       });
//       page = 1;
//     }

//     pipeline.push({ $sort: { centerName: 1 } });
//      console.log(pipeline)
//     const aggregated = await Batch.aggregate(pipeline);

//     // No records message
//     if (aggregated.length === 0) {
//     return res.status(200).json({
//       status: 200,
//        message: _response_message.notFound("data"),
//       data: [],
//       totalRecords: 0,
//       totalPages: 0,
//       currentPage: page,
//       limit: 0,
//     });
//   }

//     if (isExport) {
//       const exportRows = aggregated.map((item) => ({
//         "Center Name": item?.centerName || "NA",
//         District: item?.district || "NA",
//         "Associate Name": item?.associate_name || "NA",
//         "Product Name": item?.productName || "NA",
//         "Offered Qty": item?.offeredQty || 0,
//         "Lifted Qty": item?.liftedQty || 0,
//         "Balance Qty": item?.balanceMandi || 0,
//         "Lifting %": item?.liftingPercentage + "%" || "0%",
//         "Lifted Days": item?.liftedDataDays ?? "NA",
//         "Purchase Days": item?.purchaseDays ?? "NA",
//         Status: item?.Status ? "Active" : "Inactive",
//       }));

//       return dumpJSONToExcel(req, res, {
//         data: exportRows,
//         fileName: `MandiWiseProcurementData.xlsx`,
//         worksheetName: `Mandi Data`,
//       });
//     }

//     const totalRecords = aggregated.length;
//     const totalPages = Math.ceil(totalRecords / limit);
//     const paginatedData = aggregated.slice(skip, skip + limit);

//     return res.status(200).json({
//       status: 200,
//       data: {
//         page,
//         limit,
//         totalPages,
//         totalRecords,
//         data: paginatedData,
//         message: "Mandi Procurement Data Fetched",
//       },
//     });
//   } catch (error) {
//     console.error("Error in mandiWiseProcurement:", error);
//     return res.status(500).json({
//       status: 500,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

module.exports.mandiWiseProcurement = async (req, res) => {
  try {
    logger.info("[mandiWiseProcurement] Request received", { body: req.body });

    const { user_id } = req;
    const {
      commodity = [],
      district = [],
      schemeName = [],
      page = 1,
      limit = 10,
      isExport = 1,
      search,
    } = req.body;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const commodityArray = Array.isArray(commodity) ? commodity : String(commodity).split(",").map((id) => id.trim());
    const schemeArray = Array.isArray(schemeName) ? schemeName : String(schemeName).split(",").map((id) => id.trim());
    const districtArray = Array.isArray(district) ? district : String(district).split(",").map((d) => d.trim());

    const commodityIds = commodityArray.filter(Boolean).map((id) => new mongoose.Types.ObjectId(id));
    const schemeIds = schemeArray.filter(Boolean).map((id) => new mongoose.Types.ObjectId(id));

    const pipeline = [
      {
        $match: {
          seller_id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $lookup: {
          from: "requests",
          localField: "req_id",
          foreignField: "_id",
          as: "request",
        },
      },
      { $unwind: "$request" },
      {
        $addFields: {
          commodity_id: "$request.product.commodity_id",
          schemeId: "$request.product.schemeId",
        },
      },
      {
        $lookup: {
          from: "commodities",
          localField: "commodity_id",
          foreignField: "_id",
          as: "commodityData",
        },
      },
      { $unwind: "$commodityData" },
      {
        $addFields: {
          isToday: {
            $and: [
              { $gte: ["$createdAt", startOfDay] },
              { $lte: ["$createdAt", endOfDay] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$procurementCenter_id",
          totalQty: { $sum: "$qty" },
          todayQty: {
            $sum: {
              $cond: [{ $eq: ["$isToday", true] }, "$qty", 0],
            },
          },
          totalLiftingQty: {
            $sum: {
              $cond: [{ $ne: ["$intransit", null] }, "$qty", 0],
            },
          },
          todayLiftingQty: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$intransit", null] },
                    { $eq: ["$isToday", true] },
                  ],
                },
                "$qty",
                0,
              ],
            },
          },
          commodityName: { $first: "$commodityData.name" },
          commodity_id: { $first: "$commodity_id" },
          schemeId: { $first: "$schemeId" },
        },
      },
      {
        $lookup: {
          from: "procurementcenters",
          localField: "_id",
          foreignField: "_id",
          as: "procurementCenter",
        },
      },
      { $unwind: "$procurementCenter" },
      {
        $addFields: {
          balanceQty: { $subtract: ["$totalQty", "$totalLiftingQty"] },
          liftingPercentage: {
            $cond: [
              { $gt: ["$totalQty", 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ["$totalLiftingQty", "$totalQty"] }, 100] },
                  2,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $project: {
          procurementCenter_id: "$_id",
          procurementCenterName: "$procurementCenter.center_name",
          district: "$procurementCenter.address.district",
          commodityName: 1,
          totalQty: 1,
          todayQty: 1,
          totalLiftingQty: 1,
          todayLiftingQty: 1,
          balanceQty: 1,
          liftingPercentage: 1,
          commodity_id: 1,
          schemeId: 1,
          _id: 0,
        },
      },
    ];

    // Apply filters
    if (districtArray.length) {
      const filterdata = await Promise.all(districtArray.map(async (x) => await getDistrict(x)));
      const districtTitles = filterdata.map((x) => x.district_title);
      pipeline.push({
        $match: {
          district: { $in: districtTitles },
        },
      });
    }

    if (commodityIds.length) {
      pipeline.push({
        $match: {
          commodity_id: { $in: commodityIds },
        },
      });
    }

    if (schemeIds.length) {
      pipeline.push({
        $match: {
          schemeId: { $in: schemeIds },
        },
      });
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      pipeline.push({
        $match: {
          $or: [
            { district: { $regex: search, $options: "i" } },
            { procurementCenterName: { $regex: search, $options: "i" } },
            { commodityName: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Clone pipeline before pagination for counting total
    const totalPipeline = [...pipeline];
    const totalData = await Batch.aggregate(totalPipeline);
    const total = totalData.length;

    // Apply pagination if not export
    if (isExport != 2) {
      pipeline.push(
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      );
    }

    const result = await Batch.aggregate(pipeline);

    // Export to Excel
    if (isExport == 2) {
      const exportRows = result.map(item => ({
        "Center Name": item?.procurementCenterName || 'NA',
        "District": item?.district || 'NA',
        "Product Name": item?.commodityName || 'NA',
        "Offered Qty (MT)": item?.totalQty || 0,
        "Lifted Qty (MT)": item?.totalLiftingQty || 0,
        "Balance in Mandi (MT)": item?.balanceQty || 0,
        "Lifting %": item?.liftingPercentage != null ? `${item.liftingPercentage}%` : '0%',
        "Today Purchase Qty": item?.todayQty || 0,
        "Today Lifted Qty": item?.todayLiftingQty || 0,
      }));

      if (exportRows.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: exportRows,
          fileName: `MandiWiseProcurement.xlsx`,
          worksheetName: `Mandi Data`
        });
      } else {
        return sendResponse({
          res,
          status: 200,
          data: [],
          message: "Mandi Procurement Not Found"
        });
      }
    }

    logger.info("[mandiWiseProcurement] Successfully fetched data", { total });

    return sendResponse({
      res,
      status: 200,
      data: {
        record: result,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
        limit: Number(limit),
      },
      message: "Mandi Procurement List",
    });
  } catch (error) {
    logger.error("[mandiWiseProcurement] Error occurred", { error: error.message });

    return sendResponse({
      res,
      status: 500,
      data: [],
      message: error.message || "Internal Server Error",
      error: error.message,
    })
  }
};



// module.exports.incidentalExpense = async (req, res) => {
//   try {
//     const {
//       search = '',
//       commodity = '',
//       state = '',
//       season = '',
//       district = '',
//       schemeName = '',
//     } = req.query;

//     const { user_id } = req;
//     let page = parseInt(req.query.page) || 1;
//     let limit = parseInt(req.query.limit) || 10;
//     let skip = (page - 1) * limit;

//     const filters = {};

//     if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
//       filters.associate_id = new mongoose.Types.ObjectId(user_id);
//     }

//     let payments = await Payment.find(filters)
//       .select({
//         batch_id: 1,
//         req_id: 1,
//         associate_id: 1,
//         amount: 1,
//         qtyProcured: 1,
//         payment_status: 1,
//       })
//       .populate({
//         path: 'batch_id',
//         select: 'batchId procurementCenter_id qty',
//         populate: {
//           path: 'procurementCenter_id',
//           select: 'center_name address.district address.state',
//         },
//       })
//       .populate({
//         path: 'req_id',
//         select: 'product.name product.season product.schemeId',
//       })
//       .sort({ createdAt: -1 });

//     if (search) {
//       const lowerSearch = search.toLowerCase();
//       payments = payments.filter((p) => {
//         const batchId = p.batch_id?.batchId?.toString().toLowerCase() || '';
//         const mandiName = p.batch_id?.procurementCenter_id?.center_name?.toLowerCase() || '';
//         const districtName = p.batch_id?.procurementCenter_id?.address?.district?.toLowerCase() || '';
//         const commodityName = p.req_id?.product?.name?.toLowerCase() || '';

//         //search by batchId, mandiName, district, commodity
//         return (
//           batchId.includes(lowerSearch) ||
//           mandiName.includes(lowerSearch) ||
//           districtName.includes(lowerSearch) ||
//           commodityName.includes(lowerSearch)
//         );
//       });
//     }

//     if (state) {
//       const lowerState = state.toLowerCase();
//       payments = payments.filter((p) => {
//         const stateVal = p.batch_id?.procurementCenter_id?.address?.state?.toLowerCase() || '';
//         return stateVal.includes(lowerState);
//       });
//     }

//     if (commodity) {
//       const escapedCommodity = escapeRegex(commodity.toLowerCase());
//       const regex = new RegExp(escapedCommodity, 'i');

//       payments = payments.filter((p) => {
//         const comm = p.req_id?.product?.name || '';
//         return regex.test(comm);
//       });
//     }

//     if (season) {
//       const lowerSeason = season.toLowerCase();
//       payments = payments.filter((p) => {
//         const seasonVal = p.req_id?.product?.season?.toLowerCase() || '';
//         return seasonVal.includes(lowerSeason);
//       });
//     }

//     if (district) {
//       const lowerDistrict = district.toLowerCase();
//       payments = payments.filter((p) => {
//         const districtVal = p.batch_id?.procurementCenter_id?.address?.district?.toLowerCase() || '';
//         return districtVal.includes(lowerDistrict);
//       });
//     }

//     if (schemeName) {
//       const schemeArray = schemeName.split(',').map((s) => s.trim().toLowerCase());
//       payments = payments.filter((p) => {
//         const schemeId = p.req_id?.product?.schemeId;
//         if (!schemeId) return false;
//         const schemeIdStr = schemeId.toString().toLowerCase();
//         return schemeArray.includes(schemeIdStr);
//       });
//     }

//     const totals = payments.length;
//     const paymentPage = payments.slice(skip, skip + limit);

//     if (payments.length === 0) {
//       return res.status(200).json({
//         status: 200,
//         message: _response_message.notFound("data"),
//         data: [],
//         totalRecords: 0,
//         totalPages: 0,
//         currentPage: page,
//         limit: 0,
//       });
//     }

//     const batchIdNumbers = paymentPage
//       .map((p) => Number(p.batch_id?.batchId))
//       .filter((n) => !isNaN(n));

//     //Extracting batchId from payment whose ekhrid_payment exit true
//     const batchIDEkhrid = await Payment.find({
//       ekhrid_payment: { $exists: true }
//     }).select('batch_id');

//     const batchIdArray = batchIDEkhrid
//       .map(doc => doc.batch_id?.toString())
//       .filter((id, index, self) => id && self.indexOf(id) === index)
//       .map(id => new mongoose.Types.ObjectId(id));

//     const commisionCost = await Batch.find({
//       '_id': { $in: batchIdArray }
//     })
//       .select({
//         _id: 1,
//         'dispatched.bills.commission': 1
//       })
//       .lean();

//     const result = commisionCost.map(doc => ({
//       batchId: doc._id,
//       commission: doc?.dispatched?.bills?.commission ?? 0
//     }));
//     const ekharidList = await eKharidHaryanaProcurementModel.find({
//       'warehouseData.exitGatePassId': { $in: batchIdNumbers },
//     })
//       .select({
//         'warehouseData.exitGatePassId': 1,
//         'procurementDetails.incidentalExpenses': 1,
//         'procurementDetails.laborCharges': 1,
//         'procurementDetails.laborChargesPayableDate': 1,
//         'procurementDetails.commissionCharges': 1,
//         'procurementDetails.commissionChargesPayableDate': 1,
//       })
//       .lean();

//     // Seelcted commission for ekhrid_payment true (payment collection)
//     const batchCommissionMap = new Map();
//     result.forEach((item) => {
//       batchCommissionMap.set(item.batchId.toString(), item.commission);
//     });
//     const ekharidMap = new Map();
//     ekharidList.forEach((e) => {
//       ekharidMap.set(Number(e.warehouseData.exitGatePassId), e);
//     });


//     const finalData = paymentPage.map((p) => {
//       const batchCode = Number(p.batch_id?.batchId);
//       const batchMongoId = p.batch_id?._id?.toString();
//       const ekharidRecord = ekharidMap.get(batchCode);

//       const commissionFromEkharid = ekharidRecord?.procurementDetails?.commissionCharges;
//       const commissionFromBatch = batchCommissionMap.get(batchMongoId) ?? 0;

//       return {
//         batchId: p.batch_id?.batchId || null,
//         commodity: p.req_id?.product?.name || 'NA',
//         amount: p.amount,
//         quantity: p.qtyProcured,
//         mandiName: p.batch_id?.procurementCenter_id?.center_name || 'NA',
//         district: p.batch_id?.procurementCenter_id?.address?.district || 'NA',
//         actualIncidentCost: ekharidRecord?.procurementDetails?.incidentalExpenses || 0,
//         incidentCostRecieved: ekharidRecord?.procurementDetails?.incidentalExpenses || 0,
//         actualLaborCharges: ekharidRecord?.procurementDetails?.laborCharges || 0,
//         laborChargeRecieved: ekharidRecord?.procurementDetails?.laborCharges || 0,
//         laborChargesPayableDate: ekharidRecord?.procurementDetails?.laborChargesPayableDate || 'NA',
//         commissionRecieved: commissionFromEkharid ?? commissionFromBatch,
//         commissionChargesPayableDate: ekharidRecord?.procurementDetails?.commissionChargesPayableDate || 'NA',
//         status: p.payment_status || 'NA',
//       };
//     });

//     return res.status(200).json({
//       data: finalData,
//       status: 200,
//       totalRecords: totals,
//       totalPages: Math.ceil(totals / limit),
//       currentPage: page,
//       limit: finalData.length,
//     });
//   } catch (err) {
//     console.error('Error in incidentalExpense:', err);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: err.message,
//     });
//   }
// };




// module.exports.purchaseLifingMandiWise = async (req, res) => {
//   try {
//     const { user_id } = req;
//     const { commodity, state } = req.query;

//     const batches = await Batch.find({ seller_id: new mongoose.Types.ObjectId(user_id) })
//       .populate({
//         path: 'procurementCenter_id',
//         select: 'center_name address',
//       })
//       .populate({
//         path: 'associateOffer_id',
//         select: 'offeredQty',
//       })
//       .select('qty associateOffer_id procurementCenter_id intransit') // include intransit
//       .lean();

//     const centerGroups = {};

//     for (const batch of batches) {

//       const batchCommodity = batch.req_id?.product?.name;
//       const batchState = batch.procurementCenter_id?.address?.state;

//       // If filtering is applied, skip unmatched batches
//       if (commodity && batchCommodity !== commodity) continue;
//       if (state && batchState !== state) continue;

//       const centerName = batch.procurementCenter_id?.center_name;
//       const purchaseQty = batch.qty || 0;
//       const liftedQty = batch.intransit ? purchaseQty : 0;

//       if (!centerName) continue;

//       if (!centerGroups[centerName]) {
//         centerGroups[centerName] = {
//           center_name: centerName,
//           purchaseQty: 0,
//           liftedQty: 0,
//           balanceQty: 0,
//         };
//       }

//       centerGroups[centerName].purchaseQty += purchaseQty;
//       centerGroups[centerName].liftedQty += liftedQty;
//     }

//     const result = Object.values(centerGroups).map(entry => ({
//       ...entry,
//       balanceQty: entry.purchaseQty - entry.liftedQty,
//     }));

//     return sendResponse({
//       res,
//       status: 200,
//       message: _query.get("Purchase Lisfing Mandi Wise"),
//       data: result,
//     });

//   } catch (error) {
//     console.error('Error in getBatchesGroupedByCenter:', error);
//     return res.status(500).json({ message: 'Internal Server Error' });
//   }

// }

// module.exports.incidentalExpense = async (req, res) => {
//   try {
//     const {
//       commodity = [],
//       district = [],
//       schemeName = [],
//       page = 1,
//       limit = 10,
//       search = '',
//     } = req.body;

//     const { user_id } = req;
//     const filters = {};

//     if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
//       filters.seller_id = new mongoose.Types.ObjectId("67e38f0516a8db907254c63a");
//     }

//     const pipeline = [
//       { $match: filters },
//       {
//         $lookup: {
//           from: "requests",
//           localField: "req_id",
//           foreignField: "_id",
//           as: "request",
//         },
//       },
//       { $unwind: "$request" },
//       {
//         $addFields: {
//           commodity_id: "$request.product.commodity_id",
//           schemeId: "$request.product.schemeId",
//           commodityName: "$request.product.name",
//           isDispatched: { $ne: ["$dispatched.dispatched_at", null] },
//         },
//       },
//       {
//         $match: {
//           $or: [
//             { ekhridBatch: true },
//             { ekhridBatch: false, isDispatched: true },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "procurementcenters",
//           localField: "procurementCenter_id",
//           foreignField: "_id",
//           as: "procurementCenter",
//         },
//       },
//       { $unwind: "$procurementCenter" },
//     ];

//     if (commodity.length > 0) {
//       pipeline.push({
//         $match: {
//           commodity_id: {
//             $in: commodity.map(id => new mongoose.Types.ObjectId(id)),
//           },
//         },
//       });
//     }

//     if (schemeName.length > 0) {
//       pipeline.push({
//         $match: {
//           schemeId: {
//             $in: schemeName.map(id => new mongoose.Types.ObjectId(id)),
//           },
//         },
//       });
//     }

//     if (district.length > 0) {
//       let filterdata = await Promise.all(
//         district.map(async (x) => {
//           return await getDistrict(x);
//         })
//       );
//       let findDistrict = filterdata.map(x => { return x.district_title })
//       pipeline.push({
//         $match: {
//           "procurementCenter.address.district": { $in: findDistrict },
//         },
//       });
//     }

//     pipeline.push({
//       $facet: {
//         data: [
//           { $skip: (page - 1) * limit },
//           { $limit: limit },
//           {
//             $project: {
//               batchId: { $ifNull: ["$batchId", "NA"] },
//               ekhridBatch: { $ifNull: ["$ekhridBatch", false] },
//               commodity_id: { $ifNull: ["$commodity_id", false] },
//               schemeId: { $ifNull: ["$schemeId", false] },
//               commodity: { $ifNull: ["$commodityName", "NA"] },
//               amount: { $ifNull: ["$totalPrice", 0] },
//               quantity: { $ifNull: ["$qty", 0] },
//               mandiName: { $ifNull: ["$procurementCenter.center_name", "NA"] },
//               district: { $ifNull: ["$procurementCenter.address.district", "NA"] },
//               status: { $ifNull: ["$payment_status", "NA"] },
//             },
//           },
//         ],
//         totalCount: [{ $count: "count" }],
//       },
//     });

//     const result = await Batch.aggregate(pipeline);
//     const data = result[0]?.data || [];
//     const total = result[0]?.totalCount?.[0]?.count || 0;

//     const batchIds = data.map(item => +item.batchId).filter(id => id && id !== 'NA');
//     console.log(batchIds)
//     const summaryList = await eKharidHaryanaProcurementModel.aggregate([
//       {
//         $match: {
//           "warehouseData.exitGatePassId": { $in: batchIds }
//         }
//       },
//       {
//         $group: {
//           _id: "$warehouseData.exitGatePassId",
//           totalIncidentalExpenses: { $sum: "$procurementDetails.incidentalExpenses" },
//           totalLaborCharges: { $sum: "$procurementDetails.laborCharges" },
//           totalCommissionCharges: { $sum: "$procurementDetails.commissionCharges" },
//           laborChargesPayableDate: { $first: "$procurementDetails.laborChargesPayableDate" },
//           commissionChargesPayableDate: { $first: "$procurementDetails.commissionChargesPayableDate" },
//         }
//       },
//       {
//         $project: {
//           batchId: "$_id",
//           _id: 0,
//           totalIncidentalExpenses: 1,
//           totalLaborCharges: 1,
//           totalCommissionCharges: 1,
//           laborChargesPayableDate: 1,
//           commissionChargesPayableDate: 1
//         }
//       }
//     ]);

//     console.log(summaryList)
//     const summaryMap = {};
//     summaryList.forEach(item => {
//       summaryMap[item.batchId] = item;
//     });

//     const finalData = data.map(item => {
//       const summary = summaryMap[item.batchId?.toString()] || {};

//       return {
//         batchId: item.batchId || null,
//         commodity: item.commodity || 'NA',
//         commodityId: item.commodity_id || null,
//         schemeId: item.schemeId || null,
//         district: item.district || 'NA',
//         amount: item.amount || 0,
//         quantity: item.quantity || 0,
//         mandiName: item.mandiName || 'NA',
//         actualIncidentCost: summary.totalIncidentalExpenses || 0,
//         incidentCostRecieved: summary.totalIncidentalExpenses || 0,
//         actualLaborCharges: summary.totalLaborCharges || 0,
//         laborChargeRecieved: summary.totalLaborCharges || 0,
//         laborChargesPayableDate: summary.laborChargesPayableDate
//           ? new Date(summary.laborChargesPayableDate).toLocaleString("en-IN")
//           : "NA",
//         commissionRecieved: summary.totalCommissionCharges || 0,
//         commissionChargesPayableDate: summary.commissionChargesPayableDate
//           ? new Date(summary.commissionChargesPayableDate).toLocaleString("en-IN")
//           : "NA",
//         status: item.status || 'NA',
//       };
//     });

//     return res.status(200).json({
//       data: finalData,
//       totalRecords: total,
//       totalPages: Math.ceil(total / limit),
//       currentPage: page,
//       limit: finalData.length,
//     });
//   } catch (err) {
//     console.error("Error in incidentalExpense:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: err.message,
//     });
//   }
// };

module.exports.incidentalExpense = async (req, res) => {
  try {
    const {
      commodity = [],
      district = [],
      schemeName = [],
      page = 1,
      limit = 10,
      search = '',
      isExport = 1,
    } = req.body;

    const { user_id } = req;

    const filters = {};
    if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
      filters.seller_id = new mongoose.Types.ObjectId(user_id);
    }

    const pipeline = [
      { $match: filters },
      {
        $lookup: {
          from: "requests",
          localField: "req_id",
          foreignField: "_id",
          as: "request",
        },
      },
      { $unwind: "$request" },
      {
        $addFields: {
          commodity_id: "$request.product.commodity_id",
          schemeId: "$request.product.schemeId",
          commodityName: "$request.product.name",
          isDispatched: { $ne: ["$dispatched.dispatched_at", null] },
        },
      },
      {
        $match: {
          $or: [
            { ekhridBatch: true },
            { ekhridBatch: false, isDispatched: true },
          ],
        },
      },
      {
        $lookup: {
          from: "procurementcenters",
          localField: "procurementCenter_id",
          foreignField: "_id",
          as: "procurementCenter",
        },
      },
      { $unwind: "$procurementCenter" },
    ];

    if (commodity.length > 0) {
      const validCommodities = commodity.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
      pipeline.push({ $match: { commodity_id: { $in: validCommodities } } });
    }

    if (schemeName.length > 0) {
      const validSchemes = schemeName.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
      pipeline.push({ $match: { schemeId: { $in: validSchemes } } });
    }

    if (district.length > 0) {
      const filterdata = await Promise.all(
        district.map(async (x) => {
          try {
            const districtData = await getDistrict(x);
            return districtData?.district_title || null;
          } catch (err) {
            logger.error(`[IncidentalExpense] Error fetching district for ID ${x}: ${err.message}`);
            return null;
          }
        })
      );
      const validDistricts = filterdata.filter(Boolean);
      if (validDistricts.length) {
        pipeline.push({
          $match: {
            "procurementCenter.address.district": { $in: validDistricts },
          },
        });
      }
    }

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { commodityName: { $regex: regex } },
            { "procurementCenter.center_name": { $regex: regex } },
            { batchId: { $regex: regex } },
          ],
        },
      });
    }

    if (isExport == 2) {
      pipeline.push({
        $project: {
          batchId: { $toString: "$batchId" },
          commodity_id: 1,
          schemeId: 1,
          commodity: { $ifNull: ["$commodityName", "NA"] },
          amount: { $ifNull: ["$totalPrice", 0] },
          quantity: { $ifNull: ["$qty", 0] },
          mandiName: { $ifNull: ["$procurementCenter.center_name", "NA"] },
          district: { $ifNull: ["$procurementCenter.address.district", "NA"] },
          status: { $ifNull: ["$payment_status", "NA"] },
        },
      });
    } else {
      pipeline.push({
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                batchId: { $toString: "$batchId" },
                commodity_id: 1,
                schemeId: 1,
                commodity: { $ifNull: ["$commodityName", "NA"] },
                amount: { $ifNull: ["$totalPrice", 0] },
                quantity: { $ifNull: ["$qty", 0] },
                mandiName: { $ifNull: ["$procurementCenter.center_name", "NA"] },
                district: { $ifNull: ["$procurementCenter.address.district", "NA"] },
                status: { $ifNull: ["$payment_status", "NA"] },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      });
    }

    const result = await Batch.aggregate(pipeline);

    const data = isExport == 2 ? result : result[0]?.data || [];
    const total = isExport == 2 ? data.length : result[0]?.totalCount?.[0]?.count || 0;

    const batchIds = data.map(item => +item.batchId).filter(Boolean);
    const summaryList = await eKharidHaryanaProcurementModel.aggregate([
      {
        $match: {
          "warehouseData.exitGatePassId": { $in: batchIds }
        }
      },
      {
        $group: {
          _id: "$warehouseData.exitGatePassId",
          totalIncidentalExpenses: { $sum: "$procurementDetails.incidentalExpenses" },
          totalLaborCharges: { $sum: "$procurementDetails.laborCharges" },
          totalCommissionCharges: { $sum: "$procurementDetails.commissionCharges" },
          laborChargesPayableDate: { $first: "$procurementDetails.laborChargesPayableDate" },
          commissionChargesPayableDate: { $first: "$procurementDetails.commissionChargesPayableDate" },
        }
      },
      {
        $project: {
          batchId: "$_id",
          _id: 0,
          totalIncidentalExpenses: 1,
          totalLaborCharges: 1,
          totalCommissionCharges: 1,
          laborChargesPayableDate: 1,
          commissionChargesPayableDate: 1
        }
      }
    ]);

    const summaryMap = {};
    summaryList.forEach(item => {
      summaryMap[item.batchId] = item;
    });

    const finalData = data.map(item => {
      const summary = summaryMap[+item.batchId] || {};
      return {
        batchId: item.batchId,
        commodity: item.commodity,
        commodityId: item.commodity_id,
        schemeId: item.schemeId,
        district: item.district,
        amount: item.amount,
        quantity: item.quantity,
        mandiName: item.mandiName,
        actualIncidentCost: summary.totalIncidentalExpenses || 0,
        incidentCostRecieved: summary.totalIncidentalExpenses || 0,
        actualLaborCharges: summary.totalLaborCharges || 0,
        laborChargeRecieved: summary.totalLaborCharges || 0,
        laborChargesPayableDate: summary.laborChargesPayableDate
          ? new Date(summary.laborChargesPayableDate).toLocaleString("en-IN")
          : "NA",
        commissionRecieved: summary.totalCommissionCharges || 0,
        commissionChargesPayableDate: summary.commissionChargesPayableDate
          ? new Date(summary.commissionChargesPayableDate).toLocaleString("en-IN")
          : "NA",
        status: item.status || false,
      };
    });

    if (isExport == 2) {
      const exportRows = finalData.map(row => ({
        "Batch ID": row.batchId,
        "Commodity": row.commodity,
        "District": row.district,
        "Mandi Name": row.mandiName,
        "Quantity (MT)": row.quantity,
        "Amount": row.amount,
        "Actual Incident Cost": row.actualIncidentCost,
        "Labor Charges": row.actualLaborCharges,
        "Commission Charges": row.commissionRecieved,
        "Labor Charges Payable Date": row.laborChargesPayableDate,
        "Commission Charges Payable Date": row.commissionChargesPayableDate,
        "Payment Status": row.status || false,
      }));

      logger.info(`[IncidentalExpense] Exporting ${exportRows.length} rows`);
      return dumpJSONToExcel(req, res, {
        data: exportRows,
        fileName: `IncidentalExpense.xlsx`,
        worksheetName: `Incidental Expenses`,
      });
    }

    return sendResponse({
      res,
      status: 200,
      data: {
        data: finalData,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit: finalData.length,
      },
      message: "Incidental expenses fetched successfully"
    });

  } catch (err) {
    logger.error(`[IncidentalExpense] Error: ${err.message}`, err);
    return sendResponse({
      res,
      status: 500,
      message: "Server error while fetching incidental expenses",
      errors: err.message
    });
  }
};



module.exports.purchaseLifingMandiWise = async (req, res) => {
  try {
    const { user_id } = req;
    const { commodity, state, district, schemeName } = req.query;

    //convert schemeName 
    let schemeArray = [];
    if (schemeName) {
      schemeArray = schemeName.split(',').map(s => s.trim().toLowerCase());
    }

    const batches = await Batch.find({ seller_id: new mongoose.Types.ObjectId(user_id) })
      .populate({
        path: 'procurementCenter_id',
        select: 'center_name address',
      })
      .populate({
        path: 'associateOffer_id',
        select: 'offeredQty',
      })
      .populate({
        path: 'req_id',
        select: 'product.name product.schemeId'
      })
      .select('qty associateOffer_id procurementCenter_id req_id intransit')
      .lean();

    const centerGroups = {};

    for (const batch of batches) {
      const batchCommodity = batch.req_id?.product?.name?.toLowerCase();
      const batchState = batch.procurementCenter_id?.address?.state?.toLowerCase();
      const batchDistrict = batch.procurementCenter_id?.address?.district?.toLowerCase();
      const batchSchemeId = batch.req_id?.product?.schemeId?.toString().toLowerCase();

      //skip unmatch batche by commodity, state, district
      if (commodity) {
        const escapedCommodity = escapeRegex(commodity.toLowerCase());
        const regex = new RegExp(escapedCommodity, 'i');

        // if (!batchCommodity || !batchCommodity.some((item) => regex.test(item))) continue;
        if (!batchCommodity || !regex.test(batchCommodity)) continue;
      }
      if (state && (!batchState || !batchState.includes(state.toLowerCase()))) continue;
      if (district && (!batchDistrict || !batchDistrict.includes(district.toLowerCase()))) continue;

      //skip unmatch batche by schemeName filter if provided
      if (schemeArray.length > 0) {
        if (!batchSchemeId || !schemeArray.includes(batchSchemeId)) continue;
      }

      const centerName = batch.procurementCenter_id?.center_name;
      const purchaseQty = batch.qty || 0;
      const liftedQty = batch.intransit ? purchaseQty : 0;

      if (!centerName) continue;

      if (!centerGroups[centerName]) {
        centerGroups[centerName] = {
          center_name: centerName,
          purchaseQty: 0,
          liftedQty: 0,
          balanceQty: 0,
        };
      }

      centerGroups[centerName].purchaseQty += purchaseQty;
      centerGroups[centerName].liftedQty += liftedQty;
    }

    const result = Object.values(centerGroups).map(entry => ({
      ...entry,
      balanceQty: entry.purchaseQty - entry.liftedQty,
    }));

    if (result.length === 0) {
      //if not matched then show no data
      return sendResponse({
        res,
        status: 200,
        message: "No data found for given filters",
        data: [],
      });
    }

    return sendResponse({
      res,
      status: 200,
      message: _query.get("Purchase Lifting Mandi Wise"),
      data: result,
    });

  } catch (error) {
    console.error('Error in purchaseLifingMandiWise:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};





// module.exports.purchaseLifingMonthWise = async (req, res) => {
//   try {
//     const { user_id } = req;
//     const { commodity, state } = req.query;

//     const batches = await Batch.find({ seller_id: new mongoose.Types.ObjectId(user_id) })
//       .populate({
//         path: 'req_id',
//         select: 'product',
//         populate: {
//           path: 'product',
//           select: 'name'
//         }
//       })
//       .populate({
//         path: 'procurementCenter_id',
//         select: 'center_name address',
//       })
//       .populate({
//         path: 'associateOffer_id',
//         select: 'offeredQty',
//       })
//       .select('qty associateOffer_id procurementCenter_id req_id intransit createdAt') // include intransit
//       .lean();

//     const centerGroups = {};
//     const monthGroups = {};

//     for (const batch of batches) {

//       const batchCommodity = batch.req_id?.product?.name;
//       const batchState = batch.procurementCenter_id?.address?.state;

//       // If filtering is applied, skip unmatched batches
//       if (commodity && batchCommodity !== commodity) continue;
//       if (state && batchState !== state) continue;

//       const purchaseQty = batch.qty || 0;
//       const liftedQty = batch.intransit ? purchaseQty : 0;

//       // const month = moment(batch.createdAt).format('YYYY-MM');
//       const month = moment(batch.createdAt).format('MMMM YYYY');

//       if (!monthGroups[month]) {
//         monthGroups[month] = {
//           month,
//           purchaseQty: 0,
//           liftedQty: 0,
//           balanceQty: 0,
//         };
//       }

//       monthGroups[month].purchaseQty += purchaseQty;
//       monthGroups[month].liftedQty += liftedQty;
//     }

//     const result = Object.values(monthGroups).map(entry => ({
//       ...entry,
//       balanceQty: entry.purchaseQty - entry.liftedQty,
//     }));

//     return sendResponse({
//       res,
//       status: 200,
//       message: _query.get("Purchase Lisfing Month Wise"),
//       data: result,
//     });
//   } catch (error) {
//     console.error('Error in getBatchesGroupedByCenter:', error);
//     return res.status(500).json({ message: 'Internal Server Error' });
//   }

// }



module.exports.purchaseLifingMandiWise = async (req, res) => {
  try {
    const { user_id } = req;
    const { commodity = [], district = [], schemeName = [] } = req.body;

    logger.info("[purchaseLifingMandiWise] Fetching mandi-wise data", {
      user_id,
      commodity,
      district,
      schemeName,
    });

    const batches = await Batch.find({ seller_id: new mongoose.Types.ObjectId(user_id) })
      .populate({
        path: 'procurementCenter_id',
        select: 'center_name address',
      })
      .populate({
        path: 'req_id',
        select: 'product',
        populate: { path: 'product', select: 'name schemeId' }
      })
      .select('qty procurementCenter_id req_id intransit')
      .lean();

    let districtNames = [];
    if (district.length > 0) {
      const districtData = await Promise.all(
        district.map(async (id) => {
          try {
            const data = await getDistrict(id);
            return data?.district_title;
          } catch (err) {
            logger.error(`[purchaseLifingMandiWise] District fetch failed for ${id}: ${err.message}`);
            return null;
          }
        })
      );
      districtNames = districtData.filter(Boolean).map(d => d.toLowerCase());
    }
    const commodityLower = commodity.map(c => c.toLowerCase());
    const schemeLower = schemeName.map(s => s.toLowerCase());

    const centerGroups = {};

    for (const batch of batches) {
      const center = batch.procurementCenter_id;
      const product = batch.req_id?.product;

      if (!center || !product) continue;

      const mandiName = center.center_name;
      const districtName = center.address?.district?.toLowerCase();
      const districtId = center.address?.district_id;
      const commodityName = product.name?.toLowerCase();
      const schemeIdStr = String(product.schemeId || "").toLowerCase();

      // Apply filters
      if (commodityLower.length && (!commodityName || !commodityLower.includes(commodityName))) continue;
      if (districtNames.length && (!districtName || !districtNames.includes(districtName))) continue;
      if (schemeLower.length && (!schemeIdStr || !schemeLower.includes(schemeIdStr))) continue;

      const purchaseQty = batch.qty || 0;
      const liftedQty = batch.intransit ? purchaseQty : 0;

      if (!centerGroups[mandiName]) {
        centerGroups[mandiName] = {
          center_name: mandiName,
          purchaseQty: 0,
          liftedQty: 0,
          balanceQty: 0,
          district: center.address?.district || 'NA',
        };
      }

      centerGroups[mandiName].purchaseQty += purchaseQty;
      centerGroups[mandiName].liftedQty += liftedQty;
    }

    const result = Object.values(centerGroups).map(entry => ({
      ...entry,
      purchaseQty: entry.purchaseQty.toFixed(2),
      liftedQty: entry.liftedQty.toFixed(2),
      balanceQty: (entry.purchaseQty - entry.liftedQty).toFixed(2),
    }));

    return sendResponse({
      res,
      status: 200,
      message: result.length > 0
        ? "Purchase Lifting Mandi Wise data fetched successfully"
        : "No data found for given filters",
      data: result,
    });

  } catch (error) {
    logger.error("[purchaseLifingMandiWise] Error:", error);
    return sendResponse({
      res,
      status: 500,
      message: "Server error while fetching Mandi-wise lifting",
      errors: error.message,
    });
  }
};





// module.exports.purchaseLifingMonthWise = async (req, res) => {
//   try {
//     const { user_id } = req;
//     const { commodity, state, district, schemeName } = req.query;

//     //scheme filter array
//     let schemeArray = [];
//     if (schemeName) {
//       schemeArray = schemeName.split(',').map(s => s.trim().toLowerCase());
//     }

//     const batches = await Batch.find({ seller_id: new mongoose.Types.ObjectId(user_id) })
//       .populate({
//         path: 'req_id',
//         select: 'product',
//         populate: {
//           path: 'product',
//           select: 'name schemeId'
//         }
//       })
//       .populate({
//         path: 'procurementCenter_id',
//         select: 'center_name address',
//       })
//       .populate({
//         path: 'associateOffer_id',
//         select: 'offeredQty',
//       })
//       .select('qty associateOffer_id procurementCenter_id req_id intransit createdAt')
//       .lean();

//     const monthGroups = {};

//     for (const batch of batches) {
//       const batchCommodity = batch.req_id?.product?.name?.toLowerCase();
//       const batchState = batch.procurementCenter_id?.address?.state?.toLowerCase();
//       const batchDistrict = batch.procurementCenter_id?.address?.district?.toLowerCase();
//       const batchSchemeId = batch.req_id?.product?.schemeId?.toString().toLowerCase();

//       //Filter applied here
//       if (commodity && (!batchCommodity || !batchCommodity.includes(commodity.toLowerCase()))) continue;
//       if (state && (!batchState || !batchState.includes(state.toLowerCase()))) continue;
//       if (district && (!batchDistrict || !batchDistrict.includes(district.toLowerCase()))) continue;
//       if (schemeArray.length > 0 && (!batchSchemeId || !schemeArray.includes(batchSchemeId))) continue;

//       const purchaseQty = batch.qty || 0;
//       const liftedQty = batch.intransit ? purchaseQty : 0;
//       const month = moment(batch.createdAt).format('MMMM YYYY');

//       if (!monthGroups[month]) {
//         monthGroups[month] = {
//           month,
//           purchaseQty: 0,
//           liftedQty: 0,
//           balanceQty: 0,
//         };
//       }

//       monthGroups[month].purchaseQty += purchaseQty;
//       monthGroups[month].liftedQty += liftedQty;
//     }

//     const result = Object.values(monthGroups).map(entry => ({
//       ...entry,
//       balanceQty: entry.purchaseQty - entry.liftedQty,
//     }));

//     if (result.length === 0) {
//       return sendResponse({
//         res,
//         status: 200,
//         message: 'No data found for given filters',
//         data: [],
//       });
//     }

//     return sendResponse({
//       res,
//       status: 200,
//       message: _query.get("Purchase Lifting Month Wise"),
//       data: result,
//     });

//   } catch (error) {
//     console.error('Error in purchaseLifingMonthWise:', error);
//     return res.status(500).json({ message: 'Internal Server Error' });
//   }
// };

module.exports.purchaseLifingMonthWise = async (req, res) => {
  try {
    const { user_id } = req;
    const {
      commodity = [],
      district = [],
      schemeName = []
    } = req.body;

    logger.info("[purchaseLifingMonthWise] Filters received", {
      user_id,
      commodity,
      district,
      schemeName,
    });

    const commodityIds = commodity.map((id) => String(id));
    const schemeIds = schemeName.map((id) => String(id));

    // Convert district IDs to names
    let districtTitles = [];
    if (district.length > 0) {
      const districtData = await Promise.all(
        district.map(async (id) => {
          try {
            const result = await getDistrict(id);
            return result?.district_title;
          } catch (err) {
            logger.error(`[purchaseLifingMonthWise] getDistrict failed for ${id}: ${err.message}`);
            return null;
          }
        })
      );
      districtTitles = districtData.filter(Boolean).map((d) => d.toLowerCase());
    }

    const batches = await Batch.find({
      seller_id: new mongoose.Types.ObjectId(user_id),
    })
      .populate({
        path: 'req_id',
        select: 'product',
      })
      .populate({
        path: 'procurementCenter_id',
        select: 'center_name address',
      })
      .select('qty procurementCenter_id req_id intransit createdAt')
      .lean();

    const monthGroups = {};

    for (const batch of batches) {
      const center = batch.procurementCenter_id;
      const product = batch.req_id?.product;

      if (!product || !center?.address) continue;

      const districtName = center.address.district?.toLowerCase();
      const batchDistrictMatch =
        districtTitles.length === 0 || (districtName && districtTitles.includes(districtName));

      // Ensure product is single object (not array)
      const schemeIdStr = String(product.schemeId);
      const commodityIdStr = String(product.commodity_id);

      const schemeMatch = schemeIds.length === 0 || schemeIds.includes(schemeIdStr);
      const commodityMatch = commodityIds.length === 0 || commodityIds.includes(commodityIdStr);

      if (!batchDistrictMatch || !schemeMatch || !commodityMatch) continue;

      const purchaseQty = batch.qty || 0;
      const liftedQty = batch.intransit ? purchaseQty : 0;
      const monthKey = moment(batch.createdAt).format('YYYY-MM'); // Sortable key
      const monthLabel = moment(batch.createdAt).format('MMMM YYYY'); // Display label

      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = {
          month: monthLabel,
          purchaseQty: 0,
          liftedQty: 0,
          balanceQty: 0,
        };
      }

      monthGroups[monthKey].purchaseQty += purchaseQty;
      monthGroups[monthKey].liftedQty += liftedQty;
    }

    const result = Object.values(monthGroups)
      .map(entry => ({
        ...entry,
        purchaseQty: entry.purchaseQty.toFixed(2),
        liftedQty: entry.liftedQty.toFixed(2),
        balanceQty: (entry.purchaseQty - entry.liftedQty).toFixed(2),
      }))
      .sort((a, b) =>
        moment(a.month, "MMMM YYYY").toDate() - moment(b.month, "MMMM YYYY").toDate()
      );

    return sendResponse({
      res,
      status: 200,
      message: result.length > 0
        ? "Purchase Lifting Month Wise fetched successfully."
        : "No data found for given filters.",
      data: result,
    });
  } catch (error) {
    logger.error("[purchaseLifingMonthWise] Error:", error);
    return sendResponse({
      res,
      status: 500,
      message: "Server error while fetching Month-wise lifting",
      errors: error.message,
    });
  }
};

module.exports.getDistrict = async (req, res) => {
  try {
    const { state_title, district_titles } = req.query;

    if (!state_title) {
      return sendResponse({
        res,
        status: 400,
        message: "State title is required",
      });
    }

    //district_titles it can be array or comma-separated string
    let districtArray = [];
    if (district_titles) {
      districtArray = Array.isArray(district_titles)
        ? district_titles
        : district_titles.split(',').map(d => d.trim());
    }

    const pipeline = [
      { $unwind: "$states" },
      {
        $match: {
          "states.state_title": state_title,
          "states.status": "active",
        },
      },
      { $unwind: "$states.districts" },
      {
        $match: {
          "states.districts.status": "active",
          ...(districtArray.length > 0 && {
            "states.districts.district_title": { $in: districtArray },
            "states.districts._id": { $in: districtArray }
          }),
        },
      },
      {
        $project: {
          _id: 0,
          district_title: "$states.districts.district_title",
          district_id: "$states.districts._id"
        },
      },
    ];

    const district_list = await StateDistrictCity.aggregate(pipeline);

    return sendResponse({
      res,
      message: "",
      data: district_list,
    });
  } catch (err) {
    console.error("ERROR: ", err);
    return sendResponse({
      res,
      status: 500,
      message: err.message,
    });
  }
};



//   try {
//     const { state_title } = req.query;

//     if (!state_title) {
//       return sendResponse({
//         res,
//         status: 400,
//         message: "State code is required",
//       });
//     }

//     const district_list = await StateDistrictCity.aggregate([
//       { $unwind: "$states" },
//       {
//         $match: {
//           "states.state_title": state_title,
//           "states.status": "active",
//         },
//       },
//       { $unwind: "$states.districts" },
//       {
//         $match: {
//           "states.districts.status": "active",
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           district_title: "$states.districts.district_title",
//         },
//       },
//     ]);

//     return sendResponse({
//       res,
//       message: "",
//       data: district_list,
//     });
//   } catch (err) {
//     console.error("ERROR: ", err);
//     return sendResponse({
//       res,
//       status: 500,
//       message: err.message,
//     });
//   }
// };