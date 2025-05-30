const { _handleCatchErrors } = require("@src/v1/utils/helpers");
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

//widget listss
module.exports.widgetList = asyncErrorHandler(async (req, res) => {
  try {
    report = [
      { monthName: "January", month: 1, total: 0 },
      { monthName: "February", month: 2, total: 0 },
      { monthName: "March", month: 3, total: 0 },
      { monthName: "April", month: 4, total: 0 },
      { monthName: "May", month: 5, total: 0 },
      { monthName: "June", month: 6, total: 0 },
      { monthName: "July", month: 7, total: 0 },
      { monthName: "Augest", month: 8, total: 0 },
      { monthName: "September", month: 9, total: 0 },
      { monthName: "Octorber", month: 10, total: 0 },
      { monthName: "November", month: 11, total: 0 },
      { monthName: "Decmeber", month: 12, total: 0 },
    ];
    let widgetDetails = {
      branch: { total: 0, lastMonth: [] },

      associate: { total: 0, lastMonth: [] },
      procCenter: { total: 0, lastMonth: [] },
      farmer: { total: 0, lastMonth: [] },
    };
    let associateFCount = (await farmer.countDocuments({})) ?? 0;
    widgetDetails.farmer.total = associateFCount;
    widgetDetails.associate.total = await User.countDocuments({});
    widgetDetails.procCenter.total = await ProcurementCenter.countDocuments({});
    let lastMonthUser = await User.aggregate([
      { $match: { user_type: "Associate" } },
      { $project: { month: { $month: "$createdAt" } } },
      { $group: { _id: "$month", total: { $sum: 1 } } },
    ]);
    let lastMonthFarmer = await farmer.aggregate([
      { $project: { month: { $month: "$createdAt" } } },
      { $group: { _id: "$month", total: { $sum: 1 } } },
    ]);

    let getReport = (report, data) => {
      return report.map((item) => {
        let details = data?.find((item2) => item2?._id == item.month);
        if (details?._id == item.month) {
          return { month: item.monthName, total: details.total };
        } else {
          return { month: item.monthName, total: item.total };
        }
      });
    };
    widgetDetails.associate.lastMonth = getReport(report, lastMonthUser);
    widgetDetails.farmer.lastMonth = getReport(report, lastMonthFarmer);

    return sendResponse({
      res,
      status: 200,
      message: _query.get("Widget List"),
      data: widgetDetails,
    });
  } catch (error) {
    console.log("error", error);
  }
});

module.exports.dashboardWidgetList = asyncErrorHandler(async (req, res) => {
  try {

    const hoId = req.portalId;

    let widgetDetails = {
      branchOffice: { total: 0 },
      farmerRegistration: { farmertotal: 0, associateFarmerTotal: 0, totalRegistration: 0 },
      wareHouse: { total: 0 },
      //procurementTarget: { total: 0 }
    };



    // Get counts safely
    widgetDetails.wareHouse.total = await wareHousev2.countDocuments({});
    widgetDetails.branchOffice.total = await Branches.countDocuments({ headOfficeId: hoId });
    widgetDetails.farmerRegistration.farmertotal = await farmer.countDocuments({});
    widgetDetails.farmerRegistration.associateFarmerTotal = await User.countDocuments({});

    //let procurementTargetQty = await RequestModel.find({})
    widgetDetails.farmerRegistration.totalRegistration =
      widgetDetails.farmerRegistration.farmertotal +
      widgetDetails.farmerRegistration.associateFarmerTotal;

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

    const paymentQuery = { bo_id: portalId };
    // const payments = await Payment.find(paymentQuery).lean();
    const payments = await Payment.find().lean();
    const batchIdSet = [...new Set(payments.map(p => String(p.batch_id)).filter(Boolean))];
    console.log("Batch IDs:", batchIdSet.length);
    
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

    if (isExport) {
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
