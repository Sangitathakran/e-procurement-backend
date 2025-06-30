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
const { default: mongoose } = require("mongoose");
const { _userType, _userStatus, _paymentstatus, _procuredStatus, _collectionName, _associateOfferStatus, _status } = require("@src/v1/utils/constants");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const { SchemeAssign } = require("@src/v1/models/master/SchemeAssign");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { PurchaseOrderModel } = require("@src/v1/models/app/distiller/purchaseOrder");
// const { Commodity } = require("@src/v1/models/master/Commodity");
// const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");

//widget listss
module.exports.widgetList = asyncErrorHandler(async (req, res) => {
  try {
    const hoId = new mongoose.Types.ObjectId(req.portalId); //req.portalId;

    let report = [
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
    widgetDetails.associate.total = await User.countDocuments({ user_type: _userType.associate, is_approved: _userStatus.approved });
    widgetDetails.procCenter.total = await ProcurementCenter.countDocuments({ deletedAt: null });
    widgetDetails.branch.total = await Branches.countDocuments({ headOfficeId: hoId });

    let lastMonthUser = await User.aggregate([
      { $match: { user_type: "Associate" } },
      { $project: { month: { $month: "$createdAt" } } },
      { $group: { _id: "$month", total: { $sum: 1 } } },
    ]);
    let lastMonthFarmer = await farmer.aggregate([
      { $project: { month: { $month: "$createdAt" } } },
      { $group: { _id: "$month", total: { $sum: 1 } } },
    ]);
    let lastMonthBranch = await Branches.aggregate([
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
    widgetDetails.branch.lastMonth = getReport(report, lastMonthBranch);

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

    const hoId = new mongoose.Types.ObjectId(req.portalId); //req.portalId;
    const { user_id, portalId } = req;
   // console.log( { user_id, portalId} );
    let {
      schemeName = [],
      commodityName = [],
      dateRange,
      sessionName = [],
      stateName = []
    } = req.query;
    if (typeof commodityName === "string") commodityName = commodityName.split(',').map(s => s.trim());
    if (typeof schemeName === "string") schemeName = schemeName.split(',').map(s => s.trim());
    if (typeof sessionName === "string") sessionName = sessionName.split(',').map(s => s.trim());
    if (typeof stateName === "string") stateName = stateName.split(',').map(s => s.trim());

    if (!Array.isArray(commodityName)) commodityName = [commodityName];
    if (!Array.isArray(schemeName)) schemeName = [schemeName];
    if (!Array.isArray(sessionName)) sessionName = [sessionName];
    if (!Array.isArray(stateName)) stateName = [stateName];

    const paymentFilter = {
      ho_id: { $in: [user_id, portalId] },
      payment_status: _paymentstatus.completed,
    };

    let start_date = null, end_date= null;
    if (dateRange) {
      const { startDate, endDate } = parseDateRange(dateRange);
      start_date = startDate, end_date = endDate
      paymentFilter.createdAt = { $gte: startDate, $lte: endDate };
    }


    let widgetDetails = {
      branchOffice: { total: 0 },
      farmerRegistration: { farmertotal: 0, associateFarmerTotal: 0, totalRegistration: 0, distillerTotal: 0 },
      wareHouse: { total: 0 },
      //procurementTarget: { total: 0 }
      farmerBenifitted: 0,
      paymentInitiated: 0,
      totalProcurement: 0,
      todaysQtyProcured: 0,
    };
    // if (commodityName.length) {
    //   const matchedRequests = await RequestModel.find({
    //     "product.name": { $in: commodityName.map(name => new RegExp(name, "i")) },
    //     warehouse_id: { $ne: null },
    //     branch_id: { $ne: null }
    //   }).select("warehouse_id branch_id").lean();


    //   const warehouseIds = [...new Set(matchedRequests.map(req => req.warehouse_id?.toString()).filter(Boolean))];
    //   const branchIds = [...new Set(matchedRequests.map(req => req.branch_id?.toString()).filter(Boolean))];

    //   if (warehouseIds.length === 0) {
    //     widgetDetails.wareHouse.total = 0;
    //   } else {
    //     const warehouseFilter = { _id: { $in: warehouseIds } };
    //     widgetDetails.wareHouse.total = await wareHouseDetails.countDocuments(warehouseFilter);
    //   }

    //   if (branchIds.length === 0) {
    //     widgetDetails.branchOffice.total = 0;
    //   } else {
    //     const branchFilter = {
    //       _id: { $in: branchIds },
    //       headOfficeId: hoId
    //     };
    //     widgetDetails.branchOffice.total = await Branches.countDocuments(branchFilter);
    //   }

    //   //

    // } else {
    //   // 🧾 No commodity filter, fallback to default counts
    //   widgetDetails.wareHouse.total = await wareHouseDetails.countDocuments({});
    //   widgetDetails.branchOffice.total = await Branches.countDocuments({ headOfficeId: hoId });
    // }

    // Get counts safely
    // widgetDetails.wareHouse.total = await wareHouseDetails.countDocuments({ active: true });
    // widgetDetails.branchOffice.total = await Branches.countDocuments({ headOfficeId: hoId });
    //start of prachi code

    const {farmersCount, associateCount, distillerCount} = await getFarmersCount( { commodity: commodityName, state: stateName, season: sessionName, scheme: schemeName, start_date: start_date, end_date: end_date} );

    const {benifittedFarmersCount, totalProcurement, totalPaymentInitiated, todaysQtyProcured } = await getBenifittedFarmers({ hoId: hoId, commodity: commodityName, state: stateName, season: sessionName, scheme: schemeName, start_date: start_date, end_date: end_date });

    const { branchOfficeCount, wareHouseCount } = await getBOWarehouseCount( { hoId:hoId, commodity: commodityName, state: stateName, season: sessionName, scheme: schemeName, start_date, end_date} );
     widgetDetails.farmerRegistration.distillerTotal = distillerCount; //await Distiller.countDocuments({ is_approved: _userStatus.approved });
    // widgetDetails.branchOffice.total = await Branches.countDocuments({ headOfficeId: hoId });
    widgetDetails.farmerRegistration.farmertotal = farmersCount; //await farmer.countDocuments({});
    widgetDetails.farmerRegistration.associateFarmerTotal =  associateCount; //await User.countDocuments({ user_type: _userType.associate, is_approved: _userStatus.approved, is_form_submitted: true });
    widgetDetails.farmerRegistration.totalRegistration = (widgetDetails.farmerRegistration.farmertotal + widgetDetails.farmerRegistration.associateFarmerTotal + widgetDetails.farmerRegistration.distillerTotal);
    widgetDetails.farmerBenifitted =benifittedFarmersCount;  //await Payment.countDocuments({ ho_id: hoId, payment_status: _paymentstatus.completed });
    widgetDetails.branchOffice.total = branchOfficeCount;
    widgetDetails.wareHouse.total = wareHouseCount;
    // let scheme = null;
    // if (schemeName.length) {
    //   scheme = await Scheme.findOne({ schemeName: { $in: schemeName.map(name => new RegExp(name, "i")) } }).select("_id").lean();
    // }
   

    // const payments = await Payment.find(paymentFilter)
    //   .select("qtyProcured createdAt amount")
    //   .populate({
    //     path: "req_id",
    //     select: "product.name product.schemeId product.season",
    //     match: {
    //       ...(commodityName.length && { "product.name": { $in: commodityName.map(name => new RegExp(name, "i")) } }),
    //       ...(scheme && { "product.schemeId": scheme._id }),
    //       ...(sessionName.length && { "product.season": { $in: sessionName.map(name => new RegExp(name, "i")) } })
    //     }
    //   })
    //   .populate({
    //     path: "batch_id",
    //     select: "seller_id",
    //     populate: {
    //       path: "seller_id",
    //       select: "address.registered.state",
    //       ...(stateName.length && {
    //         match: {
    //           "address.registered.state": {
    //             $in: stateName.map(name => new RegExp(name, "i")),
    //           },
    //         },
    //       }),
    //     }
    //   })
    //   .lean();

  //  let grandTotalQtyProcured = 0;
  //  let todaysQtyProcured = 0;
  //  let grandTotalamount = 0;
    // Get start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // for (const payment of payments) {
    //   const qty = Number(payment.qtyProcured) || 0;
    //   const amount = Number(payment.amount) || 0;
    //   grandTotalQtyProcured += qty;
    //   grandTotalamount += amount;

    //   const createdAt = new Date(payment.createdAt);
    //   if (createdAt >= startOfToday) {
    //     todaysQtyProcured += qty;
    //   }
    // }

    widgetDetails.paymentInitiated += totalPaymentInitiated; //grandTotalamount;
    widgetDetails.totalProcurement = totalProcurement; //Math.round(grandTotalQtyProcured * 100) / 100;
    widgetDetails.todaysQtyProcured = todaysQtyProcured;

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

// start of prachi code
/*
module.exports.farmerPendingPayments = asyncErrorHandler(async (req, res) => {
  const hoId = new mongoose.Types.ObjectId(req.portalId); //req.portalId;
  console.log("hoId", hoId);

  const { limit = 10, page = 1 } = req.query;
  const { user_id, portalId } = req;
  const skip = (page - 1) * limit;

  let pendingPaymentDetails = await Payment.find({ ho_id: { $in: [user_id, portalId] }, payment_status: 'Pending' })
    .select('req_id qtyProcured amount payment_status')
    .populate({ path: "req_id", select: "reqNo" })
    .skip(skip)
    .limit(limit)
    .lean();

  pendingPaymentDetails = pendingPaymentDetails.map((payment) => {
    return {
      ...payment,
      reqNo: payment.req_id && payment.req_id.reqNo ? payment.req_id.reqNo : 'No Data Available',
    };
  });

  const totalCount = await Payment.countDocuments({ ho_id: { $in: [user_id, portalId] }, payment_status: 'Pending' });

  return sendResponse({
    res,
    status: 200,
    message: _query.get("Farmer Payments"),
    data: {
      rows: pendingPaymentDetails,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      limit: limit,
      page: page
    },
  });
});

// end of prachi code

//Start of prachi code for pending-approval-farmer
module.exports.farmerPendingApproval = asyncErrorHandler(async (req, res) => {

  const { limit = 10, page = 1 } = req.query;
  const skip = (page - 1) * limit;
  const { user_id, portalId } = req;

  // Get total count for pagination metadata
  const totalCount = await Payment.countDocuments({ ho_id: { $in: [user_id, portalId] }, ho_approve_status: "Pending" });

  let pendingApprovalDetails = await Payment.find({ ho_id: { $in: [user_id, portalId] }, ho_approve_status: "Pending" })
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

//end of prachi code
*/
function parseDateRange(dateRange) {
  //console.log(dateRange) // 13/06/2025 - 25/06/2025
  const [startStr, endStr] = dateRange.split(" - ").map(s => s.trim());

  const [startDay, startMonth, startYear] = startStr.split('/');
  const [endDay, endMonth, endYear] = endStr.split('/');

  const startDate = new Date(`${startYear}-${startMonth}-${startDay}T00:00:00.000Z`);
  const endDate = new Date(`${endYear}-${endMonth}-${endDay}T23:59:59.999Z`);
//console.log( {startDate, endDate} ) //{ startDate: 2025-06-13T00:00:00.000Z, endDate: 2025-06-25T23:59:59.999Z }
  return { startDate, endDate };
}

module.exports.farmerPendingPayments = asyncErrorHandler(async (req, res) => {
  const hoId = new mongoose.Types.ObjectId(req.portalId);

  let { limit = 10, page = 1, commodityName = [],
    schemeName = [],
    sessionName = [], dateRange, stateName = [] } = req.query;
  const { user_id, portalId } = req;
  const skip = (page - 1) * limit;

  if (typeof commodityName === "string") commodityName = commodityName.split(',').map(s => s.trim());
  if (typeof schemeName === "string") schemeName = schemeName.split(',').map(s => s.trim());
  if (typeof sessionName === "string") sessionName = sessionName.split(',').map(s => s.trim());
  if (typeof stateName === "string") stateName = stateName.split(',').map(s => s.trim());

  if (!Array.isArray(commodityName)) commodityName = [commodityName];
  if (!Array.isArray(schemeName)) schemeName = [schemeName];
  if (!Array.isArray(sessionName)) sessionName = [sessionName];
  if (!Array.isArray(stateName)) stateName = [stateName];

  const paymentFilter = {
    ho_id: portalId,
    payment_status: 'Pending'
  };

  // const scheme = schemeName
  //   ? await Scheme.findOne({
  //       schemeName: { $regex: new RegExp(schemeName, "i") },
  //     }).select("_id").lean()
  //   : null;

  // if (schemeName && !scheme) {
  //   return sendResponse({
  //     res,
  //     status: 200,
  //     message: "Scheme not found",
  //     data: { rows: [], totalCount: 0, totalPages: 0, limit, page },
  //   });
  // }
  let schemeIds = [];
  if (schemeName.length) {
    const schemes = await Scheme.find({
      schemeName: { $in: schemeName.map(name => new RegExp(name, "i")) }
    }).select("_id").lean();
    schemeIds = schemes.map(s => s._id);
  }

  if (dateRange) {
    const { startDate, endDate } = parseDateRange(dateRange);
    paymentFilter.createdAt = { $gte: startDate, $lte: endDate };
  }
  let pendingPaymentDetails = await Payment.find(paymentFilter)
    .populate({
      path: "req_id",
      select: "reqNo product.name product.schemeId product.season batch_id",
      match: {
        ...(commodityName.length && {
          "product.name": { $in: commodityName.map(name => new RegExp(name, "i")) },
        }),
        ...(schemeIds.length && {
          "product.schemeId": { $in: schemeIds },
        }),
        ...(sessionName.length && {
          "product.season": { $in: sessionName.map(name => new RegExp(name, "i")) },
        }),
      },
    })
    .populate({
      path: "batch_id",
      select: "seller_id",
      populate: {
        path: "seller_id",
        select: "address.registered.state",
        match: stateName.length
          ? {
            "address.registered.state": {
              $in: stateName.map(name => new RegExp(name, "i")),
            },
          }
          : undefined,
      },
    })
    .select("req_id qtyProcured amount payment_status")
    .skip(skip)
    .limit(limit)
    .lean();
  // Filter out payments where reqNo is missing
  pendingPaymentDetails = pendingPaymentDetails.filter(payment => payment.req_id && payment.req_id.reqNo);

  // Map to flatten reqNo
  pendingPaymentDetails = pendingPaymentDetails.map(payment => ({
    ...payment,
    reqNo: payment.req_id.reqNo,
    commodityName: payment.req_id?.product?.name || null
  }));

  // Note: Count still includes all "Pending" payments regardless of reqNo presence.
  // If you want the count to reflect only visible rows, recompute it based on the filtered array.
  const filteredTotalCount = pendingPaymentDetails.length;

  return sendResponse({
    res,
    status: 200,
    message: _query.get("Farmer Payments"),
    data: {
      rows: pendingPaymentDetails,
      totalCount: filteredTotalCount,
      totalPages: Math.ceil(filteredTotalCount / limit),
      limit: limit,
      page: page,
    },
  });
});

module.exports.farmerPendingApproval = asyncErrorHandler(async (req, res) => {
  let { limit = 10, page = 1, commodityName = [],
    schemeName = [],
    sessionName = [], dateRange, stateName = [] } = req.query;
  const skip = (page - 1) * limit;
  const { user_id, portalId } = req;

  if (typeof commodityName === "string") commodityName = commodityName.split(',').map(s => s.trim());
  if (typeof schemeName === "string") schemeName = schemeName.split(',').map(s => s.trim());
  if (typeof sessionName === "string") sessionName = sessionName.split(',').map(s => s.trim());
  if (typeof stateName === "string") stateName = stateName.split(',').map(s => s.trim());

  if (!Array.isArray(commodityName)) commodityName = [commodityName];
  if (!Array.isArray(schemeName)) schemeName = [schemeName];
  if (!Array.isArray(sessionName)) sessionName = [sessionName];
  if (!Array.isArray(stateName)) stateName = [stateName];

  const paymentFilter = {
    ho_id: portalId,
    ho_approve_status: 'Pending'
  };

  let schemeIds = [];
  if (schemeName.length) {
    const schemes = await Scheme.find({
      schemeName: { $in: schemeName.map(name => new RegExp(name, "i")) }
    }).select("_id").lean();
    schemeIds = schemes.map(s => s._id);
  }

  if (dateRange) {
    const { startDate, endDate } = parseDateRange(dateRange);
    paymentFilter.createdAt = { $gte: startDate, $lte: endDate };
  }

  // Fetch all relevant records for this page
  // let pendingApprovalDetails = await Payment.find(paymentFilter)
  //   .populate({ path: "req_id", select: "reqNo deliveryDate product.name",
  //     ...(commodityName && {
  //       match: {
  //         "product.name": { $regex: new RegExp(commodityName, "i") }
  //       }
  //     })
  //   })
  //   .select("req_id qtyProcured amountPaid ho_approve_status")
  //   .skip(skip)
  //   .limit(limit);
  let pendingApprovalDetails = await Payment.find(paymentFilter)
    .populate({
      path: "req_id",
      select: "reqNo deliveryDate product.name product.season batch_id",
      match: {
        ...(commodityName.length && {
          "product.name": { $in: commodityName.map(name => new RegExp(name, "i")) },
        }),
        ...(schemeIds.length && {
          "product.schemeId": { $in: schemeIds },
        }),
        ...(sessionName.length && {
          "product.season": { $in: sessionName.map(name => new RegExp(name, "i")) },
        }),
      },
    })
    .populate({
      path: "batch_id",
      select: "seller_id",
      populate: {
        path: "seller_id",
        select: "address.registered.state",
        match: stateName.length
          ? {
            "address.registered.state": {
              $in: stateName.map(name => new RegExp(name, "i")),
            },
          }
          : undefined,
      },
    })
    .select("req_id qtyProcured amountPaid ho_approve_status createdAt")
    .skip(skip)
    .limit(limit);

  // Filter out records without reqNo and compute paymentDueDate using reduce
  const modifiedDetails = pendingApprovalDetails.reduce((acc, doc) => {
    if (doc.req_id?.reqNo) {
      const deliveryDate = doc.req_id.deliveryDate ? new Date(doc.req_id.deliveryDate) : null;
      acc.push({
        ...doc.toObject(),
        paymentDueDate: deliveryDate ? moment(deliveryDate).add(72, "hours").toISOString() : null,
      });
    }
    return acc;
  }, []);

  // Adjust totalCount and pagination metadata based on filtered results
  const filteredTotalCount = modifiedDetails.length;

  return sendResponse({
    res,
    status: 200,
    message: _query.get("Farmer Payments"),
    data: {
      rows: modifiedDetails,
      totalCount: filteredTotalCount,
      totalPages: Math.ceil(filteredTotalCount / limit),
      limit: limit,
      page: page,
    },
  });
});

// module.exports.paymentActivity = asyncErrorHandler(async (req, res) => {
//   const { page = 1, limit = 10 } = req.query;
//   const skip = (page - 1) * limit;

//   const paymentDetails = await Payment.find({ ho_id: req.portalId })
//     .select("initiated_at req_id ho_approve_by ho_approve_at")
//     .populate({ path: "ho_approve_by", select: "point_of_contact.name" })
//     .populate({
//       path: "req_id",
//       select: "reqNo"
//     })
//     .populate({ path: "req_id", select: "reqNo" })
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(limit);

//   const totalCount = await Payment.countDocuments({ ho_id: req.portalId });

//   return sendResponse({
//     res,
//     status: 200,
//     message: _query.get("PaymentActivity"),
//     data: {
//       paymentDetails,
//       totalCount,
//       pages: Math.ceil(totalCount / limit),
//       limit: limit,
//       page: page,
//     },
//   });
// });
module.exports.paymentActivity = asyncErrorHandler(async (req, res) => {
  let { page = 1, limit = 10, commodityName = [], schemeName = [], dateRange, sessionName = [], stateName = [] } = req.query;
  page = Number(page);
  limit = Number(limit);
  const skip = (page - 1) * limit;
  const filter = { ho_id: req.portalId };

  if (typeof commodityName === "string") commodityName = commodityName.split(',').map(s => s.trim());
  if (typeof schemeName === "string") schemeName = schemeName.split(',').map(s => s.trim());
  if (typeof sessionName === "string") sessionName = sessionName.split(',').map(s => s.trim());
  if (typeof stateName === "string") stateName = stateName.split(',').map(s => s.trim());

  if (!Array.isArray(commodityName)) commodityName = [commodityName];
  if (!Array.isArray(schemeName)) schemeName = [schemeName];
  if (!Array.isArray(sessionName)) sessionName = [sessionName];
  if (!Array.isArray(stateName)) stateName = [stateName];
  // Apply date range filter
  if (dateRange) {
    const { startDate, endDate } = parseDateRange(dateRange);
    filter.createdAt = { $gte: startDate, $lte: endDate };
  }

  // Scheme filter - find scheme ID if schemeName is passed
  let schemeIds = [];
  if (schemeName.length) {
    const schemes = await Scheme.find({
      schemeName: { $in: schemeName.map(name => new RegExp(name, "i")) }
    }).select("_id").lean();
    schemeIds = schemes.map(s => s._id);
  }

  // const paymentDetails = await Payment.find(filter)
  //   .select("initiated_at req_id ho_approve_by ho_approve_at")
  //   .populate({ path: "ho_approve_by", select: "point_of_contact.name" })
  //   .populate({
  //     path: "req_id",
  //     select: "reqNo product.name product.schemeId",
  //     match: {
  //      ...(commodityName.length && {
  //       "product.name": { $in: commodityName.map(name => new RegExp(name, "i")) },
  //     }),
  //      ...(schemeIds.length && {
  //         "product.schemeId": { $in: schemeIds },
  //       }),
  //    ...(sessionName.length && {
  //         "product.season": { $in: sessionName.map(name => new RegExp(name, "i")) },
  //       }),
  //   },
  //   populate: {
  //     path: "batch_id",
  //     select: "seller_id",
  //     populate: {
  //       path: "seller_id",
  //       select: "address.registered.state",
  //       ...(stateName.length && {
  //         match: {
  //           "address.registered.state": {
  //               $in: stateName.map(name => new RegExp(name, "i")),
  //           },
  //         },
  //       }),
  //     },
  //   },
  // })
  //   .sort({ createdAt: -1 });

  const paymentDetails = await Payment.find(filter)
    .select("initiated_at req_id ho_approve_by ho_approve_at batch_id")
    .populate({ path: "ho_approve_by", select: "point_of_contact.name" })
    .populate({
      path: "req_id",
      select: "reqNo product.name product.schemeId product.season",
      match: {
        ...(commodityName.length && {
          "product.name": { $in: commodityName.map(name => new RegExp(name, "i")) },
        }),
        ...(schemeIds.length && {
          "product.schemeId": { $in: schemeIds },
        }),
        ...(sessionName.length && {
          "product.season": { $in: sessionName.map(name => new RegExp(name, "i")) },
        }),
      },
    })
    .populate({
      path: "batch_id",
      select: "seller_id",
      populate: {
        path: "seller_id",
        select: "address.registered.state",
        match: stateName.length
          ? {
            "address.registered.state": {
              $in: stateName.map(name => new RegExp(name, "i")),
            },
          }
          : undefined,
      },
    })

    .sort({ createdAt: -1 });
  // .populate({ path: "req_id", select: "reqNo" })
  // .sort({ createdAt: -1 })
  // .skip(skip)
  // .limit(limit);
  const filteredPayments = paymentDetails.filter(p => p.req_id);

  // Pagination manually
  const paginated = filteredPayments.slice(skip, skip + limit);

  // const totalCount = await Payment.countDocuments({ ho_id: req.portalId });

  return sendResponse({
    res,
    status: 200,
    message: _query.get("PaymentActivity"),
    data: {
      paymentDetails: paginated,
      totalCount: filteredPayments.length,
      pages: Math.ceil(filteredPayments.length / limit),
      limit: limit,
      page: page,
    },
  });
});

module.exports.satewiseProcurement = asyncErrorHandler(async (req, res) => {
  try {
    const hoId = new mongoose.Types.ObjectId(req.portalId);
    const { user_id, portalId } = req;
    let { commodityName = [],
      schemeName = [],
      sessionName = [], dateRange } = req.query;

    if (typeof commodityName === "string") commodityName = commodityName.split(',').map(s => s.trim());
    if (typeof schemeName === "string") schemeName = schemeName.split(',').map(s => s.trim());
    if (typeof sessionName === "string") sessionName = sessionName.split(',').map(s => s.trim());

    if (!Array.isArray(commodityName)) commodityName = [commodityName];
    if (!Array.isArray(schemeName)) schemeName = [schemeName];
    if (!Array.isArray(sessionName)) sessionName = [sessionName];

    // Step 1: Fetch all states from the only StateDistrictCity document
    const stateContainer = await StateDistrictCity.findOne().lean();

    if (!stateContainer || !Array.isArray(stateContainer.states)) {
      return sendResponse({
        res,
        status: 500,
        message: "State data not configured properly",
      });
    }

    // Step 2: Create a state lookup map by _id
    const stateMap = {};
    for (const state of stateContainer.states) {
      stateMap[state._id.toString()] = state.state_title;
    }
    let schemeIds = [];
    if (schemeName.length) {
      const schemes = await Scheme.find({
        schemeName: { $in: schemeName.map(name => new RegExp(name, "i")) }
      }).select("_id").lean();
      schemeIds = schemes.map(s => s._id);
    }


    const paymentFilter = {
      ho_id: { $in: [user_id, portalId] },
      payment_status: _paymentstatus.completed,
    };

    // Step 5: Add date range filter
    if (dateRange) {
      const { startDate, endDate } = parseDateRange(dateRange); // You must have this helper function defined
      paymentFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    // Step 3: Fetch payments and populate farmer (only getting state_id in address)
    const payments = await Payment.find(paymentFilter)
      .select("qtyProcured farmer_id")
      .populate({
        path: "farmer_id",
        select: "address.state_id",
      })
      .populate({
        path: "req_id",
        select: "product.name product.schemeId",
        match: {
          ...(commodityName.length && {
            "product.name": { $in: commodityName.map(name => new RegExp(name, "i")) },
          }),
          ...(schemeIds.length && {
            "product.schemeId": { $in: schemeIds },
          }),
          ...(sessionName.length && {
            "product.season": { $in: sessionName.map(name => new RegExp(name, "i")) },
          }),
        },
      })
      .lean();

    // Step 4: Group by state_id and sum qtyProcured
    const statewiseTotals = {};

    for (const payment of payments) {
      const stateId = payment?.farmer_id?.address?.state_id?.toString();

      if (!stateId || !stateMap[stateId]) continue; // skip if invalid

      const qty = Number(payment.qtyProcured) || 0; // 👈 convert to number safely

      if (!statewiseTotals[stateId]) {
        statewiseTotals[stateId] = {
          state_id: stateId,
          state_name: stateMap[stateId],
          totalQtyProcured: 0,
        };
      }

      // statewiseTotals[stateId].totalQtyProcured += payment.qtyProcured || 0;
      statewiseTotals[stateId].totalQtyProcured += qty;
    }

    // const result = Object.values(statewiseTotals);

    // Step 5: Convert to array and calculate grand total
    const result = Object.values(statewiseTotals);

    const grandTotalQtyProcured = result.reduce(
      (sum, item) => sum + item.totalQtyProcured,
      0
    );

    return sendResponse({
      res,
      status: 200,
      message: _query.get("satewise Procurement List"),
      // data: result,
      data: {
        states: result,
        // grandTotalQtyProcured: Math.round(grandTotalQtyProcured * 100) / 100,
        grandTotalQtyProcured: grandTotalQtyProcured,
      },
    });
  } catch (error) {
    console.error("Error in satewiseProcurement:", error);
    return sendResponse({
      res,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});
module.exports.stateWiseCommodityDetail = asyncErrorHandler(async (req, res) => {
  try {
    // STEP 1: STATE MAP
    const stateDoc = await StateDistrictCity.findOne().lean();
    if (!stateDoc || !Array.isArray(stateDoc.states)) {
      return sendResponse({
        res,
        status: 500,
        message: "StateDistrictCity not configured properly",
      });
    }

    const stateMap = {};
    for (const state of stateDoc.states) {
      stateMap[state._id.toString()] = state.state_title;
    }

    // STEP 2: AGGREGATION
    const result = await Crop.aggregate([
      // JOIN FARMER (PROJECT ONLY NEEDED FIELDS)
      {
        $lookup: {
          from: "farmers",
          localField: "farmer_id",
          foreignField: "_id",
          as: "farmer",
          pipeline: [
            { $project: { _id: 1, associate_id: 1, address: 1 } }
          ]
        }
      },
      { $unwind: "$farmer" },

      // JOIN ASSOCIATE (PROJECT ONLY NEEDED FIELDS)
      {
        $lookup: {
          from: "users",
          localField: "farmer.associate_id",
          foreignField: "_id",
          as: "associate",
          pipeline: [
            {
              $project: {
                _id: 1,
                associate_type: 1,
                "basic_details.associate_details.associate_type": 1
              }
            }
          ]
        }
      },
      { $unwind: { path: "$associate", preserveNullAndEmptyArrays: true } },

      // ADD associate_type
      {
        $addFields: {
          associate_type: {
            $ifNull: [
              "$associate.basic_details.associate_details.associate_type",
              "$associate.associate_type"
            ]
          }
        }
      },

      // JOIN PAYMENTS (WITHOUT $expr)
      {
        $lookup: {
          from: "payments",
          localField: "farmer._id",
          foreignField: "farmer_id",
          as: "completedPaymentsRaw"
        }
      },
      {
        $addFields: {
          completedPayments: {
            $filter: {
              input: "$completedPaymentsRaw",
              as: "p",
              cond: { $eq: ["$$p.payment_status", "Completed"] }
            }
          }
        }
      },
      {
        $project: {
          completedPaymentsRaw: 0
        }
      },

      // GROUP BY STATE + CROP
      {
        $group: {
          _id: {
            state_id: "$farmer.address.state_id",
            crop_name: "$crop_name",
          },
          uniqueFarmerIds: { $addToSet: "$farmer._id" },
          fpoOrPacsAssociates: {
            $addToSet: {
              $cond: [
                { $in: ["$associate_type", ["PACS", "FPO"]] },
                "$associate._id",
                "$$REMOVE"
              ]
            }
          },
          benefitedFarmerIds: {
            $addToSet: {
              $cond: [
                { $gt: [{ $size: "$completedPayments" }, 0] },
                "$farmer._id",
                "$$REMOVE"
              ]
            }
          },
          totalQtyProcured: {
            $sum: {
              $reduce: {
                input: "$completedPayments",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $ifNull: [
                        { $toDouble: "$$this.qtyProcured" },
                        0
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      },

      // FINAL PROJECT
      {
        $project: {
          state_id: "$_id.state_id",
          crop_name: "$_id.crop_name",
          totalFarmers: { $size: "$uniqueFarmerIds" },
          totalAssociates: { $size: "$fpoOrPacsAssociates" },
          totalBenefitedFarmers: { $size: "$benefitedFarmerIds" },
          totalQuantityPurchased: "$totalQtyProcured"
        }
      }
    ]);

    // STEP 3: GROUP STATE → CROPS[]
    const stateWiseData = {};

    for (const item of result) {
      const stateId = item.state_id?.toString();
      if (!stateId || !item.crop_name) continue;

      if (!stateWiseData[stateId]) {
        stateWiseData[stateId] = {
          state_id: stateId,
          state_name: stateMap[stateId] || "Unknown",
          crops: [],
        };
      }

      stateWiseData[stateId].crops.push({
        crop_name: item.crop_name,
        totalFarmers: item.totalFarmers,
        totalAssociates: item.totalAssociates,
        totalBenefitedFarmers: item.totalBenefitedFarmers,
        totalQuantityPurchased: item.totalQuantityPurchased,
      });
    }

    const finalResult = Object.values(stateWiseData);

    return sendResponse({
      res,
      status: 200,
      message: "State-wise commodity farmer + associate count fetched successfully",
      data: finalResult,
    });

  } catch (error) {
    console.error("Error in stateCommodityFarmerCount:", error);
    return sendResponse({
      res,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


// module.exports.getStateWiseCommodityStats = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const data = await User.aggregate([
//       {
//         $lookup: {
//           from: 'associateoffers',
//           localField: '_id',
//           foreignField: 'seller_id',
//           as: 'offers'
//         }
//       },
//       { $unwind: '$offers' },

//       {
//         $lookup: {
//           from: 'requests',
//           localField: 'offers.req_id',
//           foreignField: '_id',
//           as: 'request'
//         }
//       },
//       { $unwind: '$request' },
//       {
//         $lookup: {
//           from: 'commodities',
//           localField: 'request.product.commodity_id',
//           foreignField: '_id',
//           as: 'commodity'
//         }
//       },
//       { $unwind: '$commodity' },

//       {
//         $lookup: {
//           from: 'farmerorders',
//           localField: 'offers._id',
//           foreignField: 'associateOffers_id',
//           as: 'farmerOrders'
//         }
//       },
//       { $unwind: { path: '$farmerOrders', preserveNullAndEmptyArrays: true } },

//       {
//         $lookup: {
//           from: 'farmers',
//           localField: 'farmerOrders.farmer_id',
//           foreignField: '_id',
//           as: 'farmerInfo'
//         }
//       },
//       { $unwind: { path: '$farmerInfo', preserveNullAndEmptyArrays: true } },

//       {
//         $addFields: {
//           farmerId: '$farmerOrders.farmer_id',
//           associateId: '$farmerInfo.associate_id',
//           offeredQty: '$farmerOrders.offeredQty'
//         }
//       },

//       {
//         $group: {
//           _id: {
//             state: '$address.registered.state',
//             commodityId: '$commodity._id',
//             commodityName: '$commodity.name'
//           },
//           totalOffers: { $sum: 1 },
//           uniqueFarmers: { $addToSet: '$_id' },
//           totalQtyPurchased: { $sum: '$offeredQty' },
//           allBenefittedFarmers: { $addToSet: '$farmerId' },
//           allRegisteredPacs: { $addToSet: '$associateId' }
//         }
//       },
//       {
//         $lookup: {
//           from: 'statedistrictcities',
//           localField: '_id.state',
//           foreignField: 'states.state_title',
//           as: 'stateInfo',
//         }
//       },
//       {
//         $project: {
//           state: '$_id.state',
//            'stateInfo.states':1,
//           commodity: {
//             _id: '$_id.commodityId',
//             name: '$_id.commodityName',
//             quantityPurchased: { $ifNull: ['$totalQtyPurchased', 0] },
//             farmersBenefitted: {
//               $size: { $setUnion: ['$allBenefittedFarmers', []] }
//             },
//             registeredPacs: {
//               $size: { $setUnion: ['$allRegisteredPacs', []] }
//             }
//           },
//           _id: 0
//         }
//       },

//       {
//         $group: {
//           _id: '$state',
//           stateInfo: { $first: '$stateInfo' },
//           commodities: { $push: '$commodity' }
//         }
//       },

//       {
//         $project: {
//           state: '$_id',
//           stateInfo: '$stateInfo',
//           commodities: 1,
//           _id: 0
//         }
//       },

//       { $sort: { state: 1 } },

//       // Pagination using $facet
//       {
//         $facet: {
//           metadata: [{ $count: "total" }],
//           data: [{ $skip: skip }, { $limit: limit }]
//         }
//       },

//       // Format final result
//       {
//         $unwind: "$metadata"
//       },
//       {
//         $project: {
//           total: "$metadata.total",
//           page: { $literal: page },
//           data: 1
//         }
//       }
//     ]);
//     data[0].status = 200;
//     data[0].message = _query.get("State Wise Commodity Stats");
//     data[0].data = data[0]?.data || [];
//     data[0].total = data[0]?.total || 0;
//     data[0].page = page;
//     data[0].limit = limit;

//     res.status(200).json(data[0] );
//   } catch (err) {
//     console.error('Error generating stats:', err);
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };
module.exports.getStateWiseCommodityStats = async (req, res) => {
  try {
    const { state = "", commodityId = null } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const matchConditions = {};
    if (state) matchConditions["address.registered.state"] = state;

    const pipeline = [
      { $match: matchConditions },

      {
        $lookup: {
          from: "associateoffers",
          localField: "_id",
          foreignField: "seller_id",
          as: "offers"
        }
      },
      { $unwind: "$offers" },

      {
        $lookup: {
          from: "requests",
          let: { reqId: "$offers.req_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$reqId"] } } },
            ...(commodityId ? [{
              $match: {
                "product.commodity_id": new mongoose.Types.ObjectId(commodityId)
              }
            }] : [])
          ],
          as: "request"
        }
      },
      { $unwind: "$request" },

      {
        $lookup: {
          from: "commodities",
          localField: "request.product.commodity_id",
          foreignField: "_id",
          as: "commodity"
        }
      },
      { $unwind: "$commodity" },

      {
        $lookup: {
          from: "farmerorders",
          localField: "offers._id",
          foreignField: "associateOffers_id",
          as: "farmerOrders"
        }
      },
      { $unwind: { path: "$farmerOrders", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "farmers",
          localField: "farmerOrders.farmer_id",
          foreignField: "_id",
          as: "farmerInfo"
        }
      },
      { $unwind: { path: "$farmerInfo", preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          farmerId: "$farmerOrders.farmer_id",
          associateId: "$farmerInfo.associate_id",
          offeredQty: "$farmerOrders.offeredQty"
        }
      },

      {
        $group: {
          _id: {
            state: "$address.registered.state",
            commodityId: "$commodity._id",
            commodityName: "$commodity.name"
          },
          totalOffers: { $sum: 1 },
          uniqueFarmers: { $addToSet: "$_id" },
          totalQtyPurchased: { $sum: "$offeredQty" },
          allBenefittedFarmers: { $addToSet: "$farmerId" },
          allRegisteredPacs: { $addToSet: "$associateId" }
        }
      },

      {
        $lookup: {
          from: "statedistrictcities",
          let: { stateName: "$_id.state" },
          pipeline: [
            { $unwind: "$states" },
            {
              $match: {
                $expr: {
                  $eq: ["$states.state_title", "$$stateName"]
                }
              }
            },
            {
              $lookup: {
                from: "farmers",
                let: { stateId: "$states._id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$address.state_id", "$$stateId"] }
                    }
                  },
                  {
                    $group: {
                      _id: null,
                      totalFarmers: { $sum: 1 }
                    }
                  },
                  {
                    $project: {
                      _id: 0,
                      totalFarmers: 1
                    }
                  }
                ],
                as: "farmersCount"
              }
            },
            {
              $project: {
                _id: "$states._id",
                state_title: "$states.state_title",
                totalFarmers: { $arrayElemAt: ["$farmersCount.totalFarmers", 0] }
              }
            }
          ],
          as: "stateInfo"
        }
      },
      { $unwind: { path: "$stateInfo", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          state: "$_id.state",
          commodity: {
            _id: "$_id.commodityId",
            name: "$_id.commodityName",
            quantityPurchased: { $ifNull: ["$totalQtyPurchased", 0] },
            farmersBenefitted: {
              $size: { $setUnion: ["$allBenefittedFarmers", []] }
            },
            registeredPacs: {
              $size: { $setUnion: ["$allRegisteredPacs", []] }
            },
            farmersRegistered: "$stateInfo.totalFarmers"
          },
          _id: 0
        }
      },

      {
        $group: {
          _id: "$state",
          commodities: { $push: "$commodity" }
        }
      },

      {
        $project: {
          state: "$_id",
          commodities: 1,
          _id: 0
        }
      },

      { $sort: { state: 1 } },

      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      },

      { $unwind: "$metadata" },

      {
        $project: {
          total: "$metadata.total",
          page: { $literal: page },
          data: 1
        }
      }
    ];

    const data = await User.aggregate(pipeline);

    res.status(200).send({
      status: 200,
      message: _query.get("State Wise Commodity Stats"),
      data: {
        page,
        limit,
        pages: Math.ceil(data[0]?.total / limit) || 1,
        rows: data[0]?.data || [],
        total: data[0]?.total || 0
      }
    });

  } catch (err) {
    console.error("Error generating stats:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};






// module.exports.getStateWiseCommodityStats = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const users = await User.find({}).lean();
//     const userIds = users.map(u => u._id);
//     const offers = await AssociateOffers.find({ seller_id: { $in: userIds } }).lean();
//     const reqIds = offers.map(o => o.req_id);
//     const requests = await RequestModel.find({ _id: { $in: reqIds } }).lean();
//     const commodityIds = requests.map(r => r.product.commodity_id);
//     const commodities = await Commodity.find({ _id: { $in: commodityIds } }).lean();
//     const offerIds = offers.map(o => o._id);
//     const farmerOrders = await FarmerOrders.find({ associateOffers_id: { $in: offerIds } }).lean();
//     const farmerIds = farmerOrders.map(f => f.farmer_id);
//     const farmers = await farmer.find({ _id: { $in: farmerIds } }).lean();

//     const userMap = new Map(users.map(u => [u._id.toString(), u]));
//     const offerMap = new Map(offers.map(o => [o._id.toString(), o]));
//     const requestMap = new Map(requests.map(r => [r._id.toString(), r]));
//     const commodityMap = new Map(commodities.map(c => [c._id.toString(), c]));
//     const farmerMap = new Map(farmers.map(f => [f._id.toString(), f]));

//     const stats = {};
//     const stateFarmersMap = {}; // For total farmers per state

//     farmerOrders.forEach(fOrder => {
//       const offer = offerMap.get(fOrder.associateOffers_id.toString());
//       if (!offer) return;

//       const seller = userMap.get(offer.seller_id.toString());
//       if (!seller) return;

//       const request = requestMap.get(offer.req_id.toString());
//       if (!request) return;

//       const commodity = commodityMap.get(request.product.commodity_id.toString());
//       if (!commodity) return;

//       const farmer = farmerMap.get(fOrder.farmer_id?.toString());

//       const state = seller.address?.registered?.state || 'Unknown';

//       if (!stats[state]) stats[state] = {};
//       if (!stateFarmersMap[state]) stateFarmersMap[state] = new Set();

//       const cId = commodity._id.toString();

//       if (!stats[state][cId]) {
//         stats[state][cId] = {
//           commodityId: commodity._id,
//           commodityName: commodity.name,
//           totalOffers: 0,
//           uniqueFarmers: new Set(),
//           totalQtyPurchased: 0,
//           registeredPacs: new Set()
//         };
//       }

//       stats[state][cId].totalOffers += 1;
//       if (farmer) {
//         stats[state][cId].uniqueFarmers.add(farmer._id.toString());
//         stateFarmersMap[state].add(farmer._id.toString());
//         if (farmer.associate_id) stats[state][cId].registeredPacs.add(farmer.associate_id.toString());
//       }
//       stats[state][cId].totalQtyPurchased += fOrder.offeredQty || 0;
//     });

//     let results = Object.entries(stats).map(([stateName, commoditiesObj]) => {
//       const commoditiesArr = Object.values(commoditiesObj).map(c => ({
//         _id: c.commodityId,
//         name: c.commodityName,
//         quantityPurchased: c.totalQtyPurchased,
//         farmersBenefitted: c.uniqueFarmers.size,
//         registeredPacs: c.registeredPacs.size
//       }));

//       return {
//         state: stateName,
//         totalFarmersInState: stateFarmersMap[stateName]?.size || 0,
//         commodities: commoditiesArr
//       };
//     });

//     results.sort((a, b) => a.state.localeCompare(b.state));

//     const total = results.length;
//     const paginatedData = results.slice(skip, skip + limit);

//     res.status(200).json({
//       total,
//       page,
//       limit,
//       data: paginatedData
//     });

//   } catch (err) {
//     console.error('Error generating stats:', err);
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };









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
      amount: 0,
      total_qty: 0
    },

    {
      state: "Arunachal Pradesh",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Assam",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Bihar",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Chhattisgarh",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Goa",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Gujarat",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Haryana",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Himachal Pradesh",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Jharkhand",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      name: "Karnataka",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Kerala",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Madhya Pradesh",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Maharashtra",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Manipur",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Meghalaya",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Mizoram",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Nagaland",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Odisha",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Punjab",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      name: "Rajasthan",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Sikkim",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Tamil Nadu",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Telangana",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Tripura",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Uttar Pradesh",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Uttarakhand",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "West Bengal",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Andaman and Nicobar Islands",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Chandigarh",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Dadra and Nagar Haveli and Daman and Diu",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Lakshadweep",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Delhi",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Puducherry",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Ladakh",
      qty: 0,
      amount: 0,
      total_qty: 0
    },
    {
      state: "Jammu and Kashmir",
      qty: 0,
      amount: 0,
      total_qty: 0
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
  data = data.map(item => {
    let stateDetails = branchOfficeProc.find(item2 => item2.state == item.state);

    if (stateDetails) {
      return { ...stateDetails }
    } else {
      return { ...item }
    }
  })

  return sendResponse({
    res,
    status: 200,
    message: _query.get("BranchOfficeProcurement"),
    data: { branchOfficeProc: data, totalProcuredQty },
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
module.exports.getcommodity = asyncErrorHandler(async (req, res) => {
  const hoId = new mongoose.Types.ObjectId(req.user.portalId);
  console.log("hoid", hoId)
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Commodity name is required in query parameter"
    });
  }

  const filteredRequests = await RequestModel.find({
    head_office_id: hoId,
    "product.name": { $regex: new RegExp(name, "i") }
  })
    .select("product.name product.grade product.quantity product.commodityImage status expectedProcurementDate deliveryDate")
    .lean();

  res.status(200).json({
    success: true,
    data: filteredRequests
  });
});

module.exports.getAssignedSchemes = asyncErrorHandler(async (req, res) => {
  const hoId = new mongoose.Types.ObjectId(req.user.portalId);
  console.log("hoId", hoId)
  const { schemeName } = req.query;

  const assignedSchemes = await SchemeAssign.find({ ho_id: hoId })
    .populate({
      path: 'scheme_id',
      model: _collectionName.Scheme,
      // match: schemeName
      //   ? {
      //       schemeName: new RegExp("^" + schemeName.trim(), "i"),
      //     }
      // : {},
    })
    .lean();

  const filtered = assignedSchemes.filter(item => item.scheme_id !== null);

  res.status(200).json({
    success: true,
    data: filtered,
  });
});


// getFarmersCount
async function getFarmersCount({
  commodity = [],
  state = [],
  season = [],
  scheme = [],
  start_date,
  end_date
}) {
  let farmersCount = 0;
  let associateCount = 0;
  let distillerCount = 0;

  if (commodity.length || season.length || scheme.length || state.length) {
    let filter = {};
     let dateFilter = {};

    if (start_date instanceof Date && end_date instanceof Date) {
      dateFilter.createdAt = { $gte: start_date, $lte: end_date };
    }

    if (Array.isArray(commodity) && commodity.length > 0) {
      filter['product.name'] = {
        $in: commodity.map(c => new RegExp(c, 'i')),
      };
    }

    // Season filter
    if (Array.isArray(season) && season.length > 0) {
      // Convert season values to case-insensitive regex patterns
      const seasonRegexes = season.map(s => new RegExp(s, 'i'));

      // Step 1: Find Scheme IDs matching the desired seasons
      const matchingSchemes = await Scheme.find(
        { season: { $in: seasonRegexes } },
        { _id: 1 }
      ).lean();

      const matchingSchemeIds = matchingSchemes.map(s => s._id);

      // Step 2: Construct $or condition for both direct and indirect matches
      filter.$or = [
        { 'product.season': { $in: seasonRegexes } },
        { 'product.schemeId': { $in: matchingSchemeIds } },
      ];
    }

    if (Array.isArray(scheme) && scheme.length > 0) {
      filter['product.schemeId'] = { $in: scheme };
    }

    const requestObj = await RequestModel.find(filter, { _id: 1 }).lean();
    // console.log(requestObj);
    if (!requestObj.length)
      return { farmersCount, associateCount, distillerCount };

    const requestIds = requestObj.map(el => el._id);

    const paymentObj = await Payment.find(
      { req_id: { $in: requestIds } },
      { farmer_id: 1, associate_id: 1 }
    ).lean();

    if (state.length) {
      let farmersIds = new Set(paymentObj.map(el => String(el.farmer_id)));
      let associateIds = new Set(paymentObj.map(el => String(el.associate_id)));

      const stateRegex = state.map(s => new RegExp(s, 'i')); // case-insensitive exact match

      const filteredAssociates = await User.find(
        {
          _id: {
            $in: Array.from(associateIds).map(
              id => new mongoose.Types.ObjectId(id)
            ),
          },
          'address.registered.state': { $in: stateRegex },
        },
        { _id: 1 }
      ).lean();

      associateCount = new Set(filteredAssociates.map(user => String(user._id)))
        .size;

      const matchingAssociates = await User.find(
        { 'address.registered.state': { $in: stateRegex }, ...dateFilter },
        { _id: 1 }
      ).lean();

      const matchingAssociateIds = new Set(
        matchingAssociates.map(u => String(u._id))
      );

      //  Get farmers whose _id is in farmersIds and associate_id is in matchingAssociateIds
      const filteredFarmers = await farmer
        .find(
          {
            _id: {
              $in: Array.from(farmersIds).map(
                id => new mongoose.Types.ObjectId(id)
              ),
            },
            associate_id: {
              $in: Array.from(matchingAssociateIds).map(
                id => new mongoose.Types.ObjectId(id)
              ),
            },
            ...dateFilter,
          },
          { _id: 1 }
        )
        .lean();

      farmersCount = new Set(filteredFarmers.map(f => String(f._id))).size;

      // ✅ DISTILLER COUNT based on commodity and/or state
      const commodityRegex = commodity.map(c => new RegExp(c, 'i'));

      let distillerFilter = { is_approved: _userStatus.approved, ...dateFilter };

      let poDistillerIds = [];

      if (commodity.length) {
        poDistillerIds = await PurchaseOrderModel.distinct('distiller_id', {
          'product.name': { $in: commodityRegex },
        });
        if (poDistillerIds.length === 0) {
          distillerCount = 0; // no matching distillers if no POs found
        } else {
          distillerFilter._id = {
            $in: poDistillerIds.map(id => new mongoose.Types.ObjectId(id)),
          };
        }
      }

      if (state.length) {
        distillerFilter['address.registered.state'] = { $in: stateRegex };
      }

      if (!commodity.length && !state.length) {
        distillerCount = await Distiller.countDocuments(distillerFilter);
      } else {
        const stateDistillerDocs = await Distiller.find(distillerFilter, {
          _id: 1,
        }).lean();
        distillerCount = new Set(stateDistillerDocs.map(d => String(d._id)))
          .size;
      }
    } else {
      farmersCount = new Set(paymentObj.map(el => String(el.farmer_id))).size;
      associateCount = new Set(paymentObj.map(el => String(el.associate_id)))
        .size;

      // DISTILLER COUNT only by commodity (no state filter)
      if (commodity.length) {
        const commodityRegex = commodity.map(c => new RegExp(c, 'i'));

        const poDistillerIds = await PurchaseOrderModel.distinct(
          'distiller_id',
          {
            'product.name': { $in: commodityRegex },
          }
        );

        distillerCount = new Set(poDistillerIds.map(id => String(id))).size;
      }
    }
  } else {
    farmersCount = await farmer.countDocuments({});
    associateCount = await User.countDocuments({
      user_type: _userType.associate,
      is_approved: _userStatus.approved,
      is_form_submitted: true,
    });
    distillerCount = await Distiller.countDocuments({
      is_approved: _userStatus.approved,
    });
  }
  //console.log({ farmersCount, associateCount, distillerCount });

  return { farmersCount, associateCount, distillerCount };
}

async function getBenifittedFarmers({
  hoId,
  commodity = [],
  state = [],
  season = [],
  scheme = [],
  start_date,
  end_date
}) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  let dateFilter = {};

    if (start_date instanceof Date && end_date instanceof Date) {
      dateFilter.createdAt = { $gte: start_date, $lte: end_date };
    }

  const pipeline = [
    {
      $match: {
        payment_status: _paymentstatus.completed, 
        ho_id: hoId,
        ...dateFilter
      },
    },
    {
      $lookup: {
        from: 'requests',
        localField: 'req_id',
        foreignField: '_id',
        as: 'request',
        pipeline: [
          {
            $project: {
              _id: 1,
              product: { name: 1, season: 1, schemeId: 1 },
            },
          },
        ],
      },
    },
    { $unwind: '$request' },
    {
      $lookup: {
        from: 'schemes',
        localField: 'request.product.schemeId',
        foreignField: '_id',
        as: 'scheme',
        pipeline: [
          {
            $project: {
              _id: 1,
              season: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$scheme',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'farmers',
        localField: 'farmer_id',
        foreignField: '_id',
        as: 'farmer',
        pipeline: [
          {
            $project: {
              _id: 1,
              associate_id: 1,
            },
          },
        ],
      },
    },
     { $unwind: '$farmer' },
    {
      $lookup: {
        from: 'users',
        localField: 'farmer.associate_id',
        foreignField: '_id',
        as: 'associate',
        pipeline: [
          {
            $project: {
              _id: 1,
              'address.registered.state': 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$associate',
        preserveNullAndEmptyArrays: true,
      },
    },
     // 6. Now apply all filters together
    {
      $match: {
        ...(commodity.length > 0 && {
          'request.product.name': { $in: commodity.map(c => new RegExp(c, 'i')) }
        }),
        ...(season.length > 0 && {
          $or: [
            { 'request.product.season': { $in: season.map(s => new RegExp(s, 'i')) } },
            { 'scheme.season': { $in: season.map(s => new RegExp(s, 'i')) } }
          ]
        }),
        ...(scheme.length > 0 && {
          'request.product.schemeId': { $in: scheme.map(id => new mongoose.Types.ObjectId(id)) }
        }),
        ...(state.length > 0 && {
          'associate.address.registered.state': { $in: state.map(s => new RegExp(s, 'i')) }
        }),
      }
    },
    {
      $addFields: {
        qty: {
          $cond: [
            { $ifNull: ['$qtyProcured', false] },
            {
              $convert: {
                input: '$qtyProcured',
                to: 'double',
                onError: 0,
                onNull: 0,
              },
            },
            0,
          ],
        },
        todaysQty: {
          $cond: [
            { $gte: ['$createdAt', startOfToday] },
            {
              $convert: {
                input: '$qtyProcured',
                to: 'double',
                onError: 0,
                onNull: 0,
              },
            },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        benifittedFarmers: { $addToSet: '$farmer_id' },
        totalProcurement: { $sum: '$qty' },
        totalPaymentInitiated: { $sum: '$amount' },
        todaysQtyProcured: { $sum: '$todaysQty' },
      },
    },
    {
      $project: {
        _id: 0,
        benifittedFarmersCount: { $size: '$benifittedFarmers' },
        totalProcurement: 1,
        totalPaymentInitiated: 1,
        todaysQtyProcured: 1,
      },
    },
  ];
  const result = await Payment.aggregate(pipeline);
//console.log('>>>>>>>>>>>>>>>>',result)
  if (result.length > 0) {
    return result[0];
  }

  return {
    benifittedFarmersCount: 0,
    totalProcurement: 0,
    totalPaymentInitiated: 0,
    todaysQtyProcured: 0,
  };
}

async function getBOWarehouseCount({
  hoId,
  commodity = [],
  state = [],
  season = [],
  scheme = [],
  start_date,
  end_date,
}) {
  try {
    // Build the match criteria based on provided filters
    const matchCriteria = {
      head_office_id: hoId,
    };
    let dateFilter = {};

    if (start_date instanceof Date && end_date instanceof Date) {
      dateFilter.createdAt = { $gte: start_date, $lte: end_date };
    }

    if (commodity.length) {
      matchCriteria['product.name'] = {
        $in: commodity.map(c => new RegExp(c, 'i')),
      };
    }

    if (season.length) {
      matchCriteria['product.season'] = {
        $in: season.map(s => new RegExp(s, 'i')),
      };
    }

    if (scheme.length) {
      matchCriteria['product.schemeId'] = {
        $in: scheme.map(id => new mongoose.Types.ObjectId(id)),
      };
    }
    // console.log('>>>>>>>>>>>>>>>>>>', matchCriteria);
    // Aggregate to get unique branch and warehouse IDs from requests
    const aggregationPipeline = [
      { $match: matchCriteria },
      {
        $group: {
          _id: null,
          branchIds: { $addToSet: '$branch_id' },
          warehouseIds: { $addToSet: '$warehouse_id' },
        },
      },
    ];

    const aggregationResult = await RequestModel.aggregate(aggregationPipeline);

    if (!aggregationResult.length) {
      return { branchOfficeCount: 0, wareHouseCount: 0 };
    }

    const { branchIds, warehouseIds } = aggregationResult[0];
    //console.log({ branchIds, warehouseIds });

    // Build state filter if provided
    const stateFilter = state.length
      ? { state: { $in: state.map(s => new RegExp(s, 'i')) } }
      : {};

    // Count unique branches matching the state filter
    const branchOfficeCount = await Branches.countDocuments({
      status: 'active',
      _id: { $in: branchIds },
      ...stateFilter,
      ...dateFilter,
    });

    // // Count unique warehouses matching the state filter
    // const wareHouseCount = await wareHouseDetails.countDocuments({
    //   active: true,
    //   _id: { $in: warehouseIds },
    //    'addressDetails.state.state_name': {
    //     $in: state.map((s) => new RegExp(`^${s}$`, 'i')),
    //   },
    // });

    // Construct the state filter only if the state array is not empty
    const WRstateFilter = state.length
      ? {
          'addressDetails.state.state_name': {
            $in: state.map(s => new RegExp(s, 'i')),
          },
        }
      : {};

    // Count unique warehouses matching the state filter
    const wareHouseCount = await wareHouseDetails.countDocuments({
      active: true,
      // _id: { $in: warehouseIds },
      ...WRstateFilter,
      ...dateFilter,
    });

    //console.log( { branchOfficeCount, wareHouseCount })
    return { branchOfficeCount, wareHouseCount };
  } catch (error) {
    console.error('Error in getBOWarehouseCount:', error);
    return { branchOfficeCount: 0, wareHouseCount: 0 };
  }
}
