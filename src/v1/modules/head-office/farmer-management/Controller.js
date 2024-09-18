const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");


  module.exports.farmerList = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'name', search = '', paginate = 1 } = req.query;
        const skip = (page - 1) * limit;

        const query = search ? { name: { $regex: search, $options: 'i' } } : {};

        const records = { count: 0 };
        records.rows = paginate == 1
            ? await farmer.find(query).limit(parseInt(limit)).skip(parseInt(skip)).sort(sortBy)
            : await farmer.find(query).sort(sortBy);

        records.count = await farmer.countDocuments(query);

        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        }

        return sendResponse({
            status: 200,
            data: records,
            message: _response_message.found("farmers")
        });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

