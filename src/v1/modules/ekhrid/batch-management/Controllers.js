const { _handleCatchErrors, handleDecimal } = require("@src/v1/utils/helpers");
const { farmerOrderList } = require("../../associate/request/Controller");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { _procuredStatus, _associateOfferStatus, _paymentApproval, _batchStatus } = require("@src/v1/utils/constants");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const mongoose = require('mongoose');
const moment = require('moment');


module.exports.getFarmerOrders = async (req, res) => {
    try {

        const { req_id, seller_id } = req.body;

        const associateOfferIds = (await AssociateOffers.find({ req_id: new mongoose.Types.ObjectId(req_id), seller_id: new mongoose.Types.ObjectId(seller_id) })).map(i => i._id);

        // let query = { associateOffers_id: { $in: associateOfferIds }, status: "Received" };
        let query = {
            associateOffers_id: { $in: associateOfferIds },
            status: "Received",
            $or: [
                { batchCreatedAt: { $eq: null } }, // batchCreatedAt is null
                { batchCreatedAt: { $exists: false } } // batchCreatedAt does not exist
            ]
        };

        const farmerOrders = await FarmerOrders.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: "farmers",
                    localField: "farmer_id",
                    foreignField: "_id",
                    as: "farmerDetails"
                }
            },
            {$unwind: "$farmerDetails"},
            {
                $lookup: {
                    from: "ekharidprocurements",
                    localField: "gatePassID",
                    foreignField: "procurementDetails.gatePassID",
                    // // let: { gatePassID: {$toString: "$farmerDetails.gatePassID"} },
                    // pipeline: [
                    //     { $match: { $expr: { $eq: ["$procurementDetails.gatePassID", "gatePassID"] } } }
                    // ],
                    as: "procurementDetails"
                }
            },
            {$unwind: {path: "$procurementDetails", preserveNullAndEmptyArrays: true}},
            {$match:{"batchCreatedAt": null}},          
            {
                $group: {
                    _id: 1,
                    req_id: { $first: req_id }, // Include req_id
                    seller_id: { $first: seller_id }, // Include seller_id
                    truck_capacity: { $first: 301 }, // Static truck_capacity value
                    farmerData: {
                        $push: {
                            farmerOrder_id: "$_id",
                            qty: "$offeredQty",
                            gatePassId: "$gatePassID",
                            liftedDate:"$procurementDetails.procurementDetails.liftedDate",
                            noOfBags:"$procurementDetails.procurementDetails.totalBags",
                            driverName:"$procurementDetails.warehouseData.driverName",
                            transporterName:"$procurementDetails.warehouseData.transporterName",
                            truckNo:"$procurementDetails.warehouseData.truckNo",
                            warehouseId:"$procurementDetails.warehouseData.warehouseId", 
                            warehouseName:"$procurementDetails.warehouseData.warehouseName",   
                            // driverName: { $ifNull: ["$procurementDetails.warehouseData.driverName", "N/A"] },
                            // transporterName: { $ifNull: ["$procurementDetails.warehouseData.transporterName", "N/A"] },
                            // truckNo: { $ifNull: ["$procurementDetails.warehouseData.truckNo", "N/A"] }
                        }
                    },
                    count: { $sum: 1 } // Count number of farmerData                    
                }
            }
        ]);

        return res.status(200).json({ status: 200, data: farmerOrders });

    } catch (error) {
        console.error("Error fetching farmer orders:", error);
        return res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
}

