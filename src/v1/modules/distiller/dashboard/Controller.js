const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, } = require("@src/v1/utils/constants/messages");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _poAdvancePaymentStatus } = require("@src/v1/utils/constants");
const { asyncErrorHandler, } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { CenterProjection } = require("@src/v1/models/app/distiller/centerProjection");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");


const { mongoose } = require("mongoose");
const { procurement_partners } = require("@config/index");
const { BatchOrderProcess } = require("@src/v1/models/app/distiller/batchOrderProcess");

module.exports.getDashboardStats = asyncErrorHandler(async (req, res) => {
  try {
    const { user_id } = req;
    const currentDate = new Date();

    const wareHouseCount = (await wareHouseDetails.countDocuments()) ?? 0;
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

    const realTimeStock = result.length > 0 ? result[0].totalStock : 0;

    const totalStats = await wareHouseDetails.aggregate([
  {
    $match: {
      procurement_partner: { $in: ['Radiant', 'Agribid'] },
    },
  },
  {
    $lookup: {
      from: 'batches',
      let: { wid: '$_id', partner: '$procurement_partner' },
      pipeline: [
        { $match: { $expr: { $eq: ['$warehousedetails_id', '$$wid'] } } },
        {
          $group: {
            _id: null,
            procured: { $sum: '$qty' },
            available: { $sum: '$available_qty' },
          },
        },
        {
          $project: {
            _id: 0,
            procured: 1,
            available: 1,
          },
        },
      ],
      as: 'internalStats',
    },
  },
  {
    $lookup: {
      from: 'externalbatches',
      let: { wid: '$_id', partner: '$procurement_partner' },
      pipeline: [
        { $match: { $expr: { $eq: ['$warehousedetails_id', '$$wid'] } } },
        {
          $group: {
            _id: null,
            procured: { $sum: '$inward_quantity' },
            available: { $sum: '$remaining_quantity' },
          },
        },
        {
          $project: {
            _id: 0,
            procured: 1,
            available: 1,
          },
        },
      ],
      as: 'externalStats',
    },
  },
  {
    $addFields: {
      totalProcuredQty: {
        $cond: [
          { $eq: ['$procurement_partner', 'Radiant'] },
          { $ifNull: [{ $arrayElemAt: ['$internalStats.procured', 0] }, 0] },
          { $ifNull: [{ $arrayElemAt: ['$externalStats.procured', 0] }, 0] },
        ],
      },
      totalAvailableQty: {
        $cond: [
          { $eq: ['$procurement_partner', 'Radiant'] },
          { $ifNull: [{ $arrayElemAt: ['$internalStats.available', 0] }, 0] },
          { $ifNull: [{ $arrayElemAt: ['$externalStats.available', 0] }, 0] },
        ],
      },
    },
  },
  {
    $group: {
      _id: null,
      totalProcuredQty: { $sum: '$totalProcuredQty' },
      totalAvailableQty: { $sum: '$totalAvailableQty' },
    },
  },
  {
    $project: {
      _id: 0,
      totalProcuredQty: { $round: ['$totalProcuredQty', 2] },
      totalAvailableQty: { $round: ['$totalAvailableQty', 2] },
    },
  },
]);

//console.log('>>>>>>>>>>>>>>>',totalStats);


    const records = {
      wareHouseCount,
      purchaseOrderCount,
      realTimeStock,
      totalProcuredQty: totalStats[0]?.totalProcuredQty,
      totalAvailableQty: totalStats[0]?.totalAvailableQty,
    };

    return res.send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Dashboard Stats"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getSateStock = asyncErrorHandler(async (req, res) => {
  try {
    const {  organization_id} = req;

     const stateWiseInventoryStock = await BatchOrderProcess.aggregate([
  {
    $match: {
      distiller_id: new mongoose.Types.ObjectId(organization_id._id) 
    }
  },
  {
    $lookup: {
      from: "warehousedetails", 
      localField: "warehouseId",
      foreignField: "_id",
      as: "warehouseDetails"
    }
  },
  { $unwind: "$warehouseDetails" },

  {
    $project: {
      state: "$warehouseDetails.addressDetails.state.state_name",
      stock: "$warehouseDetails.inventory.stock"
    }
  },

  {
    $group: {
      _id: "$state",
      totalStock: { $sum: "$stock" }
    }
  },
    {
    $project: {
      _id: 0,
      state: "$_id",
      totalStock: 1
    }
  },

  { $sort: { totalStock: -1 } }
]);


    return res.send(
      new serviceResponse({
        status: 200,
        data: stateWiseInventoryStock,
        message: _response_message.found("State Wise Stock"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getStateWishProjection = async (req, res) => {
 try {
      let {
        page = 1,
        limit = 10,
        search = '',
        state = '',
        district = '',
        isExport = 0,
      } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { state: 1 };
  
      const query = {};
      if (search) {
        query.$or = [
          { state: { $regex: search, $options: 'i' } },
          { district: { $regex: search, $options: 'i' } },
          { center_location: { $regex: search, $options: 'i' } },
        ];
      }
      if (state) {
        query.state = { $regex: state, $options: 'i' };
      }
  
      if (district) {
        query.district = { $regex: district, $options: 'i' };
      }
  
       if (parseInt(isExport) === 1) {
      const exportData = await CenterProjection.find(query).sort(sort);

      const formattedData = exportData.map((item) => ({
        "Center Location": item.center_location || "NA",
        "State": item.state || "NA",
        "District": item.district || "NA",
        "Center Projection":item.current_projection || "NA",
         "Qty Booked": item.qty_booked || "NA",
      }));

      if (formattedData.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: formattedData,
          fileName: `Center-Projections-${new Date().toISOString().split('T')[0]}.xlsx`,
          worksheetName: "Center Projections",
        });
      } else {
        return res.status(200).json({
          status: 400,
          message: "No Center Projection data found to export.",
          data: [],
        });
      }
    }

      const [total, data] = await Promise.all([
        CenterProjection.countDocuments(query),
        CenterProjection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
      ]);
      const pages = limit != 0 ? Math.ceil(total / limit) : 0;
      return res.status(200).json({
        status: 200,
        data,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages,
        message: "Center Projections fetched successfully"
      });
  
    } catch (error) {
      return res.status(500).json({
        status: 500,
        message: "Error fetching center projections ",
        error: error.message
      });
    }
};



module.exports.getOrder = asyncErrorHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5,
      skip = 0,
      paginate = 1,
      sortBy = "_id",
      search = "",
    } = req.query;
    const { user_id } = req;

    let matchStage = {
      "paymentInfo.advancePaymentStatus": _poAdvancePaymentStatus.paid,
      distiller_id: new mongoose.Types.ObjectId(user_id),
      deletedAt: null,
    };

    if (search) {
      matchStage.$purchasedOrder.poNo = { $regex: search, $options: "i" };
    }

    let aggregationPipeline = [
      { $match: matchStage },
      { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } },
      {
        $project: {
          _id: 1,
          orderId: "$purchasedOrder.poNo",
          commodity: "$product.name",
          quantity: "$purchasedOrder.poQuantity",
          totalAmount: "$paymentInfo.totalAmount",
        },
      },
    ];

    if (paginate == 1) {
      aggregationPipeline.push(
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) }
      );
    }

    const records = { count: 0 };
    records.rows = await PurchaseOrderModel.aggregate(aggregationPipeline);
    records.count = await PurchaseOrderModel.countDocuments(matchStage);

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("Order"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.warehouseList = asyncErrorHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5,
      sortBy,
      search = "",
      filters = {},
      isExport = 0,
    } = req.query;
    const skip = (parseInt(page, 5) - 1) * parseInt(limit, 5);

    // let query = search
    //   ? {
    //     $or: [
    //       { "companyDetails.name": { $regex: search, $options: "i" } },
    //       { "ownerDetails.name": { $regex: search, $options: "i" } },
    //       {
    //         "warehouseDetails.basicDetails.warehouseName": {
    //           $regex: search,
    //           $options: "i",
    //         },
    //       },
    //       {
    //         "warehouseDetails.procurement_partner": {
    //           $regex: search,
    //           $options: "i",
    //         },
    //       },
    //     ],
    //     ...filters, // Additional filters
    //   }
    //   : {};

    // const aggregationPipeline = [
    //   { $match: query },
    //   {
    //     $lookup: {
    //       from: "warehousedetails", // Collection name in MongoDB
    //       localField: "_id",
    //       foreignField: "warehouseOwnerId",
    //       as: "warehouseDetails",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$warehouseDetails",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $project: {
    //       warehousename: "$warehouseDetails.basicDetails.warehouseName",
    //       inventory : "$warehouseDetails.inventory.requiredStock",
    //       address: "$warehouseDetails.addressDetails.state",
    //       totalCapicity: "$warehouseDetails.basicDetails.warehouseCapacity",
    //       utilizedCapicity: {
    //         $cond: {
    //           if: {
    //             $gt: [
    //               { $ifNull: ["$warehouseDetails.inventory.requiredStock", 0] },
    //               0,
    //             ],
    //           },
    //           then: "$warehouseDetails.inventory.requiredStock",
    //           else: "$warehouseDetails.inventory.stock",
    //         },
    //       },
    //       realTimeStock: "$warehouseDetails.inventory.stock",
    //       distance: "100 KM",
    //     },
    //   },

    //   { $sort: { [sortBy || 'createdAt']: -1, _id: 1 } },
    //   { $skip: skip },
    //   { $limit: parseInt(limit, 10) },
    // ];

    const preLookupQuery = search
  ? {
      $or: [
        { "companyDetails.name": { $regex: search, $options: "i" } },
        { "ownerDetails.name": { $regex: search, $options: "i" } },
      ],
      ...filters,
    }
  : { ...filters };

const postLookupQuery = search
  ? {
      $or: [
        {
          "warehouseDetails.basicDetails.warehouseName": {
            $regex: search,
            $options: "i",
          },
        },
        {
          "warehouseDetails.procurement_partner": {
            $regex: search,
            $options: "i",
          },
        },
      ],
    }
  : {};

    const aggregationPipeline = [
   { $match: preLookupQuery },

  // Lookup warehouseDetails
  {
    $lookup: {
      from: "warehousedetails",
      localField: "_id",
      foreignField: "warehouseOwnerId",
      as: "warehouseDetails",
    },
  },
  {
    $unwind: {
      path: "$warehouseDetails",
      preserveNullAndEmptyArrays: true,
    },
  },

  // Apply post-lookup search filters
  ...(search ? [{ $match: postLookupQuery }] : []),

   // Filter for Radiant and Agribid procurement partners
  {
    $match: {
      "warehouseDetails.procurement_partner": {
        $in: [ procurement_partners.Radiant, procurement_partners.Agribid], 
      },
    },
  },
  
  // Lookup batches (internal)
  {
    $lookup: {
      from: "batches",
      localField: "warehouseDetails._id",
      foreignField: "warehousedetails_id",
      as: "internalBatches",
    },
  },

  // Lookup externalBatches
  {
    $lookup: {
      from: "externalbatches",
      localField: "warehouseDetails._id",
      foreignField: "warehousedetails_id",
      as: "externalBatches",
    },
  },

  // Add calculated fields
  {
    $addFields: {
      totalProcuredQty: {
        $round: [
          {
            $cond: {
              if: {
                $eq: ["$warehouseDetails.procurement_partner", procurement_partners.Radiant],
              },
              then: { $sum: "$internalBatches.qty" },
              else: { $sum: "$externalBatches.inward_quantity" },
            },
          },
          2,
        ],
      },
      totalLiftedQty: {
        $round: [
          {
            $cond: {
              if: {
                $eq: ["$warehouseDetails.procurement_partner", procurement_partners.Radiant],
              },
              then: { $sum: "$internalBatches.allotedQty" },
              else: { $sum: "$externalBatches.outward_quantity" },
            },
          },
          2,
        ],
      },
    },
  },

  // Final projection
  {
    $project: {
      warehousename: "$warehouseDetails.basicDetails.warehouseName",
      inventory: "$warehouseDetails.inventory.requiredStock",
      address: "$warehouseDetails.addressDetails.state",
      totalCapicity: "$warehouseDetails.basicDetails.warehouseCapacity",
      utilizedCapicity: {
        $cond: {
          if: {
            $gt: [
              { $ifNull: ["$warehouseDetails.inventory.requiredStock", 0] },
              0,
            ],
          },
          then: "$warehouseDetails.inventory.requiredStock",
          else: "$warehouseDetails.inventory.stock",
        },
      },
      realTimeStock: "$warehouseDetails.inventory.stock",
      procurement_partner: "$warehouseDetails.procurement_partner",
      distance: "100 KM",
      totalProcuredQty: 1,
      totalLiftedQty: 1,
    },
  },

  { $sort: { [sortBy || "createdAt"]: -1, _id: 1 } },
  { $skip: skip },
  { $limit: parseInt(limit, 10) },
];

    const records = { count: 0, rows: [] };
    records.rows = await wareHousev2.aggregate(aggregationPipeline);

    const countAggregation = [{ $match: preLookupQuery }, { $count: "total" }]; //[{ $match: query }, { $count: "total" }];
    const countResult = await wareHousev2.aggregate(countAggregation);
    records.count = countResult.length > 0 ? countResult[0].total : 0;

    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    // Export functionality
    if (isExport == 1) {
      const record = records.rows.map((item) => {
        return {
          "WareHouse Name": item?.warehouseName || "NA",
          "pickup Location": item?.pickupLocation || "NA",
          "Inventory availalbility": item?.stock ?? "NA",
          "warehouse Timing": item?.warehouseTiming ?? "NA",
          "Nodal officer": item?.nodalOfficerName || "NA",
          "POC Name": item?.pointOfContact?.name ?? "NA",
          "POC Email": item?.pointOfContact?.email ?? "NA",
          "POC Phone": item?.pointOfContact?.phone ?? "NA",
        };
      });

      if (record.length > 0) {
        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `warehouse-List.xlsx`,
          worksheetName: `warehouse-List`,
        });
      } else {
        return res.send(
          new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.found("warehouse"),
          })
        );
      }
    } else {
      return res.send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("warehouse"),
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
});

