const { _handleCatchErrors, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers")
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _query } = require("@src/v1/utils/constants/messages");
// const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
// const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
// const { User } = require("@src/v1/models/app/auth/User");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _userStatus, _status, _procuredStatus, _paymentStatus, _associateOfferStatus } = require("@src/v1/utils/constants");
const { AgentInvoice } = require("@src/v1/models/app/payment/agentInvoice");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
// const { commodity } = require("../../dropDown/Controller");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
// const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const mongoose = require("mongoose");
const { Scheme } = require("@src/v1/models/master/Scheme");


module.exports.getDashboardStats = async (req, res) => {
    try {
        const boId = new mongoose.Types.ObjectId(req.portalId);
        const { commodity, season, scheme } = req.query;

        // Step 1: Build Request Filters
        const filters = [{ branch_id: boId }];

        if (commodity) {
            const ids = commodity.split(',').filter(Boolean).map(id => new mongoose.Types.ObjectId(id));
            if (ids.length) filters.push({ "product.commodity_id": { $in: ids } });
        }

        if (scheme) {
            const ids = scheme.split(',').filter(Boolean).map(id => new mongoose.Types.ObjectId(id));
            if (ids.length) filters.push({ "product.schemeId": { $in: ids } });
        }

        if (season) {
            const seasons = season.split(',').filter(Boolean).map(s => new RegExp(`^${s}$`, 'i'));
            const schemeDocs = await Scheme.find({ season: { $in: seasons } }, { _id: 1 });
            const schemeIds = schemeDocs.map(s => s._id);
            if (schemeIds.length) filters.push({ "product.schemeId": { $in: schemeIds } });
        }

        const requestMatch = { $and: filters };

        // Step 2: Aggregate Requests for totals
        const requestAgg = await RequestModel.aggregate([
            { $match: requestMatch },
            {
                $group: {
                    _id: null,
                    totalQty: { $sum: { $toDouble: "$fulfilledQty" } },
                    totalAmount: { $sum: { $multiply: [{ $toDouble: "$fulfilledQty" }, { $toDouble: "$quotedPrice" }] } },
                    requestIds: { $addToSet: "$_id" }
                }
            }
        ]);

        if (!requestAgg.length) {
            return res.send(new serviceResponse({
                status: 200,
                data: { farmerRegisteredCount: 0, warehouseCount: 0, procurementCenterCount: 0, PaymentInitiatedCount: 0, totalProcurementCount: 0 },
                message: _response_message.notFound("Dashboard Stats")
            }));
        }

        const { totalQty, totalAmount, requestIds } = requestAgg[0];

        // Step 3: Batch aggregation for unique warehouses & procurement centers
        const batchAgg = await Batch.aggregate([
            { $match: { req_id: { $in: requestIds } } },
            {
                $group: {
                    _id: null,
                    warehouseIds: { $addToSet: "$warehousedetails_id" },
                    pocIds: { $addToSet: "$procurementCenter_id" }
                }
            }
        ]);

        const warehouseCount = batchAgg.length ? batchAgg[0].warehouseIds.filter(Boolean).length : 0;
        const procurementCenterCount = batchAgg.length ? batchAgg[0].pocIds.filter(Boolean).length : 0;

        // Step 4: Farmer count (based on Payment)
        const payments = await Payment.distinct("farmer_id", {
            req_id: { $in: requestIds },
            payment_status: "Completed"
        });
        const farmerRegisteredCount = payments.length;

        return res.send(new serviceResponse({
            status: 200,
            data: {
                farmerRegisteredCount,
                warehouseCount,
                procurementCenterCount,
                PaymentInitiatedCount: handleDecimal(totalAmount),
                totalProcurementCount: handleDecimal(totalQty)
            },
            message: _response_message.found("Dashboard Stats")
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

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

module.exports.getProcurementStatusList = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 6,
            skip = 0,
            paginate = 1,
            sortBy = {},
            search = '',
            isExport = 0,
            commodity,
            season,
            scheme
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);
        skip = parseInt(skip);

        const parseArray = (param) => {
            if (!param) return [];
            if (Array.isArray(param)) return param;
            try {
                const parsed = JSON.parse(param);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                return param.split(',').map(item => item.trim()).filter(Boolean);
            }
        };

        const commodityArray = parseArray(commodity);
        const seasonArray = parseArray(season);
        const schemeArray = parseArray(scheme);

        const query = {
            deletedAt: null,
            ...(search ? { reqNo: { $regex: search, $options: 'i' } } : {})
        };

        let isAnyFilterApplied = false;

        // Commodity filter
        const validCommodityIds = commodityArray.filter(mongoose.Types.ObjectId.isValid);
        if (validCommodityIds.length > 0) {
            query['product.commodity_id'] = { $in: validCommodityIds.map(id => new mongoose.Types.ObjectId(id)) };
            isAnyFilterApplied = true;
        }

        // Scheme filter
        const validSchemeIds = schemeArray.filter(mongoose.Types.ObjectId.isValid);
        if (validSchemeIds.length > 0) {
            query['product.schemeId'] = { $in: validSchemeIds.map(id => new mongoose.Types.ObjectId(id)) };
            isAnyFilterApplied = true;
        }

        // Season filter
        if (seasonArray.length > 0) {
            query['product.season'] = { $in: seasonArray.map(season => new RegExp(`^${season}$`, 'i')) };
            isAnyFilterApplied = true;
        }

        const selectedFields = 'reqNo product.name product.quantity totalQuantity fulfilledQty product.commodity_id product.schemeId product.season';
        const records = { count: 0 };

        const fetchedRecords = paginate == 1
            ? await RequestModel.find(query).select(selectedFields).sort(sortBy).skip(skip).limit(limit)
            : await RequestModel.find(query).select(selectedFields).sort(sortBy);

        records.rows = fetchedRecords.map(record => ({
            orderId: record?.reqNo,
            commodity: record?.product?.name,
            quantityRequired: record?.product?.quantity,
            totalQuantity: record?.product?.quantity,
            fulfilledQty: record?.fulfilledQty,
            commodity_id: record?.product?.commodity_id || null,
            scheme_id: record?.product?.schemeId || null,
            season: record?.product?.season || null
        }));

        records.count = await RequestModel.countDocuments(query);

        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit !== 0 ? Math.ceil(records.count / limit) : 0;
        }

        if (!records?.rows?.length) {
            return res.status(200).send(
                new serviceResponse({
                    status: 200,
                    data: records,
                    message: isAnyFilterApplied
                        ? _response_message.notFound('No Request Found matching filters')
                        : _response_message.notFound('No Request Found')
                })
            );
        }

        return res.status(200).send(
            new serviceResponse({
                status: 200,
                data: records,
                message: _response_message.found('Procurement')
            })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

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
        const {
            page = 1,
            limit = 6,
            skip = 0,
            paginate = 1,
            sortBy = {},
            search = '',
            isExport = 0,
            commodity,
            season,
            scheme
        } = req.query;

        //Parse arrays from query
        const parseArray = (param) => {
            if (!param) return [];
            if (Array.isArray(param)) return param;
            try {
                const parsed = JSON.parse(param);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                return param.split(',').map(item => item.trim()).filter(Boolean);
            }
        };

        const commodityArray = parseArray(commodity);
        const seasonArray = parseArray(season);
        const schemeArray = parseArray(scheme);
        // console.log(commodityArray, commodity)
        //Base query
        let query = {
            deletedAt: null,
        };

        if (search) {
            query.reqNo = { $regex: search, $options: "i" };
        }

        //Apply filters
        if (commodityArray.length > 0) {
            const validIds = commodityArray.filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validIds.length) {
                query['product.commodity_id'] = { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }

        if (seasonArray.length > 0) {
            query['product.season'] = { $in: seasonArray };
        }

        if (schemeArray.length > 0) {
            const validIds = schemeArray.filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validIds.length) {
                query['product.schemeId'] = { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }

        //Fetch data
        const selectedFields = 'reqNo product.name product.quantity deliveryDate fulfilledQty product.commodity_id product.schemeId product.season';
        const fetchedRecords = paginate == 1
            ? await RequestModel.find(query)
                .select(selectedFields)
                .sort(sortBy)
                .skip(parseInt(skip))
                .limit(parseInt(limit))
            : await RequestModel.find(query).select(selectedFields).sort(sortBy);

        //No data found case when filters are applied
        if ((commodityArray.length || seasonArray.length || schemeArray.length) && fetchedRecords.length === 0) {
            return res.status(200).send(new serviceResponse({
                status: 200,
                data: { rows: [], count: 0, page, limit, pages: 0 },
                message: _response_message.notFound("Payment")
            }));
        }

        //Build response rows
        const records = { rows: [], count: 0 };

        records.rows = await Promise.all(fetchedRecords.map(async record => {
            const batchIds = await Batch.find({ req_id: record._id }).select({ _id: 0, farmerOrderIds: 1 }).lean();

            let farmerOrderIdsOnly = [];
            if (batchIds?.[0]?.farmerOrderIds?.length) {
                farmerOrderIdsOnly = batchIds[0].farmerOrderIds.map(order => order.farmerOrder_id);
            }

            const requestCount = farmerOrderIdsOnly.length > 0
                ? await FarmerOrders.countDocuments({ _id: { $in: farmerOrderIdsOnly } })
                : 0;

            return {
                orderId: record?.reqNo,
                quantityRequired: record?.product?.quantity,
                deliveryDate: record?.deliveryDate,
                requestCount: requestCount,
                commodity_id: record?.product.commodity_id,
                schemeId: record?.product.schemeId,
                season: record?.product.season
            };
        }));

        records.count = await RequestModel.countDocuments(query);

        if (paginate == 1) {
            records.page = parseInt(page);
            records.limit = parseInt(limit);
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        }

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.found("Payment")
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.agentPayments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 5,
            skip = 0,
            paginate = 1,
            sortBy = {},
            search = '',
            isExport = 0,
            commodity,
            season,
            scheme
        } = req.query;

        //multi select filter
        const parseArray = (param) => {
            if (!param) return [];
            if (Array.isArray(param)) return param;
            try {
                const parsed = JSON.parse(param);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                return param.split(',').map(item => item.trim()).filter(Boolean);
            }
        };

        const commodityArray = parseArray(commodity);
        const seasonArray = parseArray(season);
        const schemeArray = parseArray(scheme);

        //filter Request ID first
        const requestFilter = {};
        if (commodityArray.length > 0) {
            const validSchemeIds = commodityArray.filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validSchemeIds.length)
                requestFilter['product.commodity_id'] = {
                    $in: validSchemeIds.map(id => new mongoose.Types.ObjectId(id))
                };
        }
        if (seasonArray.length > 0)
            requestFilter['product.season'] = { $in: seasonArray };

        if (schemeArray.length > 0) {
            const validSchemeIds = schemeArray.filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validSchemeIds.length)
                requestFilter['product.schemeId'] = {
                    $in: validSchemeIds.map(id => new mongoose.Types.ObjectId(id))
                };
        }

        let validRequestIds = [];
        if (Object.keys(requestFilter).length > 0) {
            const matchingRequests = await RequestModel.find(requestFilter, { _id: 1 });
            validRequestIds = matchingRequests.map(req => req._id);
        }

        //build AgentInvoice query
        const query = {};

        if (validRequestIds.length > 0) {
            query.req_id = { $in: validRequestIds };
        }

        if ((commodityArray.length || seasonArray.length || schemeArray.length) && validRequestIds.length === 0) {
            // Filters applied but no matching Request found
            return res.status(200).send(new serviceResponse({
                status: 200,
                data: { rows: [], count: 0, page, limit, pages: 0 },
                message: "No Payment data found"
            }));
        }

        //apply search
        if (search) {
            query.$or = [
                { "req_id.reqNo": { $regex: search, $options: 'i' } },
                { "bo_id.branchId": { $regex: search, $options: 'i' } },
                { "req_id.product.name": { $regex: search, $options: 'i' } }
            ];
        }

        // fetch and populate
        const baseQuery = AgentInvoice.find(query)
            .select({ qtyProcured: 1, payment_status: 1, bill: 1 })
            .populate([
                { path: "bo_id", select: "branchId" },
                { path: "req_id", select: "product.name product.season product.schemeId deliveryDate quotedPrice reqNo product.commodity_id " }
            ])
            .sort(sortBy);

        const fetchedRecords = paginate == 1
            ? await baseQuery.skip(parseInt(skip)).limit(parseInt(limit))
            : await baseQuery;

        const rows = fetchedRecords
            .filter(record => record.req_id)
            .map(record => ({
                orderId: record.req_id.reqNo,
                qtyProcured: record.qtyProcured,
                billingDate: record.req_id.deliveryDate,
                paymentStatus: record.payment_status,
                commodityName: record.req_id.product.name || null,
                commodity_id: record.req_id.product.commodity_id || null,
                schemeId: record.req_id.product.schemeId || null,
                season: record.req_id.product.season || null
            }));

        const totalCount = await AgentInvoice.countDocuments(query);

        const response = {
            rows,
            count: totalCount,
        };

        if (paginate == 1) {
            response.page = parseInt(page);
            response.limit = limit;
            response.pages = limit != 0 ? Math.ceil(totalCount / limit) : 0;
        }

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: response,
            message: _query.get("Payment")
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.getStateWiseCommodityStatus = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { commodity, scheme, season, search } = req.query;
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

        //filters
        const query = [];
        let filtersApplied = false;

        if (commodity) {
            const commodityArray = commodity.split(',').filter(Boolean).map(id => new mongoose.Types.ObjectId(id));
            if (commodityArray.length) {
                filtersApplied = true;
                query.push({ 'product.commodity_id': { $in: commodityArray } });
            }
        }

        if (scheme) {
            const schemeArray = scheme.split(',').filter(Boolean).map(id => new mongoose.Types.ObjectId(id));
            if (schemeArray.length) {
                filtersApplied = true;
                query.push({ 'product.schemeId': { $in: schemeArray } });
            }
        }

        if (season) {
            const seasonArray = season.split(',').filter(Boolean);
            if (seasonArray.length) {
                filtersApplied = true;
                const regexSeason = seasonArray.map(name => new RegExp(name, 'i'));
                query.push({ 'product.season': { $in: regexSeason } });
            }
        }

        const filter = query.length ? { $and: query } : {};
        const requestIds = filtersApplied
            ? (await RequestModel.find(filter, { _id: 1 }).lean()).map(r => r._id)
            : [];

        const farmerCountPromise = farmer.countDocuments({
            'address.state_id': stateId,
            status: _status.active
        });

        //If filters are applied and no request matches, return zero stats
        if (filtersApplied && requestIds.length === 0) {
            const farmerCount = await farmerCountPromise;
            return res.status(200).json({
                status: 200,
                data: {
                    rows: [{
                        state: branch.state,
                        commodities: [],
                    }],
                    count: 0,
                    page,
                    limit,
                    pages: 0
                },
                message: _query.get('State Wise Commodity Status')
            });
        }

        //Aggregation
        const aggregationPipeline = [
            {
                $match: {
                    ...baseMatch,
                    ...(filtersApplied ? { _id: { $in: requestIds } } : {})
                }
            },
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
                                    { $unwind: '$farmerInfo' },
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
                        { $unwind: '$farmerOrders' },
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
            { $unwind: '$offers' },
            {
                $lookup: {
                    from: 'commodities',
                    localField: 'product.commodity_id',
                    foreignField: '_id',
                    as: 'commodity'
                }
            },
            { $unwind: '$commodity' },
            ...(search ? [{
                $match: {
                    'commodity.name': { $regex: search, $options: 'i' }
                }
            }] : []),

            {
                $group: {
                    _id: {
                        commodityId: '$commodity._id',
                        name: '$commodity.name',
                        scheme: '$product.schemeId',
                        season: "$product.season"
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
            {
                $match: {
                    ...baseMatch,
                    ...(filtersApplied ? { _id: { $in: requestIds } } : {})
                }
            },
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
                                    { $unwind: '$farmerInfo' },
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
                        { $unwind: '$farmerOrders' },
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
            { $unwind: '$offers' },
            {
                $lookup: {
                    from: 'commodities',
                    localField: 'product.commodity_id',
                    foreignField: '_id',
                    as: 'commodity'
                }
            },
            { $unwind: '$commodity' },

            // ✅ Apply optional search on commodity name
            ...(search ? [{
                $match: {
                    'commodity.name': { $regex: search, $options: 'i' }
                }
            }] : []),

            {
                $group: {
                    _id: branch.state // or '$branch.state' if it's embedded in the doc
                }
            },
            {
                $count: 'total'
            }
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

// State wise district
module.exports.getDistrict = async (req, res) => {
    try {
        const { district_titles } = req.query;

        //get boId
        const boId = new mongoose.Types.ObjectId(req.portalId);
        const branch = await Branches.findOne({ _id: boId });


        if (!branch || !branch.state) {
            return sendResponse({
                res,
                status: 400,
                message: "Invalid portalId or state not found in Branch data",
            });
        }

        const stateName = branch.state.trim();

        //stateId from StateDistrictCity using state Name
        const stateData = await StateDistrictCity.aggregate([
            { $unwind: "$states" },
            { $match: { "states.state_title": stateName } },
            { $project: { state_id: "$states._id", _id: 0 } }
        ]);

        const stateId = stateData[0]?.state_id;

        if (!stateId) {
            return sendResponse({
                res,
                status: 400,
                message: "State not found in StateDistrictCity collection",
            });
        }

        let districtArray = [];
        if (district_titles) {
            districtArray = Array.isArray(district_titles)
                ? district_titles
                : district_titles.split(',').map(d => d.trim());
        }

        //get districts for particular stated on basis of boId
        const pipeline = [
            { $unwind: "$states" },
            { $match: { "states._id": stateId, "states.status": "active" } },
            { $unwind: "$states.districts" },
            {
                $match: {
                    "states.districts.status": "active",
                    ...(districtArray.length > 0 && {
                        $or: [
                            { "states.districts.district_title": { $in: districtArray } },
                            {
                                "states.districts._id": {
                                    $in: districtArray
                                        .filter(id => mongoose.Types.ObjectId.isValid(id))
                                        .map(id => new mongoose.Types.ObjectId(id))
                                }
                            }
                        ]
                    })
                }
            },
            {
                $project: {
                    _id: 0,
                    district_id: "$states.districts._id",
                    district_title: "$states.districts.district_title"
                }
            }
        ];

        const district_list = await StateDistrictCity.aggregate(pipeline);

        return sendResponse({
            res,
            message: "Districts fetched successfully",
            data: district_list,
        });

    } catch (err) {
        console.error("ERROR in getDistrict: ", err);
        return sendResponse({
            res,
            status: 500,
            message: err.message,
        });
    }
};
