const mongoose = require('mongoose');
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { User } = require("@src/v1/models/app/auth/User");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');


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
                    active: 1,
                    address: 1
                }
            },
            ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),  // Sorting if required
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

        const hashedPassword = await bcrypt.hash(password, 10);
        const headOffice = new HeadOffice({
            office_id: 'HO123456',
            password: hashedPassword,
            email_verified: false,
            user_ype: "5",
            company_details,
            point_of_contact,
            address,
            authorised,
        });

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

        return res.status(200).send(new serviceResponse({ message: _response_message.created('Head Office'), data: savedHeadOffice }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.updateStatus = asyncErrorHandler(async (req, res) => {
    const { id, status } = req.body

    const record = await HeadOffice.findOne({ _id: id })

    if (!record) {
        return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Head Office") }] }))
    }

    record.active = status
    record.save()

    return res.send(new serviceResponse({ status: 200, data: record, message: _response_message.updated() }))
})

module.exports.userStatusUpdate = async (req, res) => { // TODO ask ankush is this api is workig anywhere
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('user id') }] }));
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('user id') }] }));
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(200).send(new serviceResponse({ status: 404, errors: [{ message: _response_message.notFound('User') }] }));
        }
        if (user.is_approved) {
            return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.allReadyApproved('User') }));
        }
        user.is_approved = true;

        if (!user.is_welcome_email_send) {
            await emailService.sendWelcomeEmail(user);
            user.is_welcome_email_send = true;
        }
        await user.save();

        return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.updated('User approval status'), data: { userId } }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}