const {
  _auth_module,
  _response_message,
  _middleware,
} = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors, handleDecimal } = require("@src/v1/utils/helpers");
require("dotenv").config();
const crypto = require("crypto");
// const { postReqCCAvenue } = require("./ccAvenueToolkit/ccavRequestHandler");
var ccav = require("./ccAvenueToolkit/ccavutil.js");
const {
  CCAvenueResponse,
} = require("@src/v1/models/app/payment/ccAvenuePayments.js");
const {
  _paymentmethod,
  _poAdvancePaymentStatus,
  _poBatchPaymentStatus,
  _penaltypaymentStatus,
} = require("@src/v1/utils/constants/index.js");
const {
  PurchaseOrderModel,
} = require("@src/v1/models/app/distiller/purchaseOrder.js");
const {
  BatchOrderProcess,
} = require("@src/v1/models/app/distiller/batchOrderProcess.js");

const { sendResponse } = require("@src/v1/utils/helpers/api_response");

const { REDIRECT_URL, APP_URL, SCCUESS_URL, CANCEL_URL, PG_ENV, MERCHANT_ID, ACCESS_CODE, WORKING_KEY, } = require("@config/index.js");
const logger = require("@src/common/logger/logger.js");
var workingKey = WORKING_KEY, //Put in the 32-Bit key shared by CCAvenues.
  accessCode = ACCESS_CODE, //Put in the Access Code shared by CCAvenues.
  encRequest = "";

//Generate Md5 hash for the key and then convert in base64 string
var md5 = crypto.createHash("md5").update(workingKey).digest();
var keyBase64 = Buffer.from(md5).toString("base64");

//Initializing Vector and then convert in base64 string
var ivBase64 = Buffer.from([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c,
  0x0d, 0x0e, 0x0f,
]).toString("base64");


