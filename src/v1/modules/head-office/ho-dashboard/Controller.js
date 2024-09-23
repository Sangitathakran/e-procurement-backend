const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const {
  IndividualFarmer,
} = require("@src/v1/models/app/farmerDetails/IndividualFarmer");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { User } = require("@src/v1/models/app/auth/User");
const {
  ProcurementCenter,
} = require("@src/v1/models/app/procurement/ProcurementCenter");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
// const { Payment } = require("@src/v1/models/app/procurement");
const { _query } = require("@src/v1/utils/constants/messages");

//widget list
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
  widgetDetails.procCenter.total = await CollectionCenter.countDocuments({});
  return sendResponse({
    res,
    status: 200,
    message: _query.get("Account"),
    data: widgetDetails,
  });
});

//farmer payments
module.exports.farmerPayments = asyncErrorHandler(async (req, res) => {
  const { option } = req.query;
  const report = {
    week: [
      { week: "Monday", revenue: 0 },
      { week: "Tuesday", revenue: 0 },
      { week: "Wednesday", revenue: 0 },
      { week: "Thursday", revenue: 0 },
      { week: "Friday", revenue: 0 },
      { week: "Saturday", revenue: 0 },
      { week: "Sunday", revenue: 0 },
    ],
    month: [
      { month: "January", revenue: 0 },
      { month: "February", revenue: 0 },
      { month: "March", revenue: 0 },
      { month: "April", revenue: 0 },
      { month: "May", revenue: 0 },
      { month: "June", revenue: 0 },
      { month: "July", revenue: 0 },
      { month: "Augest", revenue: 0 },
      { month: "September", revenue: 0 },
      { month: "Octorber", revenue: 0 },
      { month: "November", revenue: 0 },
      { month: "Decmeber", revenue: 0 },
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

  const paymentDetails = await Payment.aggregate(pipeline);
    report[option].map(item=>{

    })

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
      { week: "Monday", revenue: 186, expense: 80 },
      { week: "Tuesday", revenue: 205, expense: 200 },
      { week: "Wednesday", revenue: 237, expense: 120 },
      { week: "Thursday", revenue: 73, expense: 190 },
      { week: "Friday", revenue: 209, expense: 130 },
      { week: "Saturday", revenue: 214, expense: 140 },
      { week: "Sunday", revenue: 214, expense: 140 },
    ],
    month: [
      { month: "January", revenue: 186, expense: 80 },
      { month: "February", revenue: 305, expense: 200 },
      { month: "March", revenue: 237, expense: 120 },
      { month: "April", revenue: 73, expense: 190 },
      { month: "May", revenue: 209, expense: 130 },
      { month: "June", revenue: 214, expense: 140 },
      { month: "July", revenue: 214, expense: 140 },
      { month: "Augest", revenue: 214, expense: 140 },
      { month: "September", revenue: 214, expense: 140 },
      { month: "Octorber", revenue: 214, expense: 140 },
      { month: "November", revenue: 214, expense: 140 },
      { month: "Decmeber", revenue: 214, expense: 140 },
    ],
  };
});
//locationWareHouseChart
module.exports.locationWareHouseChart = asyncErrorHandler(async (req, res) => {
  const data = [
    {
      wrId: "WR23452",
      warehouseName: "WR23452",
      district: "Berhampur",
      totalWarhouse: "12",
    },
    {
      wrId: "WR23418",
      warehouseName: "WR23418",
      district: "Bangalore",
      totalWarhouse: "05",
    },
    {
      wrId: "WR23241",
      warehouseName: "WR23241",
      district: "Rajpur Sonarpur",
      totalWarhouse: "08",
    },
    {
      wrId: "WR23563",
      warehouseName: "WR23563",
      district: "Bhalswa Jahangir Pur",
      totalWarhouse: "02",
    },
    {
      wrId: "WR23443",
      warehouseName: "WR23443",
      district: "Srinagar",
      totalWarhouse: "05",
    },
  ];
 
});
//paymentQuantityPurchase
module.exports.paymentQuantityPurchase = asyncErrorHandler(async (req, res) => {
  const data = [
    { orderId: "2766253", quantityPurchased: "1000 mt", amountPayable: "₹2,87,390" },
    { orderId: "2766253", quantityPurchased: "1000 mt", amountPayable: "₹3,47,356" },
    { orderId: "2766253", quantityPurchased: "1000 mt", amountPayable: "₹3,47,356" },
    { orderId: "2766253", quantityPurchased: "1000 mt", amountPayable: "₹3,47,356" },
    { orderId: "2766253", quantityPurchased: "1000 mt", amountPayable: "₹3,47,356" },
  ];

});
