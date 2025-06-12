const {
  _handleCatchErrors,
  dumpJSONToExcel,
  generateFileName,
} = require("@src/v1/utils/helpers");
const {
  serviceResponse,
  sendResponse,
} = require("@src/v1/utils/helpers/api_response");
const {
  _query,
  _response_message,
} = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");


module.exports.getMandiProcurement = asyncErrorHandler(async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  let skip = (page - 1) * limit;
  const isExport = parseInt(req.query.isExport) === 1;
  const centerNames = req.query.search?.trim();
  const searchDistrict = req.query.districtNames?.trim() || null;
  const associateName = req.query.associateName?.trim() || null;

  const pipeline = [
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
    $lookup: {
        from: "branches", 
        localField: "relatedRequest.branch_id",
        foreignField: "_id",
        as: "branch",
    },
    },
    {
    $unwind: {
        path: "$branch",
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
];

    if (searchDistrict) {
    pipeline.push({
      $match: {
        "seller.address.registered.district": {
          $regex: new RegExp(searchDistrict, "i"),
        },
      },
    });
  }
     pipeline.push(
    {
      $group: {
        _id: "$procurementCenter_id",
        centerName: { $first: "$center.center_name" },
        Status: { $first: "$center.active" },
        centerId: { $first: "$center._id" },
        district: { $first: "$seller.address.registered.district" },
        state: { $first: "$seller.address.registered.state" },
        branchName: { $first: "$branch.branchName" }, 
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
);
  
  if (centerNames?.length) {
    pipeline.push({
      $match: {
        centerName: { $regex: centerNames, $options: "i" },
      },
    });
    page = 1;
    skip = 0;
  }
  if (associateName?.length) {
    pipeline.push({
      $match: {
        associate_name: { $regex: associateName, $options: "i" },
      },
    });
    page = 1;
    skip = 0;
  }

  pipeline.push({
  $addFields: {
    haryanaFirst: {
      $cond: [{ $eq: ["$state", "Haryana"] }, 0, 1],
    },
  },
});

pipeline.push({
  $sort: {
    haryanaFirst: 1,
    centerName: 1,
  },
});

  const aggregated = await Batch.aggregate(pipeline);


  if (isExport) {
    const exportRows = aggregated.map(item => ({
      "Center Name": item?.centerName || "NA",
      "District": item?.district || "NA",
      "State": item?.state || "NA",
      "Associate Name": item?.associate_name || "NA",
      "Branch Name": item?.branchName || "NA",
      "Product Name": item?.productName || "NA",
      "Offered Qty": item?.offeredQty || 0,
      "Lifted Qty": item?.liftedQty || 0,
      "Balance Qty": item?.balanceMandi || 0,
      "Lifting %": (item?.liftingPercentage ?? 0) + "%",
      "Lifted Days": item?.liftedDataDays ?? "NA",
      "Purchase Days": item?.purchaseDays ?? "NA",
      "Status": item?.Status ? "Active" : "Inactive",
    }));

    if (exportRows.length > 0) {
      return dumpJSONToExcel(req, res, {
        data: exportRows,
        fileName: "MandiWiseProcurementData.xlsx",
        worksheetName: "Mandi Data",
      });
    } else {
      return res.status(404).json(
        new serviceResponse({
          status: 404,
          message: _response_message.notFound("Mandi Procurement Not Found"),
        })
      );
    }
  }

  const totalRecords = aggregated.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const paginatedData = aggregated.slice(skip, skip + limit);

  return res.status(200).json(
    new serviceResponse({
      status: 200,
      data: {
        page,
        limit,
        totalPages,
        totalRecords,
        data: paginatedData,
        message: _response_message.found("Mandi Procurement Data Fetched"),
      },
    })
  );
});