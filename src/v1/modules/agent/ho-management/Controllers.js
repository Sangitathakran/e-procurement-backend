const mongoose = require('mongoose');
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { User } = require("@src/v1/models/app/auth/User");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const { TypesModel } = require('@src/v1/models/master/Types');
const { MasterUser } = require('@src/v1/models/master/MasterUser');
const UserRole = require('@src/v1/models/master/UserRole');


module.exports.getHo = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
        let query = {
            ...(search ? { 'company_details.name': { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = await HeadOffice.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'branches', // Name of the Branches collection in the database
                    localField: '_id',
                    foreignField: 'headOfficeId',
                    as: 'branches'
                }
            },
            {
                $addFields: {
                    branchCount: { $size: '$branches' }
                }
            },
            {
                $project: {
                    _id: 1,
                    office_id: 1,
                    'company_details.name': 1,
                    registered_time: 1,
                    branchCount: 1,
                    'point_of_contact.name': 1,
                    'point_of_contact.email': 1,
                    'point_of_contact.mobile': 1,
                    'point_of_contact.designation': 1,
                    registered_time: 1,
                    head_office_code: 1,
                    active: 1,
                    address: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            },
            { $sort: sortBy },
            ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []) // Pagination if required
        ]);

        records.count = await HeadOffice.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Head Office") }));

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

module.exports.saveHeadOffice = async (req, res) => {
    try {
        const { company_details, point_of_contact, address, authorised } = req.body;
        const password = generateRandomPassword();

        // this is to get the type object of head office
        const type = await TypesModel.findOne({_id:"671100dbf1cae6b6aadc2423"})

        const hashedPassword = await bcrypt.hash(password, 10);
        const headOffice = new HeadOffice({
            password: hashedPassword,
            email_verified: false,
            user_type: type.userType,
            company_details,
            point_of_contact,
            address,
            authorised,
        });


        // checking the existing user in Master User collection
        const isUserAlreadyExist = await MasterUser.findOne({ $or: [{mobile:authorised.phone},{email:authorised.email}]})
        if(isUserAlreadyExist){
          return sendResponse({res, status: 400, message: "user already existed with this mobile number or email in Master"})
        }

        const savedHeadOffice = await headOffice.save();
        const hoPocData = {
            email: savedHeadOffice.point_of_contact.email,
            name: savedHeadOffice.point_of_contact.name,
            password: password,
        }
        const hoAuthorisedData = {
            email: savedHeadOffice.authorised.email,
            name: savedHeadOffice.authorised.name,
            password: password,
        }
        await emailService.sendHoCredentialsEmail(hoAuthorisedData);

        


        const masterUser = new MasterUser({
            firstName : authorised.name,
            isAdmin : true,
            email : authorised.email,
            mobile : authorised.phone,
            password: hashedPassword,
            userType : type.userType,
            userRole: ['671159edcbbd6e268e80cfef'],
            createdBy: req.user._id,
            portalId: savedHeadOffice._id 
        });

        await masterUser.save();

        return res.status(200).send(new serviceResponse({ message: _response_message.created('Head Office'), data: savedHeadOffice }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.updateStatus = asyncErrorHandler(async (req, res) => {
    const { id, status } = req.params

    const record = await HeadOffice.findOne({ _id: id })

    if (!record) {
        return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Head Office") }] }))
    }

    record.active = status
    record.save()

    return res.send(new serviceResponse({ status: 200, data: record, message: _response_message.updated() }))
})
