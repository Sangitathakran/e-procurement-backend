const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { AgristackLog } = require("@src/v1/models/app/farmerDetails/AgristackLogs");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');


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

module.exports.exportAdharHashed = async (req, res) => {
  try {
    const stateId = new mongoose.Types.ObjectId('6719f065845487ff168db1ae');

    const farmers = await farmer.find({
      "proof.aadhar_no": { $exists: true, $ne: null },
      "address.state_id": stateId
    }).select("proof.aadhar_no").limit(5000);

    const hashes = [];

    for (const farmer of farmers) {
      try {
        const aadhaarStr = scientificToString(farmer.proof.aadhar_no);
        const hash = sha256Hash(aadhaarStr);
        hashes.push({ aadhaar_hash: hash });
      } catch (err) {
        console.error(`Error processing Aadhaar for farmer ID ${farmer._id}:`, err.message);
      }
    }

    fs.writeFileSync('aadhaar_hashes.json', JSON.stringify(hashes, null, 2));

   return res.json({ success: true, count: hashes.length, file: 'aadhaar_hashes.json' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}









// Helper: Convert scientific notation to full numeric string
function scientificToString(num) {
  const number = Number(num);
  if (isNaN(number)) throw new Error('Invalid Aadhaar format');
  return number.toFixed(0); // removes exponent part
}

// Helper: SHA256 hash
function sha256Hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}
