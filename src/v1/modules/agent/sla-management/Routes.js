const express = require("express");
const { createSLA, getSLAList } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const slaRoute = express.Router();

slaRoute.post("/", createSLA);
slaRoute.get("/", getSLAList);

module.exports = { slaRoute };