const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { User } = require("@src/v1/models/app/auth/User");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _userStatus, _status, _procuredStatus, _collectionName, _associateOfferStatus } = require("@src/v1/utils/constants");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { default: mongoose } = require("mongoose");



module.exports.getDashboardStats = async (req, res) => {

    try {

        const currentDate = new Date();
        const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

        const lastMonthAssociates = await User.countDocuments({
            user_type: _userType.associate,
            is_form_submitted: true,
            is_approved: _userStatus.approved,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        const currentMonthAssociates = await User.countDocuments({
            user_type: _userType.associate,
            is_form_submitted: true,
            is_approved: _userStatus.approved,
            createdAt: { $gte: startOfCurrentMonth }
        });

        const difference = currentMonthAssociates - lastMonthAssociates;
        const status = difference >= 0 ? 'increased' : 'decreased';

        let differencePercentage = 0;
        if (lastMonthAssociates > 0) {
            differencePercentage = (difference / lastMonthAssociates) * 100;
        }

        // Farmers stats for last month and current month
        const lastMonthFarmers = await farmer.countDocuments({
            status: _status.active,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        const currentMonthFarmers = await farmer.countDocuments({
            status: _status.active,
            createdAt: { $gte: startOfCurrentMonth }
        });

        // Difference and percentage for farmers
        const farmerDifference = currentMonthFarmers - lastMonthFarmers;
        const farmerStatus = farmerDifference >= 0 ? 'increased' : 'decreased';

        let farmerDifferencePercentage = 0;
        if (lastMonthFarmers > 0) {
            farmerDifferencePercentage = (farmerDifference / lastMonthFarmers) * 100;
        }

        const branchOfficeCount = (await Branches.countDocuments({ status: _status.active })) ?? 0;
        const associateCount = (await User.countDocuments({ user_type: _userType.associate, is_approved: _userStatus.approved, is_form_submitted: true })) ?? 0;
        const procurementCenterCount = (await ProcurementCenter.countDocuments({ active: true })) ?? 0;
        const farmerCount = (await farmer.countDocuments({ status: _status.active })) ?? 0;

        const associateStats = {
            totalAssociates: associateCount,
            currentMonthAssociates,
            lastMonthAssociates,
            difference,
            differencePercentage: differencePercentage.toFixed(2) + '%',
            status: status,
        };

        const farmerStats = {
            totalFarmers: farmerCount,
            currentMonthFarmers,
            lastMonthFarmers,
            difference: farmerDifference,
            differencePercentage: farmerDifferencePercentage.toFixed(2) + '%',
            status: farmerStatus,
        };

        const records = {
            branchOfficeCount,
            associateStats,
            procurementCenterCount,
            farmerStats
        };

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Dashboard Stats") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getProcurementsStats = async (req, res) => {

    try {

        const { month, year } = req.query;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        if (month && (isNaN(month) || month < 1 || month > 12)) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("month. It should be between 1 and 12.") }] }));
        }

        if (year && (isNaN(year) || year > currentYear)) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid(`year. It should not be greater than ${currentYear}`) }] }));
        }

        const selectedMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
        const selectedYear = year ? parseInt(year) : currentDate.getFullYear();

        const startOfMonth = new Date(selectedYear, selectedMonth, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);


        const procurementsStats = await FarmerOrders.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const records = {
            completed: 0,
            ongoing: 0,
            failed: 0,
            total: 0,
            completedPercentage: 0,
            ongoingPercentage: 0,
            failedPercentage: 0
        };

        procurementsStats.forEach(item => {
            if (item._id === _procuredStatus.received) {
                records.completed = item.count;
            } else if (item._id === _procuredStatus.pending) {
                records.ongoing = item.count;
            } else if (item._id === _procuredStatus.failed) {
                records.failed = item.count;
            }
            records.total += item.count;
        });

        if (records.total > 0) {
            records.completedPercentage = ((records.completed / records.total) * 100).toFixed(2) + '%';
            records.ongoingPercentage = ((records.ongoing / records.total) * 100).toFixed(2) + '%';
            records.failedPercentage = ((records.failed / records.total) * 100).toFixed(2) + '%';
        }

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Procured Stats") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getProcurementStatusList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', } = req.query

        let query = {
            ...(search ? { reqNo: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };

        const records = { count: 0 };
        const selectedFields = 'reqNo quoteExpiry product.name quotedPrice totalQuantity fulfilledQty deliveryDate expectedProcurementDate';
        const fetchedRecords = paginate == 1
            ? await RequestModel.find(query)
                .select(selectedFields)
                .sort(sortBy)
                .skip(skip)
                .limit(parseInt(limit))

            : await RequestModel.find(query).sort(sortBy);

        records.rows = fetchedRecords.map(record => ({
            orderId: record.reqNo,
            quoteExpiry: record.quoteExpiry,
            productName: record.product.name,
            quotedPrice: record.quotedPrice,
            deliveryDate: record.deliveryDate,
            expectedProcurementDate: record.expectedProcurementDate,
            totalQuantity: record.totalQuantity,
            fulfilledQty: record.fulfilledQty
        }));

        records.count = await RequestModel.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Procurement") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.getPendingOffersCountByRequestId = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', } = req.query

        let query = {
            ...(search && { reqNo: { $regex: search, $options: "i" } })
        };

        const aggregationPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'associateoffers',
                    localField: '_id',
                    foreignField: 'req_id',
                    as: 'offers'
                }
            },
            {
                $addFields: {
                    pendingOffersCount: { $size: '$offers' }
                }
            },
            {
                $project: {
                    reqNo: 1,
                    seller_id: 1,
                    quoteExpiry: 1,
                    'product.name': 1,
                    quotedPrice: 1,
                    totalQuantity: 1,
                    fulfilledQty: 1,
                    deliveryDate: 1,
                    expectedProcurementDate: 1,
                    pendingOffersCount: 1,
                }
            },
            { $sort: sortBy ? { [sortBy]: 1 } : { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ];
        const records = {}
        records.rows = await RequestModel.aggregate(aggregationPipeline);
        records.count = await RequestModel.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Procurement") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}


module.exports.getmandiwiseprocurment = asyncErrorHandler(async (req, res) => {
  const { portalId } = req; 
  let page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  let skip = (page - 1) * limit;
  const isExport = parseInt(req.query.isExport) === 1;
  const centerNames = req.query.search?.trim();

  const searchStates = req.query.stateNames
    ? Array.isArray(req.query.stateNames)
      ? req.query.stateNames
      : req.query.stateNames.split(',').map(s => s.trim())
    : null;
  const paymentQuery = { sla_id: portalId };
  const payments = await Payment.find(paymentQuery, { batch_id: 1}).lean();
  const batchIdSet = [...new Set(payments.map(p => String(p.batch_id)).filter(Boolean))];

  const pipeline = [
    {
      $match: {
        _id: { $in: batchIdSet.map(id => new mongoose.Types.ObjectId(id)) },
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
  ];

  if (searchStates) {
    pipeline.push({
      $match: {
        state: { $in: searchStates },
      },
    });
  }

  if (centerNames?.length) {
    pipeline.push({
      $match: {
        centerName: { $regex: centerNames, $options: "i" },
      },
    });
    page = 1;
    skip = 0;
  }

  pipeline.push({ $sort: { centerName: 1 } });
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