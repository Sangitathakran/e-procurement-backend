const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {
  _response_message,
  _middleware,
  _auth_module,
} = require("@src/v1/utils/constants/messages");
const {
  ProcurementRequest,
} = require("@src/v1/models/app/procurement/ProcurementRequest");
const {getFilter}=require("@src/v1/utils/helpers/customFilter")
//widget list
module.exports.requireMentList = asyncErrorHandler(async (req, res) => {
  try {
    const { page, limit, skip = 0, paginate, sortBy, search = "" } = req.query;
    const filter=await getFilter(req,["status", "reqNo"]);
    console.log('filter',filter)
    const query = filter;
    const records = { count: 0 };
    records.rows =
      (await ProcurementRequest.find(query)
        .select("associatOrder_id head_office_id status reqNo createdAt")
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sortBy)) ?? [];

    records.count = await ProcurementRequest.countDocuments();

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
    }

    return new serviceResponse({
      res,
      status: 200,
      data: records,
      message: _response_message.found("requirement"),
    })
  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
});
