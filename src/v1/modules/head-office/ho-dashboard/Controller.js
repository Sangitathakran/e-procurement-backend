const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { wareHouse } = require("@src/v1/models/app/warehouse/warehouseSchema");
const { User } = require("@src/v1/models/app/auth/User");
const {
  ProcurementCenter,
} = require("@src/v1/models/app/procurement/ProcurementCenter");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const {
  AssociateOffers,
} = require("@src/v1/models/app/procurement/AssociateOffers");
const { _query } = require("@src/v1/utils/constants/messages");
const moment = require("moment");
const { wareHousev2 } = require("@src/v1/models/app/warehouse/warehousev2Schema");


//widget listss
module.exports.widgetList = asyncErrorHandler(async (req, res) => {
  try {
    report = [
      { monthName: "January", month: 1, total: 0 },
      { monthName: "February", month: 2, total: 0 },
      { monthName: "March", month: 3, total: 0 },
      { monthName: "April", month: 4, total: 0 },
      { monthName: "May", month: 5, total: 0 },
      { monthName: "June", month: 6, total: 0 },
      { monthName: "July", month: 7, total: 0 },
      { monthName: "Augest", month: 8, total: 0 },
      { monthName: "September", month: 9, total: 0 },
      { monthName: "Octorber", month: 10, total: 0 },
      { monthName: "November", month: 11, total: 0 },
      { monthName: "Decmeber", month: 12, total: 0 },
    ];
    let widgetDetails = {
      branch: { total: 0, lastMonth: [] },

      associate: { total: 0, lastMonth: [] },
      procCenter: { total: 0, lastMonth: [] },
      farmer: { total: 0, lastMonth: [] },
    };
    let associateFCount = (await farmer.countDocuments({})) ?? 0;
    widgetDetails.farmer.total = associateFCount;
    widgetDetails.associate.total = await User.countDocuments({});
    widgetDetails.procCenter.total = await ProcurementCenter.countDocuments({});
    let lastMonthUser = await User.aggregate([
      { $match: { user_type: "Associate" } },
      { $project: { month: { $month: "$createdAt" } } },
      { $group: { _id: "$month", total: { $sum: 1 } } },
    ]);
    let lastMonthFarmer = await farmer.aggregate([
      { $project: { month: { $month: "$createdAt" } } },
      { $group: { _id: "$month", total: { $sum: 1 } } },
    ]);

    let getReport = (report, data) => {
      return report.map((item) => {
        let details = data?.find((item2) => item2?._id == item.month);
        if (details?._id == item.month) {
          return { month: item.monthName, total: details.total };
        } else {
          return { month: item.monthName, total: item.total };
        }
      });
    };
    widgetDetails.associate.lastMonth = getReport(report, lastMonthUser);
    widgetDetails.farmer.lastMonth = getReport(report, lastMonthFarmer);

    return sendResponse({
      res,
      status: 200,
      message: _query.get("Widget List"),
      data: widgetDetails,
    });
  } catch (error) {
    console.log("error", error);
  }
});

