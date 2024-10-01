const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const IndividualFarmer = require("@src/v1/models/app/farmerDetails/IndividualFarmer");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { wareHouse } = require("@src/v1/models/app/warehouse/warehouseSchema");
const { User } = require("@src/v1/models/app/auth/User");
const {
  ProcurementCenter,
} = require("@src/v1/models/app/procurement/ProcurementCenter");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const {
  AssociateOffers,
} = require("@src/v1/models/app/procurement/AssociateOffers");
const { _query } = require("@src/v1/utils/constants/messages");

//widget lists
module.exports.widgetList = asyncErrorHandler(async (req, res) => {
  let widgetDetails = {
    branch: { total: 0, lastMonth: [] },

    associate: { total: 0, lastMonth: [] },
    procCenter: { total: 0, lastMonth: [] },
    farmer: { total: 0, lastMonth: [] },
  };
  let individualFCount = (await IndividualFarmer.countDocuments({})) ?? 0;
  let associateFCount = (await farmer.countDocuments({})) ?? 0;
  widgetDetails.farmer.total = individualFCount + associateFCount;
  widgetDetails.associate.total = await User.countDocuments({});
  widgetDetails.procCenter.total = await ProcurementCenter.countDocuments({});
  return sendResponse({
    res,
    status: 200,
    message: _query.get("Widget List"),
    data: widgetDetails,
  });
});

