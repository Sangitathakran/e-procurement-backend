const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _auth_module, _query } = require("@src/v1/utils/constants/messages");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { verifyJwtToken, decryptJwtToken } = require("@src/v1/utils/helpers/jwt");


module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Email') }] }));
        }
        if (!password) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Password') }] }));
        }

        const branchUser = await Branches.findOne({ emailAddress: email });
        
        if (!branchUser) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('User') }] }));
        }

        const validPassword = await bcrypt.compare(password, branchUser.password);

        if (!validPassword) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('Credentials') }] }));
        }


        const payload = { email: branchUser.emailAddress, user_id: branchUser._id, user_type: branchUser.user_type }
        const expiresIn = 24 * 60 * 60;
        const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        });
        const data = {
            token: token,
            branch_code: branchUser.branchId,
            user_type: branchUser.user_type
        }
        return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data: data }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
