const reportRoutes = require("express").Router();
const { Auth } = require("@src/v1/middlewares/jwt")
const { _middleware } = require("@src/v1/utils/constants/messages");
const { summary, omcReport } = require("./Controller");

reportRoutes.get("/summary", Auth, summary);
reportRoutes.get("/omc-report", Auth, omcReport);


module.exports = { reportRoutes }; 
