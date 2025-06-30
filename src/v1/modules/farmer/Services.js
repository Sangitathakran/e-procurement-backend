const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const AgristackFarmerDetails = require("@src/v1/models/app/farmerDetails/src/v1/models/app/farmerDetails/AgristackFarmerDetails");
const {
  Verifyfarmer,
} = require("@src/v1/models/app/farmerDetails/verifyFarmer");
const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");
const { thirdPartyGetApi } = require("@src/v1/utils/helpers/third_party_Api");
const { default: mongoose } = require("mongoose");

async function getVerifiedAadharInfo(uidai_aadharNo, farmer_id) {
  try {
    const adharDetails = await Verifyfarmer.findOne(
      {
        "aadhaar_details.uidai_aadharNo": uidai_aadharNo,
        is_verify_aadhaar: true,
        farmer_id: new mongoose.Types.ObjectId(farmer_id),
      },
      { aadhaar_details: 1, farmer_id: 1 }
    ).lean();

    if (!adharDetails) return null;

    // Update the care_of field inside the nested aadhaar_details
    if (adharDetails.aadhaar_details?.care_of) {
      adharDetails.aadhaar_details.care_of =
        adharDetails.aadhaar_details.care_of.replace(/^C\/O:\s*/i, "");
    }

    return adharDetails;
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
}

async function getAgristackFarmerByAadhar(uidai_aadharNo, farmer_id) {
  try {
    const farmerObj = await farmer.findOne(
      {
        _id: new mongoose.Types.ObjectId(farmer_id),
        $or: [
          { "proof.aadhar_no": uidai_aadharNo },
          { "documents.aadhar_number": uidai_aadharNo },
        ],
      },
      { _id: 1 }
    );

    // If no farmer is found, skip Agristack lookup
    if (!farmerObj) return null;

    // Lookup verified Agristack farmer data
    const agristackFarmerObj = await AgristackFarmerDetails.findOne({
      farmer_id: farmerObj._id,
      isAgristackVerified: true,
    }).lean();

    return agristackFarmerObj;
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
}

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
    if (! mongoose.Types.ObjectId.isValid(stateId)) {
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

module.exports = {
  getVerifiedAadharInfo,
  getAgristackFarmerByAadhar,
  getAddressByPincode,
  getAllStates,
  getDistrictsByStateId,
};
