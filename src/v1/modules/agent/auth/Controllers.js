const mongoose = require('mongoose');
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { Agency } = require("@src/v1/models/app/auth/Agency");
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');

const { TypesModel } = require("@src/v1/models/master/Types")


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


const generateRandomPassword = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters[randomIndex];
    }
    return password;
};

module.exports.createAgency = async (req, res) => {
    try {
        const { first_name, last_name, email, phone, organization_name, company_logo } = req.body;

        const existUser = await Agency.findOne({ email: email });

        if (existUser){
            return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.allReadyExist('Email') }] }))
        }
        
        const password = generateRandomPassword();

        const hashedPassword = await bcrypt.hash(password, 10);
        const agency = new Agency({
            first_name : first_name,
            last_name : last_name,
            email : email,
            phone : phone,
            password: hashedPassword,
            organization_name : organization_name,
            company_logo : company_logo,
            is_email_verified: true,
        });

        const savedAgency = await agency.save();

        const agencydData = {
            email: savedAgency.email,
            name: savedAgency.first_name,
            password: password,
        }
        await emailService.sendAgencyCredentialsEmail(agencydData);

        const type = await TypesModel.findOne({_id:"67110114f1cae6b6aadc2425"})

        const masterUser = new MasterUser({
            firstName : first_name,
            lastName : last_name,
            isAdmin : true,
            email : email,
            mobile : phone,
            password: hashedPassword,
            userType : type.userType,
            createdBy: req.user._id,
            userRole: [type.adminUserRoleId],
            portalId: savedAgency._id 
        });

        await masterUser.save();

        return res.status(200).send(new serviceResponse({ message: _response_message.created('Agency'), data: savedAgency }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


