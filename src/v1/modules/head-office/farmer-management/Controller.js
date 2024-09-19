const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");

const IndividualModel = require("@src/v1/models/app/farmerDetails/IndividualFarmer")
const {farmer} = require("@src/v1/models/app/farmerDetails/Farmer")


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
              
        const data = records.rows.map(item => {

            let address = { 
                address_line : item?.address?.address_line || (`${item?.address?.address_line_1} ${item?.address?.address_line_2}`),
                village: item?.address?.village ||" ",
                block: item?.address?.block ||" ",
                district: item?.address?.district || "unknown",
                state: item?.address?.state || "unknown",
                pinCode: item?.address?.pinCode 

            }


            let farmer = {
                        farmer_name: item?.name,  
                        address: address,
                        mobile_no: item?.mobile_no,
                        associate_id: item?.associate_id?.user_code || null,  
                        farmer_id: item?.farmer_code || item?.farmer_id, 
                        father_spouse_name: item?.basic_details?.father_husband_name ||
                                    item?.parents?.father_name ||
                                    item?.parents?.mother_name  
            };
    
            return farmer;
        });

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

