const { _handleCatchErrors, handleDecimal } = require("@src/v1/utils/helpers");
const { farmerOrderList } = require("../../associate/request/Controller");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { _procuredStatus, _associateOfferStatus, _paymentApproval, _batchStatus,_paymentstatus } = require("@src/v1/utils/constants");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const mongoose = require('mongoose');
const moment = require('moment');
const { eKharidHaryanaProcurementModel } = require("@src/v1/models/app/eKharid/procurements");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");


module.exports.getFarmerOrders = async (req, res) => {
    try {

        const { req_id, seller_id } = req.body;

        const associateOfferIds = (await AssociateOffers.find({ req_id: new mongoose.Types.ObjectId(req_id), seller_id: new mongoose.Types.ObjectId(seller_id) })).map(i => i._id);

        // let query = { associateOffers_id: { $in: associateOfferIds }, status: "Received" };
        let query = {
            associateOffers_id: { $in: associateOfferIds },
            status: "Received",
            $or: [
                // { batchCreatedAt: { $eq: null } }, // batchCreatedAt is null
                // { batchCreatedAt: { $exists: true } } // batchCreatedAt does not exist
            ]
        };

        const farmerOrders = await FarmerOrders.aggregate([
            { $match: query },
            {$limit: 100},
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
                            gatePassDate:"$procurementDetails.procurementDetails.gatePassDate",
                            noOfBags:"$procurementDetails.procurementDetails.totalBags",
                            jformApprovalDate:"$procurementDetails.procurementDetails.jformApprovalDate",
                            driverName:"$procurementDetails.warehouseData.driverName",
                            transporterName:"$procurementDetails.warehouseData.transporterName",
                            truckNo:"$procurementDetails.warehouseData.truckNo",
                            warehouseId:"$procurementDetails.warehouseData.warehouseId", 
                            warehouseName:"$procurementDetails.warehouseData.warehouseName",   
                            driverName: { $ifNull: ["$procurementDetails.warehouseData.driverName", "N/A"] },
                            transporterName: { $ifNull: ["$procurementDetails.warehouseData.transporterName", "N/A"] },
                            truckNo: { $ifNull: ["$procurementDetails.warehouseData.truckNo", "N/A"] },
                            inwardDate: { $ifNull: ["$procurementDetails.warehouseData.inwardDate", "N/A"] },   
                            driverName: { $ifNull: ["$procurementDetails.warehouseData.driverName", "N/A"] },
                            transporterName: { $ifNull: ["$procurementDetails.warehouseData.transporterName", "N/A"] },
                            truckNo: { $ifNull: ["$procurementDetails.warehouseData.truckNo", "N/A"] },
                           // Neeraj code start Payment
                           transactionAmount:"$procurementDetails.paymentDetails.transactionAmount",
                           transactionDate:"$procurementDetails.paymentDetails.transactionDate",
                           transactionId:"$procurementDetails.paymentDetails.transactionId",
                           transactionStatus:"$procurementDetails.paymentDetails.transactionStatus",
                           // Neeraj code end Payment

                        }
                    },
                    count: { $sum: 1 } // Count number of farmerData                    
                }
            }
        ]);

        return res.status(200).json({ status: 200, data: farmerOrders, message: "Farmer orders fetched successfully" });

    } catch (error) {
        console.error("Error fetching farmer orders:", error);
        return res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
}

module.exports.getWarehouseTesting = async (req, res) => {
    try {
    
        const pipeline = [
            {
                $match: {
                    "warehouseData.warehouseName": { $ne: null },
                    "warehouseData.jformID": { $exists: true, $ne: null },
                }
            },
            {
                $group: {
                    _id: "$warehouseData.warehouseName",
                    warehouseId: { $first: "$warehouseData.warehouseId" },
                }
            }
        ];

        const warehouseDetails = await eKharidHaryanaProcurementModel.aggregate(pipeline);
       const warehouseNotExist=[]
        for(const warehouse of warehouseDetails){
            const existWarehouse = await wareHouseDetails.findOne({ 'basicDetails.warehouseName': warehouse._id });
            if(!existWarehouse) {
                warehouseNotExist.push(warehouse)
            }
        }

        if (!warehouseDetails || warehouseDetails.length === 0) {
            return res.status(404).json({ status: 404, message: "No warehouse details found" });
        }

        return res.status(200).json({ status: 200, data: {warehouseNotExist,count:warehouseNotExist?.length ||0} });
    } catch (error) {
        console.error("Error in getWarehouseTesting:", error);
        return res.status(500).json({ status: 500, message: "Internal Server Error", error: error.message });
    }
};






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
                        'final_quality_check.status': "Approved",
                        "final_quality_check.whr_receipt": farmer.gatePassId,
                        'intransit.no_of_bags':farmer.noOfBags,

                       //Neeraj Code start
                        'intransit.driver.name':farmer.driverName,
                        'intransit.transport.service_name':farmer.transporterName,
                        'intransit.transport.vehicleNo':farmer.truckNo,
                        'createdAt': moment(farmer.gatePassDate, "DD-MM-YYYY hh:mm:ss A").toISOString(), 
                        'dispatched.dispatched_at':moment(farmer.liftedDate, "DD-MM-YYYY hh:mm:ss A").toISOString(),
                        'intransit.intransit_at':moment(farmer.liftedDate, "DD-MM-YYYY hh:mm:ss A").toISOString(),
                        'delivered.delivered_at':moment(farmer.inwardDate, "DD-MM-YYYY hh:mm:ss A").toISOString(),
                        'dispatched.qc_report.received.0.img': "N/A",
                        'dispatched.qc_report.received.1.on': moment(farmer.jformApprovalDate, "DD-MM-YYYY hh:mm:ss A").toISOString(),  
                        'payment_at':moment(farmer.transactionDate, "DD-MM-YYYY hh:mm:ss A").toISOString(),
                        'payement_approval_at':moment(farmer.transactionDate, "DD-MM-YYYY hh:mm:ss A").toISOString(),
                         // Neeraj code End
                    }
                }


            };
        });
      {{
  
  }
    
  }
        const bulkFarmersOrder = farmerData.map((farmer, index) => {
            return {
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(farmer.farmerOrder_id) },
                    update: { $set: { batchCreatedAt: new Date(),
                        //Neeraj code start
                               payment_status:farmer?.transactionStatus==="Success"? _paymentstatus.completed: _paymentstatus.pending,
                               payment_date:moment(farmer?.transactionDate, "DD-MM-YYYY hh:mm:ss A").toISOString(),
                               ekhridPaymentDetails: {
                                transactionId: farmer?.transactionId,
                                transactionAmount: farmer?.transactionAmount,
                               }
                        // Neeraj code end
                     } }
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
