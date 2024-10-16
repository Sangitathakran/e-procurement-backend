const mongoose = require('mongoose');
const { User } = require("@src/v1/models/app/auth/User");
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const { _userType, _userStatus } = require("@src/v1/utils/constants");
const { _response_message, _middleware, _query } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { emailService } = require('@src/v1/utils/third_party/EmailServices');


module.exports.getAssociates = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', sortBy = { _id: 1 } } = req.query;
        const skip = (page - 1) * limit;

        // Build the query for searching/filtering associates
        let matchQuery = {
            user_type: _userType.associate,
            is_approved: _userStatus.approved,
            // bank_details: { $ne: null }
        };

        // If there's a search term, add it to the match query
        if (search) {
            matchQuery['basic_details.associate_details.associate_name'] = { $regex: search, $options: 'i' };
        }

        // Aggregation pipeline to join farmers and procurement centers and get counts
        const records = await User.aggregate([
            { $match: matchQuery },
            { $sort: sortBy }, // Sort by the provided field
            { $skip: skip }, // Skip for pagination
            { $limit: parseInt(limit) }, // Limit for pagination

            // Lookup to count associated farmers
            {
                $lookup: {
                    from: 'farmers', // Collection name for farmers
                    localField: '_id',
                    foreignField: 'associate_id',
                    as: 'farmers'
                }
            },
            {
                $addFields: {
                    farmersCount: { $size: '$farmers' } // Get the count of farmers
                }
            },
            {
                $project: {
                    farmers: 0 // Exclude the farmers array to keep the response clean
                }
            },

            // Lookup to count associated procurement centers
            {
                $lookup: {
                    from: 'procurementcenters', // Collection name for procurement centers
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'procurementCenters'
                }
            },
            {
                $addFields: {
                    procurementCentersCount: { $size: '$procurementCenters' } // Get the count of procurement centers
                }
            },
            {
                $project: {
                    procurementCenters: 0 // Exclude the procurement centers array
                }
            }
        ]);

        // Get total count of documents for pagination purposes
        const totalRecords = await User.countDocuments(matchQuery);

        // Pagination information
        const totalPages = Math.ceil(totalRecords / limit);

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: {
                rows: records,
                count: totalRecords,
                page: page,
                limit: limit,
                pages: totalPages
            },
            message: _response_message.found("associates")
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


module.exports.userStatusUpdate = async (req, res) => {
    try {
        const { userId, status } = req.body;
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

        if (!Object.values(_userStatus).includes(status)) {
            return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.invalid('Status') }));
        }
        user.is_approved = status;

        if (!user.is_welcome_email_send) {
            emailService.sendWelcomeEmail(user);
            user.is_welcome_email_send = true;
        }
        await user.save();

        const password = generateRandomPassword();

        const hashedPassword = await bcrypt.hash(password, 10);

        const masterUser = new MasterUser({
            firstName: user.basic_details.associate_details.associate_name,
            lastName: user.basic_details.associate_details.associate_name,
            isSuperAdmin: true,
            email: user.basic_details.associate_details.email,
            mobile: user.basic_details.associate_details.phone,
            password: hashedPassword,
            userType: '4',
        });

        await masterUser.save();

        return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.updated('User status'), data: { userId, user_status: status } }));
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

module.exports.statusUpdate = async (req, res) => {

    try {

        const { id, status } = req.body;

        if (!id) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notProvided("id") }] }))
        }

        const existingUser = await User.findOne({ _id: id });

        if (!existingUser) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("user") }] }))
        }

        existingUser.active = status;

        await existingUser.save();

        return res.status(200).send(new serviceResponse({ status: 200, data: existingUser, message: _response_message.updated("status") }))
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.pendingRequests = async (req, res) => {

    try {

        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query

        let query = search ? {
            $or: [
                { "basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
            ]
        } : {};

        query.is_approved = { $in: [_userStatus.pending, _userStatus.rejected] };
        query.is_form_submitted = true

        const records = { count: 0 };

        records.rows = paginate == 1 ? await User.find(query).select("user_code basic_details is_approved is_form_submitted")
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await User.find(query).sort(sortBy).select("user_code basic_details is_approved is_form_submitted");

        records.count = await User.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("pending request") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}



module.exports.getAssociatesById = async (req, res) => {

    try {

        const { id } = req.params;

        if (!id) {
            return res.status(200).send(new serviceResponse({ status: 400, message: _middleware.require('id') }));
        }
        const response = await User.findById({ _id: id });

        if (!response) {
            return res.status(200).send(new serviceResponse({ status: 400, message: _response_message.notFound('User') }));
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, message: _query.get("data"), data: response }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}