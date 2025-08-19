const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const exportTemplate = require("@src/v1/utils/constants/exportTemplate");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { dumpJSONToCSV, _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { thirdPartyGetApi } = require("@src/v1/utils/helpers/third_party_Api");
const { locationJson } = require("@src/v1/utils/seeders/stateDistrictCitySeeder");


/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */


exports.getExcelTemplate = async (req, res) => {
    try {
        let { template_name, isxlsx = 1 } = req.query;
        let excel_headers = exportTemplate(template_name)
        if (isxlsx == 1) {
            dumpJSONToExcel(req, res, {
                data: [excel_headers],
                fileName: `${template_name}-template.xlsx`,
                worksheetName: `${template_name}`
            });

        } else {
            dumpJSONToCSV(req, res, {
                data: [excel_headers],
                fileName: `${template_name}-template.csv`,
                worksheetName: `${template_name}`
            });
        }
    } catch (error) {
        _handleCatchErrors(error, res)
    }
}
/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */
exports.getAddressByPincode = async (req, res) => {
    try {
        const { pincode } = req.query
        const url = `https://api.postalpincode.in/pincode/${pincode}`
        const records = await thirdPartyGetApi(url, {})

        return sendResponse({ res, status: 200, data: records, message: _response_message.found() })
    } catch (error) {
        _handleCatchErrors(error, res)
    }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */


exports.createSeeder = async (req, res) => {
    try {
        let { seeder_name } = req.query;
        switch (seeder_name) {
            case "location":
                await StateDistrictCity.deleteMany();
                await StateDistrictCity.create(locationJson);
                break;
            default:
                console.log("seeder not found")
                break;
        }
        return sendResponse({ res, status: 200, message: _response_message.created() })
    } catch (error) {
        _handleCatchErrors(error, res)
    }
}

exports.updateDistrictCollection = async (req, res) => {
    try {

        const stateDistrictList = await StateDistrictCity.findOne({})
        console.log("stateDistrictList-->", stateDistrictList)
        stateDistrictList.states.forEach(state=>{ 
                state.districts.forEach((district, index)=>{ 

                    const serialNumber = index < 10 ? `0${index + 1}` : `${index + 1}`;

                    district["serialNumber"] = serialNumber
                    district['pincode'] = []
                })
        })

        const udpated = await stateDistrictList.save()

        return sendResponse({ res, status: 200, message: "serial Number added successfully", data: udpated})
    } catch (error) {
        _handleCatchErrors(error, res)
    }
}

module.exports.stateFilter = async (req, res) => {
    try {
        const branches = await Branches.find()
            .populate([
                {
                    path: "headOfficeId",
                    select: { state: 1, address: 1 },
                },
            ])
            .select("state district");

        const uniqueStatesMap = new Map();

        branches.forEach(branch => {
            if (branch.state && !uniqueStatesMap.has(branch.state)) {
                uniqueStatesMap.set(branch.state, {
                    type: "branch",
                    state: branch.state,
                    district: branch.district,
                });
            }

            // Add the headOfficeId state if it exists
            if (branch.headOfficeId?.state && !uniqueStatesMap.has(branch.headOfficeId.state)) {
                uniqueStatesMap.set(branch.headOfficeId.state, {
                    type: "headOffice",
                    state: branch.headOfficeId.state,
                    address: branch.headOfficeId.address,
                });
            }
        });
        const uniqueData = Array.from(uniqueStatesMap.values());

        sendResponse({ res, status: 200, message:_response_message.found("State"), data: uniqueData})
    } catch (error) {
        _handleCatchErrors(error, res);  
    }
};

/*
module.exports.getCommodity = async (req, res) => {
    try {
        const requests = await RequestModel.find({}, 'product.name');

        const productNames = requests.map(request => (
            {value:request.product.name,
            label:request.product.name}
        ));
            sendResponse({res,status:200, message:_response_message.found("Commodity"),data:productNames})
    } catch (error) {
        // Handle any errors
        _handleCatchErrors(error, res);   
    }
};
*/

module.exports.getCommodity = async (req, res) => {
    try {
        const requests = await RequestModel.aggregate([
            { $group: { _id: "$product.name" } },
            { $project: { value: "$_id", label: "$_id", _id: 0 } }
        ]);
 
        sendResponse({
            res,
            status: 200,
            message: _response_message.found("Commodity"),
            data: requests
        });
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.commodityFilter = async (req, res) => {
    try {
        const requests = await RequestModel.aggregate([
            {
                $lookup: {
                    from: "schemes",
                    localField: "product.schemeId",
                    foreignField: "_id",
                    as: "schemeDetails"
                }
            },
            { $unwind: "$schemeDetails" },

            {
                $lookup: {
                    from: "commodities",
                    localField: "schemeDetails.commodity_id",
                    foreignField: "_id",
                    as: "commoditiDetails"
                }
            },
            { $unwind: "$commoditiDetails" },

            {
                $group: {
                    _id: "$commoditiDetails._id", 
                    commodity_name: { $first: "$commoditiDetails.name" }
                }
            },
             {
                $project: {
                    _id: 0,
                    value: "$_id",
                    label: "$commodity_name"
                }
            }
            
        ]);

        sendResponse({
            res,
            status: 200,
            message: _response_message.found("Commodity"),
            data: requests
        });
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


