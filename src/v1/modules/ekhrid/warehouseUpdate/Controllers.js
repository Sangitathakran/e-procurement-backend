const { _handleCatchErrors, } = require("@src/v1/utils/helpers");
const { Batch } = require("@src/v1/models/app/procurement/Batch");

const { eKharidHaryanaProcurementModel } = require("@src/v1/models/app/eKharid/procurements");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { Mongoose, default: mongoose } = require("mongoose");
module.exports.warehouseTest = async (req, res) => {
    try {
        const { associateName } = req.body;
        const query = {
            "procurementDetails.jformID": { $exists: true },
            "warehouseData.jformID": { $exists: true },
            "paymentDetails.jFormId": { $exists: true },
        }
        const pipeline = [
            // { $match: { "procurementDetails.commisionAgentName": associateName } },
            { $match: query},
            {
                $group: {
                    _id: "$warehouseData.warehouseName",
                    // gatePassIDs: { $push: {gatePassID:"$procurementDetails.gatePassID"} }, // Collecting all gatePassIDs
                    warehouseName: { $first: "$warehouseData.warehouseName" }, // Preserving warehouseName for lookup
                    warehouseId: { $first: "$warehouseData.warehouseId" }, // Preserving warehouseId for lookup
                    associateName: { $first: "$procurementDetails.commisionAgentName" } // Preserving associateName for lookup
                }
            },
            {
                $lookup: {
                    from: "warehousedetails",
                    localField: "warehouseName",
                    foreignField: "basicDetails.warehouseName",
                    as: "warehouseDetails"
                }
            },
            {
                $unwind: {
                    path: "$warehouseDetails",
                    preserveNullAndEmptyArrays: true // Avoids errors when no match is found
                }
            },
            {
                $match: {
                    $expr: {
                        $ne: ["$warehouseDetails.wareHouse_code", "$warehouseId"]
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    gatePassIDs: 1,
                    warehouseName: 1,
                    _id: "$warehouseDetails._id", // Correcting reference to warehouseDetails._id
                    warehouse_code: "$warehouseDetails.wareHouse_code",
                    associateName: 1,
                    eKharidWarehouse_code: "$warehouseId", // Adding eKharidWarehouseId to the projection
                }
            }
        ];

        const gatePassData = await eKharidHaryanaProcurementModel.aggregate(pipeline);

        return res.status(200).json({
            status: 200,
            data: { gatePassData, count: gatePassData.length },
            message: "Gate Pass ID fetched successfully"
        });
    } catch (error) {
        return _handleCatchErrors(error, res);
    }
};

module.exports.getGatePassIDByWarehouse = async (req, res) => {
    try {
        const { associateName } = req.body;

        const pipeline = [
            {
                $match: {
                    "procurementDetails.commisionAgentName": associateName,
                    //   "procurementDetails.warehouseCreatedAt": { $exists: false  } 
                }
            },
            {
                $group: {
                    _id: "$warehouseData.warehouseName",
                    gatePassIDs: { $push: { gatePassID: "$procurementDetails.gatePassID" } }, // Collecting all gatePassIDs
                    warehouseName: { $first: "$warehouseData.warehouseName" } // Preserving warehouseName for lookup
                }
            },
            {
                $lookup: {
                    from: "warehousedetails",
                    localField: "warehouseName",
                    foreignField: "basicDetails.warehouseName",
                    as: "warehouseDetails"
                }
            },
            {
                $unwind: {
                    path: "$warehouseDetails",
                    preserveNullAndEmptyArrays: true // Avoids errors when no match is found
                }
            },
            {
                $project: {
                    _id: 0,
                    gatePassIDs: 1,
                    warehouseName: 1,
                    warehouse_id: "$warehouseDetails._id" // Correcting reference to warehouseDetails._id
                }
            }
        ];

        const gatePassData = await eKharidHaryanaProcurementModel.aggregate(pipeline);

        return res.status(200).json({
            status: 200,
            data: { gatePassData, count: gatePassData.length },
            message: "Gate Pass ID fetched successfully"
        });
    } catch (error) {
        return _handleCatchErrors(error, res);
    }
};


module.exports.updateWarehouseDetailsBulk = async (req, res) => {
    try {
        const { batchIds, warehousedetails_id } = req.body;

        if (!batchIds || !warehousedetails_id || !Array.isArray(batchIds)) {
            return res.status(400).json({ status: 400, message: "batchIds must be an array and warehousedetails_id is required" });
        }

        const bulkOperations = batchIds.map(batch => ({
            updateOne: {
                filter: { batchId: batch.gatePassID },
                update: { $set: { warehousedetails_id } }
            }
        }));

        // const bulkEkharidOperations = batchIds.map(batch => ({
        //     updateOne: {
        //         filter: { "procurementDetails.gatePassID": batch.gatePassID },
        //         update: { $set: { "procurementDetails.warehouseCreatedAt": new Date() } }
        //     }
        // }));

        const result = await Batch.bulkWrite(bulkOperations);
        // const ekharidResult = await eKharidHaryanaProcurementModel.bulkWrite(bulkEkharidOperations);

        return res.status(200).json({
            status: 200,
            message: "Warehouse details updated successfully for multiple batches",
            modifiedCount: result.modifiedCount,
            // ekharidModifiedCount: ekharidResult.modifiedCount,
        });

    } catch (error) {
        return res.status(500).json({ status: 500, message: "Internal server error", error: error.message });
    }
};

module.exports.getBatchesIds = async (req, res) => {
    try {
        let { req_id, seller_id } = req.body;

        if (!req_id || !seller_id) {
            return res.status(400).json({ status: 400, message: "req_id and seller_id are required" });
        }
        req_id = new mongoose.Types.ObjectId(req_id);
        seller_id = new mongoose.Types.ObjectId(seller_id);
        // Build query
        const query = {
            req_id,
            seller_id,
            $or:[
                // { warehouseUpdatedAt: { $exists: false } },
                { warehouseUpdatedAt: null }
            ]
        };
        // Fetch batch IDs
        const batchIds = await Batch.find(query).limit(500)
            .select("batchId -_id")
            .lean();

        const gatePassIds = batchIds.map(({ batchId }) => batchId);

        if (gatePassIds.length === 0) {
            return res.status(200).json({ status: 200, data: { count: 0, data: [] }, message: "No batches found" });
        }

        // Fetch procurement entries
        const ekharidWarehouse = await eKharidHaryanaProcurementModel
            .find({ 'warehouseData.exitGatePassId': { $in: gatePassIds } })
            .select("warehouseData.warehouseName warehouseData.exitGatePassId -_id")
            .lean();
        const uniqueEkharidWarehouse =[] 
        if(ekharidWarehouse.length > 0) {
            ekharidWarehouse.forEach((item) => {
                const existingItem = uniqueEkharidWarehouse.find((uniqueItem) => uniqueItem.warehouseData.exitGatePassId === item.warehouseData.exitGatePassId);
                if (!existingItem) {
                    uniqueEkharidWarehouse.push(item);
                }
            });
        }
        // Get unique warehouse names
        const warehouseNames = [...new Set(uniqueEkharidWarehouse.map(w => w.warehouseData?.warehouseName))].filter(Boolean);

        // Fetch all matching warehouse details in one go
        const warehouseDetailsList = await wareHouseDetails
            .find({ "basicDetails.warehouseName": { $in: warehouseNames },active:true })
            .select("basicDetails.warehouseName _id")
            .lean();

        // Create a map for quick lookup
        const warehouseNameToIdMap = new Map(
            warehouseDetailsList.map(w => [w.basicDetails.warehouseName, w._id])
        );

        // Append warehouseId to each result
        uniqueEkharidWarehouse.forEach(warehouse => {
            const warehouseName = warehouse?.warehouseData?.warehouseName;
            warehouse.warehouseData.warehouseId = warehouseNameToIdMap.get(warehouseName) || null;
            delete warehouse?.warehouseData?.warehouseName
        });

        const record = {
            count: uniqueEkharidWarehouse.length,
            data: uniqueEkharidWarehouse
        };

        return res.status(200).json({ status: 200, data: record, message: "Batches fetched successfully" });

    } catch (error) {
        return _handleCatchErrors(error, res);
    }
};

module.exports.updateBatchWarehouseBulks = async (req, res) => {
    try{
    const {ekharidWarehouse}=req.body;
    if(!ekharidWarehouse || !Array.isArray(ekharidWarehouse)){
        return res.status(400).json({status:400,message:"ekharidWarehouse must be an array"});
    }
    const bulkOperations = ekharidWarehouse.map(batch=>({
        updateOne:{
            filter:{batchId:batch.warehouseData.exitGatePassId},
            update:{$set:{warehousedetails_id:batch.warehouseData.warehouseId,
                warehouseUpdatedAt:batch.warehouseData.warehouseId? new Date():null,
            }}
        }
    }));
  
    const result = await Batch.bulkWrite(bulkOperations);
    return res.status(200).json({
        status:200,
        message:"Warehouse details updated successfully for multiple batches",
        modifiedCount:result.modifiedCount,
     
    });
    }
    catch(error){
        return _handleCatchErrors(error, res);
    }
}











