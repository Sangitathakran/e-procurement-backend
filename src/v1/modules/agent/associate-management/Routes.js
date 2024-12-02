

const express = require("express");
const { getAssociates, userStatusUpdate, statusUpdate, pendingRequests, getAssociatesById,updateAssociateDetails ,deleteAssociate,createAssociate} = require("./Controllers");


const associateMngmntRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt")

associateMngmntRoutes.get("/", Auth, getAssociates);
associateMngmntRoutes.patch("/update-approval", userStatusUpdate);
associateMngmntRoutes.patch("/status", statusUpdate);
associateMngmntRoutes.get("/pending", pendingRequests);
associateMngmntRoutes.get("/details/:id", getAssociatesById);
// Route for creating a new associate
associateMngmntRoutes.post('/create-associate', createAssociate);

associateMngmntRoutes.put('/:id', updateAssociateDetails);

// DELETE route for deleting an associate
associateMngmntRoutes.delete("/:id", deleteAssociate);




module.exports = { associateMngmntRoutes }; 