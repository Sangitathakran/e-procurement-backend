const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { _statesAndUTs } = require("@src/v1/utils/constants");
const moment = require('moment')
// upag api

// module.exports.getProcurementData = async (req, res) => {
//     try {
//         const schemeId = new mongoose.Types.ObjectId(req.query.schemeId);

//         if (!schemeId) {
//             return res.status(400).json({ message: "schemeId is required" });
//         }
//         const schemeData = await Scheme.findById(schemeId).select('schemeId schemeName season period');
//         const aggregation = [
//             {
//                 $match: { 'product.schemeId': schemeId }
//             },
//             {
//                 $lookup: {
//                     from: 'associateoffers',
//                     localField: '_id',
//                     foreignField: 'req_id',
//                     as: 'associateoffer'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'users',
//                     localField: 'associateoffer.seller_id',
//                     foreignField: '_id',
//                     as: 'associate'
//                 }
//             },
//             { $unwind: '$associate' },
//             {
//                 $lookup: {
//                     from: 'commodities',
//                     localField: 'product.commodity_id',
//                     foreignField: '_id',
//                     as: 'commodity'
//                 }
//             },
//             { $unwind: '$commodity' },
//             {
//                 $project: {
//                     _id: 1,
//                     product: 1,
//                     'associate.address.registered.state': 1,
//                     'commodity': 1,
//                     'associateoffer._id': 1
//                 }
//             }
//         ];

//         const result = await RequestModel.aggregate(aggregation);
//         console.log(result[0]?.associateoffer)
//         if (!result || result.length === 0) {
//             return res.status(404).json({ message: "Request not found" });
//         }

//         const associateOffers = result[0]?.associateoffer || [];

//         const farmerOffers = await Promise.all(
//             associateOffers.map(async (associateOffer) => {
//                 return FarmerOrders.find({
//                     associateOffers_id: associateOffer._id,
//                     payment_status: "Completed",
//                 });
//             })
//         );
//         const totalFarmerOffers = farmerOffers.reduce((acc, offers) => acc + offers.length, 0);

//         const yesterdayFarmerOffers = await Promise.all(
//             associateOffers.map(async (associateOffer) => {
//                 return FarmerOrders.find({
//                     associateOffers_id: associateOffer._id,
//                     payment_status: "Completed",
//                     updatedAt: {
//                         $gte: new Date(new Date().setDate(new Date().getDate() - 2)),
//                         $lt: new Date(),
//                     },
//                 });
//             })
//         );
//         const yesterdayTotalFarmerOffers = yesterdayFarmerOffers.reduce((acc, offers) => acc + offers.length, 0);
//         const response = {
//             "statecode": result[0].associate.address.registered.state,
//             "statename": result[0].associate.address.registered.state,
//             "commoditycode": result[0].commodity.commodityId,
//             "scheme": schemeData?.schemeName,
//             "sanctionqty": result[0]?.product?.quantity,
//             "quantityprocuredyesterday": yesterdayTotalFarmerOffers,
//             "progressiveprocurement": totalFarmerOffers,
//             "prognooffarmersbenefitted": 0,
//             "paymentamount": 0,
//             "lastupdateddate": "2025-05-16",
//             "procstartdate": "2025-04-01",
//             "procenddate": "2025-06-30",
//             "msp": result[0]?.quotedPrice,
//             "year": "2025",
//             "season": schemeData?.season,
//             "uom_of_qty": "MT",
//             "price": result[0]?.quotedPrice,
//             "uom_of_no_of_farmers_benifited": 0
//         }
//         return res.status(200).json({ data: response, messages: "Procurement Data Fetch Successfully" }); // Assuming one record per schemeId
//     } catch (error) {
//         console.log("Error in getProcurementData: ", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// module.exports.getProcurementData = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;

//         // Validate that startDate and endDate are provided
//         if (!startDate || !endDate) {
//             return res.status(400).json({ message: "startDate and endDate are required" });
//         }

//         // Parse the dates
//         const start = new Date(startDate);
//         const end = new Date(endDate);

//         // Check for invalid dates
//         if (isNaN(start) || isNaN(end)) {
//             return res.status(400).json({ message: "Invalid date format" });
//         }

//         // Calculate the difference in days
//         const diffTime = Math.abs(end - start);
//         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

