const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { farmerOrderList } = require("../../associate/request/Controller");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { _procuredStatus } = require("@src/v1/utils/constants");

module.exports.farmerOrderList = async (req, res) => {
    try {
        const { req_id, seller_id } = req.body;

        // Find the offer
        const offer = (await AssociateOffers.findOne({ req_id, seller_id }).lean())._id;
        if (!offer) {
            return res
                .status(400)
                .send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
        }

        const offerId = offer._id;

        const query = {
            associateOffers_id: offerId,
            status: "Received",
        };

        // Aggregation Pipeline
        const aggregation = [
            {
                $match: query,
            },
            {
                $lookup: {
                    from: "farmers",
                    localField: "farmer_id",
                    foreignField: "_id",
                    as: "farmerDetails",
                },
            },
            { $unwind: "$farmerDetails" },
        
            // Convert farmerDetails.external_farmer_id to Int32
            {
                $addFields: {
                    "farmerDetails.external_farmer_id": {
                        $toInt: "$farmerDetails.external_farmer_id",
                    },
                },
            },
        
            {
                $lookup: {
                    from: "ekharidprocurements",
                    let: { ext_farmer_id: "$farmerDetails.external_farmer_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [
                                        "$procurementDetails.farmerID",
                                        { $toInt: "$$ext_farmer_id" }, // Convert to Int32 for comparison
                                    ],
                                },
                            },
                        },
                    ],
                    as: "ekharidprocurements",
                },
            },
            { $unwind: "$ekharidprocurements" },
            { $unwind: "$ekharidprocurements.procurementDetails" },
        
            // Grouping by gatePassID
            {
                $group: {
                    _id: "$ekharidprocurements.procurementDetails.gatePassID",
                    gatePassID: { $first: "$ekharidprocurements.procurementDetails.gatePassID" },
                    truck_capacity: { $sum: "$offeredQty" },
                    // totalQtyRemaining: { $sum: "$qtyRemaining" },
                    farmerData: {
                        $push: {
                            // orderId: "$_id",
                            qty: "$offeredQty",
                            farmerOrder_id: "$farmerDetails._id",
                            external_farmer_id: "$farmerDetails.external_farmer_id",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    gatePassID: 1,
                    truck_capacity: 1,
                    // totalQtyRemaining: 1,
                    farmerData: 1,
                    count: 1,
                },
            },
        ];

        const records = { count: 0 };

        records.rows = await FarmerOrders.aggregate(aggregation);
        records.count = await FarmerOrders.aggregate([...aggregation, { $count: "count" }]);

        return res.status(200).send(
            new serviceResponse({
                status: 200,
                data: records,
                message: _response_message.found(),
            })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.createBatch = async (req, res) => {
    try {
        const { req_id, truck_capacity, farmerData = [], seller_id } = req.body;

        if (farmerData.length === 0) {
            return res.status(400).send(
                new serviceResponse({ status: 400, message: "Farmer data is required" })
            );
        }

        const farmerIds = farmerData.map((farmer) => mongoose.Types.ObjectId(farmer._id));

        const farmers = await farmer.aggregate([
            {
                $match: { _id: { $in: farmerIds } },
            },
            
            {
                $project: {
                    _id: 1,
                 
                    // Add any specific fields you want to return
                },
            },
        ]);

        return res.status(200).send(
            new serviceResponse({
                status: 200,
                data: farmers,
                message: _response_message.created("batch"),
            })
        );
    } catch (error) {
        console.error(error);
        return res.status(500).send(
            new serviceResponse({
                status: 500,
                message: "Something went wrong while creating batch",
            })
        );
    }
};

// module.exports.createBatch = async (req, res) => {
//     try {
//         const { req_id, truck_capacity, farmerData = [], seller_id } = req.body;
//         for (let value of farmerData){
//             const data= await farmer.findById({_id:value._id})
//         }


//         return res.status(200).send(new serviceResponse({ status: 200, data: data, message: _response_message.created("batch") }))

//         return false
//         const procurementRecord = await RequestModel.findOne({ _id: req_id });
//         if (!procurementRecord) {
//             return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }))
//         }

//         const record = await AssociateOffers.findOne({ seller_id: seller_id, req_id: req_id });
//         if (!record) {
//             return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
//         }

//         const sumOfQty = farmerData.reduce((acc, curr) => {
//             acc = acc + curr.qty;
//             return acc;
//         }, 0);

//         // Apply handleDecimal to sumOfQty and truck_capacity if neededs
//         const sumOfQtyDecimal = handleDecimal(sumOfQty);
//         const truckCapacityDecimal = handleDecimal(truck_capacity);

//         if (sumOfQtyDecimal > truckCapacityDecimal) {
//             return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "quantity should not exceed truck capacity" }] }))
//         }

//         //////////////// Start of Sangita code

//         if (sumOfQtyDecimal > record.offeredQty) {
//             return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Quantity should not exceed offered Qty." }] }))
//         }

//         const existBatch = await Batch.find({ seller_id: user_id, req_id, associateOffer_id: record._id });
//         if (existBatch) {
//             const addedQty = existBatch.reduce((sum, existBatch) => sum + existBatch.qty, 0);

//             if (addedQty >= record.offeredQty) {
//                 return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Cannot create more Batch, Offered qty already fulfilled." }] }))
//             }
//         }

//         //////////////// End of Sangita code

//         const farmerOrderIds = [];
//         let partiallyFulfilled = 0;
//         let procurementCenter_id;

//         for (let farmer of farmerData) {

//             const farmerOrder = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id }).lean();

//             // farmer order exist or not 
//             if (!farmerOrder) {
//                 return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer order") }] }));
//             }

//             // order should be procured from these farmers 
//             if (farmerOrder.status != _procuredStatus.received) {
//                 return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "farmer order should not be pending" }] }));
//             }

//             // procurement Center should be same in current batch
//             if (!procurementCenter_id) {
//                 procurementCenter_id = farmerOrder?.procurementCenter_id.toString();
//             } else if (procurementCenter_id && procurementCenter_id != farmerOrder.procurementCenter_id.toString()) {
//                 return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "procurement center should be the same for all the orders" }] }))
//             }

//             // qty should not exceed from qty procured 
//             if (farmerOrder?.qtyProcured < farmer.qty) {
//                 return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "added quantity should not exceed quantity procured" }] }));
//             }
//             // is the order full filled partially 
//             if ((farmerOrder?.qtyProcured - farmer.qty) > 0) {
//                 partiallyFulfilled = 1;
//             }

//             // Apply handleDecimal to amt for each farmer
//             farmer.amt = handleDecimal(farmer.qty * procurementRecord?.quotedPrice);
//             farmerOrderIds.push(farmer.farmerOrder_id);
//         }

//         // given farmer's order should be in received state
//         const farmerRecords = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $in: farmerOrderIds } });
//         if (farmerRecords)
//             return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.pending("contribution") }] }));

//         // update status based on fulfillment 
//         const farmerRecordsPending = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $nin: farmerOrderIds } });
//         record.status = (farmerRecordsPending || partiallyFulfilled == 1) ? _associateOfferStatus.partially_ordered : _associateOfferStatus.ordered;

//         // create unique batch Number 
//         let batchId, isUnique = false;
//         while (!isUnique) {
//             batchId = await generateBatchId();
//             if (!(await Batch.findOne({ batchId: batchId }))) isUnique = true;
//         }

//         const findwarehouseUser = await RequestModel.findOne({ _id: req_id });

//         const qty_value = handleDecimal(sumOfQtyDecimal);

//         const batchCreated = await Batch.create({
//             seller_id: user_id,
//             req_id,
//             associateOffer_id: record._id,
//             batchId,
//             warehousedetails_id: findwarehouseUser.warehouse_id,
//             farmerOrderIds: farmerData,
//             procurementCenter_id,
//             qty: qty_value,  // Apply handleDecimal here
//             available_qty: qty_value,
//             goodsPrice: handleDecimal(sumOfQtyDecimal * procurementRecord?.quotedPrice), // Apply handleDecimal here
//             totalPrice: handleDecimal(sumOfQtyDecimal * procurementRecord?.quotedPrice) // Apply handleDecimal here
//         });

//         for (let farmer of farmerData) {
//             const farmerOrder = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id }).lean();

//             // Fetch the latest qtyRemaining from the database
//             const latestFarmerOrder = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id }).select('qtyRemaining qtyProcured').lean();

//             if (!latestFarmerOrder) {
//                 return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Farmer order not found." }] }));
//             }

//             const currentRemaining = latestFarmerOrder.qtyRemaining ?? latestFarmerOrder.qtyProcured;

//             // Validate remaining quantity
//             if (currentRemaining < farmer.qty) {
//                 return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Added quantity exceeds the remaining quantity." }] }));
//             }

//             // Update the quantity remaining
//             await FarmerOrders.updateOne(
//                 { _id: farmer.farmerOrder_id },
//                 { $set: { qtyRemaining: handleDecimal(currentRemaining - farmer.qty) } }
//             );
//         }


//         procurementRecord.associatOrder_id.push(record._id);
//         await record.save();
//         await procurementRecord.save();

//         // const users = await User.find({
//         //     'basic_details.associate_details.email': { $exists: true }
//         // }).select('basic_details.associate_details.email basic_details.associate_details.associate_name associate.basic_details.associate_details.organization_name');

//         // await Promise.all(
//         //     users.map(({ basic_details: { associate_details } }) => {
//         //         const { email, associate_name } = associate_details;

//         //         return emailService.sendCreateBatchEmail(email, associate_name);
//         //     })
//         // );

//         return res.status(200).send(new serviceResponse({ status: 200, data: batchCreated, message: _response_message.created("batch") }))

//     } catch (error) {
//         _handleCatchErrors(error, res);
//     }
// };
