const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { AgristackLog } = require("@src/v1/models/app/farmerDetails/AgristackLogs");

module.exports.postSeekData = async (req, res) => {
  try {
    const data = req.body;
    await AgristackLog.create({ responseData: data });
    return res.status(200).send({ success: true, message: "OK"} );
  } catch (err) {
    _handleCatchErrors(err, res);
  }
}


module.exports.findStateById = async (req, res) =>  {
    const {input_id} = req.query;
  try {
    // Fetch the document (only one is expected)
    const data = await StateDistrictCity.findOne({}, { states: 1 }).lean();

    if (!data) {
      return null; 
    }

    // Find the state with the given _id
    const state = data.states.find(state => state._id.toString() === input_id.toString());

    return  res.json( { success: true,  message: "OK", data: { state: state?.state_title }});
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};
