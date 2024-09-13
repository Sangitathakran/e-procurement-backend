const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {  _response_message, _middleware, _auth_module } = require("@src/v1/utils/constants/messages");
const { ProcurementRequest } = require("@src/v1/models/app/procurement/ProcurementRequest");


//widget list
module.exports.requireMentList = async (req, res) => {

    try {

        const { page, limit, skip = 0, paginate, sortBy, search = "" } = req.query;

        const query = search ? { name: { $regex: search, $options: "i" } } : { deletedAt: null };

        const records = { count: 0 };

        records.rows = await ProcurementRequest
        .find(query).select('associatOrder_id head_office_id status reqNo createdAt').skip(skip).limit(parseInt(limit)).sort(sortBy) 

        records.count = await ProcurementRequest.countDocuments();

        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("requirement") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

