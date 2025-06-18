const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const AgristackFarmerDetails = require("@src/v1/models/app/farmerDetails/src/v1/models/app/farmerDetails/AgristackFarmerDetails");
const {
  Verifyfarmer,
} = require("@src/v1/models/app/farmerDetails/verifyFarmer");

async function getVerifiedAadharInfo(uidai_aadharNo) {
  try {
    const adharDetails = await Verifyfarmer.findOne(
      {
        "aadhaar_details.uidai_aadharNo": uidai_aadharNo,
        is_verify_aadhaar: true,
      },
      { aadhaar_details: 1, farmer_id: 1 }
    ).lean();
    return adharDetails;
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
}

async function getAgristackFarmerByAadhar(uidai_aadharNo) {
  try {
    const farmerObj = await farmer.findOne(
      {
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
