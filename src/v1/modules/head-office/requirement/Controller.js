const { _handleCatchErrors, dumpJSONToCSV, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { sendResponse, serviceResponse } = require("@src/v1/utils/helpers/api_response");
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
const { getFilter } = require("@src/v1/utils/helpers/customFilter");
const { received_qc_status } = require("@src/v1/utils/constants");

//widget list
module.exports.requireMentList = asyncErrorHandler(async (req, res) => {
  try {

    const { page, limit, skip = 0, paginate, sortBy, search = "", isExport = 0 } = req.query;

    const filter = await getFilter(req, ["status", "reqNo", "branchName"]);
    let query = filter;
    const records = { count: 0 };

    if (req.user.user_type === 2 || req.user.user_type === '2') {
      query = { ...query, head_office_id: req?.user?.portalId?._id }
    }

    records.rows =
      (
        await RequestModel.find(query)
          .populate({ path: 'branch_id', select: 'branchName'})
          .skip(skip)
          .limit(parseInt(limit))
          .sort(sortBy)) ?? [];
    if (req.query.search) {

      const pattern = new RegExp(req.query.search, 'i');
      records.rows = records.rows.filter(item => {
        if (item.branch_id) {
          return true;
        } else if (pattern.test(item.reqNo) || pattern.test(item.status)) {
          return true;
        } else {
          return false;
        }

      });
      records.count = records.rows.length;
    } else {
      records.count = await RequestModel.countDocuments(query);
    }

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
    }

    if (isExport == 1) {

      const record = records.rows.map((item) => {
        return {
          "Order ID": item?.reqNo || 'NA',
          "Branch Office": item?.branch_id || 'NA',
          "Commodity": item?.product.name || 'NA',
          "MSP": item?.quotedPrice || 'NA',
          "EST Delivery": item?.qtyPurchased || 'NA',
          "Completion": item?.deliveryDate || 'NA',
          "Created Date": item?.createdAt || 'NA'
        }
      })

      if (record.length > 0) {

        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Requirement-record.xlsx`,
          worksheetName: `Requirement-record`
        });
      } else {
        return sendResponse({
          res,
          status: 400,
          data: records,
          message: _response_message.notFound("Requirement"),
        })

      }
    } else {
      return sendResponse({
        res,
        status: 200,
        data: records,
        message: _response_message.found("Requirement"),
      })

    }

  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
});

module.exports.requirementById = asyncErrorHandler(async (req, res) => {
  try {
    const { requirementId } = req.params;
    const { page, limit, skip = 0, paginate, sortBy } = req.query;
    const records = { count: 0 };

    records.rows = await Batch.find({ req_id: requirementId })
      .select('batchId qty delivered status')
      .populate({
        path: 'associateOffer_id',
        populate: {
          path: 'seller_id',
          select: 'basic_details.associate_details.associate_name basic_details.associate_details.organization_name'
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
      _id: item._id,
      batchId: item.batchId,
      associateName: item?.associateOffer_id?.seller_id?.basic_details?.associate_details?.associate_name,
      organization_name:item?.associateOffer_id?.seller_id?.basic_details?.associate_details?.organization_name,
      procurementCenterName: item?.procurementCenter_id?.center_name,
      quantity: item.qty,
      deliveredOn: item.delivered.delivered_at,
      procurementLocationUrl: item?.procurementCenter_id?.location_url,
      status: item.status
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
    const { page, limit, skip = 0, paginate, sortBy, search = "", isExport = 0 } = req.query;
    const { id } = req.params;
    const filter = await getFilter(req, ["status", "reqNo", "branchName"]);
    const query = filter;
    const records = { count: 0 };
    console.log("query--> ", query)
    records.rows =
      (await Batch.find({ req_id: id })
        .select(" ")
        .populate({ path: "req_id", select: "address" })
        .populate({ path: "seller_id", select: "basic_details.associate_details" })
        .populate({ path: 'procurementCenter_id', select: '', match: query })
        .populate({ path: 'farmerOrderIds.farmerOrder_id', select: 'order_no' })
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sortBy)) ?? [];
    if (req.query.search) {

      const pattern = new RegExp(req.query.search, 'i');
      records.rows = records.rows.filter(item => {
        if (item.branch_id) {
          return true;
        } else if (pattern.test(item.reqNo) || pattern.test(item.status)) {
          return true;
        } else {
          return false;
        }

      });
      records.count = records.rows.length;
    } else {
      records.count = await Batch.countDocuments({ req_id: id });
    }

    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
    }

    records.rows = records.rows.map(item => {
      let batch = {}

      batch['batchId'] = item.batchId
      batch['associate_name'] = item?.seller_id?.basic_details?.associate_details?.associate_name ?? null
      batch['organization_name'] = item?.seller_id?.basic_details?.associate_details?.organization_name ?? null
      batch['procurement_center'] = item?.procurementCenter_id?.center_name ?? null
      batch['quantity_purchased'] = item?.qty ?? null
      batch['procured_on'] = item?.dispatched_at ?? null
      batch['delivery_location'] = item?.req_id?.address?.deliveryLocation ?? null
      batch['address'] = item.req_id?.address ?? null
      batch['status'] = item.status
      batch['lot_ids'] = (item?.farmerOrderIds.reduce((acc, item) => [...acc, item.farmerOrder_id.order_no], [])) ?? []
      batch['_id'] = item._id
      batch['total_amount'] = item?.total_amount ?? "2 CR",
      batch['delivered_at'] = item?.delivered?.delivered_at

      return batch
    })

    // return sendResponse({
    //   res,
    //   status: 200,
    //   data: records,
    //   message: _response_message.found("order"),
    // })


    if (isExport == 1) {

      const record = records.rows.map((item) => {
        return {
          "Batch ID": item?.batchId || 'NA',
          "Associate Name": item?.associate_name || 'NA',
          "Procure Center": item?.procurement_center || 'NA',
          "quantity purchased": item?.quantity_purchased || 'NA',
          "Delivered on": item?.delivered_at || 'NA',
          "delivery location": item?.delivery_location || 'NA',
          "Batch status": item.status || 'NA'
        }
      })

      if (record.length > 0) {

        dumpJSONToExcel(req, res, {
          data: record,
          fileName: `Batch-record.xlsx`,
          worksheetName: `Batch-record`
        });
      } else {
        return sendResponse({
          res,
          status: 400,
          data: records,
          message: _response_message.notFound("Batch"),
        })

      }
    } else {
      return sendResponse({
        res,
        status: 200,
        data: records,
        message: _response_message.found("Batch"),
      })

    }

  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
});

module.exports.qcDetailsById = asyncErrorHandler(async (req, res) => {
  try {

    const { id } = req.params;
    const records = {};
    records.rows =
      (await Batch.findById(id)
        .select(" ")
        .populate({ path: 'req_id', select: '' })) ?? []

    return sendResponse({
      res,
      status: 200,
      data: records,
      message: _response_message.found("QC detail")
    })

  } catch (error) {
    console.log("error==>", error);
    _handleCatchErrors(error, res)
  }
})

module.exports.auditTrail = asyncErrorHandler(async (req, res) => {

  const { id } = req.query;

  const record = await Batch.findOne({ _id: id });

  if (!record) {
    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
  }

  const { dispatched, intransit, delivered, createdAt, payment_at, payement_approval_at } = record;

  const steps = [
    {
      name: "Batch Created",
      status: record ? "completed" : "pending",
      date: record ? createdAt : null,
    },
    {
      name: "Mark Dispatched",
      status: dispatched ? "completed" : "pending",
      date: dispatched.dispatched_at ? dispatched.dispatched_at : null,
    },
    {
      name: "In Transit",
      status: intransit ? "completed" : "pending",
      date: intransit.intransit_at ? intransit.intransit_at : null,
    },
    {
      name: "Delivery Date",
      status: delivered ? "completed" : "pending",
      date: delivered.delivered_at ? delivered.delivered_at : null,
    },
    {
      name: "Final QC Check",
      status: dispatched.qc_report.received_qc_status == received_qc_status.accepted ? "completed" : dispatched.qc_report.received_qc_status == received_qc_status.rejected ? "rejected" : "pending",
      date: dispatched.qc_report.received.length != 0 && dispatched.qc_report.received[dispatched.qc_report.received.length - 1].on ? dispatched.qc_report.received[dispatched.qc_report.received.length - 1].on : null
    },
    {
      name: "Payment Approval Date",
      status: payement_approval_at ? "completed" : "pending",
      date: payement_approval_at ? payement_approval_at : null,
    },
    {
      name: "Payment Paid",
      status: payment_at ? "completed" : "pending",
      date: payment_at ? payment_at : null,
    },
  ];


  return res.status(200).send(new serviceResponse({ status: 200, data: steps, message: _response_message.found("audit trail") }))

})
