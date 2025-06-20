const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _query } = require("@src/v1/utils/constants/messages");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { User } = require("@src/v1/models/app/auth/User");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _userStatus, _status, _procuredStatus, _paymentStatus, _associateOfferStatus } = require("@src/v1/utils/constants");
const { AgentInvoice } = require("@src/v1/models/app/payment/agentInvoice");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { commodity } = require("../../dropDown/Controller");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const mongoose = require("mongoose");

/*
//start of prachi code
module.exports.getDashboardStats = async (req, res) => {
    try {
        const { user_id } = req;
        const currentDate = new Date();
        const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

        const [
            lastMonthBo,
            currentMonthAssociates,
            lastMonthFarmers,
            currentMonthFarmers,
            branchOfficeCount,
            associateCount,
            procurementCenterCount,
            farmerCount,
            warehouseCount,
            PaymentInitiatedCount
        ] = await Promise.all([
            User.countDocuments({
                user_type: _userType.bo,
                is_form_submitted: true,
                is_approved: _userStatus.approved,
                createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
            }),
            User.countDocuments({
                user_type: _userType.associate,
                is_form_submitted: true,
                is_approved: _userStatus.approved,
                createdAt: { $gte: startOfCurrentMonth }
            }),
            farmer.countDocuments({
                status: _status.active,
                createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
            }),
            farmer.countDocuments({
                status: _status.active,
                createdAt: { $gte: startOfCurrentMonth }
            }),
            Branches.countDocuments({ status: _status.active }),
            User.countDocuments({ user_type: _userType.associate, is_approved: _userStatus.approved }),
            ProcurementCenter.countDocuments({ deletedAt: null }),
            farmer.countDocuments({ status: _status.active }),
            wareHouseDetails.countDocuments({ active: true }),
            Payment.aggregate([
                {
                    $match: { bo_id: new mongoose.Types.ObjectId(user_id), payment_status: "Completed", deletedAt: null }
                },
                {
                    $group: {
                        _id: null, totalAmount: { $sum: "$amount" }
                    }
                }
            ]),
        ]);

        const associateDifference = currentMonthAssociates - lastMonthBo;
        const associateStatus = associateDifference >= 0 ? 'increased' : 'decreased';
        const associateDifferencePercentage = lastMonthBo > 0
            ? ((associateDifference / lastMonthBo) * 100).toFixed(2) + '%'
            : '0%';
        const farmerDifference = currentMonthFarmers - lastMonthFarmers;
        const farmerStatus = farmerDifference >= 0 ? 'increased' : 'decreased';
        const farmerDifferencePercentage = lastMonthFarmers > 0
            ? ((farmerDifference / lastMonthFarmers) * 100).toFixed(2) + '%'
            : '0%';
const totalPaymentAmount = PaymentCompletedSumAgg[0]?.totalAmount || 0;
        const records = {
            branchOfficeCount,
            associateStats: {
                totalAssociates: associateCount,
                currentMonthAssociates,
                lastMonthBo,
                difference: associateDifference,
                differencePercentage: associateDifferencePercentage,
                status: associateStatus
            },
            procurementCenterCount,
            farmerStats: {
                totalFarmers: farmerCount,
                currentMonthFarmers,
                lastMonthFarmers,
                difference: farmerDifference,
                differencePercentage: farmerDifferencePercentage,
                status: farmerStatus
            },
            warehouseCount,
            PaymentInitiatedCount
        };

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Dashboard Stats") }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
*/