/*
module.exports.createBatch = async (req, res) => {
    try {
        const { req_id, truck_capacity, farmerData = [], seller_id } = req.body;
        //  procurement Request exist or not 
        const procurementRecord = await RequestModel.findOne({ _id: req_id });
        if (!procurementRecord) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }))
        }

        const record = await AssociateOffers.findOne({ seller_id: new mongoose.Types.ObjectId(seller_id), req_id: new mongoose.Types.ObjectId(req_id) });
        if (!record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
        }

        const sumOfQty = farmerData.reduce((acc, curr) => {
            acc = acc + curr.qty;
            return acc;
        }, 0);

        // Apply handleDecimal to sumOfQty and truck_capacity if neededs
        const sumOfQtyDecimal = handleDecimal(sumOfQty);
        const truckCapacityDecimal = handleDecimal(truck_capacity);

        if (sumOfQtyDecimal > truckCapacityDecimal) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "quantity should not exceed truck capacity" }] }))
        }

        if (sumOfQtyDecimal > record.offeredQty) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Quantity should not exceed offered Qty." }] }))
        }

        const existBatch = await Batch.find({ seller_id, req_id, associateOffer_id: record._id });
        if (existBatch) {
            const addedQty = existBatch.reduce((sum, existBatch) => sum + existBatch.qty, 0);

            if (addedQty >= record.offeredQty) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Cannot create more Batch, Offered qty already fulfilled." }] }))
            }
        }

        const farmerOrderIds = [];
        let partiallyFulfilled = 0;
        let procurementCenter_id;

        for (let farmer of farmerData) {

            const farmerOrder = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id }).lean();

            // farmer order exist or not 
            if (!farmerOrder) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer order") }] }));
            }

            // order should be procured from these farmers 
            if (farmerOrder.status != _procuredStatus.received) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "farmer order should not be pending" }] }));
            }

            // procurement Center should be same in current batch
            // if (!procurementCenter_id) {
            //     procurementCenter_id = farmerOrder?.procurementCenter_id.toString();
            // } else if (procurementCenter_id && procurementCenter_id != farmerOrder.procurementCenter_id.toString()) {
            //     return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "procurement center should be the same for all the orders" }] }))
            // }

            // qty should not exceed from qty procured 
            if (farmerOrder?.qtyProcured < farmer.qty) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "added quantity should not exceed quantity procured" }] }));
            }
            // is the order full filled partially 
            if ((farmerOrder?.qtyProcured - farmer.qty) > 0) {
                partiallyFulfilled = 1;
            }

            // Apply handleDecimal to amt for each farmer
            farmer.amt = handleDecimal(farmer.qty * procurementRecord?.quotedPrice);
            farmerOrderIds.push(farmer.farmerOrder_id);
        }

        // given farmer's order should be in received state
        const farmerRecords = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $in: farmerOrderIds } });
        if (farmerRecords)
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.pending("contribution") }] }));

        // update status based on fulfillment 
        const farmerRecordsPending = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $nin: farmerOrderIds } });
        record.status = (farmerRecordsPending || partiallyFulfilled == 1) ? _associateOfferStatus.partially_ordered : _associateOfferStatus.ordered;

        // create unique batch Number 
        let batchId, isUnique = false;
        while (!isUnique) {
            batchId = await generateBatchId();
            if (!(await Batch.findOne({ batchId: batchId }))) isUnique = true;
        }

        const findwarehouseUser = await RequestModel.findOne({ _id: req_id });

        const qty_value = handleDecimal(sumOfQtyDecimal);

        const batchCreated = await Batch.create({
            seller_id,
            req_id,
            associateOffer_id: record._id,
            batchId,
            warehousedetails_id: findwarehouseUser.warehouse_id,
            farmerOrderIds: farmerData,
            procurementCenter_id,
            qty: qty_value,  // Apply handleDecimal here
            available_qty: qty_value,
            goodsPrice: handleDecimal(sumOfQtyDecimal * procurementRecord?.quotedPrice), // Apply handleDecimal here
            totalPrice: handleDecimal(sumOfQtyDecimal * procurementRecord?.quotedPrice), // Apply handleDecimal here
            ekhridBatch: true,
            agent_approve_at: new Date(),
            agent_approve_status: _paymentApproval.approved,
            bo_approve_status: _paymentApproval.approved,
            ho_approve_status: _paymentApproval.approved,
            ho_approval_at: new Date(),
            status: _batchStatus.intransit
        });

        return res.status(200).send(
            new serviceResponse({
                status: 200,
                // data: farmers,
                message: _response_message.created("batch"),
            })
        );

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
*/

async function generateBatchId() {
    // Fetch the most recent batch by sorting in descending order
    const latestBatch = await Batch.findOne({})
        .sort({ _id: -1 }) // Sort by `_id` in descending order (latest first)
        .select("batchId"); // Only fetch the `batchId` field to minimize data transfer

    let nextSequence = 1;

    if (latestBatch && latestBatch.batchId) {
        // Extract the sequence number from the latest batch ID
        const match = latestBatch.batchId.match(/BH-(\d+)$/);
        if (match) {
            nextSequence = parseInt(match[1], 10) + 1; // Increment the sequence
        }
    }

    // Generate the new batch ID
    const batchId = `BH-${nextSequence.toString().padStart(4, "0")}`; // Zero-padded to 4 digits
    return batchId;
}

/*

module.exports.createBatch = async (req, res) => {
    try {
        const { req_id, truck_capacity, farmerData = [], seller_id } = req.body;

        // Check if procurement request exists
        const procurementRecord = await RequestModel.findOne({ _id: req_id });
        if (!procurementRecord) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }));
        }

        // Find the associate offer
        const record = await AssociateOffers.findOne({ seller_id: new mongoose.Types.ObjectId(seller_id), req_id: new mongoose.Types.ObjectId(req_id) });
        if (!record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
        }

        // Find warehouse user
        const findwarehouseUser = await RequestModel.findOne({ _id: req_id });

        const batches = [];

        for (let farmer of farmerData) {

            // Convert farmerOrder_id to ObjectId
            const farmerOrderId = new mongoose.Types.ObjectId(farmer.farmerOrder_id);

            // Check if farmer order exists
            const farmerOrder = await FarmerOrders.findOne({ _id: farmerOrderId }).lean();

            if (!farmerOrder) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer order") }] }));
            }

            // Farmer order should be in "Received" state
            if (farmerOrder.status !== _procuredStatus.received) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Farmer order should be in received state" }] }));
            }

            // Generate unique batch ID
            let batchId, isUnique = false;
            while (!isUnique) {
                batchId = await generateBatchId();
                if (!(await Batch.findOne({ batchId: batchId }))) isUnique = true;
            }

            console.log(farmer.gatePassId);
            
            // Calculate values
            const qty_value = handleDecimal(farmer.qty);
            const total_price = handleDecimal(farmer.qty * procurementRecord?.quotedPrice);

            // Create a new batch for each farmer order
            const batchCreated = await Batch.create({
                seller_id,
                req_id,
                associateOffer_id: record._id,
                batchId: farmer.gatePassId,
                warehousedetails_id: findwarehouseUser.warehouse_id,
                farmerOrderIds: [{ farmerOrder_id: farmerOrderId }], // ✅ Fix: Use an array of objects
                procurementCenter_id: farmerOrder.procurementCenter_id, // Assign correct procurement center
                qty: qty_value,
                available_qty: qty_value,
                goodsPrice: total_price,
                totalPrice: total_price,
                ekhridBatch: true,
                agent_approve_at: new Date(),
                agent_approve_status: _paymentApproval.approved,
                bo_approve_status: _paymentApproval.approved,
                ho_approve_status: _paymentApproval.approved,
                ho_approval_at: new Date(),
                status: _batchStatus.intransit,
                ekhridBatch:true
            });

            batches.push(batchCreated);
        }

        return res.status(200).send(
            new serviceResponse({
                status: 200,
                data: batches,
                message: _response_message.created("batches"),
            })
        );

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
*/

