const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt")
const { getProcurement, getOrderedAssociate, getBatchByAssociateOfferrs, trackDeliveryByBatchId ,createTrackOrder,updateTrackOrder,deleteTrackOrder} = require("./Controller");
const trackDeliveryRoutes = express.Router();


trackDeliveryRoutes.get("/ordered-associate", Auth, getOrderedAssociate);
trackDeliveryRoutes.get("/request", Auth, getProcurement);
trackDeliveryRoutes.get("/batch", Auth, getBatchByAssociateOfferrs);
trackDeliveryRoutes.get("/batch/:id", Auth, trackDeliveryByBatchId)


// POST route to create tracking info
trackDeliveryRoutes.post('/', createTrackOrder);

// PUT route to update tracking info
trackDeliveryRoutes.put('/:id', updateTrackOrder);

// DELETE route to delete tracking info
trackDeliveryRoutes.delete('/:id', deleteTrackOrder);
module.exports = { trackDeliveryRoutes }; 





