const mongoose = require('mongoose');
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const { _auth_module, _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { Agency } = require("@src/v1/models/app/auth/Agency");
const { NccfAdmin } = require("@src/v1/models/app/auth/NccfAdmin");
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = require('@config/index');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const { generateRandomPassword } = require("@src/v1/utils/helpers/randomGenerator")

const { TypesModel } = require("@src/v1/models/master/Types");
const { getPermission } = require("../../user-management/permission");

const getIpAddress = require('@src/v1/utils/helpers/getIPAddress');
const { _frontendLoginRoutes, _userTypeFrontendRouteMapping } = require('@src/v1/utils/constants');
const logger = require('@src/common/logger/logger');


module.exports.getNccf = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
        let query = {
            ...(search ? { first_name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = paginate == 1
            ? await NccfAdmin.find(query).sort(sortBy).skip(skip).limit(parseInt(limit))
            : await NccfAdmin.find(query).sort(sortBy);

        records.count = await NccfAdmin.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Nccf") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.createNccf = async (req, res) => {
    try {
        const { nccf_name, email, phone } = req.body

        // const pwd = "procurement123@";
        // const hashedpwd = await bcrypt.hash(pwd, 10);
        // console.log(hashedpwd);
        // return false;

        const existUser = await NccfAdmin.findOne({ email: email });

        if (existUser) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.allReadyExist('Email') }] }))
        }

        // checking the existing user in Master User collection
        const isUserAlreadyExist = await MasterUser.findOne(
            { $or: [{ mobile: { $exists: true, $eq: phone.trim() } }, { email: { $exists: true, $eq: email.trim() } }] });
       
        if (isUserAlreadyExist) {
            return sendResponse({ res, status: 400, message: "user already existed with this mobile number or email in Master" })
        }

        // const password = generateRandomPassword();
        const password = "Coop123@";

        const hashedPassword = await bcrypt.hash(password, 10);
        const nccfData = new NccfAdmin({
            nccf_name: nccf_name,
            email: email,
            phone: phone,
        });

        const savedNccf = await nccfData.save();

        // const login_url = `${process.env.FRONTEND_URL}${_frontendLoginRoutes.nccf}`
        // const emailPayload = {
        //     email: savedNccf.email,
        //     user_name:savedNccf.first_name,
        //     name: savedNccf.first_name,
        //     password: password,
        //     login_url:login_url
        // }
        // await emailService.sendNccfCredentialsEmail(emailPayload);

        // const type = await TypesModel.findOne({ _id: "677b7de4f392eaf580a68688" }) // testing
        // const type = await TypesModel.findOne({ _id: "677b7f12f392eaf580a6868c" }) // live
        const type = await TypesModel.findOne({ _id: "677b7de4f392eaf580a68688" }) // nccf-admin
        type.adminUserRoleId = "67a1fb7cc6f4b27e68a200fe" // nccf-admin
        // 67115a35cbbd6e268e80d00f


        if (savedNccf._id) {
            const masterUser = new MasterUser({
                firstName: nccf_name,
                isAdmin: true,
                email: email.trim(),
                mobile: phone.trim(),
                password: hashedPassword,
                user_type: type.user_type,
                // createdBy: req.user._id,
                userRole: [type.adminUserRoleId],
                portalId: savedNccf._id,
                ipAddress: getIpAddress(req)
            });

            await masterUser.save();
        } else {
            await NccfAdmin.deleteOne({ _id: savedNccf._id })
            throw new Error('Nccf not created ')

        }

        return res.status(200).send(new serviceResponse({ message: _response_message.created('Nccf Admin'), data: savedNccf }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.changeStatus = async (req, res) => {
    try {
        const agentId = req.params.id;
        if (!agentId) {
            return sendResponse({ res, status: 400, message: "NccfAdmin id not provided" })
        }
        const agent = await NccfAdmin.findById(agentId);
        if (!agent) {
            return sendResponse({ res, status: 400, message: "agent not exist or wrong agent id" })
        }

        agent.status = agent?.status === 'active' ? 'inactive' : 'active';

        const updatedagent = await NccfAdmin.save();
        return sendResponse({ res, status: 200, data: updatedagent, message: "user status changed successfully" })

    } catch (err) {
        _handleCatchErrors(error, res);
    }
};

/*
module.exports.login = async (req, res) => {
    try {

        const { email, password, portal_type } = req.body;

        if (!email) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Email') }] }));
        }
        if (!password) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Password') }] }));
        }

        const user = await MasterUser.findOne({ email: email.trim() })
            .populate([
                { path: "userRole", select: "" },
                { path: "portalId", select: "" }
            ])

        if (!user) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('User') }] }));
        }
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('Credentials') }] }));
        }

        const portalTypeMapping = Object.fromEntries(
            Object.entries(_userTypeFrontendRouteMapping).map(([key, value]) => [value, key])
        );

        const userType = _userTypeFrontendRouteMapping[portal_type];

        if (user.user_type !== _userTypeFrontendRouteMapping.ministry) {
            if (userType !== user.user_type) {
                return res.status(400).send(new serviceResponse({ status: 400, message: _auth_module.Unauthorized(portalTypeMapping[user.user_type]), errors: [{ message: _auth_module.unAuth }] }));
            }
        }

        // if (userType !== user.user_type) {
        //     return res.status(400).send(new serviceResponse({ status: 400, message: _auth_module.Unauthorized(portalTypeMapping[user.user_type]), errors: [{ message: _auth_module.unAuth }] }));
        // }

        const payload = { email: user.email, user_id: user?._id, portalId: user?.portalId?._id, user_type: user.user_type }
        const expiresIn = 24 * 60 * 60;
        const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });

        const typeData = await TypesModel.find()
        const userData = await getPermission(user)

        const data = {
            token: token,
            user: userData,
            typeData: typeData

        }
        return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data: data }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
*/

module.exports.login = async (req, res) => {
    try {
        const { email, password, portal_type } = req.body;

        // Log login attempt
        logger.info(`Login attempt - Email: ${email}, Portal: ${portal_type}`);

        if (!email) {
            logger.warn('Login failed - Email is required');
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Email') }] }));
        }
        if (!password) {
            logger.warn('Login failed - Password is required');
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('Password') }] }));
        }

        const user = await MasterUser.findOne({ email: email.trim() })
            .populate([
                { path: "userRole", select: "" },
                { path: "portalId", select: "" }
            ]);

        if (!user) {
            logger.warn(`Login failed - User not found for email: ${email}`);
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('User') }] }));
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            logger.warn(`Login failed - Invalid password for email: ${email}`);
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('Credentials') }] }));
        }

        const portalTypeMapping = Object.fromEntries(
            Object.entries(_userTypeFrontendRouteMapping).map(([key, value]) => [value, key])
        );

        const userType = _userTypeFrontendRouteMapping[portal_type];

        if (user.user_type !== _userTypeFrontendRouteMapping.ministry) {
            if (userType !== user.user_type) {
                logger.warn(`Login failed - Unauthorized portal access attempt by user ${email}`);
                return res.status(400).send(new serviceResponse({ status: 400, message: _auth_module.Unauthorized(portalTypeMapping[user.user_type]), errors: [{ message: _auth_module.unAuth }] }));
            }
        }

        const payload = {
            email: user.email,
            user_id: user?._id,
            portalId: user?.portalId?._id,
            user_type: user.user_type
        };
        const expiresIn = 24 * 60 * 60;
        const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });

        const typeData = await TypesModel.find();
        const userData = await getPermission(user);

        const data = {
            token: token,
            user: userData,
            typeData: typeData
        };

        logger.info(`Login successful - User: ${email}, UserID: ${user._id}`);

        return res.status(200).send(new serviceResponse({ status: 200, message: _auth_module.login('Account'), data: data }));
    } catch (error) {
        logger.error(`Login error - ${error.message}`, { error });
        _handleCatchErrors(error, res);
    }
};

