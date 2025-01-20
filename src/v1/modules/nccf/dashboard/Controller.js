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

        const page = 1, limit = 5;

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

        const page = 1, limit = 5, paginate = 1;

        let aggregationPipeline = [
            {
                $lookup: {
                    from: "distillers", // Adjust this to your actual collection name for branches
                    localField: "distiller_id",
                    foreignField: "_id",
                    as: "distillerDetails"
                }
            },
            // Unwind batchDetails array if necessary
            { $unwind: { path: "$distillerDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "batchorderprocesses", // Adjust this to your actual collection name for branches
                    localField: "_id",
                    foreignField: "orderId",
                    as: "batchDetails"
                }
            },

            // Unwind batchDetails array if necessary
            { $unwind: { path: "$batchDetails", preserveNullAndEmptyArrays: true } },

            // Unwind penaltyDetails if it's an array (assuming it is)
            {
                $unwind: {
                    path: "$batchDetails.penaltyDetails",
                    preserveNullAndEmptyArrays: true
                }
            },

            // Group by order ID and sum up penaltyAmount
            {
                $group: {
                    _id: "$_id",
                    order_id: { $first: "$purchasedOrder.poNo" },
                    distillerName: { $first: "$distillerDetails.basic_details.distiller_details.organization_name" },
                    commodity: { $first: "$product.name" },
                    quantityRequired: { $first: "$purchasedOrder.poQuantity" },
                    totalAmount: { $first: "$paymentInfo.totalAmount" },
                    paymentSent: { $first: "$paymentInfo.paidAmount" },
                    outstandingPayment: { $first: "$paymentInfo.balancePayment" },
                    totalPenaltyAmount: {
                        $sum: {
                            $ifNull: ["$batchDetails.penaltyDetails.penaltyAmount", 0]
                        }
                    },
                    paymentStatus: { $first: "$poStatus" },
                    distiller_id: { $first: "$distillerDetails.user_code" },
                }
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
                    distiller_id: 1
                }
            }
        ];

        aggregationPipeline.push(
            { $sort: { 'createdAt': -1, _id: 1 } },
            { $limit: parseInt(limit) }
        );

        const rows = await PurchaseOrderModel.aggregate(aggregationPipeline);

        const countPipeline = [
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

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("NCCF dashboard penalty status") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.getWarehouseList = asyncErrorHandler(async (req, res) => {

    const page = 1, limit = 5, sortBy = 'createdAt', sortOrder = 'asc', isExport = 0;

    try {

        // Fetch data with pagination and sorting
        const warehouses = await wareHouseDetails.find()
            .select()
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Count total warehouses
        const totalWarehouses = await wareHouseDetails.countDocuments();
        const activeWarehouses = await wareHouseDetails.countDocuments({ active: true });
        const inactiveWarehouses = totalWarehouses - activeWarehouses;

        // Handle export functionality
        if (isExport == 1) {
            const exportData = warehouses.map(item => ({
                "Warehouse ID": item._id,
                "Warehouse Name": item.basicDetails?.warehouseName || 'NA',
                "City": item.addressDetails?.city || 'NA',
                "State": item.addressDetails?.state || 'NA',
                "Status": item.active ? 'Active' : 'Inactive',
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