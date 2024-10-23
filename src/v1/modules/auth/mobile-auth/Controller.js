
const MasterUser = require("@src/v1/models/master/MasterUser");
const { _auth_module, _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { FeatureList } = require("@src/v1/models/master/FeatureList");

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Email') }] }));
        }
        if (!password) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Password') }] }));
        }

        const user = await MasterUser.findOne({ email: email }).populate('userRole')
        
        if (!user) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('User') }] }));
        }
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('Credentials') }] }));
        }


        const payload = { email: user.email, user_type:user.user_type }
        const expiresIn = 24 * 60 * 60;
        const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });

        const loginUser = JSON.parse(JSON.stringify(user))
        delete loginUser.password
        
        const data = {
            token: token,
            user: loginUser
        }
        return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data: data }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

