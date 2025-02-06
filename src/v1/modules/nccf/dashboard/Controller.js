const {
  _handleCatchErrors,
  dumpJSONToExcel,
} = require("@src/v1/utils/helpers");

const {
  serviceResponse,
  sendResponse,
} = require("@src/v1/utils/helpers/api_response");
const {
  _response_message,
  _middleware,
} = require("@src/v1/utils/constants/messages");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const {
  _userType,
  _poAdvancePaymentStatus,
  _status,
  _procuredStatus,
  _collectionName,
  _associateOfferStatus,
  _userStatus,
} = require("@src/v1/utils/constants");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const {
  wareHousev2,
} = require("@src/v1/models/app/warehouse/warehousev2Schema");
const {
  PurchaseOrderModel,
} = require("@src/v1/models/app/distiller/purchaseOrder");
const {
  wareHouseDetails,
} = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { mongoose } = require("mongoose");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");

module.exports.getDashboardStats = asyncErrorHandler(async (req, res) => {
  try {
    const { user_id } = req;

    const currentDate = new Date();

    const wareHouseCount = (await wareHousev2.countDocuments()) ?? 0;
    const purchaseOrderCount =
      (await PurchaseOrderModel.countDocuments({ distiller_id: user_id })) ?? 0;

    const result = await wareHouseDetails.aggregate([
      {
        $project: {
          stockToSum: {
            $cond: {
              if: { $gt: ["$inventory.requiredStock", 0] }, // If requiredStock > 0
              then: "$inventory.requiredStock",
              else: "$inventory.stock", // Otherwise, take stock
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$stockToSum" },
        },
      },
    ]);

    const moU = await Distiller.countDocuments({
      mou_approval: _userStatus.pending,
    });

    const onBoarding = await Distiller.countDocuments({
      is_approved: _userStatus.pending,
    });

    const distillerCount = await Distiller.countDocuments();

    const realTimeStock = result.length > 0 ? result[0].totalStock : 0;

    const records = {
      wareHouseCount,
      purchaseOrderCount,
      realTimeStock,
      moUCount: moU,
      onBoardingCount: onBoarding,
      totalRequest: moU + onBoarding,
      distillerCount,
    };

    return res.send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("NCCF dashboard Stats"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getonBoardingRequests = asyncErrorHandler(async (req, res) => {
  try {
    const page = 1,
      limit = 5;

    const data = await Distiller.aggregate([
      {
        $project: {
          distiller_name: "$basic_details.distiller_details.organization_name",
          distiller_id: "$user_code",
          status: "$is_approved",
        },
      },
    ])
      .skip((page - 1) * limit)
      .limit(limit);

    const totalCount = await Distiller.countDocuments();

    const records = {
      data,
      meta: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    };

    return res.send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("NCCF dashboard onboarding requests"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getpenaltyStatus = asyncErrorHandler(async (req, res) => {
  try {
    const page = 1,
      limit = 5,
      paginate = 1;

    let aggregationPipeline = [
      {
        $lookup: {
          from: "distillers", // Adjust this to your actual collection name for branches
          localField: "distiller_id",
          foreignField: "_id",
          as: "distillerDetails",
        },
      },
      // Unwind batchDetails array if necessary
      {
        $unwind: {
          path: "$distillerDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "batchorderprocesses", // Adjust this to your actual collection name for branches
          localField: "_id",
          foreignField: "orderId",
          as: "batchDetails",
        },
      },

      // Unwind batchDetails array if necessary
      { $unwind: { path: "$batchDetails", preserveNullAndEmptyArrays: true } },

      // Unwind penaltyDetails if it's an array (assuming it is)
      {
        $unwind: {
          path: "$batchDetails.penaltyDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Group by order ID and sum up penaltyAmount
      {
        $group: {
          _id: "$_id",
          order_id: { $first: "$purchasedOrder.poNo" },
          distillerName: {
            $first:
              "$distillerDetails.basic_details.distiller_details.organization_name",
          },
          commodity: { $first: "$product.name" },
          quantityRequired: { $first: "$purchasedOrder.poQuantity" },
          totalAmount: { $first: "$paymentInfo.totalAmount" },
          paymentSent: { $first: "$paymentInfo.paidAmount" },
          outstandingPayment: { $first: "$paymentInfo.balancePayment" },
          totalPenaltyAmount: {
            $sum: {
              $ifNull: ["$batchDetails.penaltyDetails.penaltyAmount", 0],
            },
          },
          paymentStatus: { $first: "$poStatus" },
          distiller_id: { $first: "$distillerDetails.user_code" },
        },
      },

      // Final Projection
      {
        $project: {
          _id: 1,
          order_id: 1,
          distillerName: 1,
          commodity: 1,
          quantityRequired: 1,
          totalAmount: 1,
          paymentSent: 1,
          outstandingPayment: 1,
          totalPenaltyAmount: 1, // Ensure total sum is included
          paymentStatus: 1,
          distiller_id: 1,
        },
      },
    ];

    aggregationPipeline.push(
      { $sort: { createdAt: -1, _id: 1 } },
      { $limit: parseInt(limit) }
    );

    const rows = await PurchaseOrderModel.aggregate(aggregationPipeline);

    const countPipeline = [{ $count: "total" }];

    const countResult = await PurchaseOrderModel.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;

    const records = { rows, count };

    if (paginate == 1) {
      records.page = parseInt(page);
      records.limit = parseInt(limit);
      records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("NCCF dashboard penalty status"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

// module.exports.getWarehouseList = asyncErrorHandler(async (req, res) => {
//   const { limit = 5 } = req.query;

//   const page = 1,
//     sortBy = "createdAt",
//     sortOrder = "asc",
//     isExport = 0;

//   try {
//     // Fetch data with pagination and sorting
//     const warehouses = await wareHouseDetails
//       .find()
//       .select()
//       .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     // Count total warehouses
//     const totalWarehouses = await wareHouseDetails.countDocuments();
//     const activeWarehouses = await wareHouseDetails.countDocuments({
//       active: true,
//     });
//     const inactiveWarehouses = totalWarehouses - activeWarehouses;

//     // Handle export functionality
//     if (isExport == 1) {
//       const exportData = warehouses.map((item) => ({
//         "Warehouse ID": item._id,
//         "Warehouse Name": item.basicDetails?.warehouseName || "NA",
//         City: item.addressDetails?.city || "NA",
//         State: item.addressDetails?.state || "NA",
//         Status: item.active ? "Active" : "Inactive",
//       }));

//       if (exportData.length) {
//         return dumpJSONToExcel(req, res, {
//           data: exportData,
//           fileName: `Warehouse-List.xlsx`,
//           worksheetName: `Warehouses`,
//         });
//       }

//       return res
//         .status(200)
//         .send(
//           new serviceResponse({
//             status: 200,
//             message: "No data available for export",
//           })
//         );
//     }

//     // Return paginated results
//     return res.status(200).send(
//       new serviceResponse({
//         status: 200,
//         data: {
//           records: warehouses,
//           page,
//           limit,
//           totalRecords: totalWarehouses,
//           activeRecords: activeWarehouses,
//           inactiveRecords: inactiveWarehouses,
//           pages: Math.ceil(totalWarehouses / limit),
//         },
//         message: "Warehouses fetched successfully",
//       })
//     );
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .send(
//         new serviceResponse({
//           status: 500,
//           message: "Error fetching warehouses",
//           error: error.message,
//         })
//       );
//   }
// });

module.exports.getWarehouseList = asyncErrorHandler(async (req, res) => {
  const { limit = 5, procurement_partner } = req.query;
  
  const page = 1, sortBy = 'createdAt', sortOrder = 'asc', isExport = 0;

  try {
      // Construct filter object
      let filter = {};
      if (procurement_partner) {
          filter.procurement_partner = procurement_partner;
      }

      // Fetch data with pagination and sorting
      const warehouses = await wareHouseDetails.find(filter)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit));

      // Count total warehouses based on filter
      const totalWarehouses = await wareHouseDetails.countDocuments(filter);
      const activeWarehouses = await wareHouseDetails.countDocuments({ ...filter, active: true });
      const inactiveWarehouses = totalWarehouses - activeWarehouses;

      // Handle export functionality
      if (isExport == 1) {
          const exportData = warehouses.map(item => ({
              "Warehouse ID": item._id,
              "Warehouse Name": item.basicDetails?.warehouseName || 'NA',
              "City": item.addressDetails?.city || 'NA',
              "State": item.addressDetails?.state || 'NA',
              "Status": item.active ? 'Active' : 'Inactive',
              "Procurement Partner": item.procurement_partner || 'NA'
          }));

          if (exportData.length) {
              return dumpJSONToExcel(req, res, {
                  data: exportData,
                  fileName: `Warehouse-List.xlsx`,
                  worksheetName: `Warehouses`
              });
          }

          return res.status(200).send(new serviceResponse({ status: 200, message: "No data available for export" }));
      }

      // Return paginated results
      return res.status(200).send(new serviceResponse({
          status: 200,
          data: {
              records: warehouses,
              page,
              limit,
              totalRecords: totalWarehouses,
              activeRecords: activeWarehouses,
              inactiveRecords: inactiveWarehouses,
              pages: Math.ceil(totalWarehouses / limit)
          },
          message: "Warehouses fetched successfully"
      }));
  } catch (error) {
      console.error(error);
      return res.status(500).send(new serviceResponse({ status: 500, message: "Error fetching warehouses", error: error.message }));
  }
});
module.exports.getCompanyNames = async (req, res) => {
  try {
    // FETCH DISTINCT PROCUREMENT PARTNER VALUES
    const result = await wareHouseDetails.distinct("procurement_partner");

    if (!result || result.length === 0) {
      return sendResponse({
        res,
        data: [],
        status: 404,
        message: _response_message.notFound("procurement partners"),
      });
    }

    return sendResponse({
      res,
      data: result,
      status: 200,
      message: _response_message.found("procurement partners"),
    });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.getMonthlyPaidAmount = asyncErrorHandler(async (req, res) => {
  try {
    const { state } = req.query;

    // Build match stage based on state condition
    const matchStage = {};
    if (state) {
      matchStage["distiller.address.registered.state"] = state;
    }

    const monthlyPaidAmounts = await PurchaseOrderModel.aggregate([
      {
        $lookup: {
          from: "distillers",
          localField: "distiller_id",
          foreignField: "_id",
          as: "distiller",
        },
      },
      {
        $unwind: "$distiller",
      },
      {
        $match: matchStage, // Apply state filter if provided
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalPaidAmount: { $sum: "$paymentInfo.paidAmount" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          totalPaidAmount: 1,
        },
      },
    ]);

    // Generate a full list of months with 0 for missing data
    const currentYear = new Date().getFullYear();
    const startYear = monthlyPaidAmounts.length
      ? monthlyPaidAmounts[0].year
      : currentYear;
    const endYear = currentYear;

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const filledMonthlyData = [];
    let totalSumAllMonths = 0;

    for (let year = startYear; year <= endYear; year++) {
      for (let month = 1; month <= 12; month++) {
        const existingData = monthlyPaidAmounts.find(
          (data) => data.year === year && data.month === month
        );

        const paidAmount = existingData ? existingData.totalPaidAmount : 0;
        totalSumAllMonths += paidAmount;

        filledMonthlyData.push({
          year,
          month: monthNames[month - 1],
          totalPaidAmount: paidAmount,
        });
      }
    }

    if (!filledMonthlyData.length) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: "No data available for monthly paid amounts",
        })
      );
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: {
          monthlyData: filledMonthlyData,
          totalSumAllMonths,
        },
        message: "Monthly paid amounts fetched successfully",
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).send(
      new serviceResponse({
        status: 500,
        message: "Error fetching monthly paid amounts",
        error: error.message,
      })
    );
  }
});

module.exports.getPublicStates = async (req, res) => {
  try {
    const states = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      { $project: { "states.state_title": 1, "states._id": 1 } },
      { $group: { _id: null, states: { $push: "$states" } } },
    ]);

    if (!states.length || !states[0].states.length) {
      return sendResponse({
        res,
        data: [],
        status: 404,
        message: _response_message.notFound("state"),
      });
    }

    return sendResponse({
      res,
      data: states[0].states,
      status: 200,
      message: _response_message.found("state"),
    });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.getPublicDistrictByState = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse({
        res,
        data: null,
        status: 404,
        message: _response_message.invalid(id),
      });
    }
    const result = await StateDistrictCity.findOne(
      { "states._id": id },
      { "states.$": 1 }
    );

    if (!result && result?.states?.length > 0) {
      sendResponse({
        res,
        data: districts,
        status: 404,
        message: _response_message.notFound("state"),
      });
    }

    const state = result.states[0];
    const districts = state.districts.map((district) => ({
      district_title: district.district_title,
      _id: district._id,
    }));
    return sendResponse({
      res,
      data: districts,
      status: 200,
      message: _response_message.found("district"),
    });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};