//         // Check if the difference exceeds 7 days
//         console.log('diffDays', diffDays)
//         if (diffDays >= 7) {
//             return res.status(400).json({ message: "Date range should not exceed 7 days" });
//         }

//         const schemes = await Scheme.find().select('_id schemeId schemeName season period procurementDuration');
//         if (!schemes || schemes.length === 0) {
//             return res.status(404).json({ message: "No schemes found" });
//         }
//         const finalResponses = [];

//         for (const scheme of schemes) {
//             const schemeId = scheme._id;

//             const aggregation = [
//                 {
//                     $match: { 'product.schemeId': schemeId }
//                 },
//                 {
//                     $lookup: {
//                         from: 'associateoffers',
//                         localField: '_id',
//                         foreignField: 'req_id',
//                         as: 'associateoffer'
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: 'users',
//                         localField: 'associateoffer.seller_id',
//                         foreignField: '_id',
//                         as: 'associate'
//                     }
//                 },
//                 { $unwind: '$associate' },
//                 {
//                     $lookup: {
//                         from: 'commodities',
//                         localField: 'product.commodity_id',
//                         foreignField: '_id',
//                         as: 'commodity'
//                     }
//                 },
//                 { $unwind: '$commodity' },
//                 {
//                     $project: {
//                         _id: 1,
//                         product: 1,
//                         'associate.address.registered.state': 1,
//                         'commodity': 1,
//                         'associateoffer._id': 1,
//                         quotedPrice: 1,
//                     }
//                 }
//             ];
//             const result = await RequestModel.aggregate(aggregation);
//             if (!result || result.length === 0) continue;

//             const associateOffers = result[0]?.associateoffer || [];
//             const farmerOffers = await Promise.all(
//                 associateOffers.map(async (associateOffer) => {
//                     return FarmerOrders.find({
//                         associateOffers_id: associateOffer._id,
//                         payment_status: "Completed",
//                         updatedAt: {
//                             $gte: new Date(startDate).toISOString(),
//                             $lt: new Date(endDate).toISOString(),
//                         }
//                     }, { offeredQty: 1 });
//                 })
//             );
//             const totalFarmerOffers = farmerOffers.reduce((acc, offers) => acc + offers.length, 0);
//             let progressiveprocurement = 0

//             let qtyProcured = 0
//             for (let farmerOrder of farmerOffers) {
//                 qtyProcured += farmerOrder.reduce((acc, order) => acc + order.offeredQty, 0)
//             }
//             progressiveprocurement = qtyProcured;

//             const yesterdayFarmerOffers = await Promise.all(
//                 associateOffers.map(async (associateOffer) => {
//                     return FarmerOrders.find({
//                         associateOffers_id: associateOffer._id,
//                         payment_status: "Completed",
//                         updatedAt: {
//                             $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
//                             $lt: new Date(),
//                         },
//                     },);
//                 })
//             );

//             let quantityprocuredyesterday = 0
//             for (let farmerOrder of yesterdayFarmerOffers) {
//                 quantityprocuredyesterday += farmerOrder.reduce((acc, order) => acc + order.offeredQty, 0)
//             }
//             const [pocStartDate, pocEndDate] = scheme?.procurementDuration.split(' - ')
//             const response = {
//                 "statecode": result[0].associate.address.registered.state,
//                 "statename": result[0].associate.address.registered.state,
//                 "commoditycode": result[0].commodity.commodityId,
//                 "scheme": scheme.schemeName,
//                 "sanctionqty": result[0]?.product?.quantity,
//                 "quantityprocuredyesterday": quantityprocuredyesterday,
//                 "progressiveprocurement": progressiveprocurement,
//                 "prognooffarmersbenefitted": totalFarmerOffers,
//                 "paymentamount": qtyProcured * result[0]?.quotedPrice,
//                 "lastupdateddate": null,
//                 "procstartdate": pocStartDate,
//                 "procenddate": pocEndDate,
//                 "msp": result[0]?.quotedPrice,
//                 "year": "2025",
//                 "season": scheme.season,
//                 "uom_of_qty": "MT",
//                 "price": result[0]?.quotedPrice,
//                 "uom_of_no_of_farmers_benifited": totalFarmerOffers
//             };

