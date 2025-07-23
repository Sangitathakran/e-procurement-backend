const express = require('express');
const { scheme, commodity,commodityRequest, commodity_standard, bo_list, cna_list,  getStates, getRoles, getCitiesByState, getAssociates, getWarehouses, getCitiesByDistrict, getDistrictsByState,sla_list,districtWisecenter  } = require('./Controller');
const { commonAuth} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

const dropDownRoutes = express.Router();

dropDownRoutes.get('/scheme',commonAuth, scheme);
dropDownRoutes.get('/commodity',commonAuth, commodity);
dropDownRoutes.get('/commodity-request',commonAuth, commodityRequest);

dropDownRoutes.get('/commodity_standard',commonAuth, commodity_standard );
dropDownRoutes.get('/bo',commonAuth, bo_list);
dropDownRoutes.get('/cna',commonAuth, cna_list);
dropDownRoutes.get('/sla',commonAuth, sla_list);
dropDownRoutes.get('/state', getStates);
dropDownRoutes.get('/districtsByState', getDistrictsByState);
dropDownRoutes.get('/roles',commonAuth, getRoles);
dropDownRoutes.get('/cities', getCitiesByState);
dropDownRoutes.get('/associates',commonAuth, getAssociates);
dropDownRoutes.get('/warehouses',commonAuth, getWarehouses);
dropDownRoutes.get('/procurementcenter',commonAuth, districtWisecenter);




module.exports = { dropDownRoutes};