module.exports.createBatch = async (req, res) => {
    try {
        const { req_id, truck_capacity, farmerData = [], seller_id } = req.body;

        // Fetch procurement request and warehouse user in a single call
        const procurementRecord = await RequestModel.findOne({ _id: req_id }).lean();
        if (!procurementRecord) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }));
        }

        // Find associate offer
        const record = await AssociateOffers.findOne({ seller_id: new mongoose.Types.ObjectId(seller_id), req_id: new mongoose.Types.ObjectId(req_id) })
        if (!record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
        }

        // Get warehouse details (Assuming it’s stored in RequestModel)
        const warehouseDetails = procurementRecord.warehouse_id || null;

        // Collect all farmerOrder IDs
        const farmerOrderIds = farmerData.map(farmer => new mongoose.Types.ObjectId(farmer.farmerOrder_id));

        // Fetch all farmer orders in one query
        const farmerOrders = await FarmerOrders.find({ _id: { $in: farmerOrderIds } }).lean();
        console.log(farmerOrders.length,farmerOrderIds.length)
        if (farmerOrders.length !== farmerOrderIds.length) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "One or more farmer orders not found" }] }));
        }

        // Validate farmer order status
        for (const order of farmerOrders) {
            if (order.status !== _procuredStatus.received) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "All farmer orders must be in received state" }] }));
            }
        }

        // Generate unique batch IDs
        // const batchIds = new Set();
        // while (batchIds.size < farmerData.length) {
        //     batchIds.add(await generateBatchId());
        // }
        // const batchIdArray = Array.from(batchIds);
        

        // Prepare bulk insert operations
        const bulkOps = farmerData.map((farmer, index) => {
            const farmerOrder = farmerOrders.find(order => order._id.toString() === farmer.farmerOrder_id);
            const qty_value = handleDecimal(farmer.qty);
            const total_price = handleDecimal(farmer.qty * procurementRecord?.quotedPrice);
            return {
                insertOne: {
                    document: {
                        seller_id,
                        req_id,
                        associateOffer_id: record._id,
                        // batchId: batchIdArray[index],  // Assign unique batch ID
                        batchId: farmer.gatePassId,  
                        gatePassId: farmer.gatePassId,
                        warehousedetails_id: warehouseDetails,
                        farmerOrderIds: [{ farmerOrder_id: new mongoose.Types.ObjectId(farmer.farmerOrder_id),
                            qty: qty_value,
                            amt: total_price,
                         }],
                        procurementCenter_id: farmerOrder.procurementCenter_id,
                        qty: qty_value,
                        available_qty: qty_value,
                        goodsPrice: total_price,
                        totalPrice: total_price,
                        ekhridBatch: true,
                        agent_approve_at: new Date(),
                        agent_approve_status: _paymentApproval.approved,
                        bo_approve_status: _paymentApproval.approved,
                        ho_approve_status: _paymentApproval.approved,
                        ho_approval_at: new Date(),
                        status: _batchStatus.intransit,
                        "final_quality_check.whr_receipt": farmer.gatePassId,
                        'dispatched.dispatched_at':moment(farmer.liftedDate, "DD-MM-YYYY hh:mm:ss A").toISOString(),
                        'intransit.no_of_bags':farmer.noOfBags,

                    }
                }
            };
        });
      
        const bulkFarmersOrder = farmerData.map((farmer, index) => {
            return {
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(farmer.farmerOrder_id) },
                    update: { $set: { batchCreatedAt: new Date() } }
                }
            };
        });
         await FarmerOrders.bulkWrite(bulkFarmersOrder);

        // Execute bulk insert in one go
        const result = await Batch.bulkWrite(bulkOps);
        record.status = _associateOfferStatus.ordered;
        await record.save();

        return res.status(200).send(
            new serviceResponse({
                status: 200,
                data: result.insertedIds,
                message: _response_message.created("batches"),
            })
        );

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
