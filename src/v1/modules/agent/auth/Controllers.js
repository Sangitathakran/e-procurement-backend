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

        if (existUser){
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.allReadyExist('Email') }] }))
        }

        // checking the existing user in Master User collection
        const isUserAlreadyExist = await MasterUser.findOne(
              { $or: [{ mobile: { $exists: true, $eq: phone } }, { email: { $exists: true, $eq: email } }] });
          
        if(isUserAlreadyExist){
          return sendResponse({res, status: 400, message: "user already existed with this mobile number or email in Master"})
        }
        
        const password = generateRandomPassword();

        const hashedPassword = await bcrypt.hash(password, 10);
        const agency = new Agency({
            agent_name : agent_name,
            email : email,
            phone : phone,
        });

        const savedAgency = await agency.save();

        const agencydData = {
            email: savedAgency.email,
            user_name:savedAgency.first_name,
            name: savedAgency.first_name,
            password: password,
        }
        await emailService.sendAgencyCredentialsEmail(agencydData);

        const type = await TypesModel.findOne({_id:"67110114f1cae6b6aadc2425"})

        const masterUser = new MasterUser({
            firstName : agent_name,
            isAdmin : true,
            email : email,
            mobile : phone,
            password: hashedPassword,
            userType : type.userType,
            createdBy: req.user._id,
            userRole: [type.adminUserRoleId],
            portalId: savedAgency._id,
            ipAddress:getIpAddress(req) 
        });

        await masterUser.save();

        return res.status(200).send(new serviceResponse({ message: _response_message.created('Agency'), data: savedAgency }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


