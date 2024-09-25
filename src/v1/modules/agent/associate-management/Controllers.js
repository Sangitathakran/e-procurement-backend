const mongoose = require('mongoose');
const { User } = require("@src/v1/models/app/auth/User");
const { _userType } = require("@src/v1/utils/constants");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");


module.exports.getAssociates = async (req, res) => {

    try {

        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query

        let query = search ? {
            $or: []
        } : {};

        query.user_type = _userType.associate;
        query.is_approved = false;
        query.bank_details = { $ne: null }

        const records = { count: 0 };

        records.rows = paginate == 1 ? await User.find(query).select('_id user_code basic_details user_type status')
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await User.find(query).sort(sortBy);

        records.count = await User.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("associates") }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.userStatusUpdate = async (req, res) => {
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