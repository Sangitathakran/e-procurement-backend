const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const {
  _response_message,
  _middleware,
  _auth_module,
} = require("@src/v1/utils/constants/messages");
const {
<<<<<<< HEAD:src/v1/modules/head-office/requirement/Controller.js
  RequestModel,
} = require("@src/v1/models/app/procurement/Request");
=======
  ProcurementRequest,
} = require("@src/v1/models/app/procurement/ProcurementRequest");
const {
  AssociateOrders,
} = require("@src/v1/models/app/procurement/AssociateOrders");
>>>>>>> 67531eb0121236041a082ee569c80ae21c29b103:src/v1/services/requirement/Controller.js
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

    return sendResponse({
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
module.exports.orderListByRequestId = asyncErrorHandler(async (req, res) => {
  try {
    const { page, limit, skip = 0, paginate, sortBy, search = "" } = req.query;
    const {id}=req.params;
    const filter=await getFilter(req,["status", "reqNo","branchName"]);
    const query = filter;
    const records = { count: 0 };
    records.rows =
      (await AssociateOrders.find({req_id:id})
        .select(" ")
        .populate({path:'procurementCenter_id',select:'',match:query})
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
          records.count = await AssociateOrders.countDocuments(query);
        }
        
    

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
    }

    return sendResponse({
      res,
      status: 200,
      data: records,
      message: _response_message.found("order"),
    })
  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
});