module.exports.getDashboardStats = async (req, res) => {
    try {
  
        const boId = new mongoose.Types.ObjectId(req.portalId);

        const userDetails = await Branches.findOne({ _id: boId })
        const stateName = userDetails?.state?.trim();
        const stateDoc = await StateDistrictCity.aggregate([
            { $unwind: "$states" },
            { $match: { "states.state_title": stateName } },
            { $project: { _id: 0, state_id: "$states._id" } }
        ]);

        const stateId = stateDoc[0]?.state_id;
        const farmerRegisteredCount = await farmer.countDocuments({
            "address.state_id": stateId
        });

        // warehouse count 
        const warehouseCount = await wareHouseDetails.countDocuments({ active: true });

        // Procurement center count
        const procurementCenterCount = await ProcurementCenter.countDocuments({deletedAt: null, active:true})

        //Payment Count 
        const PaymentInitiatedCount = await Payment.countDocuments({
            bo_id: { $exists: true },
            payment_status: "Completed"
        })

        // total Procurment count
        const totalProducments = await Payment.find(
            { payment_status: "Completed" },
            'qtyProcured'
        );
        const totalProcurementCount = totalProducments.reduce((sum, item) => {
            const qty = parseFloat(item.qtyProcured || 0);
            const currentSum = sum + qty;
            return currentSum;
        }, 0);


        const records = {
            farmerRegisteredCount,
            procurementCenterCount,
            warehouseCount,
            PaymentInitiatedCount,
            totalProcurementCount,

        };

        return res.send(new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.found("Dashboard Stats")
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

// module.exports.getDashboardStats = async (req, res) => {

//     try {

//         const currentDate = new Date();
//         const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
//         const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
//         const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

//         const lastMonthBo = await User.countDocuments({
//             user_type: _userType.bo,
//             is_form_submitted: true,
//             is_approved: _userStatus.approved,
//             createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
//         });

//         const currentMonthAssociates = await User.countDocuments({
//             user_type: _userType.associate,
//             is_form_submitted: true,
//             is_approved: _userStatus.approved,
//             createdAt: { $gte: startOfCurrentMonth }
//         });

//         const difference = currentMonthAssociates - lastMonthBo;
//         const status = difference >= 0 ? 'increased' : 'decreased';

//         let differencePercentage = 0;
//         if (lastMonthBo > 0) {
//             differencePercentage = (difference / lastMonthBo) * 100;
//         }

//         // Farmers stats for last month and current month
//         const lastMonthFarmers = await farmer.countDocuments({
//             status: _status.active,
//             createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
//         });

//         const currentMonthFarmers = await farmer.countDocuments({
//             status: _status.active,
//             createdAt: { $gte: startOfCurrentMonth }
//         });

//         // Difference and percentage for farmers
//         const farmerDifference = currentMonthFarmers - lastMonthFarmers;
//         const farmerStatus = farmerDifference >= 0 ? 'increased' : 'decreased';

//         let farmerDifferencePercentage = 0;
//         if (lastMonthFarmers > 0) {
//             farmerDifferencePercentage = (farmerDifference / lastMonthFarmers) * 100;
//         }

//         const branchOfficeCount = (await Branches.countDocuments({ status: _status.active })) ?? 0;
//         const associateCount = (await User.countDocuments({ user_type: _userType.associate, is_approved: _userStatus.approved})) ?? 0;
//         const procurementCenterCount = (await ProcurementCenter.countDocuments({deletedAt: null})) ?? 0;
//         const farmerCount = (await farmer.countDocuments({ status: _status.active })) ?? 0;

//         const associateStats = {
//             totalAssociates: associateCount,
//             currentMonthAssociates,
//             lastMonthBo,
//             difference,
//             differencePercentage: differencePercentage.toFixed(2) + '%',
//             status: status,
//         };

//         const farmerStats = {
//             totalFarmers: farmerCount,
//             currentMonthFarmers,
//             lastMonthFarmers,
//             difference: farmerDifference,
//             differencePercentage: farmerDifferencePercentage.toFixed(2) + '%',
//             status: farmerStatus,
//         };

//         const records = {
//             branchOfficeCount,
//             associateStats,
//             procurementCenterCount,
//             farmerStats
//         };

//         return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Dashboard Stats") }));

//     } catch (error) {
//         _handleCatchErrors(error, res);
//     }
// }




module.exports.getProcurementsStats = async (req, res) => {

    try {

        const { month, year } = req.query;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        if (month && (isNaN(month) || month < 1 || month > 12)) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("month. It should be between 1 and 12.") }] }));
        }

        if (year && (isNaN(year) || year > currentYear)) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid(`year. It should not be greater than ${currentYear}`) }] }));
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

