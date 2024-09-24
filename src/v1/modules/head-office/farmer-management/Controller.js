const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const IndividualModel = require("@src/v1/models/app/farmerDetails/IndividualFarmer")
const {farmer} = require("@src/v1/models/app/farmerDetails/Farmer");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const {Bank} = require("@src/v1/models/app/farmerDetails/Bank");
const {Crop} = require("@src/v1/models/app/farmerDetails/Crop");
const {Land} = require("@src/v1/models/app/farmerDetails/Land");

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

        const type = req.params.type
         const farmerDetails =  await singlefarmerDetails(res, farmerId, type);
               
    

        return sendResponse({
                res,
                status: 200,
                data: farmerDetails ,
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



const singlefarmerDetails = async (res, farmerId, farmerType=1) => {


    try {
        const SINGLE_FARMER_INITIALS = {
            basic_details: {
                name: null,
                father_spouse_name: null,
                email: null,
                mobile_no: null,
                category: null,
                dob: null,
                farmer_type: null,
                gender: null
            },
            address: {
                address_line_1: null,
                address_line_2: null,
                pincode: null,
                state: null,
                district: null,
                village_town_city: null,
                taluka: null,
                country: null,
            },
            land_details: {
                total_area: null,
                pincode: null,
                khasra_no: null,
                ghat_no: null,
                soil_type: null,
                soil_tested: null
            },
            crop_details: {
               upcoming_harvest: [{crop_name: null,
                sowing_date: null,
                harvest_date: null,
                season: null}],
                
               past_harvest:[{
                crop_name: null,
                sowing_date: null,
                harvest_date: null,
                season: null
               }] 
                
            },
            bank_details: {
                bank_name: null,
                branch_name: null,
                account_holder_name: null,
                ifsc_code: null,
                account_no: null,
                confirm_account_no: null,
                upload_proof: null
            }
        }
        //this is associate farmer
        if(farmerType==1){
           const basicDetails = await farmer.findById(farmerId).select('name parents email mobile_no category dob farmer_type gender')
           const address = await farmer.findById(farmerId).select('address.address_line address.pinCode address.village address.country address.block')
           const landDetails = await Land.findOne({ _id: farmerId }).select('total_area khasra_no soil_type soil_tested')
           const cropDetails = await Crop.findOne({ _id: farmerId }).select('crops_name sowing_date harvesting_date crop_seasons')
           const bankDetails = await Bank.findOne({ _id: farmerId }).select('bank_name account_holder_name ifsc_code account_no document')
          
           SINGLE_FARMER_INITIALS.basic_details = {
             name: basicDetails?.name,
             father_spouse_name: basicDetails?.parents?.father_name ||
                                 basicDetails.parents?.mother_name,
             email: bankDetails?.email,
             mobile_no: basicDetails?.mobile_no,
             category: basicDetails?.category,
             farmer_type: basicDetails?.farmer_type,
             gender: basicDetails?.gender
           }
           SINGLE_FARMER_INITIALS.address = {
            address_line_1: address?.address.address_line || null,
            address_line_2: address?.address.address_line || null,
            pincode: address?.address.pinCode,
            state: null,
            district: null,
            village_town_city: address?.address.village,
            taluka: address?.address.block,
            country: address?.address.country
           }
           SINGLE_FARMER_INITIALS.land_details = {
            total_area: landDetails?.total_area || null,
            pincode: null,
            khasra_no: landDetails?.khasra_no || null,
            ghat_no: null,
            soil_type: landDetails?.soil_type || null,
            soil_tested: landDetails?.soil_tested || null
           }
           SINGLE_FARMER_INITIALS.crop_details = {
            upcoming_harvest: [{
                crop_name: cropDetails?.crops_name,
                sowing_date: cropDetails?.sowing_date,
                harvest_date: cropDetails?.harvesting_date,
                season: cropDetails?.crop_seasons
            }],
                
               past_harvest:[{
                crop_name: cropDetails?.crops_name,
                sowing_date: cropDetails?.sowing_date,
                harvest_date: cropDetails?.harvesting_date,
                season: cropDetails?.crop_seasons
               }] 
           }
           SINGLE_FARMER_INITIALS.bank_details = {
            bank_name: bankDetails?.bank_name,
            branch_name: bankDetails?.bank_name,
            account_holder_name: bankDetails?.account_holder_name,
            ifsc_code: bankDetails?.ifsc_code,
            account_no: bankDetails?.account_no,
            confirm_account_no: bankDetails?.account_no,
            upload_proof: bankDetails?.document
           }


        }
        //this is individual farmer
        if(farmerType==2){
            const individualfarmerDetails = await IndividualModel.findOne({ _id: farmerId })
            SINGLE_FARMER_INITIALS.basic_details = {
                name:individualfarmerDetails?.basic_details.name,
                father_spouse_name:individualfarmerDetails?.basic_details.father_husband_name ,
                email:individualfarmerDetails?.basic_details.email,
                mobile_no:individualfarmerDetails?.basic_details.mobile_no,
                category:individualfarmerDetails?.basic_details.category,
                dob:individualfarmerDetails?.basic_details.dob,
                farmer_type:individualfarmerDetails?.basic_details.farmer_type,
                gender:individualfarmerDetails?.basic_details.gender
            }
            SINGLE_FARMER_INITIALS.address = {
                address_line_1: individualfarmerDetails?.address.address_line_1 || null,
                address_line_2: individualfarmerDetails?.address.address_line_2 || null,
                pincode: individualfarmerDetails?.address.pinCode,
                state: individualfarmerDetails?.state,
                district:individualfarmerDetails?.address.district,
                village_town_city: individualfarmerDetails?.address.village,
                taluka: individualfarmerDetails?.address.block,
                country: individualfarmerDetails?.address.country
            }
            SINGLE_FARMER_INITIALS.land_details = {
                total_area: individualfarmerDetails?.land_details.total_area,
                pincode:individualfarmerDetails?.land_details.pinCode,
                khasra_no: individualfarmerDetails?.land_details.khasra_no,
                ghat_no: individualfarmerDetails?.land_details.ghat_number,
                soil_type: individualfarmerDetails?.land_details.soil_type,
                soil_tested: individualfarmerDetails?.land_details.soil_tested
            }
            SINGLE_FARMER_INITIALS.crop_details = {
                upcoming_harvest: [{crop_name: null,
                    sowing_date: null,
                    harvest_date: null,
                    season: null}],
                    
                   past_harvest:[{
                    crop_name: null,
                    sowing_date: null,
                    harvest_date: null,
                    season: null
                   }] 
            }
            SINGLE_FARMER_INITIALS.bank_details = {
                bank_name: individualfarmerDetails?.bank_details.bank_name,
                branch_name: individualfarmerDetails?.bank_details.branch_name,
                account_holder_name: individualfarmerDetails?.bank_details.account_holder_name,
                ifsc_code: individualfarmerDetails?.bank_details.ifsc_code,
                account_no: individualfarmerDetails?.bank_details.account_no,
                confirm_account_no: individualfarmerDetails?.bank_details.account_no,
                upload_proof: individualfarmerDetails?.bank_details.proof_doc_key
            }
        }
        return SINGLE_FARMER_INITIALS;

    } catch (error) {
         _handleCatchErrors(error, res);

    }

}

