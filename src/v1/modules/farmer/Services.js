const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const AgristackFarmerDetails = require("@src/v1/models/app/farmerDetails/src/v1/models/app/farmerDetails/AgristackFarmerDetails");
const {
  Verifyfarmer,
} = require("@src/v1/models/app/farmerDetails/verifyFarmer");
const { default: mongoose } = require("mongoose");

async function getVerifiedAadharInfo(uidai_aadharNo, farmer_id) {
  try {
    const adharDetails = await Verifyfarmer.findOne(
      {
        "aadhaar_details.uidai_aadharNo": uidai_aadharNo,
        is_verify_aadhaar: true,
        farmer_id: new mongoose.Types.ObjectId(farmer_id)
      },
      { aadhaar_details: 1, farmer_id: 1 }
    ).lean();

    if (!adharDetails) return null;

    // Update the care_of field inside the nested aadhaar_details
    if (adharDetails.aadhaar_details?.care_of) {
      adharDetails.aadhaar_details.care_of = adharDetails.aadhaar_details.care_of.replace(/^C\/O:\s*/i, '');
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
          { "documents.aadhar_number": uidai_aadharNo }
        ]
      },
      { _id: 1 }
    );

    // If no farmer is found, skip Agristack lookup
    if (!farmerObj) return null;

    // Lookup verified Agristack farmer data
    const agristackFarmerObj = await AgristackFarmerDetails.findOne(
      {
        farmer_id: farmerObj._id,
        isAgristackVerified: true
      }
    ).lean();

    return agristackFarmerObj;
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
}

module.exports = { getVerifiedAadharInfo, getAgristackFarmerByAadhar };
