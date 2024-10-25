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
  RequestModel,
} = require("@src/v1/models/app/procurement/Request");
const {
  Batch,
} = require("@src/v1/models/app/procurement/Batch");
const Branches = require("@src/v1/models/app/branchManagement/Branches");
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

module.exports.requirementById = asyncErrorHandler(async (req, res) => {
  try {
    const {requirementId} = req.params;
    const { page, limit, skip = 0, paginate, sortBy } = req.query;
    const records = { count: 0 };         

    records.rows = await Batch.find({ req_id:requirementId })
      .select('batchId qty delivered status')
      .populate({
        path: 'associateOffer_id',
        populate: {
          path: 'seller_id',
          select: 'basic_details.associate_details.associate_name'
        }
      })
      .populate({
        path: 'procurementCenter_id',
        select: 'center_name location_url'
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortBy) ?? [];

    records.rows = records.rows.map(item => ({
      batchId: item.batchId,
      associateName: item?.associateOffer_id?.seller_id?.basic_details?.associate_details?.associate_name,
      procurementCenterName: item?.procurementCenter_id?.center_name,
      quantity: item.qty,
      deliveredOn: item.delivered.delivered_at,
      procurementLocationUrl: item?.procurementCenter_id?.location_url,
      status:item.status
    }));

    records.count = records.rows.length;

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


module.exports.batchListByRequestId = asyncErrorHandler(async (req, res) => {
  try {
    const { page, limit, skip = 0, paginate, sortBy, search = "" } = req.query;
    const {id}=req.params;
    const filter=await getFilter(req,["status", "reqNo","branchName"]);
    const query = filter;
    const records = { count: 0 };
    console.log("query--> ", query)
    records.rows =
      (await Batch.find({req_id:id})
        .select(" ")
        .populate({ path: "req_id" , select: "address"})
        .populate({ path: "seller_id" , select: "basic_details.associate_details"})
        .populate({ path:'procurementCenter_id',select:'',match:query})
        .populate({ path: 'farmerOrderIds.farmerOrder_id',  select: 'order_no'})
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
          records.count = await Batch.countDocuments({req_id:id});
        }
        
    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
    }

    records.rows = records.rows.map(item=> { 
          let batch = {}

          batch['batchId'] = item.batchId
          batch['associate_name'] = item?.seller_id?.basic_details?.associate_details?.associate_name ?? null
          batch['procurement_center'] = item?.procurementCenter_id?.center_name ?? null
          batch['quantity_purchased'] = item?.dispatchedqty ?? null
          batch['procured_on'] = item?.dispatched_at ?? null
          batch['delivery_location'] = item?.req_id.address.deliveryLocation ?? null
          batch['address'] = item.req_id.address
          batch['status'] = item.status
          batch['lot_ids'] = (item?.farmerOrderIds.reduce((acc, item)=> [...acc, item.farmerOrder_id.order_no], [])) ?? []
          batch['_id'] = item._id
          batch['total_amount'] = item?.total_amount ?? "2 CR"

          return batch
    })

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

module.exports.qcDetailsById = asyncErrorHandler( async (req, res) =>{
  try{
  
    const {id} = req.params;
    const records = {};
    records.rows = 
    ( await Batch.findById(id)
       .select(" ")
       .populate({path:'req_id',select:''}) ) ?? []

    return sendResponse({
      res,
      status: 200,
      data : records,
      message: _response_message.found("QC detail")
    })   

  } catch (error) {
    console.log("error==>", error);
    _handleCatchErrors(error, res)
  }
})
