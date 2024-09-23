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