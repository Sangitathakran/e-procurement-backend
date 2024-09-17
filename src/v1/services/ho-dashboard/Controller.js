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
  CollectionCenter,
} = require("@src/v1/models/app/procurement/CollectionCenter");
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
  return  sendResponse({
    res,
    status: 200,
    message: _query.get("Account"),
    data: widgetDetails,
  })
});

//payment quantity list
module.exports.paymentQuantityList = asyncErrorHandler(async (req, res) => {
  let widgetDetails = {
    branch: { total: 0, lastMonth: [] },

    associate: { total: 0, lastMonth: [] },
    procCenter: { total: 0, lastMonth: [] },
    farmer: { total: 0, lastMonth: [] },
  };
});
//locationWareHouseChart
module.exports.locationWareHouseChart = asyncErrorHandler(async (req, res) => {
  let widgetDetails = {
    branch: { total: 0, lastMonth: [] },

    associate: { total: 0, lastMonth: [] },
    procCenter: { total: 0, lastMonth: [] },
    farmer: { total: 0, lastMonth: [] },
  };
});