//farmer payments
module.exports.farmerPayments = asyncErrorHandler(async (req, res) => {
  const { option } = req.query;
  const report = {
    week: [
      { weekName: "Monday", week: 1, revenue: 0 },
      { weekName: "Tuesday", week: 2, revenue: 0 },
      { weekName: "Wednesday", week: 3, revenue: 0 },
      { weekName: "Thursday", week: 4, revenue: 0 },
      { weekName: "Friday", week: 5, revenue: 0 },
      { weekName: "Saturday", week: 6, revenue: 0 },
      { weekName: "Sunday", week: 7, revenue: 0 },
    ],
    month: [
      { monthName: "January", month: 1, revenue: 0 },
      { monthName: "February", month: 2, revenue: 0 },
      { monthName: "March", month: 3, revenue: 0 },
      { monthName: "April", month: 4, revenue: 0 },
      { monthName: "May", month: 5, revenue: 0 },
      { monthName: "June", month: 6, revenue: 0 },
      { monthName: "July", month: 7, revenue: 0 },
      { monthName: "Augest", month: 8, revenue: 0 },
      { monthName: "September", month: 9, revenue: 0 },
      { monthName: "Octorber", month: 10, revenue: 0 },
      { monthName: "November", month: 11, revenue: 0 },
      { monthName: "Decmeber", month: 12, revenue: 0 },
    ],
  };
  let pipeline = [];
  if (option == "month") {
    pipeline = [
      {
        $project: { month: { $month: "$createdAt" }, amount: 1 },
      },
      {
        $group: { _id: "$month", revenue: { $sum: "$amount" } },
      },
    ];
  } else {
    pipeline = [
      {
        $project: { day: { $dayOfWeek: "$createdAt" }, amount: 1 },
      },
      {
        $group: { _id: "$day", revenue: { $sum: "$amount" } },
      },
    ];
  }

  let paymentDetails = await Payment.aggregate(pipeline);
  paymentDetails = report[option].map((item) => {
    let payment = paymentDetails?.find((item2) => item2?._id == item[option]);
    if (payment?._id == item[option]) {
      return { [option]: item[`${option}Name`], revenue: payment.revenue };
    } else {
      return { [option]: item[`${option}Name`], revenue: item.revenue };
    }
  });

  return sendResponse({
    res,
    status: 200,
    message: _query.get("Farmer Payments"),
    data: paymentDetails,
  });
});
//revenue expense chart
module.exports.revenueExpenseChart = asyncErrorHandler(async (req, res) => {
  const report = {
    week: [
      { week: "Mon", farmer: 186, agency: 80 },
      { week: "Tuesday", farmer: 205, agency: 200 },
      { week: "Wednesday", farmer: 237, agency: 120 },
      { week: "Thursday", farmer: 73, agency: 190 },
      { week: "Friday", farmer: 209, agency: 190 },
      { week: "Saturday", farmer: 214, agency: 140 },
      { week: "Sunday", farmer: 214, agency: 140 },
    ],
    month: [
      { month: "January", farmer: 186, agency: 80 },
      { month: "February", farmer: 305, agency: 200 },
      { month: "March", farmer: 237, agency: 120 },
      { month: "April", farmer: 73, agency: 190 },
      { month: "May", farmer: 209, agency: 130 },
      { month: "June", farmer: 214, agency: 140 },
      { month: "July", farmer: 214, agency: 140 },
      { month: "Augest", farmer: 214, agency: 140 },
      { month: "September", farmer: 214, agency: 140 },
      { month: "Octorber", farmer: 214, agency: 140 },
      { month: "November", farmer: 214, agency: 140 },
      { month: "Decmeber", farmer: 214, agency: 140 },
    ],
  };
  return sendResponse({
    res,
    status: 200,
    message: _query.get("Revenue Expense chart"),
    data: report,
  });
});
//locationWareHouseChart
module.exports.locationWareHouseChart = asyncErrorHandler(async (req, res) => {
  const { skip, limit } = req.query;
  let record = { count: 0 };
  record.row = await wareHouse.aggregate([
    {
      $group: {
        _id: "$state",
        district: { $push: "$district" },
        totalwarehouse: { $sum: 1 },
      },
    },
    {
      $project: {
        district: {
          $rtrim: {
            input: {
              $reduce: {
                input: "$district",
                initialValue: "",
                in: {
                  $concat: ["$$value", "$$this", ","],
                },
              },
            },
            chars: ",",
          },
        },
        state: "$_id",
        totalwarehouse: 1,
        _id: 0,
      },
    },
    { $skip: skip },
    { $limit: limit },
  ]);
  record.count = await wareHouse.aggregate([
    { $group: { _id: "$state", district: { $push: "$district" } } },
    { $setWindowFields: { output: { totalCount: { $count: {} } } } },
    { $skip: skip },
    { $limit: limit },
    { $project: { totalCount: 1, _id: 0 } },
  ]);
  record.count = record.count[0].totalCount;
  return sendResponse({
    res,
    status: 200,
    message: _query.get("Warehouse Location"),
    data: record,
  });
});
//paymentQuantityPurchase
module.exports.paymentQuantityPurchase = asyncErrorHandler(async (req, res) => {
  const {limit,skip,page}=req.query;
  let records={count:0};
  records.row= await RequestModel.find({}).select('quotedPrice fulfilledQty reqNo').skip(skip).limit(limit);
  records.count=await RequestModel.countDocuments({}).skip(skip).limit(limit);
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
  return sendResponse({
    res,
    status: 200,
    message: _query.get("Farmer Payments"),
    data: records,
  });
});
//branchOfficeProcurement
module.exports.branchOfficeProcurement = asyncErrorHandler(async (req, res) => {
  const data = [
    { state: "Uttar Pradesh", farmers: 2800 },
    { state: "Madhya Pradesh", farmers: 2800 },
    { state: "Haryana", farmers: 3800 },
    { state: "Himachal Pradesh", farmers: 1400 },
  ];

  return sendResponse({
    res,
    status: 200,
    message: _query.get("BranchOfficeProcurement"),
    data: data,
  });
});
//farmerBenifitteds
module.exports.farmerBenifitted = asyncErrorHandler(async (req, res) => {
  const report = {
    month: [
      { monthName: "January", month: 1, farmers: 0 },
      { monthName: "February", month: 2, farmers: 0 },
      { monthName: "March", month: 3, farmers: 0 },
      { monthName: "April", month: 4, farmers: 0 },
      { monthName: "May", month: 5, farmers: 0 },
      { monthName: "June", month: 6, farmers: 0 },
      { monthName: "July", month: 7, farmers: 0 },
      { monthName: "Augest", month: 8, farmers: 0 },
      { monthName: "September", month: 9, farmers: 0 },
      { monthName: "Octorber", month: 10, farmers: 0 },
      { monthName: "November", month: 11, farmers: 0 },
      { monthName: "Decmeber", month: 12, farmers: 0 },
    ],
  };
  let farmerBenifittedDetails = await AssociateOffers.aggregate([
    {
      $project: { month: { $month: "$createdAt" } },
    },
    {
      $group: { _id: "$month", farmers: { $count: {} } },
    },
  ]);
  farmerBenifittedDetails = report.month.map((item) => {
    let farmerDetails = farmerBenifittedDetails?.find(
      (item2) => item2?._id == item.month
    );
    if (farmerDetails?._id == item.month) {
      return { month: item.monthName, farmers: farmerDetails.farmers };
    } else {
      return { month: item.monthName, farmers: item.farmers };
    }
  });

  return sendResponse({
    res,
    status: 200,
    message: _query.get("FarmerBenifitted"),
    data: farmerBenifittedDetails,
  });
});
//procurementStatuss
module.exports.procurementStatus = asyncErrorHandler(async (req, res) => {
  let statusDetails = [
    {
      status: "Requirement",
      quantity: 0,
      totalQuantity: 0,
      fill: "#0062F5",
    },
    {
      status: "Procurement Done",
      quantity: 0,
      totalQuantity: 0,
      fill: "#40BF7F",
    },
    {
      status: "Procurement Left",
      quantity: 0,
      totalQuantity: 0,
      fill: "#FF8819",
    },
    {
      status: "Procurement Ongoing",
      quantity: 0,
      totalQuantity: 0,
      fill: "#F64C4C",
    },
  ];
  let { id } = req.query;
  let request = {};
  if (!id) {
    request = await RequestModel.findOne({ status: "Open" }).sort({
      createdAt: -1,
    });
  } else {
    request = await RequestModel.findById(id);
  }
  const procurementStatusDetails = await Batch.aggregate([
    {
      $match: {
        req_id: request._id,
        status: { $ne: null },
      },
    },
    {
      $group: { _id: "$status", quantity: { $sum: "$dispatchedqty" } },
    },
    {
      $project: {
        status: "$_id",
        quantity: "$quantity",
        _id: 0,
        dispatchedqty: 1,
      },
    },
  ]);
  statusDetails =
    procurementStatusDetails &&
    statusDetails.map((item) => {
      if (item.status == "Requirement") {
        return {
          ...item,
          quantity: request.fulfilledQty,
          totalQuantity: request.totalQuantity,
        };
      } else if (item.status == "Procurement Done") {
        let deliveredDetails = procurementStatusDetails.find(
          (item2) => item2.status == "Delivered"
        );
        return {
          ...item,
          quantity: deliveredDetails?.quantity ?? 0,
          totalQuantity: request.fulfilledQty,
        };
      } else if (item.status == "Procurement Left") {
        let deliveredDetails = procurementStatusDetails
          .filter(
            (item2) => item2.status == "In-Transit" || item2.status == "Pending"
          )
          .reduce((acc, curr) => {
            return (acc = curr.quantity);
          }, 0);
        return {
          ...item,
          quantity: deliveredDetails ?? 0,
          totalQuantity: request.fulfilledQty,
        };
      } else if (item.status == "Procurement Ongoing") {
        let deliveredDetails = procurementStatusDetails.find(
          (item2) => item2.status == "Delivered"
        ) ?? { quantity: 0 };
        let inTransitDetails = procurementStatusDetails.find(
          (item2) => item2.status == "In-Transit"
        ) ?? { quantity: 0 };
        let leftDetails = request.fulfilledQty - deliveredDetails?.quantity;
        return {
          ...item,
          quantity: inTransitDetails?.quantity,
          totalQuantity: leftDetails,
        };
      }
    });
  return sendResponse({
    res,
    status: 200,
    message: _query.get("ProcurementStatus"),
    data: statusDetails,
  });
});
//procurementOnTime
module.exports.procurementOnTime = asyncErrorHandler(async (req, res) => {
  const procurementStatusDetails = await AssociateOffers.aggregate([
    {
      $group: { _id: "$status", total: { $count: {} } },
    },
    { $project: { status: "$_id", visitors: "$total", _id: 0 } },
  ]);
  const data = [
    { status: "On-Time", visitors: 58, fill: "#40BF7F" },
    { status: "Late", visitors: 22, fill: "#FF8819" },
    { status: "Early", visitors: 8, fill: "#F64C4C" },
  ];
  return sendResponse({
    res,
    status: 200,
    message: _query.get("ProcurementOnTime"),
    data: data,
  });
});
