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

    const { user_id, portalId } = req;
    const {district, commodity, season} = req.query;

    let widgetDetails = {};

    let commodityArray = Array.isArray(commodity) ? commodity : [commodity];
    let regexCommodity = commodityArray.map(name => new RegExp(name, "i"));

    let districtArray = Array.isArray(district) ? district : [district];
    let regexDistrict = districtArray.map(dist => new RegExp(dist, "i"));

    let seasonArray = Array.isArray(season) ? season : [season];
    let regexSeason = seasonArray.map(e=> new RegExp(e, "i"))

    // Commodity waise filter for farmer 
    widgetDetails.farmertotal = await farmer.countDocuments({ associate_id: new mongoose.Types.ObjectId(user_id) });
    
    if (commodity || district || season) {
       let matchFarmerQuery = {
          associate_id: new mongoose.Types.ObjectId(user_id)
        };
    let requestFilter = {};

    if (commodity) {
        requestFilter['product.name'] = { $in: regexCommodity };
      }

    if (season) {
      requestFilter['product.season'] = { $in: regexSeason };
    }
    let requestIds = [], farmersIDInfo = [], farmersDis = []

    if (Object.keys(requestFilter).length > 0) {
        const requestDocs = await RequestModel.find(requestFilter).select("_id");
        requestIds = requestDocs.map(doc => doc._id);
      }

      //farmer IDs from payment based on req_id
      const farmerIDs = await Payment.find({
        req_id: { $in: requestIds }
      }).distinct('farmer_id');

      //console.log(">>>>>>>>>>>",requestIds )
      
      const districtId = await farmer.find({
        _id : {$in: farmerIDs}
      }).distinct('address.district_id address.state_id')
      //console.log("farmer dis id", districtId)

      // for( let obj of districtId){
      //   farmersIDInfo.push( { farmer_id: obj._id, state_id: obj.address.state_id, district_id: obj.address.district_id} );
      // }
      // console.log(farmersIDInfo)
      // for(let obj of farmersInfo){
      //   let dis_title = await getName(obj.state_id, dis_id);
      //     farmersDis.push( {...obj, dis_title});
      // }

      // if(){}

      if (farmerIDs.length > 0) {
      matchFarmerQuery._id = {  $in: farmerIDs };
      }
       widgetDetails.farmertotal = await farmer.countDocuments(matchFarmerQuery);
    }

    //Commodity wise  and district wise POC Count
    widgetDetails.procurementCenter = await ProcurementCenter.countDocuments({ 
      user_id: new mongoose.Types.ObjectId(user_id) 
    });

    if(commodity || district ||season){
      let matchPOCQuery = { user_id: new mongoose.Types.ObjectId(user_id) };
      let requestFilter = {};

      if (commodity) {
        requestFilter['product.name'] = { $in: regexCommodity };
      }

      if (season) {
      requestFilter['product.season'] = { $in: regexSeason };
    }
      let requestIds = [];
      if (Object.keys(requestFilter).length > 0) {
          const requestDocs = await RequestModel.find(requestFilter).select("_id");
          requestIds = requestDocs.map(doc => doc._id);
        }

        let batchIds = await Batch.find({
          req_id : {$in: requestIds}
        }).select('procurementCenter_id')
        let procurementCenterIds = batchIds.map(b => b.procurementCenter_id);

      if (procurementCenterIds.length > 0) {
      matchPOCQuery._id = { $in: procurementCenterIds };
    }
       if(district) {
        matchPOCQuery['address.district'] = { $in: regexDistrict };
      }
      
       widgetDetails.procurementCenter = await ProcurementCenter.countDocuments(matchPOCQuery);
    }

    //Filter wise total purchase
      if (commodity || district || season) {
      let requestFilter = {};

       if (commodity) {
        requestFilter['product.name'] = { $in: regexCommodity };
      }

      if (season) {
      requestFilter['product.season'] = { $in: regexSeason };
    }
      let requestIds = [];
      if (Object.keys(requestFilter).length > 0) {
          const requestDocs = await RequestModel.find(requestFilter).select("_id");
          requestIds = requestDocs.map(doc => doc._id);
        }

      // Filtered Total Purchased
      const totalPurchasedFiltered = await Batch.aggregate([
        {
          $match: {
            seller_id: new mongoose.Types.ObjectId(user_id),
            req_id: { $in: requestIds }
          }
        },
        {
          $group: {
            _id: null,
            totalQty: { $sum: "$qty" }
          }
        }
      ]);

      widgetDetails.totalPurchased = totalPurchasedFiltered[0]?.totalQty || 0;

      // Filtered Total Lifting
      const totalLiftingFiltered = await Batch.aggregate([
        {
          $match: {
            seller_id: new mongoose.Types.ObjectId(user_id),
            intransit: { $exists: true, $ne: null },
            req_id: { $in: requestIds }
          }
        },
        {
          $group: {
            _id: null,
            totalQty: { $sum: "$qty" }
          }
        }
      ]);

      widgetDetails.totalLifting = totalLiftingFiltered[0]?.totalQty || 0;
    }else{
      // Unfiltered totalPurchased
      const totalPurchased = await Batch.aggregate([
        {
          $match: { seller_id: new mongoose.Types.ObjectId(user_id) }
        },
        {
          $group: {
            _id: null,
            totalQty: { $sum: "$qty" }
          }
        }
      ]);
      widgetDetails.totalPurchased = totalPurchased[0]?.totalQty || 0;

      // Unfiltered totalLifting
      const totalLifting = await Batch.aggregate([
        {
          $match: {
            seller_id: new mongoose.Types.ObjectId(user_id),
            intransit: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            totalQty: { $sum: "$qty" }
          }
        }
      ]);

      widgetDetails.totalLifting = totalLifting[0]?.totalQty || 0;
    }

    // filter days lifting 
    let batchMatch = {
            seller_id: new mongoose.Types.ObjectId(user_id),
            intransit: { $exists: true, $ne: null }
          };
          if (commodity || district ||season) {
            // Find matching Request IDs based on commodity
          let requestFilter = {};

          if (commodity) {
            requestFilter['product.name'] = { $in: regexCommodity };
          }

          if (season) {
          requestFilter['product.season'] = { $in: regexSeason };
          }
          let requestIds = [];
          if (Object.keys(requestFilter).length > 0) {
              const requestDocs = await RequestModel.find(requestFilter).select("_id");
              requestIds = requestDocs.map(doc => doc._id);
            }

            //Find users matching seller_id and district
            const sellerUsers = await User.find({
              _id: new mongoose.Types.ObjectId(user_id),
              'address.registered.district': { $in: regexDistrict }
            }).select('_id');
            const validSellerIds = sellerUsers.map(u => u._id);

          //Apply filters
            batchMatch.req_id = { $in: requestIds };
            batchMatch.seller_id = { $in: validSellerIds };
          }

          //Fetch filtered batches
          const batches = await Batch.find(batchMatch)
            .populate('req_id', 'createdAt updatedAt') 
            .select('qty updatedAt req_id');

          let totalQty = 0;
          let totalDays = 0;

          for (const batch of batches) {
            totalQty += batch.qty || 0;

            const createdAt = batch.req_id?.createdAt;
            const updatedAt = batch.updatedAt;

            if (createdAt && updatedAt) {
              const diffMs = new Date(updatedAt) - new Date(createdAt);
              const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
              totalDays += days;
            }
          }
          widgetDetails.totalDaysLifting = totalDays;

    return sendResponse({
      res,
      status: 200,
      message: _query.get("Widget List"),
      data: widgetDetails,
    });
  } catch (error) {
    console.error("Error in widgetList:", error);
    return sendResponse({
      res,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


module.exports.mandiWiseProcurement = async (req, res) => {
  try {
    const { user_id, portalId } = req;
    let page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;
    const isExport = parseInt(req.query.isExport) === 1;
    const centerNames = req.query.search?.trim();
    const searchDistrict = req.query.districtNames
      ? Array.isArray(req.query.districtNames)
        ? req.query.districtNames
        : req.query.districtNames.split(',').map(c => c.trim())
      : null;

    const payments = await Payment.find().lean();
    const batchIdSet = [...new Set(payments.map(p => String(p.batch_id)).filter(Boolean))];
    //console.log("Batch IDs:", batchIdSet.length);

    const pipeline = [
      {
        $match: {
          _id: { $in: batchIdSet.map(id => new mongoose.Types.ObjectId(id)) },
          seller_id: new mongoose.Types.ObjectId(user_id)
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
                  endDate: "$createdAt",
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
          district: { $first: "$seller.address.registered.district" },
          associate_name: {
            $first: "$seller.basic_details.associate_details.associate_name",
          },
          liftedQty: { $sum: "$qty" },
          offeredQty: { $first: { $ifNull: ["$associateOffer.offeredQty", 0] } },
          liftedDataDays: { $first: "$liftedDataDays" },
          purchaseDays: { $first: "$purchaseDays" },
          productName: { $first: "$relatedRequest.product.name" },
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

    if (searchDistrict) {
      pipeline.push({
        $match: {
          district: { $in: searchDistrict },
        },
      });
      //   page = 1;
      //   skip = 0;
    }

    if (centerNames?.length) {
      pipeline.push({
        $match: {
          centerName: { $regex: centerNames, $options: 'i' },
        },
      });
      page = 1;
      skip = 0;
    }

    pipeline.push({ $sort: { centerName: 1 } });

    const aggregated = await Batch.aggregate(pipeline);

    if (isExport == 1) {
      const exportRows = aggregated.map(item => ({
        "Center Name": item?.centerName || 'NA',
        "District": item?.district || 'NA',
        "Associate Name": item?.associate_name || 'NA',
        "Product Name": item?.productName || 'NA',
        "Offered Qty": item?.offeredQty || 0,
        "Lifted Qty": item?.liftedQty || 0,
        "Balance Qty": item?.balanceMandi || 0,
        "Lifting %": item?.liftingPercentage + "%" || '0%',
        "Lifted Days": item?.liftedDataDays ?? 'NA',
        "Purchase Days": item?.purchaseDays ?? 'NA',
        "Status": item?.Status ? 'Active' : 'Inactive',
      }));

      if (exportRows.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: exportRows,
          fileName: `MandiWiseProcurementData.xlsx`,
          worksheetName: `Mandi Data`
        });
      } else {
        return res.status(404).json(new serviceResponse({
          status: 404,
          message: _response_message.notFound("Mandi Procurement Not Found")
        }));
      }
    }
    const totalRecords = aggregated.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedData = aggregated.slice(skip, skip + limit);

    return res.status(200).json(new serviceResponse({
      status: 200,
      data: {
        page,
        limit,
        totalPages,
        totalRecords,
        data: paginatedData,
        message: _response_message.found("Mandi Procurement Data Fetched")
      }
    }));

  } catch (error) {
    _handleCatchErrors(error, res);
  }
}

module.exports.incidentalExpense = async (req, res) => {
  try {
    const {
      search = '',
      commodity = '',
      state = '',
      season = '',
    } = req.query;

    const { user_id } = req;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    const searchRegex = new RegExp(search, 'i');
    const filters = {};

    if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
      filters.associate_id = new mongoose.Types.ObjectId(user_id);
    }

    // Step 1: Fetch paginated payments with populated refs
    let payments = await Payment.find(filters)
      .select({
        batch_id: 1,
        req_id: 1,
        associate_id: 1,
        amount: 1,
        qtyProcured: 1,
        payment_status: 1
      })
      .populate({
        path: 'batch_id',
        select: 'batchId procurementCenter_id qty',
        populate: {
          path: 'procurementCenter_id',
          select: 'center_name address.district address.state',
        }
      })
      .populate({
        path: 'req_id',
        select: 'product.name'
      })
      .sort({ createdAt: -1 })
      // .skip(skip)
      // .limit(limitInt)
      // .lean();

    if (search) {
      payments = payments.filter(p => {
        const batchId = p.batch_id?.batchId?.toString().toLowerCase() || '';
        const mandiName = p.batch_id?.procurementCenter_id?.center_name?.toLowerCase() || '';
        return (
          batchId.includes(search.toLowerCase()) ||
          mandiName.includes(search.toLowerCase())
        );
      });
    }

    // State filter
    if (state) {
      payments = payments.filter(p => {
        const stateVal = p.batch_id?.procurementCenter_id?.address?.state?.toLowerCase() || '';
        return stateVal.includes(state.toLowerCase());
      });
    }

    // Commodity filter
    if (commodity) {
      payments = payments.filter(p => {
        const comm = p.req_id?.product?.name?.toLowerCase() || '';
        return comm.includes(commodity.toLowerCase());
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
  
    // if (search) {
    //   payments = payments.filter(p => {
    //     const batchId = p.batch_id?.batchId?.toString().toLowerCase() || '';
    //     const mandiName = p.batch_id?.procurementCenter_id?.center_name?.toLowerCase() || '';
    //     return (
    //       batchId.includes(search.toLowerCase()) ||
    //       mandiName.includes(search.toLowerCase())
    //     );
    //   });
    // }

    // // State filter
    // if (state) {
    //   payments = payments.filter(p => {
    //     const stateVal = p.batch_id?.procurementCenter_id?.address?.state?.toLowerCase() || '';
    //     return stateVal.includes(state.toLowerCase());
    //   });
    // }

    // // Commodity filter
    // if (commodity) {
    //   payments = payments.filter(p => {
    //     const comm = p.req_id?.product?.name?.toLowerCase() || '';
    //     return comm.includes(commodity.toLowerCase());
    //   });
    // }

    // Step 2: Extract all numeric batchIds
    const batchIdNumbers = paymentPage
      .map(p => Number(p.batch_id?.batchId))
      .filter(n => !isNaN(n));

    // Step 3: Fetch related ekharid records
    const ekharidList = await eKharidHaryanaProcurementModel.find({
      'warehouseData.exitGatePassId': { $in: batchIdNumbers }
    })
      .select(
        {
          'warehouseData.exitGatePassId': 1,
          "procurementDetails.incidentalExpenses": 1,
          "procurementDetails.laborCharges": 1, "procurementDetails.laborChargesPayableDate": 1,
          "procurementDetails.commissionCharges": 1, "procurementDetails.commissionChargesPayableDate": 1
        })
      .lean();

    // Create a mapping for fast lookup
    const ekharidMap = new Map();
    ekharidList.forEach(e => {
      ekharidMap.set(Number(e.warehouseData.exitGatePassId), e);
    });

    // Step 4: Transform and attach data
      const finalData = paymentPage.map(p => {
      const batchCode = Number(p.batch_id?.batchId);
      const ekharidRecord = ekharidMap.get(batchCode);

      return {
        batchId: p.batch_id?.batchId || null,
        commodity: p.req_id?.product?.name || "NA",
        amount: p.amount,
        quantity: p.qtyProcured,
        mandiName: p.batch_id?.procurementCenter_id?.center_name || "NA",
        district: p.batch_id?.procurementCenter_id?.address?.district || "NA",
        actualIncidentCost: ekharidRecord?.procurementDetails?.incidentalExpenses || 0,
        incidentCostRecieved: ekharidRecord?.procurementDetails?.incidentalExpenses || 0,
        actualLaborCharges: ekharidRecord?.procurementDetails?.laborCharges || 0,
        laborChargeRecieved: ekharidRecord?.procurementDetails?.laborCharges || 0,
        laborChargesPayableDate: ekharidRecord?.procurementDetails?.laborChargesPayableDate || "NA",
        commissionRecieved: ekharidRecord?.procurementDetails?.commissionCharges || 0,
        commissionChargesPayableDate: ekharidRecord?.procurementDetails?.commissionChargesPayableDate || "NA",
        status: p.payment_status || "NA",
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

    // return sendResponse({
    //   res,
    //   success: true,
    //   // message: _query.get("Incidental Expense"),
    //   totalRecords: totals,
    //   // data: finalData,
      
    //   totalPages:Math.ceil(totals / limit),
    //   currentPage: page,
    //   count: finalData.length,
    // });

  } catch (err) {
    console.error('Error in incidentalExpense:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  }
}



module.exports.purchaseLifingMandiWise = async (req, res) => {
  try {
    const { user_id } = req;
    const { commodity, state } = req.query;

    const batches = await Batch.find({ seller_id: new mongoose.Types.ObjectId(user_id) })
      .populate({
        path: 'procurementCenter_id',
        select: 'center_name address',
      })
      .populate({
        path: 'associateOffer_id',
        select: 'offeredQty',
      })
      .select('qty associateOffer_id procurementCenter_id intransit') // include intransit
      .lean();

    const centerGroups = {};

    for (const batch of batches) {

      const batchCommodity = batch.req_id?.product?.name;
      const batchState = batch.procurementCenter_id?.address?.state;

      // If filtering is applied, skip unmatched batches
      if (commodity && batchCommodity !== commodity) continue;
      if (state && batchState !== state) continue;

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

    return sendResponse({
      res,
      status: 200,
      message: _query.get("Purchase Lisfing Mandi Wise"),
      data: result,
    });

  } catch (error) {
    console.error('Error in getBatchesGroupedByCenter:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }

}

module.exports.purchaseLifingMonthWise = async (req, res) => {
  try {
    const { user_id } = req;
    const { commodity, state } = req.query;

    const batches = await Batch.find({ seller_id: new mongoose.Types.ObjectId(user_id) })
      .populate({
        path: 'req_id',
        select: 'product',
        populate: {
          path: 'product',
          select: 'name'
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
      .select('qty associateOffer_id procurementCenter_id req_id intransit createdAt') // include intransit
      .lean();

    const centerGroups = {};
    const monthGroups = {};

    for (const batch of batches) {

      const batchCommodity = batch.req_id?.product?.name;
      const batchState = batch.procurementCenter_id?.address?.state;

      // If filtering is applied, skip unmatched batches
      if (commodity && batchCommodity !== commodity) continue;
      if (state && batchState !== state) continue;

      const purchaseQty = batch.qty || 0;
      const liftedQty = batch.intransit ? purchaseQty : 0;

      // const month = moment(batch.createdAt).format('YYYY-MM');
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

    return sendResponse({
      res,
      status: 200,
      message: _query.get("Purchase Lisfing Month Wise"),
      data: result,
    });
  } catch (error) {
    console.error('Error in getBatchesGroupedByCenter:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }

}

//DropDown for state wise district 
module.exports.getDistrict = async (req, res) => {
  try {
    const { state_title } = req.query;

    if (!state_title) {
      return sendResponse({
        res,
        status: 400,
        message: "State code is required",
      });
    }

    const district_list = await StateDistrictCity.aggregate([
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
        },
      },
      {
        $project: {
          _id: 0,
          district_title: "$states.districts.district_title",
        },
      },
    ]);

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