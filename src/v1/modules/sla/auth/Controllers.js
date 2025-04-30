const mongoose = require('mongoose');
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { Agency } = require("@src/v1/models/app/auth/Agency");
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const { generateRandomPassword } = require("@src/v1/utils/helpers/randomGenerator")

const { TypesModel } = require("@src/v1/models/master/Types");
const getIpAddress = require('@src/v1/utils/helpers/getIPAddress');
const { _frontendLoginRoutes } = require('@src/v1/utils/constants');


module.exports.getAgency = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
        let query = {
            ...(search ? { first_name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = paginate == 1
            ? await Agency.find(query).sort(sortBy).skip(skip).limit(parseInt(limit))
            : await Agency.find(query).sort(sortBy);

        records.count = await Agency.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Agency") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.createAgency = async (req, res) => {
    try {
        const { agent_name, email, phone } = req.body

        const existUser = await Agency.findOne({ email: email });

        if (existUser) {
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.allReadyExist('Email') }] }))
        }

        // checking the existing user in Master User collection
        const isUserAlreadyExist = await MasterUser.findOne(
            { $or: [{ mobile: { $exists: true, $eq: phone.trim() } }, { email: { $exists: true, $eq: email.trim() } }] });

        if (isUserAlreadyExist) {
            return sendResponse({ res, status: 400, message: "user already existed with this mobile number or email in Master" })
        }

        const password = generateRandomPassword();

        const hashedPassword = await bcrypt.hash(password, 10);
        const agency = new Agency({
            agent_name: agent_name,
            email: email,
            phone: phone,
        });

        const savedAgency = await agency.save();

        const login_url = `${process.env.FRONTEND_URL}${_frontendLoginRoutes.agent}`
        const emailPayload = {
            email: savedAgency.email,
            user_name: savedAgency.first_name,
            name: savedAgency.first_name,
            password: password,
            login_url: login_url
        }
        await emailService.sendAgencyCredentialsEmail(emailPayload);

        const type = await TypesModel.findOne({ _id: "67110114f1cae6b6aadc2425" })

        if (savedAgency._id) {
            const masterUser = new MasterUser({
                firstName: agent_name,
                isAdmin: true,
                email: email.trim(),
                mobile: phone.trim(),
                password: hashedPassword,
                user_type: type.user_type,
                createdBy: req.user._id,
                userRole: [type.adminUserRoleId],
                portalId: savedAgency._id,
                ipAddress: getIpAddress(req)
            });

            await masterUser.save();
        } else {
            await Agency.deleteOne({ _id: savedAgency._id })
            throw new Error('Agency not created ')

        }

        return res.status(200).send(new serviceResponse({ message: _response_message.created('Agency'), data: record }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.changeStatus = async (req, res) => {
    try {
        const agentId = req.params.id;
        if (!agentId) {
            return sendResponse({ res, status: 400, message: "agent id not provided" })
        }
        const agent = await Agency.findById(agentId);
        if (!agent) {
            return sendResponse({ res, status: 400, message: "agent not exist or wrong agent id" })
        }

        agent.status = agent?.status === 'active' ? 'inactive' : 'active';

        const updatedagent = await agent.save();
        return sendResponse({ res, status: 200, data: updatedagent, message: "user status changed successfully" })

    } catch (err) {
        _handleCatchErrors(error, res);
    }
};


