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
    const { schemeName, commodity, district } = req.query;
    const userObjectId = new mongoose.Types.ObjectId(user_id);

    let widgetDetails = {};

    //filter
    const commodityArray = commodity ? (Array.isArray(commodity) ? commodity : [commodity]) : [];
    const regexCommodity = commodityArray.map(name => new RegExp(name, 'i'));

    const schemeArray = schemeName ? (Array.isArray(schemeName) ? schemeName : [schemeName]) : [];
    const objectIdArray = schemeArray
      .map(id => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null))
      .filter(id => id !== null);

    const districtArray = district ? (Array.isArray(district) ? district : [district]) : [];
    const regexDistrict = districtArray.map(title => new RegExp(`^${title}$`, 'i'));

    const districtDocs = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      { $unwind: "$states.districts" },
      { $match: { "states.districts.district_title": { $in: regexDistrict } } },
      { $project: { _id: "$states.districts._id" } }
    ]);
    const districtObjectIds = districtDocs.map(d => d._id);

    //farmer count
    const baseFarmerQuery = { associate_id: userObjectId };
    if (districtArray.length || commodityArray.length || schemeArray.length) {
      const requestFilter = {};
      if (commodityArray.length) requestFilter['product.name'] = { $in: regexCommodity };
      if (objectIdArray.length) requestFilter['product.schemeId'] = { $in: objectIdArray };

      const requestIds = await RequestModel.find(requestFilter).distinct('_id');
      const paymentFarmerIds = await Payment.find({ req_id: { $in: requestIds } }).distinct('farmer_id');

      const farmerFilterQuery = { _id: { $in: paymentFarmerIds } };
      if (districtObjectIds.length) farmerFilterQuery['address.district_id'] = { $in: districtObjectIds };

      const filteredFarmerIds = await farmer.find(farmerFilterQuery).distinct('_id');
      baseFarmerQuery._id = { $in: filteredFarmerIds };
    }
    widgetDetails.farmertotal = await farmer.countDocuments(baseFarmerQuery);

    //procurementcenter count
    const basePOCQuery = { user_id: userObjectId };
    if (districtArray.length || commodityArray.length || schemeArray.length) {
      const requestFilter = {};
      if (commodityArray.length) requestFilter['product.name'] = { $in: regexCommodity };
      if (objectIdArray.length) requestFilter['product.schemeId'] = { $in: objectIdArray };

      const requestIds = await RequestModel.find(requestFilter).distinct('_id');
      const batchPOCs = await Batch.find({ req_id: { $in: requestIds } }).distinct('procurementCenter_id');

      basePOCQuery._id = { $in: batchPOCs };
      if (districtArray.length) basePOCQuery['address.district'] = { $in: regexDistrict };
    }
    widgetDetails.procurementCenter = await ProcurementCenter.countDocuments(basePOCQuery);

    //total purchased quantity
    const purchasedMatch = { seller_id: userObjectId };
    if (commodityArray.length || schemeArray.length || districtArray.length) {
      const requestFilter = {};
      if (commodityArray.length) requestFilter['product.name'] = { $in: regexCommodity };
      if (objectIdArray.length) requestFilter['product.schemeId'] = { $in: objectIdArray };
      const requestIds = await RequestModel.find(requestFilter).distinct('_id');

      if (requestIds.length) purchasedMatch.req_id = { $in: requestIds };
    }
    const purchased = await Batch.aggregate([
      { $match: purchasedMatch },
      { $group: { _id: null, totalQty: { $sum: "$qty" } } }
    ]);
    widgetDetails.totalPurchased = purchased[0]?.totalQty || 0;

    //total lifting quantity
    const liftingMatch = { seller_id: userObjectId, intransit: { $exists: true, $ne: null } };
    if (commodityArray.length || schemeArray.length || districtArray.length) {
      const requestFilter = {};
      if (commodityArray.length) requestFilter['product.name'] = { $in: regexCommodity };
      if (objectIdArray.length) requestFilter['product.schemeId'] = { $in: objectIdArray };
      const requestIds = await RequestModel.find(requestFilter).distinct('_id');

      if (requestIds.length) liftingMatch.req_id = { $in: requestIds };
    }
    const lifting = await Batch.aggregate([
      { $match: liftingMatch },
      { $group: { _id: null, totalQty: { $sum: "$qty" } } }
    ]);
    widgetDetails.totalLifting = lifting[0]?.totalQty || 0;

    //total Lifting Days(suggeted by Neeraj sir)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcMidnight = new Date(now.setUTCHours(0, 0, 0, 0));
    const startOfDayIST = new Date(utcMidnight.getTime() - istOffset);
    const endOfDayIST = new Date(startOfDayIST.getTime() + 24 * 60 * 60 * 1000 - 1);

    const dayPurchaseMatch = {
      seller_id: userObjectId,
      delivered: { $exists: true, $ne: null },
      updatedAt: { $gte: startOfDayIST, $lt: endOfDayIST }
    };
    const dayPurchase = await Batch.aggregate([
      { $match: dayPurchaseMatch },
      { $group: { _id: null, totalQty: { $sum: "$qty" } } }
    ]);
    widgetDetails.totalDayPurchase = dayPurchase[0]?.totalQty || 0;

    const todayLiftingBatches = await Batch.find({
      seller_id: userObjectId,
      intransit: { $exists: true, $ne: null },
      updatedAt: { $gte: startOfDayIST, $lt: endOfDayIST }
    }).select('qty');

    const totalLiftingQtyToday = todayLiftingBatches.reduce((sum, b) => sum + (b.qty || 0), 0);
    widgetDetails.totalDaysLifting = totalLiftingQtyToday;

    return sendResponse({
      res,
      status: 200,
      message: _query.get("Widget List"),
      data: widgetDetails
    });
  } catch (error) {
    console.error("Error in widgetList:", error);
    return sendResponse({
      res,
      status: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
});




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


module.exports.mandiWiseProcurement = async (req, res) => {
  try {
    const { user_id } = req;
    const { commodity, district, schemeName, search } = req.query;

    // Normalize query params to arrays or empty arrays
    const commodityArray = commodity
      ? Array.isArray(commodity)
        ? commodity
        : commodity.split(',').map((c) => c.trim())
      : [];
    const districtArray = district
      ? Array.isArray(district)
        ? district
        : district.split(',').map((d) => d.trim())
      : [];
    const schemeArray = schemeName
      ? Array.isArray(schemeName)
        ? schemeName
        : schemeName.split(',').map((s) => s.trim())
      : [];

    // Pagination
    let page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const isExport = parseInt(req.query.isExport) === 1;
    const centerSearch = req.query.search?.trim();


    // Get payment batch IDs
    const payments = await Payment.find().lean();
    const batchIdSet = [...new Set(payments.map((p) => String(p.batch_id)).filter(Boolean))];
  

    const pipeline = [
      {
        $match: {
          _id: { $in: batchIdSet.map((id) => new mongoose.Types.ObjectId(id)) },
          seller_id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "seller_id",
          foreignField: "_id",
          as: "seller",
        },
      },
      { $unwind: "$seller" },
      {
        $lookup: {
          from: "procurementcenters",
          localField: "procurementCenter_id",
          foreignField: "_id",
          as: "center",
        },
      },
      { $unwind: "$center" },
      {
        $lookup: {
          from: "associateoffers",
          localField: "seller_id",
          foreignField: "seller_id",
          as: "associateOffer",
        },
      },
      {
        $unwind: {
          path: "$associateOffer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "requests",
          localField: "req_id",
          foreignField: "_id",
          as: "relatedRequest",
        },
      },
      {
        $unwind: {
          path: "$relatedRequest",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          liftedDataDays: {
            $cond: [
              { $and: ["$createdAt", "$relatedRequest.createdAt"] },
              {
                $dateDiff: {
                  startDate: "$relatedRequest.createdAt",
                  endDate: {
                    $cond: [
                      { $ifNull: ["$deliveryDate", false] },
                      "$deliveryDate",
                      "$updatedAt"
                    ]
                  },
                  unit: "day",
                },
              },
              null,
            ],
          },
          purchaseDays: {
            $cond: [
              { $and: ["$updatedAt", "$relatedRequest.createdAt"] },
              {
                $dateDiff: {
                  startDate: "$relatedRequest.createdAt",
                  endDate: "$updatedAt",
                  unit: "day",
                },
              },
              null,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$procurementCenter_id",
          centerName: { $first: "$center.center_name" },
          Status: { $first: "$center.active" },
          centerId: { $first: "$center._id" },
          // Use procurement center district here:
          district: { $first: "$center.address.district" },
          associate_name: {
            $first: "$seller.basic_details.associate_details.associate_name",
          },
          totalPurchase: { $sum: "$qty" },
          liftedQty: {
            $sum: {
              $cond: [
                { $ne: [{ $ifNull: ["$intransit", null] }, null] },
                "$qty",
                0
              ]
            }
          },
          offeredQty: { $first: { $ifNull: ["$associateOffer.offeredQty", 0] } },
          liftedDataDays: { $first: "$liftedDataDays" },
          purchaseDays: { $first: "$purchaseDays" },
          productName: { $first: "$relatedRequest.product.name" },
          schemeId: { $first: "$relatedRequest.product.schemeId" },
        },
      },
      {
        $addFields: {
          balanceMandi: { $subtract: ["$offeredQty", "$liftedQty"] },
          liftingPercentage: {
            $cond: {
              if: { $gt: ["$offeredQty", 0] },
              then: {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$liftedQty", "$offeredQty"] },
                      100,
                    ],
                  },
                  2,
                ],
              },
              else: 0,
            },
          },
        },
      },
    ];

    // Apply filters **after grouping** on grouped fields
    const filterMatch = {};
    if (districtArray.length > 0) {
      filterMatch.district = { $in: districtArray };
    }

    if (commodityArray.length > 0) {
      filterMatch.productName = { $in: commodityArray };
    }

    if (schemeArray.length > 0) {
      filterMatch.schemeId = { $in: schemeArray };
    }

    if (Object.keys(filterMatch).length > 0) {
      pipeline.push({ $match: filterMatch });
    }

    // Center name search filter if any
    if (centerSearch && centerSearch.length > 0) {
      const searchRegex = new RegExp(centerSearch, "i");
      pipeline.push({
        // $match: { centerName: { $regex: centerSearch, $options: "i" } },
        $match: {
          $or: [
            { centerName: { $regex: searchRegex } },
            { productName: { $regex: searchRegex } },
            { district: { $regex: searchRegex } },
          ],
        },
      });
      page = 1;
    }

    pipeline.push({ $sort: { centerName: 1 } });

    const aggregated = await Batch.aggregate(pipeline);

    // No records message
    if (aggregated.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "No records found for the applied filters",
        data: [],
      });
    }

    if (isExport) {
      const exportRows = aggregated.map((item) => ({
        "Center Name": item?.centerName || "NA",
        District: item?.district || "NA",
        "Associate Name": item?.associate_name || "NA",
        "Product Name": item?.productName || "NA",
        "Offered Qty": item?.offeredQty || 0,
        "Lifted Qty": item?.liftedQty || 0,
        "Balance Qty": item?.balanceMandi || 0,
        "Lifting %": item?.liftingPercentage + "%" || "0%",
        "Lifted Days": item?.liftedDataDays ?? "NA",
        "Purchase Days": item?.purchaseDays ?? "NA",
        Status: item?.Status ? "Active" : "Inactive",
      }));

      return dumpJSONToExcel(req, res, {
        data: exportRows,
        fileName: `MandiWiseProcurementData.xlsx`,
        worksheetName: `Mandi Data`,
      });
    }

    const totalRecords = aggregated.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedData = aggregated.slice(skip, skip + limit);

    return res.status(200).json({
      status: 200,
      data: {
        page,
        limit,
        totalPages,
        totalRecords,
        data: paginatedData,
        message: "Mandi Procurement Data Fetched",
      },
    });
  } catch (error) {
    console.error("Error in mandiWiseProcurement:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.incidentalExpense = async (req, res) => {
  try {
    const {
      search = '',
      commodity = '',
      state = '',
      season = '',
      district = '',
      schemeName = '',
    } = req.query;

    const { user_id } = req;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    const filters = {};

    if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
      filters.associate_id = new mongoose.Types.ObjectId(user_id);
    }

    let payments = await Payment.find(filters)
      .select({
        batch_id: 1,
        req_id: 1,
        associate_id: 1,
        amount: 1,
        qtyProcured: 1,
        payment_status: 1,
      })
      .populate({
        path: 'batch_id',
        select: 'batchId procurementCenter_id qty',
        populate: {
          path: 'procurementCenter_id',
          select: 'center_name address.district address.state',
        },
      })
      .populate({
        path: 'req_id',
        select: 'product.name product.season product.schemeId',
      })
      .sort({ createdAt: -1 });

    if (search) {
      const lowerSearch = search.toLowerCase();
      payments = payments.filter((p) => {
        const batchId = p.batch_id?.batchId?.toString().toLowerCase() || '';
        const mandiName = p.batch_id?.procurementCenter_id?.center_name?.toLowerCase() || '';
        const districtName = p.batch_id?.procurementCenter_id?.address?.district?.toLowerCase() || '';
         const commodityName = p.req_id?.product?.name?.toLowerCase() || '';

        //search by batchId, mandiName, district, commodity
        return (
          batchId.includes(lowerSearch) ||
          mandiName.includes(lowerSearch) ||
          districtName.includes(lowerSearch)||
          commodityName.includes(lowerSearch)
        );
      });
    }

    if (state) {
      const lowerState = state.toLowerCase();
      payments = payments.filter((p) => {
        const stateVal = p.batch_id?.procurementCenter_id?.address?.state?.toLowerCase() || '';
        return stateVal.includes(lowerState);
      });
    }

    if (commodity) {
      const lowerCommodity = commodity.toLowerCase();
      payments = payments.filter((p) => {
        const comm = p.req_id?.product?.name?.toLowerCase() || '';
        return comm.includes(lowerCommodity);
      });
    }

    if (season) {
      const lowerSeason = season.toLowerCase();
      payments = payments.filter((p) => {
        const seasonVal = p.req_id?.product?.season?.toLowerCase() || '';
        return seasonVal.includes(lowerSeason);
      });
    }

    if (district) {
      const lowerDistrict = district.toLowerCase();
      payments = payments.filter((p) => {
        const districtVal = p.batch_id?.procurementCenter_id?.address?.district?.toLowerCase() || '';
        return districtVal.includes(lowerDistrict);
      });
    }

    if (schemeName) {
      const schemeArray = schemeName.split(',').map((s) => s.trim().toLowerCase());
      payments = payments.filter((p) => {
        const schemeId = p.req_id?.product?.schemeId;
        if (!schemeId) return false;
        const schemeIdStr = schemeId.toString().toLowerCase();
        return schemeArray.includes(schemeIdStr);
      });
    }

    const totals = payments.length;
    const paymentPage = payments.slice(skip, skip + limit);

    if (!paymentPage.length) {
      return res.status(200).json({
        success: true,
        data: [],
        totalRecords: 0,
        totalPages: 0,
        currentPage: page,
        count: 0,
      });
    }

    const batchIdNumbers = paymentPage
      .map((p) => Number(p.batch_id?.batchId))
      .filter((n) => !isNaN(n));

    const ekharidList = await eKharidHaryanaProcurementModel.find({
      'warehouseData.exitGatePassId': { $in: batchIdNumbers },
    })
      .select({
        'warehouseData.exitGatePassId': 1,
        'procurementDetails.incidentalExpenses': 1,
        'procurementDetails.laborCharges': 1,
        'procurementDetails.laborChargesPayableDate': 1,
        'procurementDetails.commissionCharges': 1,
        'procurementDetails.commissionChargesPayableDate': 1,
      })
      .lean();

    const ekharidMap = new Map();
    ekharidList.forEach((e) => {
      ekharidMap.set(Number(e.warehouseData.exitGatePassId), e);
    });

    const finalData = paymentPage.map((p) => {
      const batchCode = Number(p.batch_id?.batchId);
      const ekharidRecord = ekharidMap.get(batchCode);

      return {
        batchId: p.batch_id?.batchId || null,
        commodity: p.req_id?.product?.name || 'NA',
        amount: p.amount,
        quantity: p.qtyProcured,
        mandiName: p.batch_id?.procurementCenter_id?.center_name || 'NA',
        district: p.batch_id?.procurementCenter_id?.address?.district || 'NA',
        actualIncidentCost: ekharidRecord?.procurementDetails?.incidentalExpenses || 0,
        incidentCostRecieved: ekharidRecord?.procurementDetails?.incidentalExpenses || 0,
        actualLaborCharges: ekharidRecord?.procurementDetails?.laborCharges || 0,
        laborChargeRecieved: ekharidRecord?.procurementDetails?.laborCharges || 0,
        laborChargesPayableDate: ekharidRecord?.procurementDetails?.laborChargesPayableDate || 'NA',
        commissionRecieved: ekharidRecord?.procurementDetails?.commissionCharges || 0,
        commissionChargesPayableDate: ekharidRecord?.procurementDetails?.commissionChargesPayableDate || 'NA',
        status: p.payment_status || 'NA',
      };
    });

    return res.status(200).json({
      data: finalData,
      status: 200,
      totalRecords: totals,
      totalPages: Math.ceil(totals / limit),
      currentPage: page,
      limit: finalData.length,
    });
  } catch (err) {
    console.error('Error in incidentalExpense:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  }
};




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
      if (commodity && (!batchCommodity || !batchCommodity.includes(commodity.toLowerCase()))) continue;
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


module.exports.purchaseLifingMonthWise = async (req, res) => {
  try {
    const { user_id } = req;
    const { commodity, state, district, schemeName } = req.query;

    //scheme filter array
    let schemeArray = [];
    if (schemeName) {
      schemeArray = schemeName.split(',').map(s => s.trim().toLowerCase());
    }

    const batches = await Batch.find({ seller_id: new mongoose.Types.ObjectId(user_id) })
      .populate({
        path: 'req_id',
        select: 'product',
        populate: {
          path: 'product',
          select: 'name schemeId'
        }
      })
      .populate({
        path: 'procurementCenter_id',
        select: 'center_name address',
      })
      .populate({
        path: 'associateOffer_id',
        select: 'offeredQty',
      })
      .select('qty associateOffer_id procurementCenter_id req_id intransit createdAt')
      .lean();

    const monthGroups = {};

    for (const batch of batches) {
      const batchCommodity = batch.req_id?.product?.name?.toLowerCase();
      const batchState = batch.procurementCenter_id?.address?.state?.toLowerCase();
      const batchDistrict = batch.procurementCenter_id?.address?.district?.toLowerCase();
      const batchSchemeId = batch.req_id?.product?.schemeId?.toString().toLowerCase();

      //Filter applied here
      if (commodity && (!batchCommodity || !batchCommodity.includes(commodity.toLowerCase()))) continue;
      if (state && (!batchState || !batchState.includes(state.toLowerCase()))) continue;
      if (district && (!batchDistrict || !batchDistrict.includes(district.toLowerCase()))) continue;
      if (schemeArray.length > 0 && (!batchSchemeId || !schemeArray.includes(batchSchemeId))) continue;

      const purchaseQty = batch.qty || 0;
      const liftedQty = batch.intransit ? purchaseQty : 0;
      const month = moment(batch.createdAt).format('MMMM YYYY');

      if (!monthGroups[month]) {
        monthGroups[month] = {
          month,
          purchaseQty: 0,
          liftedQty: 0,
          balanceQty: 0,
        };
      }

      monthGroups[month].purchaseQty += purchaseQty;
      monthGroups[month].liftedQty += liftedQty;
    }

    const result = Object.values(monthGroups).map(entry => ({
      ...entry,
      balanceQty: entry.purchaseQty - entry.liftedQty,
    }));

    if (result.length === 0) {
      return sendResponse({
        res,
        status: 200,
        message: 'No data found for given filters',
        data: [],
      });
    }

    return sendResponse({
      res,
      status: 200,
      message: _query.get("Purchase Lifting Month Wise"),
      data: result,
    });

  } catch (error) {
    console.error('Error in purchaseLifingMonthWise:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};



// State wise Ditrict
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