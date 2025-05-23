const { AgristackLog } = require("@src/v1/models/app/farmerDetails/AgristackLogs");


module.exports.postSeekData = async (req, res) => {
  try {
    const data = req.body;
    //await AgristackLog.create({ responseData: data, farmerData: data?.message?.search_response?.[0]?.data?.reg_records?.farmerData });
    await AgristackLog.updateOne(
      { correlation_id: data?.message?.correlation_id },
      {
        $set: {
          responseData: data,
          farmerData:
            data?.message?.search_response?.[0]?.data?.reg_records?.farmerData,
          land_data:
            data?.message?.search_response?.[0]?.data?.reg_records?.land_data,
          crop_sown_data:
            data?.message?.search_response?.[0]?.data?.reg_records
              ?.crop_sown_data,
        },
      }
    );
    return res.status(200).send({ success: true, message: "OK" });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};
