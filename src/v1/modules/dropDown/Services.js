const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const { thirdPartyGetApi } = require("@src/v1/utils/helpers/third_party_Api");
const { default: mongoose } = require("mongoose");


async function getAddressByPincode({ pincode }) {
  try {
    const url = `https://api.postalpincode.in/pincode/${pincode}`;
    const records = await thirdPartyGetApi(url, {});

    return records;
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }
}

// Returns an array of { _id, state_title }
async function getAllStates() {
  try {
    // Assuming only one document holds all states
    const doc = await StateDistrictCity.findOne({}, { states: 1 }).lean();

    if (!doc || !doc.states) return [];

    return doc.states.map(({ _id, state_title }) => ({ _id, state_title }));
  } catch (err) {
    console.log(err);
    throw new Error();
  }
}

async function getDistrictsByStateId(stateId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(stateId)) {
      throw new Error("Invalid stateId");
    }

    const result = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      { $match: { "states._id": new mongoose.Types.ObjectId(stateId) } },
      { $unwind: "$states.districts" },
      {
        $project: {
          _id: "$states.districts._id",
          district_title: "$states.districts.district_title",
        },
      },
    ]);

    return result; // [{ _id: ..., district_title: '...' }, ...]
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
}


module.exports = {getAddressByPincode, getAllStates, getDistrictsByStateId }