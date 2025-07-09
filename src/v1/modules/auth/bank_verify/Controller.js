const {
  verifyBankAccountService,
} = require("@src/common/services/gridlines/BankVerification");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { _middleware, _query } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");

module.exports.verifyBankAccount = async (req, res) => {
  try {
    const { account_number, ifsc } = req.body;

    if (!account_number || !ifsc) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _middleware.require("account_number and ifsc") }],
        })
      );
    }
    const farmerObj = await farmer.findOne(
      {
        "bank_details.account_no": account_number,
        "bank_details.ifsc_code": ifsc,
        "bank_details.is_verified": true
      },
      {
        bank_details: 1,
      }
    );

    if (farmerObj) {
      return res.json(
        new serviceResponse({
          status: 200,
          message: _query.get("bank_details"),
          data: { bank_data: farmerObj?.bank_details}
        })
      );
    }


    const responseData = await verifyBankAccountService({
      account_number,
      ifsc,
    });
   // console.log(responseData);
    if (responseData?.status !== 200 || !responseData?.transaction_id) {
      return res.json(
        new serviceResponse({
          status: 400,
          message: _query.invalid(
            responseData?.data?.data?.message ||
              "response from service provider"
          ),
        })
      );
    }

    let farmerUpdatedBankData = await farmer
      .findOneAndUpdate(
        {
          "bank_details.account_no": account_number,
          "bank_details.ifsc_code": ifsc,
        },
        {
          $set: {
            "bank_details.account_holder_name": responseData?.data?.bank_account_data?.name,
            "bank_details.branch_name": responseData?.data?.bank_account_data?.branch,
            "bank_details.bank_name": responseData?.data?.bank_account_data?.bank_name,
            "bank_details.is_verified": true,
          },
        },
        { new: true }
      )
      .select("bank_details"); // only include bank_details

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: "Bank account verified successfully",
        data: { bank_data: farmerUpdatedBankData?.bank_details, responseData},
      })
    );
  } catch (error) {
    const status = error?.status || 500;
    const errorData = error?.data?.error?.metadata?.fields ||
      error?.data || {
        message: error.message,
      };

    return res.status(200).send(
      new serviceResponse({
        status,
        message: _query.invalid("response from service provider"),
        errors: errorData,
      })
    );
  }
};
