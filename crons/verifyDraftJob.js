const { verfiyfarmer } = require('@src/v1/models/app/farmerDetails/verfiyFarmer');
const { aadherVerfiycation, bankVerfiycation } = require('@src/common/services/ongridVerfication');
const { farmer } = require('@src/v1/models/app/farmerDetails/Farmer');
const { _collectionName } = require('@src/v1/utils/constants');
const { _verfiycationStatus } = require('@src/v1/utils/constants/index');
const logger = require('@src/common/logger/logger');

const runBankVerificationJob = async () => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    logger.info("⏰ Cron started: Bank and Aadhaar verification");

    const records = await verfiyfarmer.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { request_for_bank: true },
                { request_for_aadhaar: true }
              ]
            },
            {
              $or: [
                { is_verify_bank: false },
                { is_verify_aadhaar: false }
              ]
            }
          ]
        }

      },
      {
        $lookup: {
          from: _collectionName.farmers,
          localField: "farmer_id",
          foreignField: "_id",
          as: "farmer",
        },
      },
      { $unwind: "$farmer" },
      { $limit: 20 },
      {
        $project: {
          _id: 1,
          is_verfiy_bank: 1,
          is_verfiy_aadhar: 1,
          request_for_bank: 1,
          request_for_aadhaar: 1,
          createdAt: 1,
          associate_id: "$farmer.associate_id",
          farmer_id: "$farmer._id",
          bank_details: "$farmer.bank_details",
          proof: "$farmer.proof",
          farmer_status: "$farmer.status",
        },
      },
    ]);

    logger.info(` Total records fetched for verification: ${records.length}`);
    console.log(records)
    for (const record of records) {
      await processSingleFarmerRecord(record);
    }

    logger.info(` Completed processing ${records.length} verification records.`);
  } catch (error) {
    logger.error(" Cron error during verification process: " + error.message);
  }
};

const processSingleFarmerRecord = async (record) => {
  try {
    logger.info(` Verifying record ID: ${record._id}`);

    // ----------------- Bank Verification -----------------
    if (record?.request_for_bank === true) {
      const { account_no, ifsc_code } = record?.bank_details || {};

      if (account_no && ifsc_code) {
        const bankRes = await bankVerfiycation(account_no, ifsc_code);
        logger.info(`🏦 Bank API Response for ${record.farmer_id}: ${JSON.stringify(bankRes)}`);

        const timestamp = new Date(bankRes?.timestamp || Date.now());

        if (bankRes?.data?.code === "1000") {
          const bankData = bankRes.data.bank_account_data;

          await verfiyfarmer.findByIdAndUpdate(record._id, {
            bank_details: {
              name: bankData?.name,
              code: bankRes?.data?.code,
              bank_name: bankData?.bank_name,
              branch: bankData?.branch,
              account_number: bankData?.account_number,
              ifsc: ifsc_code,
              verified_at: timestamp,
              request_id: bankRes?.request_id,
              transaction_id: bankRes?.transaction_id,
            },
            is_verify_bank: true,
            is_verify_bank_date: timestamp,
            request_for_bank: false,
          });

          await farmer.findByIdAndUpdate(record.farmer_id, {
            $set: {
              "bank_details.is_verified": true,
              "bank_details.is_verify_bank_date": timestamp,
            },
          });

          logger.info(`Bank verified for farmer ${record.farmer_id}`);
        } else {
          await verfiyfarmer.findByIdAndUpdate(record._id, {
            bank_details: {
              name: bankRes?.name,
              code: bankRes?.data?.code,
              bank_name: bankRes?.bank_name,
              branch: bankRes?.branch,
              account_number: bankRes?.account_number,
              ifsc: bankRes?.ifsc_code,
              verified_at: timestamp,
              request_id: bankRes?.request_id,
              transaction_id: bankRes?.transaction_id,
            },
            is_verify_bank: false,
            is_verify_bank_date: timestamp,
            request_for_bank: false,
          });

          await farmer.findByIdAndUpdate(record.farmer_id, {
            $set: {
              "bank_details.is_verified": false,
              "bank_details.is_verify_bank_date": timestamp,
            },
          });

          logger.warn(`⚠️ Bank verification failed for farmer ${record.farmer_id}`);
        }
      }
    }

    // ----------------- Aadhaar Verification -----------------
    if (record?.request_for_aadhaar === true) {
      const aadhaarNo = record?.proof?.aadhar_no;

      if (aadhaarNo) {
        const aadherRes = await aadherVerfiycation(aadhaarNo);
        logger.info(` Aadhaar API Response for ${record.farmer_id}: ${JSON.stringify(aadherRes)}`);

        const timestamp = new Date(aadherRes?.timestamp || Date.now());
        const aadherData = aadherRes.data?.aadhaar_data;

        if (aadherRes?.data?.code === "1018") {
          await verfiyfarmer.findByIdAndUpdate(record._id, {
            aadhaar_details: {
              code: aadherRes?.data?.code,
              ...aadherData,
              request_id: aadherRes?.request_id,
              transaction_id: aadherRes?.transaction_id,
            },
            is_verify_aadhaar: true,
            is_verify_aadhaar_date: timestamp,
            request_for_aadhaar: false,
          });

          await farmer.findByIdAndUpdate(record.farmer_id, {
            $set: {
              "proof.is_verified": true,
              "proof.is_verify_aadhaar_date": timestamp,
            },
          });

          logger.info(` Aadhaar verified for farmer ${record.farmer_id}`);
        } else {
          logger.warn(` Aadhaar verification failed for ${aadhaarNo}: Third party API call failed`);

          await verfiyfarmer.findByIdAndUpdate({_id: record._id}, {
            aadhaar_details: {
              code: aadherRes?.data?.code,
              ...aadherData,
              request_id: aadherRes?.request_id,
              transaction_id: aadherRes?.transaction_id,
            },
            is_verify_aadhaar: false,
            is_verify_aadhaar_date: timestamp,
            request_for_aadhaar: false,
          });

          await farmer.findByIdAndUpdate(record.farmer_id, {
            $set: {
              "proof.is_verified": false,
              "proof.is_verify_aadhaar_date": timestamp,
            },
          });

          logger.warn(` Aadhaar verification failed for farmer ${record.farmer_id}`);
        }
      }
    }

  } catch (error) {
    logger.error(` Error verifying record ID: ${record._id} - ${error.message}`);
  }
};


module.exports = { runBankVerificationJob };
