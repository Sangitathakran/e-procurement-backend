const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {  _response_message, _middleware, _auth_module } = require("@src/v1/utils/constants/messages");
const  HeadOffice  = require("@src/v1/models/app/auth/HeadOffice");

const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { verifyJwtToken, decryptJwtToken } = require("@src/v1/utils/helpers/jwt");

module.exports.Login = async (req, res) => {
    try {
        const { email,password  } = req.body;

       
       

        let hoExist = await HeadOffice.findOne({email,password});

        if (hoExist) {
            const payload = { email:hoExist.email }
            const now = new Date();
            const expiresIn = Math.floor(now.getTime() / 1000) + 3600;
            const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
            const data = {
                'token': token,
            }

            return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data:data }));
        } else {
            //   await new HeadOffice({
            //     email:'nccf@radiantinfonet.com',
            //     password:"nccf@123",
            //     head_office_name:"Nccf Radiant infonet",
            //     office_id:'854',
            //     address:'Tower A Sector-62 Noida'
            //    }).save();
            return res.status(400).send(new serviceResponse({ status: 400, message: _auth_module.unAuth('Head Office')}));
        }

    } catch (err) {
        _handleCatchErrors(err, res);
    }
}



