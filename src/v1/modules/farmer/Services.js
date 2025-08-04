const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const AgristackFarmerDetails = require("@src/v1/models/app/farmerDetails/src/v1/models/app/farmerDetails/AgristackFarmerDetails");
const {StateDistrictCity,} = require("@src/v1/models/master/StateDistrictCity");
const { thirdPartyGetApi } = require("@src/v1/utils/helpers/third_party_Api");
const { default: mongoose } = require("mongoose");
const { verfiyfarmer } = require("@src/v1/models/app/farmerDetails/verfiyFarmer");

async function getVerifiedAadharInfo(uidai_aadharNo, farmer_id) {
  try {
    const adharDetails = await verfiyfarmer.findOne(
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

// async function getAgristackFarmerByAadhar(
//   uidai_aadharNo,
//   farmer_id,
//   cpmu_farmer_id
// ) {
//   try {
//     const farmerObj = await farmer.findOne(
//       {
//         _id: new mongoose.Types.ObjectId(farmer_id),
//         $or: [
//           { "proof.aadhar_no": uidai_aadharNo },
//           { "documents.aadhar_number": uidai_aadharNo },
//         ],
//       },
//       { _id: 1 }
//     );

//     // If no farmer is found, skip Agristack lookup
//     if (!farmerObj) return null;

//     const agristackFarmerObj = await AgristackFarmerDetails.findOne({
//       $or: [
//         {
//           farmer_id: farmerObj._id,
//           isAgristackVerified: true,
//         },
//         {
//           cpmu_farmer_id: cpmu_farmer_id,
//         },
//       ],
//     }).lean();

//     return agristackFarmerObj;
//   } catch (err) {
//     console.log(err);
//     throw new Error(err.message);
//   }
// }

async function getAgristackFarmerByAadhar(
  uidai_aadharNo,
  farmer_id,
  cpmu_farmer_id
) {
  try {
    let farmerObj = null;

    // Try finding the farmer by ID and Aadhaar (if provided)
    const farmerMatch = {
      _id: new mongoose.Types.ObjectId(farmer_id),
    };

    if (uidai_aadharNo) {
      farmerMatch.$or = [
        { "proof.aadhar_no": uidai_aadharNo },
        { "documents.aadhar_number": uidai_aadharNo },
      ];
    }

    if (farmer_id && mongoose.Types.ObjectId.isValid(farmer_id)) {
      farmerObj = await farmer.findOne(farmerMatch, { _id: 1 });
    }

    // Build dynamic OR query for Agristack lookup
    const agristackOrConditions = [];

    if (farmerObj) {
      agristackOrConditions.push({
        farmer_id: farmerObj._id,
        isAgristackVerified: true,
      });
    }

    if (cpmu_farmer_id) {
      agristackOrConditions.push({ cpmu_farmer_id });
    }

    // If neither farmer nor CPMU ID is present, return null
    if (agristackOrConditions.length === 0) return null;

    const agristackFarmerObj = await AgristackFarmerDetails.findOne({
      $or: agristackOrConditions,
    }).lean();

    return agristackFarmerObj;
  } catch (err) {
    console.error("Error in getAgristackFarmerByAadhar:", err);
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

module.exports = {
  getVerifiedAadharInfo,
  getAgristackFarmerByAadhar,
  getAddressByPincode,
  getAllStates,
  getDistrictsByStateId,
};
