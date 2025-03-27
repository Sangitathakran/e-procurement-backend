const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { farmerOrderList } = require("../../associate/request/Controller");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");

module.exports.batchNorthEastBulkuplod = async (req, res) => {
    const req_id = "67c998d7fcf73bf553b62703";
    try {
        const offer = await AssociateOffers.findOne({ req_id });
        if (!offer) {
            return res.status(404).send(new serviceResponse({ status: 404, message: "Offer not found" }));
        }

        let query = {
            associateOffers_id: { $in: [offer._id] }, // Use the correct ObjectId
            status: "Received", // Correcting the misplaced condition
            qtyRemaining: { $gt: 0 }
        };

        const farmerOrder = await FarmerOrders.find(query, { _id: 1 });

// -----------------------------Batch Create--------------------------------------------------------
        return res.status(200).send(new serviceResponse({
            status: 200,
            data: farmerOrder,
            message: _response_message.found()
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
