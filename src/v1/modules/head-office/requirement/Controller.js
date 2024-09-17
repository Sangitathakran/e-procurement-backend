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
  RequestModel,
} = require("@src/v1/models/app/procurement/Request");
const Branches = require("@src/v1/models/master/Branches");
const {getFilter}=require("@src/v1/utils/helpers/customFilter")
//widget list
module.exports.requireMentList = asyncErrorHandler(async (req, res) => {
  try {
    const { page, limit, skip = 0, paginate, sortBy, search = "" } = req.query;
    const filter=await getFilter(req,["status", "reqNo","branchName"]);
    const query = filter;
    const records = { count: 0 };
    records.rows =
      (await RequestModel.find()
        .select("associatOrder_id head_office_id status reqNo createdAt")
        .populate({path:'branch_id',select:'branchName',match:query})
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sortBy)) ?? [];
        if(req.query.search){
          
          const pattern = new RegExp(req.query.search, 'i'); 
          records.rows=records.rows.filter(item=>{
            if(item.branch_id){
              return true;
            }else if(pattern.test(item.reqNo)||pattern.test(item.status)){
              return true;
            }else{
              return false;
            }
            
          });
          records.count=records.rows.length;
        }else{
          records.count = await RequestModel.countDocuments(query);
        }
        
    

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
