const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { User } = require("@src/v1/models/app/auth/User");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _userStatus, _status, _procuredStatus, _collectionName, _associateOfferStatus } = require("@src/v1/utils/constants");


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

        const hoWithBranches = await HeadOffice.aggregate([
            { $match: { deletedAt: null } },
            {
                $lookup: {
                    from: 'branches',
                    localField: '_id',
                    foreignField: 'headOfficeId',
                    as: 'branches'
                }
            },
            {
                $addFields: {
                    branchCount: { $size: '$branches' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalBranchCount: { $sum: '$branchCount' }
                }
            }
        ]);

        const branchOfficeCount = hoWithBranches?.[0]?.totalBranchCount ?? 0;
        // const branchOfficeCount = (await Branches.countDocuments({status: _status.active})) ?? 0;
        const associateCount = (await User.countDocuments({ user_type: _userType.associate, is_approved: _userStatus.approved })) ?? 0;
        const procurementCenterCount = (await ProcurementCenter.countDocuments({ deletedAt: null })) ?? 0;
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
        const selectedFields = 'reqNo quoteExpiry product.name quotedPrice totalQuantity fulfilledQty deliveryDate expectedProcurementDate product.quantity';
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
            totalQuantity: record.product?.quantity,
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

// ****************************** CONTROLLERS  WITHOUT AGGREGATION      *****************************

module.exports.getDashboardStatsWOAggregation = async (req, res) => {
    try {
      const currentDate = new Date();
      const startOfCurrentMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const startOfLastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        0
      );
  
      const lastMonthQuery = {
          user_type: _userType.associate,
          is_form_submitted: true,
          is_approved: _userStatus.approved,
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
        currentMonthQuery = {
          user_type: _userType.associate,
          is_form_submitted: true,
          is_approved: _userStatus.approved,
          createdAt: { $gte: startOfCurrentMonth },
        };
  
      const [lastMonthAssociates, currentMonthAssociates] = await Promise.all([
        User.countDocuments(lastMonthQuery),
        User.countDocuments(currentMonthQuery),
      ]);
      const difference = currentMonthAssociates - lastMonthAssociates;
      const status = difference >= 0 ? 'increased' : 'decreased';
  
      let differencePercentage = 0;
      if (lastMonthAssociates > 0) {
        differencePercentage = (difference / lastMonthAssociates) * 100;
      }
  
      const [lastMonthFarmers, currentMonthFarmers] = await Promise.all([
        farmer.countDocuments({
          status: _status.active,
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        }),
        farmer.countDocuments({
          status: _status.active,
          createdAt: { $gte: startOfCurrentMonth },
        }),
      ]);
  
      // Difference and percentage for farmers
      const farmerDifference = currentMonthFarmers - lastMonthFarmers;
      const farmerStatus = farmerDifference >= 0 ? 'increased' : 'decreased';
  
      let farmerDifferencePercentage = 0;
      if (lastMonthFarmers > 0) {
        farmerDifferencePercentage = (farmerDifference / lastMonthFarmers) * 100;
      }
  
      // 1. Fetch head offices (only _id) that are not deleted
      const headOffices = await HeadOffice.find({ deletedAt: null })
        .select('_id')
        .lean();
  
      // 2. Get list of HeadOffice IDs
      const headOfficeIds = headOffices.map(ho => ho._id);
  
      const branchCountData = await Branches.countDocuments({
        headOfficeId: { $in: headOfficeIds },
      });
  
      const branchOfficeCount = branchCountData ?? 0;
  
      const [associateCount, procurementCenterCount, farmerCount] =
        await Promise.all([
          User.countDocuments({
            user_type: _userType.associate,
            is_approved: _userStatus.approved,
          }),
          ProcurementCenter.countDocuments({ deletedAt: null }),
          farmer.countDocuments({ status: _status.active }),
        ]);
  
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
        farmerStats,
      };
  
      return res.send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found('Dashboard Stats'),
        })
      );
    } catch (error) {
      _handleCatchErrors(error, res);
    }
  };
  