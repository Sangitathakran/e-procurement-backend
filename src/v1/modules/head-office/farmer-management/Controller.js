const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const IndividualModel = require("@src/v1/models/app/farmerDetails/IndividualFarmer")
const {farmer} = require("@src/v1/models/app/farmerDetails/Farmer");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");


module.exports.farmerList = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'name', search = '', isExport = 0 } = req.query;
        const skip = (page - 1) * limit;
        const searchFields = ['name', 'farmer_id', 'farmer_code', 'mobile_no']

        

        const makeSearchQuery = (searchFields) => { 
            let query = {}
            query['$or'] =  searchFields.map(item=> ({ [item] : { $regex: search, $options: 'i' } }))
            return query
        }

        const query = search ? makeSearchQuery(searchFields) : {}
        const records = { count: 0, rows:[] };

        // associate farmer list
        records.rows.push(...await farmer.find(query)
                                    .select('associate_id farmer_code name parents mobile_no address')
                                    .populate({path:'associate_id', select:"user_code"})
                                    // .populate({path:'address.state_id', model: "StateDistrictCity", match: {"states._id": { $exists: true } }})
                                    .limit(parseInt(limit/2))
                                    .skip(parseInt(skip/2))
                                    .sort(sortBy)
                         )

        // individual farmer list
        records.rows.push(...await IndividualModel.find(query)
                                                .select('associate_id farmer_id name basic_details.father_husband_name mobile_no address')
                                                .limit(parseInt(limit/2))
                                                .skip(parseInt(skip/2))
                                                .sort(sortBy)
                                                .lean()
                         )
              
        const data = await Promise.all(records.rows.map(async(item) => {

            let address = await getAddress(item)

            let farmer = {
                        _id:item?._id,
                        farmer_name: item?.name,  
                        address: address,
                        mobile_no: item?.mobile_no,
                        associate_id: item?.associate_id?.user_code || null,  
                        farmer_id: item?.farmer_code || item?.farmer_id, 
                        father_spouse_name: item?.basic_details?.father_husband_name ||
                                    item?.parents?.father_name ||
                                    item?.parents?.mother_name  
            }
    
            return farmer;
        }))

        records.rows = data

        const associateFarmerCount = await farmer.countDocuments(query);
        const individualFarmerCount = await IndividualModel.countDocuments(query);

        records.count = associateFarmerCount + individualFarmerCount


        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        
        if (isExport == 1) {

            const record = records.rows.map((item) => {
                let address = item?.address?.address_line + ", " +
                                item?.address?.village +  ", " +
                                item?.address?.block + ", " +
                                item?.address?.district + ", " +
                                item?.address?.state + ", "  +
                                item?.address?.pinCode
                                    
                return {
                    "Farmer Name": item?.farmer_name || 'NA',
                    "Mobile Number": item?.mobile_no || 'NA',
                    "Associate ID": item?.associate_id || 'NA',
                    "Farmer ID": item?.farmer_id ?? 'NA',
                    "Father/Spouse Name": item?.father_spouse_name ?? 'NA',
                    "Address": address ?? 'NA',
                }

                
            })
            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Farmer-List.xlsx`,
                    worksheetName: `Farmer-List`
                });
            } else {
                return sendResponse({
                    res,
                    status: 200,
                    data: records,
                    message: _response_message.found("farmers")
                });
            }
        }
        else{ 
            return sendResponse({
                res,
                status: 200,
                data: records,
                message: _response_message.found("farmers")
            });
        }
        

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.getSingleFarmer = async (req, res) => {
    try {
   
        const farmerId = req.params.id
        if(!farmerId)
                return sendResponse({res, status: 400, data: null, message: _response_message.notProvided('Farmer Id')})

        const associate = req.params.associate

        let farmerDetails
        switch (associate) {
            case 'true': 
              farmerDetails = await farmer.findOne({ _id: farmerId });
              break;
      
            case 'false': 
              farmerDetails = await IndividualModel.findOne({ _id: farmerId });
              break;
      
            default:
              farmerDetails = null; 
        }

        return sendResponse({
                res,
                status: 200,
                data: farmerDetails,
                message: farmerDetails 
                    ? _response_message.found("farmer")
                    : _response_message.notFound("farmer")
            });
        
        

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

const getAddress = async (item) =>{
    return { 
        address_line : item?.address?.address_line || (`${item?.address?.address_line_1} ${item?.address?.address_line_2}`),
        village: item?.address?.village ||" ",
        block: item?.address?.block ||" ",
        district: item?.address?.district 
                    ? item?.address?.district 
                    : item?.address?.district_id
                        ? await getDistrict(item?.address?.district_id)
                        : "unknown",
        state: item?.address?.state 
                ? item?.address?.state 
                : item?.address?.state_id
                    ? await getState(item?.address?.state_id)
                    : "unknown",
        pinCode: item?.address?.pinCode 

    }
}

const getState = async (stateId)=>{
    const state = await StateDistrictCity.aggregate([
        {
           $match: { _id: new ObjectId(`66d8438dddba819889f4d798`)}
        },
        {
            $project: {
                _id: 1,
                state: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                                        input: "$states",
                                        as: 'item',
                                        cond: { $eq: ['$$item._id', stateId ] }
                                    }
                        },
                        as: "filterState",
                        in: "$$filterState.state_title"
                      }
                    },
                    0
                  ]
                  
                }
            }
        }
    ])
    return state[0].state
}

const getDistrict = async (districtId)=>{
    const district = await StateDistrictCity.aggregate([
        {
           $match: { _id: new ObjectId(`66d8438dddba819889f4d798`)}
        },
        {
           $unwind: "$states" 
        },
        { 
           $unwind: "$states.districts"
        },
        { 
            $match: { "states.districts._id": districtId }
        },
        {
            $project: { 
                _id: 1,
                district: "$states.districts.district_title"
            }
        }


    ])
    return district[0].district

}



