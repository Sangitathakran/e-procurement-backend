const reportRoutes = require("express").Router();
const { Auth } = require("@src/v1/middlewares/jwt")
const { _middleware } = require("@src/v1/utils/constants/messages");
const {  summary } = require("./Controller");

reportRoutes.get("/summary", Auth, summary);



module.exports = { reportRoutes }; 