module.exports.sendRequest = async (req, res) => {
  try {
    let { order_id, currency, cancel_url, amount, paymentSection } = req.body;
    cancel_url = cancel_url ? `${APP_URL}${cancel_url}` : CANCEL_URL
    const paymentData = `merchant_id=${MERCHANT_ID}&order_id=${order_id}&currency=${currency}&amount=${amount}&redirect_url=${REDIRECT_URL}&cancel_url=${cancel_url}&access_code=${accessCode}&language=EN&merchant_param1=${paymentSection}`;
    // CCAvenue Encryption
    encRequest = ccav.encrypt(paymentData, keyBase64, ivBase64);
    console.log("myEncryption", encRequest);

    if (!encRequest)
      return res.status(400).json({ error: "Failed to encrypt request" });
    const paymentUrl = `https://${PG_ENV}.ccavenue.com/transaction/transaction.do?command=initiateTransaction&encRequest=${encRequest}&access_code=${accessCode}&language=EN`;

    // const decrypted = ccav.decrypt(encRequest, keyBase64, ivBase64);
    // console.log("decrypted response myEnc=>", decrypted);

    return res.json({ paymentUrl, status: 200 });
  } catch (error) {
    console.error("Encryption Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.paymentStatus = async (req, res) => {
  const { encResp = null, orderNo = null } = req.body;
  try {
    if (!encResp)
      return res.status(400).json({ error: "Missing encrypted response" });

    const decrypted = ccav.decrypt(encResp, keyBase64, ivBase64);

    const responseParams = Object.fromEntries(new URLSearchParams(decrypted));
    const paymentStatus = responseParams?.order_status || "Not Found";
    // const paymentStatus = responseParams?.order_status || "Success";
    const {
      tracking_id = "",
      bank_ref_no = "",
      payment_mode = "",
      order_id = "",
      amount = "",
      merchant_param1: paymentSection = "",
      cancel_url = FRONTEND_URL,
    } = responseParams;

    if (paymentStatus === "Success") {
      if (paymentSection && paymentSection === "myorders") {
        const record = await BatchOrderProcess.findOne({ _id: order_id });

        let purchaseOrderRecord = await PurchaseOrderModel.findOne({ _id: record?.orderId }).lean();
        logger.info("purchaseOrderRecord==>", purchaseOrderRecord);
        if (!purchaseOrderRecord) {
          return sendResponse({
            res,
            status: 404,
            message: "Purchase Order not found"
          });
        }

        const amountToBePaid = handleDecimal(amount);
        record.payment.date = Date.now();

        let purchaseOrderRecordUpdate = await PurchaseOrderModel.findByIdAndUpdate(
          { _id: record?.orderId },
          {
            "paymentInfo.paidAmount": handleDecimal(purchaseOrderRecord.paymentInfo.paidAmount + amountToBePaid),
            "paymentInfo.balancePayment": handleDecimal(purchaseOrderRecord.paymentInfo.balancePayment - amountToBePaid),
            "paymentInfo.balancePaymentDate": Date.now(),
            "fulfilledQty": purchaseOrderRecord.fulfilledQty + record.quantityRequired
          }
        );

        if (!purchaseOrderRecordUpdate) {
          return sendResponse({
            res,
            status: 404,
            message: "Purchase Order not found"
          });
        }
        await BatchOrderProcess.findByIdAndUpdate({ _id: order_id }, {
          payment: {
            status: _poBatchPaymentStatus.paid,
            paymentId: tracking_id,
            amount: amountToBePaid,
            date: Date.now(),
          },
          action: {
            proceedToPay: true
          }
        });

      } else if (paymentSection && paymentSection === "penalty") {
        const record = await BatchOrderProcess.findOne({ _id: order_id });
        const amountToBePaid = handleDecimal(amount);
        record.penaltyDetails.penaltypaymentStatus = _penaltypaymentStatus.paid;
        record.penaltyDetails.penaltyAmount = amountToBePaid;
        await record.save();

      } else {
        const record = await PurchaseOrderModel.findOne({
          _id: order_id,
        }).populate("branch_id");

        if (record) {
          const totalPaid = record.paymentInfo?.advancePayment;
          record.paymentInfo.advancePaymentStatus = _poAdvancePaymentStatus.paid;
          record.paymentInfo.paidAmount = handleDecimal(totalPaid);
          record.paymentInfo.advancePaymentDate = Date.now();
          record.paymentGatewayDetails.transactionId = tracking_id;
          record.paymentGatewayDetails.paymentStatus = "Success";

          await record.save();
        }
      }
    }

    await CCAvenueResponse.create({
      order_status: paymentStatus,
      details: responseParams,
      order_id: orderNo,
      payment_method: payment_mode || _paymentmethod.bank_transfer,
      payment_section: paymentSection || "purchase_order",
    });

    // Determine the frontend redirect URL
    let redirectUrlFE = SCCUESS_URL;

    res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Payment Status</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f4f4f4;
                            text-align: center;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 500px;
                            margin: 50px auto;
                            background: #fff;
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        }
                        h2 {
                            color: ${paymentStatus === "Success"
        ? "#28a745"
        : "#dc3545"
      };
                        }
                        p {
                            font-size: 16px;
                            margin: 8px 0;
                        }
                        .btn {
                            display: inline-block;
                            margin-top: 20px;
                            padding: 10px 20px;
                            font-size: 16px;
                            color: #fff;
                            background-color: ${paymentStatus === "Success"
        ? "#28a745"
        : "#dc3545"
      };
                            text-decoration: none;
                            border-radius: 5px;
                        }
                        .btn:hover {
                            background-color: ${paymentStatus === "Success"
        ? "#218838"
        : "#c82333"
      };
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>${paymentStatus === "Success"
        ? "🎉 Payment Successful!"
        : "❌ Payment Failed"
      }</h2>
                        <p><strong>Order ID:</strong> ${order_id}</p>
                        <p><strong>Amount:</strong> ₹${amount}</p>
                        <p><strong>Status:</strong> ${paymentStatus}</p>
                        <p><strong>Tracking ID:</strong> ${tracking_id || "N/A"
      }</p>
                        <p><strong>Payment Mode:</strong> ${payment_mode || "N/A"
      }</p>
                        <p><strong>Bank Ref No:</strong> ${bank_ref_no || "N/A"
      }</p>
                        <a class="btn" href="${redirectUrlFE}?order_id=${order_id}&status=${paymentStatus}">Go Back</a>
                    </div>
                </body>
                </html>
            `);
  } catch (error) {
    console.error("Internal Error:", error);
    res.status(500).json({ error: "Internal Server Error", errorLog: error });
  }
};

module.exports.decryptEncryption = async (req, res) => {
  const { encResp } = req.body;
  try {
    if (!encResp)
      return res.status(400).json({ error: "Missing encrypted response" });
    // Decrypt the response
    const decrypted = ccav.decrypt(encResp, keyBase64, ivBase64);
    console.log("decryptedResponse==>", decrypted);
    // Convert the response
    const responseParams = Object.fromEntries(new URLSearchParams(decrypted));

    res.status(200).json({ decrytedData: responseParams });
  } catch (error) {
    res.status(500).json({ error: error });
  }
};