module.exports.getMonthlyPaidAmount = asyncErrorHandler(async (req, res) => {
  try {
    // Fetch aggregated monthly paid amounts
    const monthlyPaidAmounts = await PurchaseOrderModel.aggregate([
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
    const startYear = monthlyPaidAmounts.length ? monthlyPaidAmounts[0].year : currentYear;
    const endYear = currentYear;

    const filledMonthlyData = [];
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 1; month <= 12; month++) {
        const existingData = monthlyPaidAmounts.find(
          (data) => data.year === year && data.month === month
        );

        filledMonthlyData.push({
          year,
          month,
          totalPaidAmount: existingData ? existingData.totalPaidAmount : 0,
        });
      }
    }

    // Check if data is available
    if (!filledMonthlyData.length) {
      return res.status(200).send(new serviceResponse({
        status: 200,
        message: "No data available for monthly paid amounts"
      }));
    }

    // Return aggregated results with missing months filled in
    return res.status(200).send(new serviceResponse({
      status: 200,
      data: filledMonthlyData,
      message: "Monthly paid amounts fetched successfully"
    }));
  } catch (error) {
    console.error(error);
    return res.status(500).send(new serviceResponse({
      status: 500,
      message: "Error fetching monthly paid amounts",
      error: error.message
    }));
  }
});
