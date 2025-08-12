const express = require('express');
const { scheme, commodity, getStates,getCitiesByState,
    getDistrictsByState,getCitiesByDistrict} = require('./Controller');
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")
const dropDownRoutes = express.Router();

dropDownRoutes.get('/scheme',authenticateUser,authorizeRoles(_userType.distiller), scheme);
dropDownRoutes.get('/commodity',authenticateUser,authorizeRoles(_userType.distiller), commodity);
dropDownRoutes.get('/state', authenticateUser,authorizeRoles(_userType.distiller),getStates);
dropDownRoutes.get('/cities',authenticateUser,authorizeRoles(_userType.distiller), getCitiesByState);
dropDownRoutes.get('/districtsByState',authenticateUser,authorizeRoles(_userType.distiller), getDistrictsByState);
dropDownRoutes.get('/citiesByDistrict',authenticateUser,authorizeRoles(_userType.distiller), getCitiesByDistrict);



module.exports = { dropDownRoutes};
