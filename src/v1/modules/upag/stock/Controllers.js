const { getUpagAccessToken, submitStockData } = require("@src/v1/common/services/upag_api");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { Scheme } = require("@src/v1/models/master/Scheme");
const moment = require('moment')

const getDateInterval = (endDate) => {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays
}

module.exports.getStockData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Validate that startDate and endDate are provided
        // if (!startDate || !endDate) {
        //     return res.status(400).json({ message: "startDate and endDate are required" });
        // }

        // Parse the dates
        // const start = new Date(startDate);
        // const end = new Date(endDate);

        // Check for invalid dates
        // if (isNaN(start) || isNaN(end)) {
        //     return res.status(400).json({ message: "Invalid date format" });
        // }

        // Calculate the difference in days
        // const diffTime = Math.abs(end - start);
        // const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Check if the difference exceeds 7 days
        // if (diffDays >= 7) {
        //     return res.status(400).json({ message: "Date range should not exceed 7 days" });
        // }

        const schemes = await Scheme.find().select('_id schemeId schemeName season period procurementDuration');
        if (!schemes || schemes.length === 0) {
            return res.status(404).json({ message: "No schemes found" });
        }
        const finalResponses = [];

        for (const scheme of schemes) {
            const schemeId = scheme._id;

            const aggregation = [
                {
                    $match: { 'product.schemeId': schemeId }
                },
                {
                    $lookup: {
                        from: 'associateoffers',
                        localField: '_id',
                        foreignField: 'req_id',
                        as: 'associateoffer'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'associateoffer.seller_id',
                        foreignField: '_id',
                        as: 'associate'
                    }
                },
                { $unwind: '$associate' },
                {
                    $lookup: {
                        from: 'commodities',
                        localField: 'product.commodity_id',
                        foreignField: '_id',
                        as: 'commodity'
                    }
                },
                { $unwind: '$commodity' },
                {
                    $project: {
                        _id: 1,
                        product: 1,
                        'associate.address.registered.state': 1,
                        'commodity': 1,
                        'associateoffer._id': 1,
                        quotedPrice: 1,
                        createdAt: 1
                    }
                }
            ];
            const result = await RequestModel.aggregate(aggregation);
            if (!result || result.length === 0) continue;

            const associateOffers = result[0]?.associateoffer || [];
            const requestId = result[0]?._id || null;
            const { createdAt,_id } = result[0] || []
            const batches = await Promise.all(
                associateOffers.map(async (associateOffer) => {
                    return Batch.find({
                        status: "Delivered",
                        associateOffer_id: associateOffer._id,
                        req_id: requestId,
                    }, { available_qty: 1, allotedQty: 1, 'receiving_details.received_on': 1 });
                })
            );
            let availableqty = 0
            for (let batch of batches) {
                availableqty += batch.reduce((acc, data) => acc + data.available_qty, 0)
            }
            const dateInterval = []
            for (let batch of batches) {
                for (let item of batch) {
                    dateInterval.push(getDateInterval(item.receiving_details.received_on))
                }
            }

            const ageofstock = Math.max(...dateInterval)
            const lastUpdate = dateInterval?.length>0?Math.min(...dateInterval):[]
            const today = new Date();
            let pastDate = new Date();
            pastDate.setDate(today.getDate() - lastUpdate);
            pastDate=pastDate.toDateString()
            console.log(pastDate,lastUpdate)

            const response = {
                "statecode": result[0].associate.address.registered.state,
                "statename": result[0].associate.address.registered.state,
                "commoditytype": result[0].commodity.name,
                "commoditycode": result[0].commodity.commodityId,
                "scheme": scheme.schemeName,
                "availableqtypss": availableqty,
                "availableqtypsf":0,
                "Ageofstockpss": ageofstock,
                "Ageofstockpsf":0, 
                "lastupdateddate ": dateInterval?.length>0 ?moment(pastDate).format("YYYY MM DD"):null,
                "year": moment(createdAt).format("YYYY"),
                "season": scheme.season,
                "uom_of_qty": "MT",
                "uom_of_age_of_stock": ageofstock,
            };

            finalResponses.push(response);
        }
        if (finalResponses.length === 0) {
            return res.status(404).json({ message: "No stock data found for any scheme" });
        }

        return res.status(200).json({ data: finalResponses, messages: "Stock Data Fetched Successfully" });

    } catch (error) {
        console.log("Error in getStockData: ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports.postStockData = async (req, res) => {
  try {
    const token = await getUpagAccessToken();
    const result = await submitStockData(token, req.body);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
