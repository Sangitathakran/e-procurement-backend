const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {  _response_message, _middleware, _auth_module } = require("@src/v1/utils/constants/messages");
const { User } = require("@src/v1/models/app/auth/User");
const EmailService = require("@src/v1/utils/third_party/EmailServices");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { verifyJwtToken, decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
//widget list
module.exports.requireMentList=asyncErrorHandler(async(req,res)=>{
                    
                
});

// //payment quantity list
// module.exports.paymentQuantityList=asyncErrorHandler(async(req,res)=>{
//     let widgetDetails = {
//       branch: { total: 0, lastMonth: [] },

//       associate: { total: 0, lastMonth: [] },
//       procCenter: { total: 0, lastMonth: [] },
//       farmer: { total: 0, lastMonth: [] },
//     };

// });
// //locationWareHouseChart 
// module.exports.locationWareHouseChart=asyncErrorHandler(async(req,res)=>{
//     let widgetDetails = {
//       branch: { total: 0, lastMonth: [] },

//       associate: { total: 0, lastMonth: [] },
//       procCenter: { total: 0, lastMonth: [] },
//       farmer: { total: 0, lastMonth: [] },
//     };

// });