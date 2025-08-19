const {
  _handleCatchErrors,
  dumpJSONToExcel,
} = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const IndividualModel = require("@src/v1/models/app/farmerDetails/IndividualFarmer");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const { Crop } = require("@src/v1/models/app/farmerDetails/Crop");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { parseDateRange } = require("../ho-dashboard/Services");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _paymentApproval } = require("@src/v1/utils/constants");
const { validateObjectIdFields, convertToObjecId } = require("@src/v1/utils/helpers/api.helper");

module.exports. farmerList = async (req, res) => {
  try {
   
    let {
      page = 1,
      limit = 10,
      sortBy = "name",
      search = "",
      isExport = 0,
      state,
      district,
      startDate,
      endDate,
    } = req.query;

    //state = Array.isArray(state) ? state : state ? [state] : [];

    const skip = (page - 1) * limit;
    const searchFields = ["name", "farmer_id", "farmer_code", "mobile_no"];
    validateObjectIdFields(req, res, ['state', 'district']);

    // Disallow special characters
    if (/[.*+?^${}()|[\]\\]/.test(search)) {
      return sendResponse({
        res,
        status: 400,
        errorCode: 400,
        errors: [{ message: "Do not use any special character" }],
        message: "Do not use any special character",
      });
    }

    // Create search query
    const makeSearchQuery = (fields) => ({
      $or: fields.map((item) => ({
        [item]: { $regex: search, $options: "i" },
      })),
    });

    const query = search ? makeSearchQuery(searchFields) : {};

    // //  Build State & District Maps
    // const stateDistrictData = await StateDistrictCity.find(
    //   {},
    //   { states: 1 }
    // ).lean();

    // const stateMap = {};
    // const districtMap = {};
    // const reverseStateMap = {};
    // const reverseDistrictMap = {};

    // stateDistrictData.forEach(({ states }) => {
    //   states.forEach(({ _id, state_title, districts }) => {
    //     const stateIdStr = _id.toString();
    //     stateMap[stateIdStr] = state_title;
    //     reverseStateMap[state_title.toLowerCase()] = stateIdStr;

    //     districts.forEach(({ _id, district_title }) => {
    //       const districtIdStr = _id.toString();
    //       districtMap[districtIdStr] = district_title;
    //       reverseDistrictMap[district_title.toLowerCase()] = districtIdStr;
    //     });
    //   });
    // });


    // if (state.length > 0 || district) {
    //   const andConditions = [];

    //   // Handle multiple states
    //   if (state.length > 0) {
    //     const stateIds = state
    //       .map((s) => reverseStateMap[s.toLowerCase()])
    //       .filter(Boolean);

    //     if (stateIds.length > 0) {
    //       andConditions.push({ "address.state_id": { $in: stateIds } });
    //     } else {
    //       return sendResponse({
    //         res,
    //         status: 200,
    //         data: { count: 0, rows: [], page, limit, pages: 0 },
    //         message: "No matching states found",
    //       });
    //     }
    //   }

    //   // Handle single district
    //   if (district) {
    //     const districtId = reverseDistrictMap[district.toLowerCase()];
    //     if (districtId) {
    //       andConditions.push({ "address.district_id": districtId });
    //     } else {
    //       return sendResponse({
    //         res,
    //         status: 200,
    //         data: { count: 0, rows: [], page, limit, pages: 0 },
    //         message: "No matching district found",
    //       });
    //     }
    //   }

    //   if (andConditions.length > 0) {
    //     query.$and = [...(query.$and || []), ...andConditions];
    //   }

    // }
     const records = { count: 0, rows: [] };

    //  EXPORT to Excel
    if (isExport == 1) {
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          // Set time to end of the day
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
      const farmers = await farmer
        .find(query)
        .populate({ path: "associate_id", select: "user_code" })
        .sort(sortBy)
        .lean();



      const farmerIds = farmers.map((f) => f._id);
      const crops = await Crop.find({ farmer_id: { $in: farmerIds } }).lean();
      const landRecords = await Land.find({
        farmer_id: { $in: farmerIds },
      }).lean();

      const cropsByFarmer = crops.reduce((acc, crop) => {
        const farmerId = crop.farmer_id?.toString();
        if (!acc[farmerId]) acc[farmerId] = [];
        acc[farmerId].push(crop);
        return acc;
      }, {});
      const landByFarmer = landRecords.reduce((acc, land) => {
        const farmerId = land.farmer_id?.toString();
        if (!acc[farmerId]) acc[farmerId] = [];
        acc[farmerId].push(land);
        return acc;
      }, {});

      const data = await Promise.all ( 
        farmers.map( async (item) => {
        const address = await getAddress(item);
        const farmerIdStr = item._id.toString();
        const crops = cropsByFarmer[farmerIdStr] || [];
        const lands = landByFarmer[farmerIdStr] || [];

        return {
          ...item,
          address : address,
          crop_details: crops,
          land_details: lands, // replaces previous "land_details"
        };
      }) );

     
      const exportData = data.map((item) => {
        return {
          "Associate ID": item?.associate_id || "NA",
          "Farmer ID": item?.farmer_id || "NA",
          "Farmer Name": item?.name || "NA",
          "Father/Spouse Name": item?.parents?.father_name || "NA",
          "Mother Name": item?.parents?.mother_name || "NA",
          "Mobile Number": item?.mobile_no || "NA",
          "Created At" : item?.createdAt || "NA",
          "Email ": item?.basic_details?.email || "NA",
          "Category": item?.basic_details?.category || "NA",
          "Age": item?.basic_details?.age || "NA",
          "Date of Birth": item?.basic_details?.dob || "NA",
          "Farmer Type": item?.basic_details?.farmer_type || "NA",
          "Gender": item?.basic_details?.gender || "NA",
          "Address Line 1": item?.address?.address_line_1 || "NA",
          "Address Line 2": item?.address?.address_line_2 || "NA",
          village: item?.address?.village || "NA",
          Block: item?.address?.block || "NA",
          Tahshil: item?.address?.tahshil || "NA",
          District: item?.address?.district || "NA",
          State: item?.address?.state || "NA",
          Country: item?.address?.country || "NA",
          "Pin Code": item?.address?.pin_code || "NA",
          Lat: item?.address?.lat || "NA",
          Long: item?.address?.long || "NA",
          "Land Details": item?.land_details || "NA",
          "Crop Details": item?.crop_details || "NA",
          "Bank Name": item?.bank_details?.bank_name || "NA",
          "Account Holder Name":
            item?.bank_details?.account_holder_name || "NA",
          "IFSC Code": item?.bank_details?.ifsc_code || "NA",
          "Account Number": item?.bank_details?.account_no || "NA",
          "Account Status": item?.bank_details?.accountstatus || "NA",
          "Welcome Msg Send": item?.is_welcome_msg_send || "NA",
          "Verify Otp": item?.is_verify_otp || "NA",
          "Haryna Famer Code": item?.harynaNewFarmer_code || "NA",
          "User Type": item?.user_type || "NA",
          "Marital Status": item?.marital_status || "NA",
          Religion: item?.religion || "NA",
          "Eduction (Highest)": item?.education?.highest_edu || "NA",
          "Eduction (Details)": item?.education?.edu_details || "NA",
          "Proof (Type)": item?.proof?.type || "NA",
          "Proof (Aadhar no.)": item?.proof?.aadhar_no || "NA",
          Status: item?.status || "NA",
          "External Farmer Id": item?.external_farmer_id || "NA",
          "Infra Structure (Warehouse) ":
            item?.infrastructure_needs?.warehouse || "NA",
          "Infra Structure (Cold Storage) ":
            item?.infrastructure_needs?.cold_storage || "NA",
          "Infra Structure (Processing Unit) ":
            item?.infrastructure_needs?.processing_unit || "NA",
          "Infra Structure (Teansportation) ":
            item?.infrastructure_needs?.transportation_facilities || "NA",
          Ekhird: item?.ekhrid || "NA",
          "Famer Tracent Code": item?.farmer_tracent_code || "NA",
          "Financial Support (Creadit Facillties)":
            item?.financial_support?.credit_facilities || "NA",
          "Financial Support (Soure of Credit)":
            item?.financial_support?.source_of_credit || "NA",
          "Financial Support (Financial Chanllenges)":
            item?.financial_support?.financial_challenges || "NA",
          "Financial Support (Support Required)":
            item?.financial_support?.support_required || "NA",
          "hr_p_code (p_DCodeLGD)": item?.hr_p_code?.p_DCodeLGD || "NA",
          "hr_p_code (p_BtCodeLGD)": item?.hr_p_code?.p_BtCodeLGD || "NA",
          "hr_p_code (p_WvCodeLGD)": item?.hr_p_code?.p_WvCodeLGD || "NA",
          "hr_p_code (p_address)": item?.hr_p_code?.p_address || "NA",
          "hr_p_code (Dis_code)": item?.hr_p_code?.Dis_code || "NA",
          "hr_p_code (Teh_code)": item?.hr_p_code?.Teh_code || "NA",
          "hr_p_code (Vil_code)": item?.hr_p_code?.Vil_code || "NA",
          "hr_p_code (statecode)": item?.hr_p_code?.statecode || "NA",
          "Land Details (Khtauni Number)":
            item?.land_details?.khtauni_number || "NA",
          "Land Details (khasra Number)":
            item?.land_details?.khasra_number || "NA",
          "Soil Testing Agencies":
            item?.land_details?.soil_testing_agencies || "NA",
          "Land Details (LandCropID)": item?.land_details?.LandCropID || "NA",
          "Land Details (Muraba)": item?.land_details?.Muraba || "NA",
          "Land Details (khewat)": item?.land_details?.khewat || "NA",
          "Land Details (sownkanal)": item?.land_details?.sownkanal || "NA",
          "Land Details (SownMarla)": item?.land_details?.SownMarla || "NA",
          "Land Details (SownAreaInAcre)":
            item?.land_details?.SownAreaInAcre || "NA",
          "Land Details (RevenueKanal)":
            item?.land_details?.RevenueKanal || "NA",
          "Land Details (RevenueMarla)":
            item?.land_details?.RevenueMarla || "NA",
          "Land Details (RevenueAreaInAcre)":
            item?.land_details?.RevenueAreaInAcre || "NA",
          "Crop Details (Season Name)": item?.crop_details?.seasonname || "NA",
          "Crop Details (Season Id)": item?.crop_details?.seasonid || "NA",
          "Crop Details (L LGD DIS CODE)":
            item?.crop_details?.L_LGD_DIS_CODE || "NA",
          "Crop Details (L LGD TEH CODE)":
            item?.crop_details?.L_LGD_TEH_CODE || "NA",
          "Crop Details (L LGD VIL CODE)":
            item?.crop_details?.L_LGD_VIL_CODE || "NA",
          "Crop Details (Sown Commodity ID)":
            item?.crop_details?.SownCommodityID || "NA",
          "Crop Details (Sown Commodity Name)":
            item?.crop_details?.SownCommodityName || "NA",
          "Crop Details (Commodity Variety)":
            item?.crop_details?.CommodityVariety || "NA",
          "Crop Details (Crop Growth Stage)":
            item?.crop_details?.crop_growth_stage || "NA",
          "Crop Details (Crop Name)": item?.crop_details?.crop_name || "NA",
          "Crop Details (Harvesting Date)":
            item?.crop_details?.harvesting_date || "NA",
          "Crop Details (Production Quantity)":
            item?.crop_details?.production_quantity || "NA",
          "Crop Details (Production Quantity)":
            item?.crop_details?.production_quantity || "NA",
          "Crop Details (Selling Price)":
            item?.crop_details?.selling_price || "NA",
          "Crop Details (Yield)": item?.crop_details?.yield || "NA",
          "Crop Details (Land Name)": item?.crop_details?.land_name || "NA",
          "Crop Details (Crop Disease)":
            item?.crop_details?.crop_disease || "NA",
          "Crop Details (Crop Rotation)":
            item?.crop_details?.crop_rotation || "NA",
          "Insurance Details (Insurance Company)":
            item?.insurance_details?.insurance_company || "NA",
          "Insurance Details (Insurance Worth)":
            item?.insurance_details?.insurance_worth || "NA",
          "Insurance Details (Insurance Premium)":
            item?.insurance_details?.insurance_premium || "NA",
          "Insurance Details (Insurance Start Date)":
            item?.insurance_details?.insurance_start_date || "NA",
          "Insurance Details (Insurance End Date)":
            item?.insurance_details?.insurance_end_date || "NA",
          "Seeds (Crop Name)": item?.input_details?.seeds?.crop_name || "NA",
          "Seeds (Crop Variety)":
            item?.input_details?.seeds?.crop_variety || "NA",
          "Seeds (Name of Seeds)":
            item?.input_details?.seeds?.name_of_seeds || "NA",
          "Seeds (Name of Seeds Company)":
            item?.input_details?.seeds?.name_of_seeds_company || "NA",
          "Seeds (Package Size)":
            item?.input_details?.seeds?.package_size || "NA",
          "Seeds (Total Package Required)":
            item?.input_details?.seeds?.total_package_required || "NA",
          "Seeds (Date of Purchase)":
            item?.input_details?.seeds?.date_of_purchase || "NA",
        };
      });

      return dumpJSONToExcel(req, res, {
        data: exportData,
        fileName: `Farmer-List.xlsx`,
        worksheetName: `Farmer-List`,
      });
    }


    if(state){
      query['address.state_id'] = convertToObjecId(state);
    }
    if(district){
      query['address.district_id'] = convertToObjecId(district);
    }

    //  PAGINATED FETCH
    records.rows = await farmer
      .find(query)
      .select(
        "farmer_code farmer_id name parents mobile_no address basic_details associate_id bank_details.is_verified proof createdAt"
      )
      .populate({ path: "associate_id", select: "user_code" })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort(sortBy)
      .lean();

    const data = await Promise.all(
      records.rows.map(async (item) => {
        const address = await getAddress(item);
        const basicDetails = item?.basic_details || {};
        

        return {
          _id: item?._id,
          farmer_name: item?.name,
          address: address,
          basic_details: basicDetails,
          mobile_no: item?.mobile_no,
          associate_id: item?.associate_id?.user_code || null,
          farmer_id: item?.farmer_id,
          father_spouse_name:
            item?.parents?.father_name || item?.parents?.mother_name || null,
          bank_details: item?.bank_details,
          proof: item?.proof,

          createdAt: item?.createdAt || null,
        };
      })
    );

    records.rows = data;
    records.count = await farmer.countDocuments(query);
    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

    return sendResponse({
      res,
      status: 200,
      data: records,
      message: _response_message.found("farmers"),
    });
  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
};

module.exports. farmerListExport = async (req, res) => {
  try {
   

    let {
   
      sortBy = "name",
      state,
      startDate,
      endDate,
    } = req.query;

    state = Array.isArray(state) ? state : state ? [state] : [];

    let query = {};

    const stateDistrictData = await StateDistrictCity.find(
      {},
      { states: 1 }
    ).lean();

    const stateMap = {};
    const reverseStateMap = {};

    stateDistrictData.forEach(({ states }) => {
      states.forEach(({ _id, state_title, districts }) => {
        const stateIdStr = _id.toString();
        stateMap[stateIdStr] = state_title;
        reverseStateMap[state_title.toLowerCase()] = stateIdStr;
      });
    });


    if (state.length > 0 ) {
      const andConditions = [];

      // Handle multiple states
      if (state.length > 0) {
        const stateIds = state
          .map((s) => reverseStateMap[s.toLowerCase()])
          .filter(Boolean);

        if (stateIds.length > 0) {
          andConditions.push({ "address.state_id": { $in: stateIds } });
        } else {
          return sendResponse({
            res,
            status: 200,
            data: { count: 0, rows: [], page, limit, pages: 0 },
            message: "No matching states found",
          });
        }
      }
      if (andConditions.length > 0) {
        query.$and = [...(query.$and || []), ...andConditions];
      }
    }
    const records = { count: 0, rows: [] };

     if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
    
     const farmers = await farmer
        .find(query)
        .populate({ path: "associate_id", select: "user_code" })
        .sort(sortBy)
        .lean();

      const farmerIds = farmers.map((f) => f._id);
      const crops = await Crop.find({ farmer_id: { $in: farmerIds } }).lean();
      const landRecords = await Land.find({
        farmer_id: { $in: farmerIds },
      }).lean();

      const cropsByFarmer = crops.reduce((acc, crop) => {
        const farmerId = crop.farmer_id?.toString();
        if (!acc[farmerId]) acc[farmerId] = [];
        acc[farmerId].push(crop);
        return acc;
      }, {});
      const landByFarmer = landRecords.reduce((acc, land) => {
        const farmerId = land.farmer_id?.toString();
        if (!acc[farmerId]) acc[farmerId] = [];
        acc[farmerId].push(land);
        return acc;
      }, {});

      const data = await Promise.all ( 
        farmers.map( async (item) => {
        const address = await getAddress(item);
        const farmerIdStr = item._id.toString();
        const crops = cropsByFarmer[farmerIdStr] || [];
        const lands = landByFarmer[farmerIdStr] || [];

        return {
          ...item,
          address : address,
          crop_details: crops,
          land_details: lands, 
        };
      }) );

       records.rows = data;
    
      
      const exportData = data.map((item) => {
        return {
          "Associate ID": item?.associate_id?.user_code || "NA",
          "Farmer ID": item?.farmer_id || "NA",
          "Farmer Name": item?.name || "NA",
          "Father/Spouse Name": item?.parents?.father_name || "NA",
          "Mother Name": item?.parents?.mother_name || "NA",
          "Mobile Number": item?.mobile_no || "NA",
          "Created At" : item?.createdAt || "NA",
          "Email ": item?.basic_details?.email || "NA",
          "Category": item?.basic_details?.category || "NA",
          "Age": item?.basic_details?.age || "NA",
          "Date of Birth": item?.basic_details?.dob || "NA",
          "Farmer Type": item?.basic_details?.farmer_type || "NA",
          "Gender": item?.basic_details?.gender || "NA",
          "Address Line 1": item?.address?.address_line_1 || "NA",
          "Address Line 2": item?.address?.address_line_2 || "NA",
          village: item?.address?.village || "NA",
          Block: item?.address?.block || "NA",
          Tahshil: item?.address?.tahshil || "NA",
          District: item?.address?.district || "NA",
          State: item?.address?.state || "NA",
          Country: item?.address?.country || "NA",
          "Pin Code": item?.address?.pin_code || "NA",
          "Bank Name": item?.bank_details?.bank_name || "NA",
          "Account Holder Name":
            item?.bank_details?.account_holder_name || "NA",
          "IFSC Code": item?.bank_details?.ifsc_code || "NA",
          "Account Number": item?.bank_details?.account_no || "NA",
          "Account Status": item?.bank_details?.accountstatus || "NA",
          "Welcome Msg Send": item?.is_welcome_msg_send ,
          "Verify Otp": item?.is_verify_otp ,
          "Haryna Famer Code": item?.harynaNewFarmer_code ,
          "User Type": item?.user_type || "NA",
          "Marital Status": item?.marital_status,
          Religion: item?.religion || "NA",
          "Eduction (Highest)": item?.education?.highest_edu || "NA",
          "Eduction (Details)": item?.education?.edu_details || "NA",
          "Proof (Type)": item?.proof?.type || "NA",
          "Proof (Aadhar no.)": item?.proof?.aadhar_no || "NA",
          Status: item?.status || "NA",
          "External Farmer Id": item?.external_farmer_id || "NA",
          "Infra Structure (Warehouse) ":
            item?.infrastructure_needs?.warehouse || "NA",
          "Infra Structure (Cold Storage) ":
            item?.infrastructure_needs?.cold_storage || "NA",
          "Infra Structure (Processing Unit) ":
            item?.infrastructure_needs?.processing_unit || "NA",
          "Infra Structure (Teansportation) ":
            item?.infrastructure_needs?.transportation_facilities || "NA",
          Ekhird: item?.ekhrid || "NA",
          "Famer Tracent Code": item?.farmer_tracent_code || "NA",
          "Financial Support (Creadit Facillties)":
            item?.financial_support?.credit_facilities || "NA",
          "Financial Support (Soure of Credit)":
            item?.financial_support?.source_of_credit || "NA",
          "Financial Support (Financial Chanllenges)":
            item?.financial_support?.financial_challenges || "NA",
          "Financial Support (Support Required)":
            item?.financial_support?.support_required || "NA",
          "hr_p_code (p_DCodeLGD)": item?.hr_p_code?.p_DCodeLGD || "NA",
          "hr_p_code (p_BtCodeLGD)": item?.hr_p_code?.p_BtCodeLGD || "NA",
          "hr_p_code (p_WvCodeLGD)": item?.hr_p_code?.p_WvCodeLGD || "NA",
          "hr_p_code (p_address)": item?.hr_p_code?.p_address || "NA",
          "hr_p_code (Dis_code)": item?.hr_p_code?.Dis_code || "NA",
          "hr_p_code (Teh_code)": item?.hr_p_code?.Teh_code || "NA",
          "hr_p_code (Vil_code)": item?.hr_p_code?.Vil_code || "NA",
          "hr_p_code (statecode)": item?.hr_p_code?.statecode || "NA",
          "Land Details (Khtauni Number)":
            item?.land_details?.[0]?.khtauni_number || "NA",
          "Land Details (khasra Number)":
            item?.land_details?.[0]?.khasra_number || "NA",
          "Soil Testing Agencies":
            item?.land_details?.[0]?.soil_testing_agencies || "NA",
          "Land Details (LandCropID)": item?.land_details?.[0]?.LandCropID || "NA",
          "Land Details (Muraba)": item?.land_details?.[0]?.Muraba || "NA",
          "Land Details (khewat)": item?.land_details?.[0]?.khewat || "NA",
          "Land Details (sownkanal)": item?.land_details?.[0]?.sownkanal || "NA",
          "Land Details (SownMarla)": item?.land_details?.[0]?.SownMarla || "NA",
          "Land Details (SownAreaInAcre)":
            item?.land_details?.[0]?.SownAreaInAcre || "NA",
          "Land Details (RevenueKanal)":
            item?.land_details?.[0]?.RevenueKanal || "NA",
          "Land Details (RevenueMarla)":
            item?.land_details?.[0]?.RevenueMarla || "NA",
          "Land Details (RevenueAreaInAcre)":
            item?.land_details?.[0]?.RevenueAreaInAcre || "NA",
          "Crop Details (Season Name)": item?.crop_details?.[0]?.crop_season || "NA",
          "Crop Details (L LGD DIS CODE)":
            item?.crop_details?.[0]?.L_LGD_DIS_CODE || "NA",
          "Crop Details (L LGD TEH CODE)":
            item?.crop_details?.[0]?.L_LGD_TEH_CODE || "NA",
          "Crop Details (L LGD VIL CODE)":
            item?.crop_details?.[0]?.L_LGD_VIL_CODE || "NA",
          "Crop Details (Sown Commodity ID)":
            item?.crop_details?.[0]?.SownCommodityID || "NA",
          "Crop Details (Sown Commodity Name)":
            item?.crop_details?.[0]?.SownCommodityName || "NA",
          "Crop Details (Commodity Variety)":
            item?.crop_details?.[0]?.CommodityVariety || "NA",
          "Crop Details (Crop Growth Stage)":
            item?.crop_details?.[0]?.crop_growth_stage || "NA",
          "Crop Details (Crop Name)": item?.crop_details?.[0]?.crop_name || "NA",
          "Crop Details (Harvesting Date)":
            item?.crop_details?.[0]?.harvesting_date || "NA",
          "Crop Details (Production Quantity)":
            item?.crop_details?.[0]?.production_quantity || "NA",
          "Crop Details (Production Quantity)":
            item?.crop_details?.[0]?.production_quantity || "NA",
          "Crop Details (Selling Price)":
            item?.crop_details?.[0]?.selling_price || "NA",
          "Crop Details (Yield)": item?.crop_details?.[0]?.yield || "NA",
          "Crop Details (Land Name)": item?.crop_details?.[0]?.land_name || "NA",
          "Crop Details (Crop Disease)":
            item?.crop_details?.[0]?.crop_disease || "NA",
          "Crop Details (Crop Rotation)":
            item?.crop_details?.[0]?.crop_rotation || "NA",
          "Insurance Details (Insurance Company)":
            item?.crop_details?.[0]?.insurance_details?.[0]?.insurance_company || "NA",
          "Insurance Details (Insurance Worth)":
            item?.crop_details?.[0]?.insurance_details?.[0]?.insurance_worth || "NA",
          "Insurance Details (Insurance Premium)":
            item?.crop_details?.[0]?.insurance_details?.[0]?.insurance_premium || "NA",
          "Insurance Details (Insurance Start Date)":
            item?.crop_details?.[0]?.insurance_details?.[0]?.insurance_start_date || "NA",
          "Insurance Details (Insurance End Date)":
            item?.crop_details?.[0]?.insurance_details?.[0]?.insurance_end_date || "NA",
          "Seeds (Crop Name)": item?.crop_details?.[0]?.input_details?.[0]?.seeds?.crop_name || "NA",
          "Seeds (Crop Variety)":
            item?.crop_details?.[0]?.input_details?.[0]?.seeds?.crop_variety || "NA",
          "Seeds (Name of Seeds)":
            item?.crop_details?.[0]?.input_details?.[0]?.seeds?.name_of_seeds || "NA",
          "Seeds (Name of Seeds Company)":
            item?.crop_details?.[0]?.input_details?.[0]?.seeds?.name_of_seeds_company || "NA",
          "Seeds (Package Size)":
            item?.input_details?.[0]?.seeds?.package_size || "NA",
          "Seeds (Total Package Required)":
            item?.crop_details?.[0]?.input_details?.[0]?.seeds?.total_package_required || "NA",
          "Seeds (Date of Purchase)":
            item?.crop_details?.[0]?.input_details?.[0]?.seeds?.date_of_purchase || "NA",
        };
      });

      return dumpJSONToExcel(req, res, {
        data: exportData,
        fileName: `Farmer-List.xlsx`,
        worksheetName: `Farmer-List`,
      });
  
  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
};

module.exports.getSingleFarmer = async (req, res) => {
  try {
    const farmerId = req.params.id;
    if (!farmerId)
      return sendResponse({
        res,
        status: 400,
        data: null,
        message: _response_message.notProvided("Farmer Id"),
      });

    const farmerData = await farmer
      .findById(farmerId)
      .populate("land_details.land_id crop_details.crop_id");

    //console.log(farmerData);

    const state = await getState(farmerData.address?.state_id);
    const district = await getDistrict(
      farmerData.address?.district_id,
      farmerData.address?.state_id
    );

    const response = {
      ...JSON.parse(JSON.stringify(farmerData)),
      address: {
        ...JSON.parse(JSON.stringify(farmerData.address)),
        state,
        district,
      },
    };

    if (!farmerData) {
      return sendResponse({
        res,
        status: 200,
        data: response,
        message: _response_message.notFound("farmer"),
      });
    }

    return sendResponse({
      res,
      status: 200,
      data: response,
      message: _response_message.found("farmer"),
    });
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getAllStateAndDistricts = async (req, res) => {
  try {
    const farmerStates = await farmer.distinct("address.state_id");
    const farmerDistricts = await farmer.distinct("address.district_id");

    const stateEntries = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      { $match: { "states._id": { $in: farmerStates } } },
      { $unwind: "$states.districts" },
      { $match: { "states.districts._id": { $in: farmerDistricts } } },
      {
        $group: {
          _id: "$states._id",
          state_title: { $first: "$states.state_title" },
          districts: {
            $push: {
              label: "$states.districts.district_title",
              value: "$states.districts._id",
            },
          },
        },
      },
      {
        $project: {
          label: "$state_title",
          value: "$_id",
          districts: 1,
        },
      },
      { $sort: { label: 1 } }, // Sort states alphabetically
    ]);

    return sendResponse({
      res,
      status: 200,
      data: stateEntries,
      message: _response_message.found("All farmer State and districts"),
    });
  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
};

module.exports.getStatewiseFarmersCount = async (req, res) => {
  try {
    const farmerStates = await farmer.distinct("address.state_id", {
      "address.state_id": { $ne: null },
    });
    // Aggregate over the StateDistrictCity collection
    const stateEntries = await StateDistrictCity.aggregate([
      {
        $unwind: "$states",
      },
      {
        $match: {
          "states._id": { $in: farmerStates.filter((id) => id) },
        },
      },
      {
        // Optimized $lookup with $group to directly get counts
        $lookup: {
          from: "farmers",
          let: { stateId: "$states._id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$address.state_id", "$$stateId"] },
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
          as: "farmers_count",
        },
      },
      {
        // Restructure the output with count from lookup
        $project: {
          state: "$states.state_title",
          count: {
            $ifNull: [{ $arrayElemAt: ["$farmers_count.count", 0] }, 0],
          }, // Get count from lookup, default to 0
          _id: 0, // Exclude _id field
        },
      },
    ]);

    const totalFarmers = stateEntries.reduce(
      (sum, state) => sum + state.count,
      0
    );

    return sendResponse({
      res,
      status: 200,
      data: { stateWiseCount: stateEntries, totalCount: totalFarmers },
      message: _response_message.found("All farmers count fetch successfully"),
    });
  } catch (error) {
    console.log("error", error);
    _handleCatchErrors(error, res);
  }
};

const getState = async (stateId) => {
  try {
    if (!stateId) return "";

    const state = await StateDistrictCity.findOne(
      { states: { $elemMatch: { _id: stateId.toString() } } },
      { "states.$": 1 }
    );

    return state?.states[0]?.state_title || "";
  } catch (error) {
    console.error("Error in getState:", error);
    return "";
  }
};

const getDistrict = async (districtId, stateId) => {
  try {
    if (!districtId || !stateId) return "";

    const state = await StateDistrictCity.findOne(
      { states: { $elemMatch: { _id: stateId.toString() } } },
      { "states.$": 1 }
    );

    const district = state?.states[0]?.districts?.find(
      (item) => item?._id.toString() === districtId.toString()
    );

    return district?.district_title || "";
  } catch (error) {
    console.error("Error in getDistrict:", error);
    return "";
  }
};

const getAddress = async (item) => {
  try {
    if (!item?.address) {
      return {
        country: "",
        state: "",
        district: "",
        block: "",
        village: "",
        pin_code: "",
      };
    }

    const state = await getState(item.address.state_id);
    const district = await getDistrict(
      item.address.district_id,
      item.address.state_id
    );

    return {
      country: item.address.country || "",
      state: state,
      district: district,
      block: item.address.block || "",
      village: item.address.village || "",
      pin_code: item.address.pin_code || "",
      state_id: item.address.state_id,
      district_id: item.address.district_id
    };
  } catch (error) {
    console.error("Error in getAddress:", error);
    return {
      country: "",
      state: "",
      district: "",
      block: "",
      village: "",
      pin_code: "",
    };
  }
};

const singlefarmerDetails = async (res, farmerId, farmerType = 1) => {
  try {
    const SINGLE_FARMER_INITIALS = {
      basic_details: {},
      address: {},
      land_details: {},
      bank_details: {},
      crop_details: {
        upcoming_harvest: [],
        past_harvest: [],
      },
    };
    //this is associate farmer
    if (farmerType == 1) {
      const basicDetails = await farmer.findById(farmerId);
      const address = await farmer.findById(farmerId);
      const landDetails = await Land.findOne({ farmer_id: farmerId });
      const cropDetails = await Crop.find({ farmer_id: farmerId });
      const bankDetails = await Bank.findOne({ farmer_id: farmerId });

      SINGLE_FARMER_INITIALS.basic_details = {
        name: basicDetails?.name || null,
        father_spouse_name:
          basicDetails?.parents?.father_name ||
          basicDetails.parents?.mother_name ||
          null,
        email: bankDetails?.email || null,
        mobile_no: basicDetails?.mobile_no || null,
        category: basicDetails?.category || null,
        farmer_type: basicDetails?.farmer_type || null,
        gender: basicDetails?.gender || null,
      };
      SINGLE_FARMER_INITIALS.address = {
        address_line_1: address?.address.address_line || null,
        address_line_2: address?.address.address_line || null,
        pincode: address?.address.pinCode || null,
        state: await getState(address?.address?.state_id),
        district: await getDistrict(address?.address?.district_id),
        village_town_city: address?.address.village || null,
        taluka: address?.address.block || null,
        country: address?.address.country || null,
      };
      SINGLE_FARMER_INITIALS.land_details = {
        total_area: landDetails?.total_area || null,
        pincode: null,
        khasra_no: landDetails?.khasra_no || null,
        ghat_no: null,
        soil_type: landDetails?.soil_type || null,
        soil_tested: landDetails?.soil_tested || null,
      };

      SINGLE_FARMER_INITIALS.bank_details = {
        bank_name: bankDetails?.bank_name || null,
        branch_name: bankDetails?.bank_name || null,
        account_holder_name: bankDetails?.account_holder_name || null,
        ifsc_code: bankDetails?.ifsc_code || null,
        account_no: bankDetails?.account_no || null,
        confirm_account_no: bankDetails?.account_no || null,
        upload_proof: bankDetails?.document || null,
      };

      cropDetails.map((item) => {
        let crop = {
          crop_name: item?.crops_name || null,
          sowing_date: item?.sowing_date || null,
          harvest_date: item?.harvesting_date || null,
          season: item?.crop_seasons || null,
        };
        let cropHarvestDate = new Date(crop.harvest_date);
        let currentDate = new Date();

        if (cropHarvestDate < currentDate) {
          SINGLE_FARMER_INITIALS.crop_details.past_harvest.push(crop);
        } else {
          SINGLE_FARMER_INITIALS.crop_details.upcoming_harvest.push(crop);
        }
      });

      return SINGLE_FARMER_INITIALS;
    }
    //this is individual farmer
    if (farmerType == 2) {
      const individualfarmerDetails = await IndividualModel.findOne({
        _id: farmerId,
      });
      //temperary logic as indivdiual farmer don't have crop data
      const upcomping_crop =
        individualfarmerDetails.land_details.kharif_crops.map((item) => {
          let crop = {
            crop_name: item || null,
            sowing_date: item?.sowing_date || null,
            harvest_date: item?.harvesting_date || null,
            season: item?.crop_seasons || null,
          };

          return crop;
        });
      //temperary logic as indivdiual farmer don't have crop data
      const past_crop = individualfarmerDetails.land_details.rabi_crops.map(
        (item) => {
          let crop = {
            crop_name: item || null,
            sowing_date: item?.sowing_date || null,
            harvest_date: item?.harvesting_date || null,
            season: item?.crop_seasons || null,
          };

          return crop;
        }
      );

      SINGLE_FARMER_INITIALS.basic_details = {
        name: individualfarmerDetails?.basic_details.name || null,
        father_spouse_name:
          individualfarmerDetails?.basic_details.father_husband_name || null,
        email: individualfarmerDetails?.basic_details.email || null,
        mobile_no: individualfarmerDetails?.basic_details.mobile_no || null,
        category: individualfarmerDetails?.basic_details.category || null,
        dob: individualfarmerDetails?.basic_details.dob || null,
        farmer_type: individualfarmerDetails?.basic_details.farmer_type || null,
        gender: individualfarmerDetails?.basic_details.gender || null,
      };
      SINGLE_FARMER_INITIALS.address = {
        address_line_1: individualfarmerDetails?.address.address_line_1 || null,
        address_line_2: individualfarmerDetails?.address.address_line_2 || null,
        pincode: individualfarmerDetails?.address.pinCode || null,
        state: individualfarmerDetails?.state || null,
        district: individualfarmerDetails?.address.district || null,
        village_town_city: individualfarmerDetails?.address.village || null,
        taluka: individualfarmerDetails?.address.block || null,
        country: individualfarmerDetails?.address.country || null,
      };
      SINGLE_FARMER_INITIALS.land_details = {
        total_area: individualfarmerDetails?.land_details.total_area || null,
        pincode: individualfarmerDetails?.land_details.pinCode || null,
        khasra_no: individualfarmerDetails?.land_details.khasra_no || null,
        ghat_no: individualfarmerDetails?.land_details.ghat_number || null,
        soil_type: individualfarmerDetails?.land_details.soil_type || null,
        soil_tested: individualfarmerDetails?.land_details.soil_tested || null,
      };
      SINGLE_FARMER_INITIALS.crop_details = {
        upcoming_harvest: upcomping_crop,

        past_harvest: past_crop,
      };
      SINGLE_FARMER_INITIALS.bank_details = {
        bank_name: individualfarmerDetails?.bank_details.bank_name || null,
        branch_name: individualfarmerDetails?.bank_details.branch_name || null,
        account_holder_name:
          individualfarmerDetails?.bank_details.account_holder_name || null,
        ifsc_code: individualfarmerDetails?.bank_details.ifsc_code || null,
        account_no: individualfarmerDetails?.bank_details.account_no || null,
        confirm_account_no:
          individualfarmerDetails?.bank_details.account_no || null,
        upload_proof:
          individualfarmerDetails?.bank_details.proof_doc_key || null,
      };

      return SINGLE_FARMER_INITIALS;
    }
  } catch (error) {
    //  _handleCatchErrors(error, res);
    return;
  }
};

// module.exports.getStatewiseFarmersCount = async (req, res) => {
//     try {

//         const farmerStates = await farmer.distinct('address.state_id', { "address.state_id": { $ne: null } });

// // Aggregate over the StateDistrictCity collection
// const stateEntries = await StateDistrictCity.aggregate([
//     {
//         $unwind: "$states"
//     },
//     {
//         $match: {
//             "states._id": { $in: farmerStates.filter(id => id) }
//         }
//     },
//     {
//         // Optimized $lookup with $group to directly get counts
//         $lookup: {
//             from: "farmers",
//             let: { stateId: "$states._id" },
//             pipeline: [
//                 {
//                     $match: {
//                         $expr: { $eq: ["$address.state_id", "$$stateId"] }
//                     }
//                 },
//                 {
//                     $group: {
//                         _id: null,
//                         count: { $sum: 1 }
//                     }
//                 }
//             ],
//             as: "farmers_count"
//         }
//     },
//     {
//         // Restructure the output with count from lookup
//         $project: {
//             state: "$states.state_title",
//             count: {
//                 $ifNull: [{ $arrayElemAt: ["$farmers_count.count", 0] }, 0]
//             }, // Get count from lookup, default to 0
//             _id: 0 // Exclude _id field
//         }
//     }
// ]);

//         return sendResponse({
//             res,
//             status: 200,
//             data: stateEntries,
//             message: _response_message.found("All farmers count fetch successfully")
//         });
//     } catch (error) {
//         console.log('error', error);
//         _handleCatchErrors(error, res);
//     }
// }

// **************************  CONTROLLERS WITHOUT AGGREGATION    ***************************

// module.exports.getStatewiseFarmersCountWOAggregation = async (req, res) => {
//   try {
//     // Step 1: Get valid states from StateDistrictCity
//     const stateDistrictData = await StateDistrictCity.find(
//       {},
//       { states: 1 }
//     ).lean();

//     const allStates = stateDistrictData.flatMap((doc) => doc.states);
//     const stateMap = {};
//     const stateIds = [];

//     for (const state of allStates) {
//       if (state?._id) {
//         const sid = state._id.toString();
//         stateMap[sid] = state.state_title;
//         stateIds.push(state._id);
//       }
//     }

//     // Step 2: Group in MongoDB — only count per state_id
//     const farmerCounts = await farmer.aggregate([
//       {
//         $match: {
//           "address.state_id": { $in: stateIds },
//         },
//       },
//       {
//         $group: {
//           _id: "$address.state_id",
//           count: { $sum: 1 },
//         },
//       },
//     ]);

//     // Step 3: Build final state-wise count array
//     const stateWiseCount = farmerCounts.map((item) => ({
//       state: stateMap[item._id.toString()] || "Unknown",
//       count: item.count,
//     }));

//     const totalFarmers = stateWiseCount.reduce(
//       (sum, entry) => sum + entry.count,
//       0
//     );

//     return sendResponse({
//       res,
//       status: 200,
//       data: { stateWiseCount, totalCount: totalFarmers },
//       message: _response_message.found(
//         "All farmers count fetched successfully"
//       ),
//     });
//   } catch (error) {
//     console.log("error", error);
//     _handleCatchErrors(error, res);
//   }
// };

module.exports.getStateWiseFarmerCount = async (req, res) => {
  try {
    const { season, commodity_id, schemeId, states, dateRange } = req.query;
   let dateFilter = {};
if (dateRange) {
  const { startDate, endDate } = parseDateRange(dateRange);
  dateFilter = {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };
}


    const hasRequestFilters = season || commodity_id || schemeId;

    // Convert filter strings to arrays (if provided)
    const seasonArr = season
  ? season.split(",").map((s) => new RegExp(s.trim(), "i"))
  : null;
    const commodityArr = commodity_id ? commodity_id.split(",").map((id) => new ObjectId(id.trim())) : null;
    const schemeArr = schemeId ? schemeId.split(",").map((id) => new ObjectId(id.trim())) : null;
    const stateArr = states ? states.split(",").map((id) => new ObjectId(id.trim())) : null;

    const matchStage = stateArr
      ? { "address.state_id": { $in: stateArr }, ...dateFilter }
      : {...dateFilter};

    let pipeline;

    if (hasRequestFilters) {
      // Use full aggregation with Payment and Request filtering
      pipeline = [
        { $match: matchStage },

        {
          $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "farmer_id",
            as: "payments",
          },
        },
        { $unwind: "$payments" },

        {
          $lookup: {
            from: "requests",
            localField: "payments.req_id",
            foreignField: "_id",
            as: "request",
          },
        },
        { $unwind: "$request" },
       {
  $lookup: {
    from: "schemes",
    localField: "request.product.schemeId",
    foreignField: "_id",
    as: "scheme",
  }
},
{ $unwind: { path: "$scheme", preserveNullAndEmptyArrays: true } },

       {
  $match: {
    ...(seasonArr && {
      $or: [
        { "request.product.season": { $in: seasonArr } },
        { "scheme.season": { $in: seasonArr } }
      ]
    }),
    ...(commodityArr && { "request.product.commodity_id": { $in: commodityArr } }),
    ...(schemeArr && { "request.product.schemeId": { $in: schemeArr } }),
  }
},

        {
          $group: {
            _id: "$address.state_id",
            farmerIds: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            state_id: "$_id",
            count: { $size: "$farmerIds" },
            _id: 0,
          },
        },

        {
          $lookup: {
            from: "statedistrictcities",
            let: { stateId: "$state_id" },
            pipeline: [
              { $unwind: "$states" },
              { $match: { $expr: { $eq: ["$states._id", "$$stateId"] } } },
              { $project: { state_title: "$states.state_title", _id: 0 } },
            ],
            as: "state_info",
          },
        },
        { $unwind: { path: "$state_info", preserveNullAndEmptyArrays: true } },

        {
          $project: {
            state_id: 1,
            count: 1,
            state: "$state_info.state_title",
          },
        },
        { $sort: { count: -1 } },
      ];
    } else {
      // Lightweight version: only from farmer → group by state
      pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: "$address.state_id",
            farmerIds: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            state_id: "$_id",
            count: { $size: "$farmerIds" },
            _id: 0,
          },
        },
        {
          $lookup: {
            from: "statedistrictcities",
            let: { stateId: "$state_id" },
            pipeline: [
              { $unwind: "$states" },
              { $match: { $expr: { $eq: ["$states._id", "$$stateId"] } } },
              { $project: { state_title: "$states.state_title", _id: 0 } },
            ],
            as: "state_info",
          },
        },
        { $unwind: { path: "$state_info", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            state_id: 1,
            count: 1,
            state: "$state_info.state_title",
          },
        },
        { $sort: { count: -1 } },
      ];
    }

    const result = await farmer.aggregate(pipeline);

    res.status(200).json({
      status: 200,
      message: "All farmers count fetched successfully found successfully.",
      data: {
        statewise_farmers: result,
        total_farmers: result.reduce( (acc, curr) =>acc+curr.count, 0)
      },
    });
  } catch (err) {
    console.error("Error in getStateWiseFarmerCount:", err);
    res.status(500).json({
      status: 500,
      message: err.message,
      error: err.message,
    });
  }
};
module.exports.getStateWiseProcuredQty = async (req, res) => {
  try {
    const { season, commodity_id, schemeId, states, dateRange } = req.query;
    const { portalId, user_id } = req;
    const paymentIds = await Payment.distinct('req_id', {
      ho_id: { $in: [portalId, user_id] },
      bo_approve_status: _paymentApproval.approved,
    });

   // console.log('paymentIds', paymentIds);
    let query = {
      'request._id': { $in: paymentIds },
    };


    let dateFilter = {};
    if (dateRange) {
      const { startDate, endDate } = parseDateRange(dateRange);
      dateFilter = {
        'batches.createdAt': {
          $gte: startDate,
          $lte: endDate,
        },
      };
    }

    const seasonArr = season
      ? season.split(',').map(s => new RegExp(s.trim(), 'i'))
      : null;
    const commodityArr = commodity_id
      ? commodity_id.split(',').map(id => new ObjectId(id.trim()))
      : null;
    const schemeArr = schemeId
      ? schemeId.split(',').map(id => new ObjectId(id.trim()))
      : null;
    const stateArr = states
      ? states.split(',').map(id => new ObjectId(id.trim()))
      : null;

    const matchStage = stateArr
      ? { 'address.state_id': { $in: stateArr } }
      : {};

    const pipeline = [
      { $match: matchStage },

      // Join with Batch
      {
        $lookup: {
          from: 'batches',
          localField: '_id',
          foreignField: 'procurementCenter_id',
          as: 'batches',
        },
      },
      { $unwind: '$batches' },
      { $match: dateFilter },

      // Join with Request
      {
        $lookup: {
          from: 'requests',
          let: { reqId: '$batches.req_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$reqId'] },
              },
            },
            {
              $project: {
                'product.season': 1,
                'product.commodity_id': 1,
                'product.schemeId': 1,
              },
            },
          ],
          as: 'request',
        },
      },
      { $unwind: { path: '$request', preserveNullAndEmptyArrays: true } },
      { $match: query},
      {
        $lookup: {
          from: 'schemes',
          localField: 'request.product.schemeId',
          foreignField: '_id',
          as: 'scheme',
        },
      },
      { $unwind: { path: '$scheme', preserveNullAndEmptyArrays: true } },

      // Filters
      {
        $match: {
          ...(seasonArr && {
            $or: [
              { 'request.product.season': { $in: seasonArr } },
              { 'scheme.season': { $in: seasonArr } },
            ],
          }),
          ...(commodityArr && {
            'request.product.commodity_id': { $in: commodityArr },
          }),
          ...(schemeArr && { 'request.product.schemeId': { $in: schemeArr } }),
        },
      },

      // Group by state_id and state title directly from ProcurementCenter.address
      //       {
      //         $group: {
      //           _id: {
      //             state_id: '$address.state_id',
      //             state: '$address.state',
      //           },
      //           //totalQty: { $sum: '$batches.qty' },
      //           totalQty: { $sum: '$batches.qty' },
      // todaysQty: {
      //   $sum: {
      //     $cond: [
      //       {
      //         $and: [
      //           { $gte: ['$batches.createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
      //           { $lt: ['$batches.createdAt', new Date(new Date().setHours(23, 59, 59, 999))] },
      //         ],
      //       },
      //       '$batches.qty',
      //       0,
      //     ],
      //   },
      // },

      //         },
      //       },
      //       {
      //         $project: {
      //           state_id: '$_id.state_id',
      //           state: '$_id.state',
      //           totalQty: 1,
      //           _id: 0,
      //         },
      //       },

      {
        $group: {
          _id: {
            state_id: '$address.state_id',
            state: '$address.state',
          },
          totalQty: { $sum: '$batches.qty' },
          todaysQty: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $gte: [
                        '$batches.createdAt',
                        new Date(new Date().setHours(0, 0, 0, 0)),
                      ],
                    },
                    {
                      $lt: [
                        '$batches.createdAt',
                        new Date(new Date().setHours(23, 59, 59, 999)),
                      ],
                    },
                  ],
                },
                '$batches.qty',
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          state_id: '$_id.state_id',
          state: '$_id.state',
          totalQty: 1,
          todaysQty: 1,
          _id: 0,
        },
      },

      { $sort: { totalQty: -1 } },
    ];

    const result = await ProcurementCenter.aggregate(pipeline);

    res.status(200).json({
      status: 200,
      message: 'State-wise procured quantity fetched statusfully',
      data: {
        total_procurement_quantity: result.reduce( (acc, curr) => acc+ curr.totalQty ,0)?.toFixed(3),
        todays_procurement_quantity: result.reduce( (acc, curr) => acc+ curr.todaysQty, 0)?.toFixed(3),
        statewise_procurement_quantity: result,
      },
    });
  } catch (err) {
    console.error('Error in getStateWiseProcuredQty:', err);
    res.status(500).json({
      success: 500,
      message: 'Internal server error',
      error: err.message,
    });
  }
};

