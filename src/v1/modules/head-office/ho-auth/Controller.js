const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const {
  _response_message,
  _middleware,
  _auth_module,
} = require("@src/v1/utils/constants/messages");
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");

const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require("@config/index");
const {
  verifyJwtToken,
  decryptJwtToken,
} = require("@src/v1/utils/helpers/jwt");
const bcrypt = require("bcryptjs");
//updates login
module.exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let hoExist = await HeadOffice.findOne({ email });
     
    if (hoExist) {
      bcrypt.compare(password, hoExist.password, async (err, result) => {
        if (err) {
          
          return sendResponse({
            res,
            status: 400,
            message: _auth_module.unAuth,
          });
        }
        
        if (result) {
          const payload = { email: hoExist.email, _id: hoExist._id,user_type:hoExist.user_type};
          const now = new Date();
          const expiresIn = Math.floor(now.getTime() / 1000) + 3600;
          const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
          const data = {
            token: token,
            details:  {...payload,office:hoExist.office_id},
          };

          return sendResponse({
            res,
            status: 200,
            message: _auth_module.login("Account"),
            data:data,
          });
        } else {
          console.log('here')
          return sendResponse({
            res,
            status: 400,
            message: _auth_module.unAuth,
          });
        }
      });
    } else {
      return sendResponse({
        res,
        status: 400,
        message: _auth_module.unAuth,
      });
    }
  } catch (err) {
    console.log('error',err)
    _handleCatchErrors(err, res);
  }
};
