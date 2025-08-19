const {
  verifyBankAccountService,
} = require("@src/common/services/gridlines/BankVerification");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { _middleware, _query } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { default: mongoose } = require("mongoose");

module.exports.verifyBankAccount = async (req, res) => {
  try {
    const { account_number, ifsc, farmer_id } = req.body;

    if (!account_number || !ifsc || !farmer_id) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [
            {
              message: _middleware.require('account_number,ifsc and farmer_id'),
            },
          ],
        })
      );
    }
    const farmerObj = await farmer.findOne(
      {
        'bank_details.account_no': account_number,
        'bank_details.ifsc_code': ifsc,
        'bank_details.is_verified': true,
      },
      {
        bank_details: 1,
      }
    );

    if (farmerObj) {
      if (!farmerObj._id.equals(farmer_id)) {
        return res.status(400).send(
          new serviceResponse({
            status: 400,
            message:
              'Account already taken, please try a different account number',
          })
        );
      }

      return res.json(
        new serviceResponse({
          status: 200,
          message: _query.get('bank_details'),
          data: { bank_data: farmerObj?.bank_details },
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
              'response from service provider'
          ),
        })
      );
    }

    if(!responseData?.data?.bank_account_data){
      return res.json( new serviceResponse({
          status: 400,
          message: responseData?.data?.message || _query.invalid('response from service provider'),
        }));
    }

    let farmerUpdatedBankData = await farmer
      .findOneAndUpdate(
        { _id: farmer_id },
        {
          $set: {
            'bank_details.account_no': account_number,
            'bank_details.ifsc_code': ifsc,
            'bank_details.account_holder_name':
              responseData?.data?.bank_account_data?.name,
            'bank_details.branch_name':
              responseData?.data?.bank_account_data?.branch,
            'bank_details.bank_name':
              responseData?.data?.bank_account_data?.bank_name,
            'bank_details.is_verified': true,
          },
        },
        { new: true }
      )
      .select('bank_details');

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: responseData?.data?.message,
        data: { bank_data: farmerUpdatedBankData?.bank_details, responseData },
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
        message: _query.invalid('response from service provider'),
        errors: errorData,
      })
    );
  }
};