module.exports.dashboardWidgetList = asyncErrorHandler(async (req, res) => {
  try {

    const hoId = req.portalId;

    let widgetDetails = {
      branchOffice: { total: 0 },
      farmerRegistration: { farmertotal: 0, associateFarmerTotal: 0, totalRegistration: 0 },
      wareHouse: { total: 0 },
      //procurementTarget: { total: 0 }
    };



    // Get counts safely
    widgetDetails.wareHouse.total = await wareHousev2.countDocuments({});
    widgetDetails.branchOffice.total = await Branches.countDocuments({headOfficeId:hoId});
    widgetDetails.farmerRegistration.farmertotal = await farmer.countDocuments({});
    widgetDetails.farmerRegistration.associateFarmerTotal = await User.countDocuments({});

    //let procurementTargetQty = await RequestModel.find({})
    widgetDetails.farmerRegistration.totalRegistration =
      widgetDetails.farmerRegistration.farmertotal +
      widgetDetails.farmerRegistration.associateFarmerTotal;

    return sendResponse({
      res,
      status: 200,
      message: _query.get("Widget List"),
      data: widgetDetails,
    });
  } catch (error) {
    console.error("Error in widgetList:", error);
    return sendResponse({
      res,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


module.exports.farmerPendingPayments = asyncErrorHandler(async (req, res) => {
  const { limit = 10, page = 1 } = req.query;

  const skip = (page - 1) * limit;
  let pendingPaymentDetails = await Payment.find({payment_status:'Pending'})
  .populate({ path: "req_id", select: "reqNo" })
  .select('req_id qtyProcured amount payment_status')
  .skip(skip)
  .limit(limit);

  // Get total count for pagination metadata
  const totalCount = await Payment.countDocuments({ payment_status: "Pending" });

  

 
  return sendResponse({
    res,
    status: 200,
    message: _query.get("Farmer Payments"),
    //data: pendingPaymentDetails,
    data: {
      rows: pendingPaymentDetails,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      limit: limit,
      page: page
    },
  });
});

module.exports.farmerPendingApproval = asyncErrorHandler(async (req, res) => {

  const { limit = 10, page = 1 } = req.query;
  const skip = (page - 1) * limit;

  // Get total count for pagination metadata
  const totalCount = await Payment.countDocuments({ ho_approve_status: "Pending" });
  
  let pendingApprovalDetails = await Payment.find({ ho_approve_status: "Pending" })
    .populate({ path: "req_id", select: "reqNo deliveryDate" })
    .select("req_id qtyProcured amountPaid ho_approve_status")
    .skip(skip)
    .limit(limit);

  // Modify the response to add paymentDueDate (deliveryDate + 72 hours)
  const modifiedDetails = pendingApprovalDetails.map((doc) => {
    const deliveryDate = doc.req_id?.deliveryDate ? new Date(doc.req_id.deliveryDate) : null;
    
    return {
      ...doc.toObject(),
      paymentDueDate: deliveryDate ? moment(deliveryDate).add(72, "hours").toISOString() : null,
    };
  });

  return sendResponse({
    res,
    status: 200,
    message: _query.get("Farmer Payments"),
    //data: modifiedDetails,
    data: {
      rows: modifiedDetails,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      limit: limit,
      page: page
    },
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
  let { option } = req.query;

  const report = {
    week: [
      { weekName: "Monday", week: 1, farmer: 0, agency: 0 },
      { weekName: "Tuesday", week: 2, farmer: 0, agency: 0 },
      { weekName: "Wednesday", week: 3, farmer: 0, agency: 0 },
      { weekName: "Thursday", week: 4, farmer: 0, agency: 0 },
      { weekName: "Friday", week: 5, farmer: 0, agency: 0 },
      { weekName: "Saturday", week: 6, farmer: 0, agency: 0 },
      { weekName: "Sunday", week: 7, farmer: 0, agency: 0 },
    ],
    month: [
      { monthName: "January", month: 1, farmer: 0, agency: 0 },
      { monthName: "February", month: 2, farmer: 0, agency: 0 },
      { monthName: "March", month: 3, farmer: 0, agency: 0 },
      { monthName: "April", month: 4, farmer: 0, agency: 0 },
      { monthName: "May", month: 5, farmer: 0, agency: 0 },
      { monthName: "June", month: 6, farmer: 0, agency: 0 },
      { monthName: "July", month: 7, farmer: 0, agency: 0 },
      { monthName: "Augest", month: 8, farmer: 0, agency: 0 },
      { monthName: "September", month: 9, farmer: 0, agency: 0 },
      { monthName: "Octorber", month: 10, farmer: 0, agency: 0 },
      { monthName: "November", month: 11, farmer: 0, agency: 0 },
      { monthName: "Decmeber", month: 12, farmer: 0, agency: 0 },
    ],
  };

  const groupStage =
    option === "week"
      ? {
          // Group by day of the week
          $group: {
            _id: {
              day: { $dayOfWeek: "$createdAt" }, // 1 (Sunday) to 7 (Saturday)
              payment_collect_by: "$payment_collect_by",
            },
            totalAmount: { $sum: "$amount" },
          },
        }
      : {
          // Group by year and month
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              payment_collect_by: "$payment_collect_by",
            },
            totalAmount: { $sum: "$amount" },
          },
        };

  const results = await Payment.aggregate([
    groupStage,
    {
      // Reshape the output
      $project: {
        _id: 0,
        ...(option === "week"
          ? {
              day: "$_id.day",
              payment_collect_by: "$_id.payment_collect_by",
            }
          : {
              year: "$_id.year",
              month: "$_id.month",
              payment_collect_by: "$_id.payment_collect_by",
            }),
        totalAmount: "$totalAmount",
      },
    },
    {
      $group: {
        _id: option === "week" ? "$day" : { month: "$month" },
        farmer: {
          $sum: {
            $cond: [
              { $eq: ["$payment_collect_by", "farmer"] },
              "$totalAmount",
              0,
            ],
          },
        },
        agency: {
          $sum: {
            $cond: [
              { $eq: ["$payment_collect_by", "Agency"] },
              "$totalAmount",
              0,
            ],
          },
        },
      },
    },
    {
      // Final projection to shape the output
      $project: {
        _id: 0,
        ...(option === "week" ? { day: "$_id" } : { month: "$_id.month" }),
        farmer: 1,
        agency: 1,
      },
    },
    {
      // Sort by day or by year and month
      $sort: option === "week" ? { day: 1 } : { month: 1 },
    },
  ]);
  let paymentDetails = report[option].map((item) => {
    let payment = results?.find((item2) => item2[option] == item[option]);
    console.log("payment", payment, item);
    if (payment) {
      return {
        [option]: item[`${option}Name`],
        farmer: payment.farmer,
        agency: payment.agency,
      };
    } else {
      return {
        [option]: item[`${option}Name`],
        farmer: item.farmer,
        agency: item.agency,
      };
    }
  });

  return sendResponse({
    res,
    status: 200,
    message: _query.get("Revenue Expense chart"),
    data: paymentDetails,
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
  const { limit, skip, page } = req.query;
  let records = { count: 0 };
  records.row = await RequestModel.find({})
    .select("quotedPrice fulfilledQty reqNo")
    .skip(skip)
    .limit(limit);

  records.count = await RequestModel.countDocuments({});
  records.page = page;
  records.limit = limit;
  records.pages = Math.ceil(records.count / limit);
  return sendResponse({
    res,
    status: 200,
    message: _query.get("Payment Quantity"),
    data: records,
  });
});
module.exports.optionRequestId = asyncErrorHandler(async (req, res) => {
  let records = { count: 0 };
  records.row = await RequestModel.find({
    // head_office_id:req.user.portalId
  }).select("reqNo");

  return sendResponse({
    res,
    status: 200,
    message: _query.get("Request Option List"),
    data: records,
  });
});
//branchOfficeProcurements
module.exports.branchOfficeProcurement = asyncErrorHandler(async (req, res) => {
  let { stateNames } = req.query;

  stateNames = stateNames ? JSON.parse(stateNames) : [];
  let data = [
    {
      state: "Andhra Pradesh",
      qty: 0,
      amount:0,
      total_qty:0
    },

    {
      state: "Arunachal Pradesh",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Assam",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Bihar",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Chhattisgarh",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Goa",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Gujarat",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Haryana",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Himachal Pradesh",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Jharkhand",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      name: "Karnataka",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Kerala",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Madhya Pradesh",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Maharashtra",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Manipur",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Meghalaya",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Mizoram",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Nagaland",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Odisha",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Punjab",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      name: "Rajasthan",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Sikkim",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Tamil Nadu",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Telangana",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Tripura",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Uttar Pradesh",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Uttarakhand",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "West Bengal",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Andaman and Nicobar Islands",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Chandigarh",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Dadra and Nagar Haveli and Daman and Diu",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Lakshadweep",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Delhi",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Puducherry",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Ladakh",
      qty: 0,
      amount:0,
      total_qty:0
    },
    {
      state: "Jammu and Kashmir",
      qty: 0,
      amount:0,
      total_qty:0
    },
  ];
  let pipeline = [
    {
      $lookup: {
        from: "procurementcenters",
        localField: "procurementCenter_id",
        foreignField: "_id",
        as: "result",
      },
    },
    {
      $lookup: {
        from: "requests",
        localField: "req_id",
        foreignField: "_id",
        as: "requests",
      },
    },
    {
      $unwind: {
        path: "$result",
        preserveNullAndEmptyArrays: false, // Ensures only documents with procurement centers are processed
      },
    },
    {
      $unwind: {
        path: "$requests",
        preserveNullAndEmptyArrays: true, // Allows docs with no matching requests to be included
      },
    },
    {
      $group: {
        _id: "$result.address.state",
        qty: { $sum: "$qty" },
        amount: { $sum: "$totalPrice" },
        total_qty: { $sum: "$requests.fulfilledQty" }, // Now works after unwinding requests
      },
    },
    {
      $project: {
        state: "$_id",
        qty: 1,
        amount: 1,
        total_qty: 1,
        _id: 0,
      },
    },
  ];
  
  if (stateNames.length > 0) {
    pipeline.push({ $match: { state: { $in: stateNames } } });
  } else {
  }
  let branchOfficeProc = await Batch.aggregate(pipeline);
  let totalProcuredQty = branchOfficeProc.reduce((accumulator, item) => accumulator + (Number(item.qty) || 0), 0);
  totalProcuredQty = Math.round(totalProcuredQty);
  data=data.map(item=>{
    let stateDetails=branchOfficeProc.find(item2=>item2.state==item.state);
   
        if(stateDetails){
          return {...stateDetails}
        }else{
          return {...item}
        }
  })

  return sendResponse({
    res,
    status: 200,
    message: _query.get("BranchOfficeProcurement"),
    data: {branchOfficeProc: data, totalProcuredQty},
  });
});
//farmerBenifitted
module.exports.farmerBenifitted = asyncErrorHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
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
  const pipeline = [
    // query,
    {
      $project: { month: { $month: "$createdAt" } },
    },
    {
      $group: { _id: "$month", farmers: { $count: {} } },
    },
  ];
  if (startDate != undefined || endDate != undefined) {
    let formatStartDate = moment(startDate).format("DD-MM-YYYY");
    let formatEndDate = moment(endDate).format("DD-MM-YYYY");
    pipeline.unshift({
      $match: { createdAt: { $gt: formatStartDate, $lte: formatEndDate } },
    });
  } else {
  }

  let farmerBenifittedDetails = await AssociateOffers.aggregate(pipeline);

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
//procurementStatus
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
//payment status by batch
module.exports.paymentStatusByDate = asyncErrorHandler(async (req, res) => {
  const { date } = req.query;
  const paymentDetails = await Payment.aggregate([
    {
      $match: {
        $expr: {
          $eq: [
            { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            date,
          ],
        },
      },
    },
    {
      $project: { createdAt: 1, amount: 1, payment_status: 1 },
    },
  ]);
  const totalPendingAmount = await calculateAmount(paymentDetails, "Pending");
  const totalCompletedAmount = await calculateAmount(
    paymentDetails,
    "Completed"
  );
  const totalProcureDelivered = await calculateProcureQuantity(
    paymentDetails,
    "Completed"
  );
  let data = {
    sentAmount: totalCompletedAmount,
    dueAmount: totalPendingAmount,
    ProcurementDelivered: totalProcureDelivered,
  };
  return sendResponse({
    res,
    status: 200,
    message: _query.get("PaymentByDate"),
    data: data,
  });
});
//payment status by batch
module.exports.paymentActivity = asyncErrorHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const paymentDetails = await Payment.find()
    .select("initiated_at req_id ho_approve_by")
    .populate({ path: "ho_approve_by", select: "" })
    .populate({ path: "req_id", select: "reqNo" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Payment.countDocuments();

  return sendResponse({
    res,
    status: 200,
    message: _query.get("PaymentActivity"),
    data: {
      paymentDetails,
      totalCount,
      pages: Math.ceil(totalCount / limit),
      limit: limit,
      page: page,
    },
  });
});
const calculateProcureQuantity = async (paymentDetails, status) => {
  return paymentDetails
    .filter((item) => item.payment_status == status)
    .reduce((acc, item) => acc + item.qtyProcured, 0);
};
const calculateAmount = async (paymentDetails, status) => {
  return paymentDetails
    .filter((item) => item.payment_status == status)
    .reduce((acc, item) => acc + item.amount, 0);
};
//procurementOnTime
module.exports.procurementOnTime = asyncErrorHandler(async (req, res) => {
  let data = [
    { status: "On-Time", visitors: 0, fill: "#40BF7F" },
    { status: "Late", visitors: 0, fill: "#FF8819" },
    { status: "Early", visitors: 0, fill: "#F64C4C" },
  ];

  const results = await Batch.aggregate([
    {
      $project: {
        status: {
          $cond: {
            if: { $lt: ["$delivered_at", "$dispatched_at"] },
            then: "Early",
            else: {
              $cond: {
                if: { $lte: ["$delivered_at", "$dispatched_at"] },
                then: "On-Time",
                else: "Late",
              },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
    { $project: { status: "$_id", visitors: "$count", _id: 0 } },
  ]);
  data = data.map((item) => {
    let details = results.find((item2) => item2.status == item.status);
    if (item.status == details?.status) {
      return { ...item, visitors: details.visitors };
    } else {
      return { ...item };
    }
  });
  return sendResponse({
    res,
    status: 200,
    message: _query.get("ProcurementOnTime"),
    data: data,
  });
});
