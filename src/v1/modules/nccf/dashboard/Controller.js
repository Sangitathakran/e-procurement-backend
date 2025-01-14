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

        const pipline = [
            {
                $project: {
                    _id: 1,

                }
            }
        ]

    } catch (error) {
        _handleCatchErrors(error, res);
    }
});