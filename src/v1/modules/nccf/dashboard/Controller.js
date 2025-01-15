const {
    _handleCatchErrors,
    dumpJSONToExcel,
} = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
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

        const moU = await Distiller.countDocuments({ mou_approval: _userStatus.pending })

        const onBoarding = await Distiller.countDocuments({ is_approved: _userStatus.pending })

        const distillerCount = await Distiller.countDocuments()

        const realTimeStock = result.length > 0 ? result[0].totalStock : 0;

        const records = {
            wareHouseCount,
            purchaseOrderCount,
            realTimeStock,
            moUCount: moU,
            onBoardingCount: onBoarding,
            totalRequest: moU + onBoarding,
            distillerCount
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

        const { page = 1, limit = 5 } = req.body;

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
        }

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

        const { page = 1, limit = 5, skip = 0, paginate = 1, sortBy } = req.query;

        let matchQuery = {
            deletedAt: null
        };

        let aggregationPipeline = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: "distillers",
                    localField: "distiller_id",
                    foreignField: "_id",
                    as: "distillerDetails"
                }
            },
            {
                $unwind: {
                    path: "$distillerDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: "$_id",
                    order_id: { $first: "$purchasedOrder.poNo" },
                    distiller_id: { $first: "$distiller_id" },
                    distiller_name: { $first: "$distillerDetails.basic_details.distiller_details.organization_name" },
                    quantityRequired: { $first: "$purchasedOrder.poQuantity" }
                }
            },
            {
                $project: {
                    _id: 0,
                    order_id: 1,
                    distiller_id: 1,
                    distiller_name: 1,
                    quantityRequired: 1
                }
            }
        ];

        if (paginate == 1) {
            aggregationPipeline.push(
                { $sort: { [sortBy || 'createdAt']: -1, _id: 1 } },
                { $skip: parseInt(skip) },
                { $limit: parseInt(limit) }
            );
        } else {
            aggregationPipeline.push({ $sort: { [sortBy || 'createdAt']: -1, _id: 1 } });
        }

        const rows = await PurchaseOrderModel.aggregate(aggregationPipeline);

        const countPipeline = [
            { $match: matchQuery },
            { $count: "total" }
        ];

        const countResult = await PurchaseOrderModel.aggregate(countPipeline);
        const count = countResult[0]?.total || 0;

        const records = { rows, count };

        if (paginate == 1) {
            records.page = parseInt(page);
            records.limit = parseInt(limit);
            records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Distiller Data") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
});