//start of prachi code 
module.exports.getProcurementStatusList = async (req, res) => {

    try {
        const { page, limit = 6, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;
        let query = {
            ...(search ? { reqNo: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };

        const records = { count: 0 }
        const selectedFields = 'reqNo product.name product.quantity totalQuantity fulfilledQty';

        const fetchedRecords = paginate == 1
            ? await RequestModel.find(query)
                .select(selectedFields)
                .sort(sortBy)
                .skip(skip)
                .limit(parseInt(limit))

            : await RequestModel.find(query).sort(sortBy)

        records.rows = fetchedRecords.map(record => ({
            orderId: record?.reqNo,
            commodity: record?.product.name,
            quantityRequired: record?.product.quantity,
            totalQuantity: record?.product.quantity,
            fulfilledQty: record?.fulfilledQty
        }));
        records.count = await RequestModel.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }
        if (!records) {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Procurement") }));
        }
        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Procurement") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
//end of prachi code 


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

module.exports.farmerPayments = async (req, res) => {

    try {
        const { page, limit = 6, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query

        let query = {
            ...(search ? { reqNo: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };
        const records = { count: 0 };
        const selectedFields = 'reqNo product.name product.quantity deliveryDate fulfilledQty';
        const fetchedRecords = paginate == 1
            ? await RequestModel.find(query)
                .select(selectedFields)
                .sort(sortBy)
                .skip(skip)
                .limit(parseInt(limit))

            : await RequestModel.find(query).sort(sortBy);

        let requestCount = 0;

        records.rows = await Promise.all(fetchedRecords.map(async record => {

            const batchIds = await Batch.find({ req_id: record._id }).select({ _id: 0, farmerOrderIds: 1 }).lean();

            let farmerOrderIdsOnly = {}

            if (batchIds && batchIds.length > 0) {
                farmerOrderIdsOnly = batchIds[0].farmerOrderIds.map(order => order.farmerOrder_id);
                let query = { _id: { $in: farmerOrderIdsOnly } };
                requestCount = await FarmerOrders.countDocuments(query);
                // console.log(query);
            }
            return {
                'orderId': record?.reqNo,
                'quantityRequired': record?.product.quantity,
                'deliveryDate': record?.deliveryDate,
                'requestCount': requestCount
            }
            // return { ...record.toObject(), branchDetails }
        }));

        records.count = await RequestModel.countDocuments(query);
        //  console.log(records)
        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (!records) {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Payment") }));
        }
        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.agentPayments = async (req, res) => {

    try {

        const { page, limit = 5, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query

        let query = search ? {
            $or: [
                { "req_id.reqNo": { $regex: search, $options: 'i' } },
                { "bo_id.branchId": { $regex: search, $options: 'i' } },
                { "req_id.product.name": { $regex: search, $options: 'i' } }
            ]
        } : {};

        const records = { count: 0 };

        const fetchedRecords = paginate == 1 ? await AgentInvoice.find(query)
            .select({ qtyProcured: 1, payment_status: 1, bill: 1 })
            .populate([{ path: "bo_id", select: "branchId" }, { path: "req_id", select: "product.name deliveryDate quotedPrice reqNo" }])
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit))

            : await AgentInvoice.find(query)
                .select({ qtyProcured: 1, payment_status: 1, bill: 1 })
                .populate([{ path: "bo_id", select: "branchId" }, { path: "req_id", select: "product.name deliveryDate quotedPrice reqNo" }])
                .sort(sortBy)

        // records.rows = fetchedRecords.map(record => ({
        //     orderId: record?.req_id?.reqNo || null,
        //     qtyProcured: record?.qtyProcured,
        //     billingDate: record?.req_id?.deliveryDate || null,
        //     paymentStatus: record?.payment_status
        // })).filter(row => row.orderId !== null);

        records.rows = fetchedRecords
            .filter(record => record.req_id) // only include records where req_id is not null
            .map(record => ({
                orderId: record.req_id.reqNo,
                qtyProcured: record.qtyProcured,
                billingDate: record.req_id.deliveryDate,
                paymentStatus: record.payment_status
            }));

        records.count = await AgentInvoice.countDocuments(query);
        // console.log(records)

        if (paginate == 1) {
            records.page = parseInt(page)
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))


    } catch (error) {
        _handleCatchErrors(error, res);
    }

}
module.exports.getStateWiseCommodityStatus = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const portalId = req.user?.portalId?._id;
        if (!portalId) return res.status(400).json({ message: 'Invalid portalId' });

        const branch = await Branches.findOne({ _id: portalId }).lean();
        if (!branch) return res.status(404).json({ message: 'No branch found for the portal' });

        const stateData = await StateDistrictCity.findOne(
            { "states.state_title": branch.state },
            { "states.$": 1 }
        ).lean();
        const stateId = stateData?.states?.[0]?._id;
        if (!stateId) return res.status(404).json({ message: 'State not found in the master collection' });

        const baseMatch = { branch_id: branch._id };

        const farmerCountPromise = farmer.countDocuments({ 'address.state_id': stateId, status: _status.active });

        const aggregationPipeline = [
            { $match: baseMatch },
            {
                $lookup: {
                    from: 'associateoffers',
                    let: { reqId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$req_id', '$$reqId'] } } },
                        {
                            $lookup: {
                                from: 'farmerorders',
                                let: { offerId: '$_id' },
                                pipeline: [
                                    { $match: { $expr: { $eq: ['$associateOffers_id', '$$offerId'] } } },
                                    {
                                        $lookup: {
                                            from: 'farmers',
                                            localField: 'farmer_id',
                                            foreignField: '_id',
                                            as: 'farmerInfo'
                                        }
                                    },
                                    {
                                        $unwind: '$farmerInfo'
                                    },
                                    {
                                        $project: {
                                            offeredQty: 1,
                                            farmer_id: 1,
                                            associate_id: '$farmerInfo.associate_id'
                                        }
                                    }
                                ],
                                as: 'farmerOrders'
                            }
                        },
                        {
                            $unwind: '$farmerOrders'
                        },
                        {
                            $project: {
                                farmer_id: '$farmerOrders.farmer_id',
                                offeredQty: '$farmerOrders.offeredQty',
                                associate_id: '$farmerOrders.associate_id'
                            }
                        }
                    ],
                    as: 'offers'
                }
            },
            {
                $unwind: '$offers'
            },
            {
                $lookup: {
                    from: 'commodities',
                    localField: 'product.commodity_id',
                    foreignField: '_id',
                    as: 'commodity'
                }
            },
            {
                $unwind: '$commodity'
            },
            {
                $group: {
                    _id: {
                        commodityId: '$commodity._id',
                        name: '$commodity.name'
                    },
                    totalQtyPurchased: { $sum: '$offers.offeredQty' },
                    farmerSet: { $addToSet: '$offers.farmer_id' },
                    pacSet: { $addToSet: '$offers.associate_id' }
                }
            },
            {
                $project: {
                    commodityId: '$_id.commodityId',
                    name: '$_id.name',
                    quantityPurchased: { $ifNull: ['$totalQtyPurchased', 0] },
                    farmersBenefitted: { $size: '$farmerSet' },
                    registeredPacs: { $size: '$pacSet' }
                }
            },
            {
                $group: {
                    _id: branch.state,
                    commodities: { $push: '$$ROOT' }
                }
            },
            {
                $project: {
                    _id: 0,
                    state: '$_id',
                    commodities: 1
                }
            },
            { $skip: skip },
            { $limit: limit }
        ];

        const countPipeline = [
            { $match: baseMatch },
            {
                $group: {
                    _id: branch.state
                }
            },
            { $count: 'total' }
        ];

        const [result, countResult, farmerCount] = await Promise.all([
            RequestModel.aggregate(aggregationPipeline).allowDiskUse(true),
            RequestModel.aggregate(countPipeline),
            farmerCountPromise
        ]);

        const rows = result.map(entry => ({
            ...entry,
            commodities: entry.commodities.map(commodity => ({
                ...commodity,
                farmerCount
            }))
        }));

        const count = countResult[0]?.total || 0;

        res.status(200).json({
            status: 200,
            data: {
                rows,
                count,
                page,
                limit,
                pages: limit !== 0 ? Math.ceil(count / limit) : 0
            },
            message: _query.get('State Wise Commodity Status')
        });

    } catch (err) {
        console.error('Error generating stats:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};












