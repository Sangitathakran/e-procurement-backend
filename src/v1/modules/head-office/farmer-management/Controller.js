const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const IndividualModel = require("@src/v1/models/app/farmerDetails/IndividualFarmer")
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");

module.exports.farmerList = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'name', search = '', isExport = 0 } = req.query;
        const skip = (page - 1) * limit;
        const searchFields = ['name', 'farmer_id', 'farmer_code', 'mobile_no']



        const makeSearchQuery = (searchFields) => {
            let query = {}
            query['$or'] = searchFields.map(item => ({ [item]: { $regex: search, $options: 'i' } }))
            return query
        }

        const query = search ? makeSearchQuery(searchFields) : {}
        const records = { count: 0, rows: [] };

        // associate farmer list
        records.rows.push(...await farmer.find(query)
            .select('associate_id farmer_code name parents mobile_no address')
            .populate({ path: 'associate_id', select: "user_code" })
            // .populate({path:'address.state_id', model: "StateDistrictCity", match: {"states._id": { $exists: true } }})
            .limit(parseInt(limit / 2))
            .skip(parseInt(skip / 2))
            .sort(sortBy)
        )

        // individual farmer list
        records.rows.push(...await IndividualModel.find(query)
            .select('associate_id farmer_id name basic_details.father_husband_name mobile_no address')
            .limit(parseInt(limit / 2))
            .skip(parseInt(skip / 2))
            .sort(sortBy)
            .lean()
        )

        const data = await Promise.all(records.rows.map(async (item) => {

            let address = await getAddress(item)

            let farmer = {
                _id: item?._id,
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
                    item?.address?.village + ", " +
                    item?.address?.block + ", " +
                    item?.address?.district + ", " +
                    item?.address?.state + ", " +
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
        else {
            return sendResponse({
                res,
                status: 200,
                data: records,
                message: _response_message.found("farmers")
            });
        }


    } catch (error) {
        console.log('error',error)
        _handleCatchErrors(error, res);
    }
};

module.exports.getSingleFarmer = async (req, res) => {
    try {

        const farmerId = req.params.id
        if (!farmerId)
            return sendResponse({ res, status: 400, data: null, message: _response_message.notProvided('Farmer Id') })

        const type = req.params.type
        const farmerDetails = await singlefarmerDetails(res, farmerId, type);



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

const getAddress = async (item) => {
    return {
        address_line: item?.address?.address_line || (`${item?.address?.address_line_1} ${item?.address?.address_line_2}`),
        village: item?.address?.village || " ",
        block: item?.address?.block || " ",
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

const getState = async (stateId) => {
    const state = await StateDistrictCity.aggregate([
        {
            $match: {}
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
                                        cond: { $eq: ['$$item._id', stateId] }
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
    return state[0].state || "NA"
}

const getDistrict = async (districtId) => {
    const district = await StateDistrictCity.aggregate([
        {
            $match: {}
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
    console.log("district-->", district)
    return district[0]?.district || 'NA'

}



const singlefarmerDetails = async (res, farmerId, farmerType = 1) => {


    try {
        const SINGLE_FARMER_INITIALS = {
            basic_details: {},
            address: {},
            land_details: {},
            bank_details: {},
            crop_details: {
                upcoming_harvest: [],
                past_harvest: []
            },
        }
        //this is associate farmer
        if (farmerType == 1) {
            const basicDetails = await farmer.findById(farmerId)
            const address = await farmer.findById(farmerId)
            const landDetails = await Land.findOne({ farmer_id: farmerId })
            const cropDetails = await Crop.find({ farmer_id: farmerId })
            const bankDetails = await Bank.findOne({ farmer_id: farmerId })

            SINGLE_FARMER_INITIALS.basic_details = {
                name: basicDetails?.name || null,
                father_spouse_name: basicDetails?.parents?.father_name ||
                    basicDetails.parents?.mother_name || null,
                email: bankDetails?.email || null,
                mobile_no: basicDetails?.mobile_no || null,
                category: basicDetails?.category || null,
                farmer_type: basicDetails?.farmer_type || null,
                gender: basicDetails?.gender || null
            }
            SINGLE_FARMER_INITIALS.address = {
                address_line_1: address?.address.address_line || null,
                address_line_2: address?.address.address_line || null,
                pincode: address?.address.pinCode || null,
                state: await getState(address?.address?.state_id),
                district: await getDistrict(address?.address?.district_id),
                village_town_city: address?.address.village || null,
                taluka: address?.address.block || null,
                country: address?.address.country || null
            }
            SINGLE_FARMER_INITIALS.land_details = {
                total_area: landDetails?.total_area || null,
                pincode: null,
                khasra_no: landDetails?.khasra_no || null,
                ghat_no: null,
                soil_type: landDetails?.soil_type || null,
                soil_tested: landDetails?.soil_tested || null
            }

            SINGLE_FARMER_INITIALS.bank_details = {
                bank_name: bankDetails?.bank_name || null,
                branch_name: bankDetails?.bank_name || null,
                account_holder_name: bankDetails?.account_holder_name || null,
                ifsc_code: bankDetails?.ifsc_code || null,
                account_no: bankDetails?.account_no || null,
                confirm_account_no: bankDetails?.account_no || null,
                upload_proof: bankDetails?.document || null
            }

            cropDetails.map(item => {
                let crop = {

                    crop_name: item?.crops_name || null,
                    sowing_date: item?.sowing_date || null,
                    harvest_date: item?.harvesting_date || null,
                    season: item?.crop_seasons || null

                }
                let cropHarvestDate = new Date(crop.harvest_date)
                let currentDate = new Date()

                if (cropHarvestDate < currentDate) {
                    SINGLE_FARMER_INITIALS.crop_details.past_harvest.push(crop)
                } else {
                    SINGLE_FARMER_INITIALS.crop_details.upcoming_harvest.push(crop)
                }



            })



            return SINGLE_FARMER_INITIALS;

        }
        //this is individual farmer
        if (farmerType == 2) {
            const individualfarmerDetails = await IndividualModel.findOne({ _id: farmerId })
            //temperary logic as indivdiual farmer don't have crop data 
            const upcomping_crop = individualfarmerDetails.land_details.kharif_crops.map(item => {
                let crop = {

                    crop_name: item || null,
                    sowing_date: item?.sowing_date || null,
                    harvest_date: item?.harvesting_date || null,
                    season: item?.crop_seasons || null

                }

                return crop
            })
            //temperary logic as indivdiual farmer don't have crop data
            const past_crop = individualfarmerDetails.land_details.rabi_crops.map(item => {
                let crop = {

                    crop_name: item || null,
                    sowing_date: item?.sowing_date || null,
                    harvest_date: item?.harvesting_date || null,
                    season: item?.crop_seasons || null

                }

                return crop
            })


            SINGLE_FARMER_INITIALS.basic_details = {
                name: individualfarmerDetails?.basic_details.name || null,
                father_spouse_name: individualfarmerDetails?.basic_details.father_husband_name || null,
                email: individualfarmerDetails?.basic_details.email || null,
                mobile_no: individualfarmerDetails?.basic_details.mobile_no || null,
                category: individualfarmerDetails?.basic_details.category || null,
                dob: individualfarmerDetails?.basic_details.dob || null,
                farmer_type: individualfarmerDetails?.basic_details.farmer_type || null,
                gender: individualfarmerDetails?.basic_details.gender || null
            }
            SINGLE_FARMER_INITIALS.address = {
                address_line_1: individualfarmerDetails?.address.address_line_1 || null,
                address_line_2: individualfarmerDetails?.address.address_line_2 || null,
                pincode: individualfarmerDetails?.address.pinCode || null,
                state: individualfarmerDetails?.state || null,
                district: individualfarmerDetails?.address.district || null,
                village_town_city: individualfarmerDetails?.address.village || null,
                taluka: individualfarmerDetails?.address.block || null,
                country: individualfarmerDetails?.address.country || null
            }
            SINGLE_FARMER_INITIALS.land_details = {
                total_area: individualfarmerDetails?.land_details.total_area || null,
                pincode: individualfarmerDetails?.land_details.pinCode || null,
                khasra_no: individualfarmerDetails?.land_details.khasra_no || null,
                ghat_no: individualfarmerDetails?.land_details.ghat_number || null,
                soil_type: individualfarmerDetails?.land_details.soil_type || null,
                soil_tested: individualfarmerDetails?.land_details.soil_tested || null
            }
            SINGLE_FARMER_INITIALS.crop_details = {

                upcoming_harvest: upcomping_crop,

                past_harvest: past_crop
            }
            SINGLE_FARMER_INITIALS.bank_details = {
                bank_name: individualfarmerDetails?.bank_details.bank_name || null,
                branch_name: individualfarmerDetails?.bank_details.branch_name || null,
                account_holder_name: individualfarmerDetails?.bank_details.account_holder_name || null,
                ifsc_code: individualfarmerDetails?.bank_details.ifsc_code || null,
                account_no: individualfarmerDetails?.bank_details.account_no || null,
                confirm_account_no: individualfarmerDetails?.bank_details.account_no || null,
                upload_proof: individualfarmerDetails?.bank_details.proof_doc_key || null
            }

            return SINGLE_FARMER_INITIALS;
        }


    } catch (error) {
        //  _handleCatchErrors(error, res);
        return

    }

}

