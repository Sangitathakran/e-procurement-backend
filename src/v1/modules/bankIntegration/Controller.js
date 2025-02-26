const {
  _auth_module,
  _response_message,
  _middleware,
} = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
require("dotenv").config();
const crypto = require("crypto");
// const { postReqCCAvenue } = require("./ccAvenueToolkit/ccavRequestHandler");
var ccav = require("./ccAvenueToolkit/ccavutil.js");
const {
  CCAvenueResponse,
} = require("@src/v1/models/app/payment/ccAvenuePayments.js");
const { _paymentmethod } = require("@src/v1/utils/constants/index.js");

const {
  MERCHANT_ID,
  ACCESS_CODE,
  WORKING_KEY,
  REDIRECT_URL,
  PG_ENV,
  CANCEL_URL,
} = process.env;

const FRONTEND_SUCCESS_URL = "https://testing.distiller.khetisauda.com";
const FRONTEND_FAILURE_URL = "https://testing.distiller.khetisauda.com";

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
    const { order_id, currency, cancel_url, amount } = req.body;
    const paymentData = `merchant_id=${MERCHANT_ID}&order_id=${order_id}&currency=${currency}&amount=${amount}&redirect_url=${REDIRECT_URL}&cancel_url=${cancel_url}&access_code=${accessCode}&language=EN`;
    // CCAvenue Encryption
    encRequest = ccav.encrypt(paymentData, keyBase64, ivBase64);
    console.log("myEncryption", encRequest);

    if (!encRequest)
      return res.status(400).json({ error: "Failed to encrypt request" });

    const paymentUrl = `https://${PG_ENV}.ccavenue.com/transaction/transaction.do?command=initiateTransaction&encRequest=${encRequest}&access_code=${accessCode}&language=EN`;
    // const ccAvEnc =
    //   "5bb30500d8b938f0ffba082f12fe14243cb9671212892c80c1221907e7dde74d336dc5e0361d1c01e30c2ff40a62c4461f6755b6d83d4aa1df3b439da66fb1b4f7530b78201a3e6e3f2495299fabbbe8638a8b1b3dd2956813a09ff068c98c6f56ea975c486b172e23f83a3d1778940db8f61fe6db3e6d09cc1aecaf5bd2f9fbc6ee7a4512488dfda1038f7abb6701574aeaa5dccb41c6f9f3325081df097125982aef609ad0348ab132392cc7e5730c85d61dcbc6731d613b4584ce5a0b5da832c0b29d0693fef0888f3546242a8d31962dbeae5a2d943260bec349f234d260c0c2a695f847d8bba261a781bcdd711cf2c3d8209fe7a3b8c01268b3bf722ca30e6328604e42bdfb23a23bd1821d743c";
    const decrypted = ccav.decrypt(encRequest, keyBase64, ivBase64);
    console.log("decrypted response myEnc=>", decrypted);

    return res.json({ paymentUrl });
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
    // Decrypt the response
    const decrypted = ccav.decrypt(encResp, keyBase64, ivBase64);
    // console.log("decryptedResponse==>", decrypted);
    // Convert the response
    const responseParams = Object.fromEntries(new URLSearchParams(decrypted));

    console.log("CCAvenue Payment Response:", responseParams);

    const paymentStatus = responseParams?.order_status || "Unknown";

    await CCAvenueResponse.create({
      order_status: paymentStatus,
      details: responseParams,
      order_id: orderNo,
      // created_at: Date.now(),
      payment_method: _paymentmethod.bank_transfer,
    });

    const {
      tracking_id = "",
      bank_ref_no = "",
      payment_mode = "",
      order_id = "",
      amount = "",
    } = responseParams;

    // Determine the frontend redirect URL
    let redirectUrlFE =
      paymentStatus === "Success" ? FRONTEND_SUCCESS_URL : FRONTEND_FAILURE_URL;

    // if (paymentStatus === "Success") {
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
                            color: ${
                              paymentStatus === "Success"
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
                            background-color: ${
                              paymentStatus === "Success"
                                ? "#28a745"
                                : "#dc3545"
                            };
                            text-decoration: none;
                            border-radius: 5px;
                        }
                        .btn:hover {
                            background-color: ${
                              paymentStatus === "Success"
                                ? "#218838"
                                : "#c82333"
                            };
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>${
                          paymentStatus === "Success"
                            ? "🎉 Payment Successful!"
                            : "❌ Payment Failed"
                        }</h2>
                        <p><strong>Order ID:</strong> ${order_id}</p>
                        <p><strong>Amount:</strong> ₹${amount}</p>
                        <p><strong>Status:</strong> ${paymentStatus}</p>
                        <p><strong>Tracking ID:</strong> ${
                          tracking_id || "N/A"
                        }</p>
                        <p><strong>Payment Mode:</strong> ${
                          payment_mode || "N/A"
                        }</p>
                        <p><strong>Bank Ref No:</strong> ${
                          bank_ref_no || "N/A"
                        }</p>
                        <a class="btn" href="${CANCEL_URL}?order_id=${order_id}&status=${paymentStatus}">Go Back</a>
                    </div>
                </body>
                </html>
            `);
    // } else {
    //   return res.status(400).json({
    //     message: "Payment failed or pending",
    //     details: responseParams,
    //   });
    // }
  } catch (error) {
    console.error("Internal Error:", error);
    res.status(500).json({ error: "Internal Server Error", errorLog: error });
  }
};