//             finalResponses.push(response);
//         }

//         if (finalResponses.length === 0) {
//             return res.status(404).json({ message: "No procurement data found for any scheme" });
//         }

//         return res.status(200).json({ data: finalResponses, messages: "Procurement Data Fetched Successfully" });

//     } catch (error) {
//         console.log("Error in getProcurementData: ", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };
;

module.exports.getProcurementData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "startDate and endDate are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
        if (diffDays >= 7) {
            return res.status(400).json({ message: "Date range should not exceed 7 days" });
        }

        const schemes = await Scheme.find().select('_id schemeId schemeName season period procurementDuration').lean();

        if (!schemes.length) {
            return res.status(404).json({ message: "No schemes found" });
        }

        const finalResponses = [];

        for (const scheme of schemes) {
            const schemeId = scheme._id;

            const aggregation = [
                {
                    $match: { 'product.schemeId': schemeId }
                },
                {
                    $lookup: {
                        from: 'associateoffers',
                        localField: '_id',
                        foreignField: 'req_id',
                        as: 'associateoffer'
                    }
                },
                {
                    $unwind: {
                        path: '$associateoffer',
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'associateoffer.seller_id',
                        foreignField: '_id',
                        as: 'associate'
                    }
                },
                {
                    $unwind: '$associate'
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
                    $project: {
                        reqId: '$_id',
                        quantity: '$product.quantity',
                        quotedPrice: '$quotedPrice',
                        commodityId: '$commodity.commodityId',
                        associateState: '$associate.address.registered.state',
                        associateOfferId: '$associateoffer._id',
                        updatedAt:1,
                        createdAt:1
                    }
                }
            ];

            const result = await RequestModel.aggregate(aggregation);
            if (!result.length) continue;

            const associateOfferIds = result.map(item => item.associateOfferId);

            const [farmerOrdersByRange, farmerOrdersLastWeek] = await Promise.all([
                FarmerOrders.aggregate([
                    {
                        $match: {
                            associateOffers_id: { $in: associateOfferIds },
                            payment_status: "Completed",
                            updatedAt: {
                                $gte: start,
                                $lt: end
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalQty: { $sum: '$offeredQty' },
                            count: { $sum: 1 }
                        }
                    }
                ]),
                FarmerOrders.aggregate([
                    {
                        $match: {
                            associateOffers_id: { $in: associateOfferIds },
                            payment_status: "Completed",
                            updatedAt: {
                                $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
                                $lt: new Date()
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalQty: { $sum: '$offeredQty' }
                        }
                    }
                ])
            ]);

            const { quantity, quotedPrice, associateState, commodityId,updatedAt,createdAt } = result[0];
            const progressiveprocurement = farmerOrdersByRange[0]?.totalQty || 0;
            const totalFarmers = farmerOrdersByRange[0]?.count || 0;
            const quantityprocuredyesterday = farmerOrdersLastWeek[0]?.totalQty || 0;
            const statecode = _statesAndUTs?.find((st)=>st?.name===associateState)?.code || associateState
            const [pocStartDate, pocEndDate] = scheme.procurementDuration.split(' - ');
            finalResponses.push({
                "statecode": statecode,
                "statename": associateState,
                "commoditycode": commodityId,
                "scheme": scheme.schemeName,
                "sanctionqty": quantity,
                "quantityprocuredyesterday": quantityprocuredyesterday,
                "progressiveprocurement": progressiveprocurement,
                "prognooffarmersbenefitted": totalFarmers,
                "paymentamount": progressiveprocurement * quotedPrice,
                "lastupdateddate": moment(updatedAt).format("YYYY MM DD"),
                "procstartdate": pocStartDate,
                "procenddate": pocEndDate,
                "msp": quotedPrice,
                "year": moment(createdAt).format("YYYY"),
                "season": scheme.season,
                "uom_of_qty": "MT",
                "price": quotedPrice,
                "uom_of_no_of_farmers_benifited": "Count"
            });
        }

        if (!finalResponses.length) {
            return res.status(404).json({ message: "No procurement data found for any scheme" });
        }

        return res.status(200).json({ data: finalResponses, message: "Procurement Data Fetched Successfully" });

    } catch (error) {
        console.error("Error in getProcurementData:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};



