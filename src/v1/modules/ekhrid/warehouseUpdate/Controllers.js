const { _handleCatchErrors,  } = require("@src/v1/utils/helpers");
const { Batch } = require("@src/v1/models/app/procurement/Batch");

const { eKharidHaryanaProcurementModel } = require("@src/v1/models/app/eKharid/procurements");

module.exports.getGatePassIDByWarehouse = async (req, res) => {
    try {
        const { warehouseName } = req.body;
        const gatePassData = await eKharidHaryanaProcurementModel
            .find({ 'warehouseData.warehouseName': warehouseName })
            .select("procurementDetails.gatePassID")
            .lean();

        const gatePassIDs = gatePassData.flatMap(item => 
            item.procurementDetails?.gatePassID ? [{'gatePassID':item.procurementDetails.gatePassID}] : []
        );

        return res.status(200).json({ status: 200, data: {gatePassIDs,count:gatePassIDs?.length}, message: "Gate Pass ID fetched successfully" });
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

        const result = await Batch.bulkWrite(bulkOperations);

        return res.status(200).json({
            status: 200,
            message: "Warehouse details updated successfully for multiple batches",
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        return res.status(500).json({ status: 500, message: "Internal server error", error: error.message });
    }
};











