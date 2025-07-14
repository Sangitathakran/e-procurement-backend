const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware, _query } = require("@src/v1/utils/constants/messages");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { ManufacturingUnit } = require("@src/v1/models/app/auth/ManufacturingUnit");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const mongoose = require("mongoose");

async function getStateName(stateId) {
    if (!stateId) return "";
    const state = await StateDistrictCity.findOne(
        { "states": { $elemMatch: { "_id": stateId.toString() } } },
        { "states.$": 1 }
    );
    return state?.states[0]?.state_title || "";
}

async function getDistrictName(districtId, stateId) {
    if (!districtId || !stateId) return "";
    const state = await StateDistrictCity.findOne(
        { "states": { $elemMatch: { "_id": stateId.toString() } } },
        { "states.$": 1 }
    );
    const district = state?.states[0]?.districts?.find(
        item => item?._id.toString() === districtId.toString()
    );
    return district?.district_title || "";
}

async function getManufacturingUnitsWithLocation(distillerId) {
    const units = await ManufacturingUnit.find({ distiller_id: distillerId });
    const result = [];
    for (const unit of units) {
        const stateName = await getStateName(unit.manufacturing_state);
        const districtName = await getDistrictName(unit.manufacturing_district, unit.manufacturing_state);
        result.push({
            unitId: unit._id,
            stateId: unit.manufacturing_state,
            stateName,
            districtId: unit.manufacturing_district,
            districtName,
            ...unit.toObject()
        });
    }
    return result;
}

const saveThirdPartyDistillerDetails = async (userId, formData) => {
    const session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
        const distiller = await Distiller.findById(userId).session(session);
        if (!distiller) throw new Error(_response_message.notFound('User'));

        if (formData.organization_name) {
            distiller.basic_details.distiller_details.organization_name = formData.organization_name;
        }
        if (formData.email) {
            distiller.basic_details.distiller_details.email = formData.email;
        }
        if (formData.phone) {
            distiller.basic_details.distiller_details.phone = formData.phone;
        }
        if (formData.associate_type) {
            let associateType = formData.associate_type;
            if (associateType.toUpperCase() === 'ORGANISATION') {
                associateType = 'Organisation';
            } else if (associateType.toUpperCase() === 'SOCIETY') {
                associateType = 'Society';
            } else if (associateType.toUpperCase() === 'TRUST') {
                associateType = 'Trust';
            } else if (associateType.toUpperCase() === 'INDIVIDUAL') {
                associateType = 'Individual';
            } else if (associateType.toUpperCase() === 'PROPRIETOR') {
                associateType = 'Proprietor';
            } else if (associateType.toUpperCase() === 'PACS') {
                associateType = 'PACS';
            } else if (associateType.toUpperCase() === 'MULTIPURPOSE') {
                associateType = 'MULTIPURPOSE';
            } else if (associateType.toUpperCase() === 'CAMPS') {
                associateType = 'CAMPS';
            } else if (associateType.toUpperCase() === 'AGRICULTURAL') {
                associateType = 'Agricultural';
            }
            distiller.basic_details.distiller_details.associate_type = associateType;
        }

        if (formData.poc_name) {
            distiller.basic_details.point_of_contact.name = formData.poc_name;
        }
        if (formData.poc_email) {
            distiller.basic_details.point_of_contact.email = formData.poc_email;
        }
        if (formData.poc_mobile) {
            distiller.basic_details.point_of_contact.mobile = formData.poc_mobile;
        }
        if (formData.designation) {
            distiller.basic_details.point_of_contact.designation = formData.designation;
        }
        if (formData.aadhar_number) {
            distiller.basic_details.point_of_contact.aadhar_number = formData.aadhar_number;
        }
        if (formData.aadhar_front || formData.aadhar_back) {
            distiller.basic_details.point_of_contact.aadhar_image = {
                front: formData.aadhar_front || distiller.basic_details.point_of_contact.aadhar_image?.front,
                back: formData.aadhar_back || distiller.basic_details.point_of_contact.aadhar_image?.back
            };
        }

        if (formData.owner_name) {
            distiller.basic_details.company_owner_info.name = formData.owner_name;
        }
        if (formData.owner_aadhar_number) {
            distiller.basic_details.company_owner_info.aadhar_number = formData.owner_aadhar_number;
        }
        if (formData.owner_pan_card) {
            distiller.basic_details.company_owner_info.pan_card = formData.owner_pan_card;
        }
        if (formData.owner_aadhar_front || formData.owner_aadhar_back) {
            distiller.basic_details.company_owner_info.aadhar_image = {
                front: formData.owner_aadhar_front || distiller.basic_details.company_owner_info.aadhar_image?.front,
                back: formData.owner_aadhar_back || distiller.basic_details.company_owner_info.aadhar_image?.back
            };
        }
        if (formData.owner_pan_image) {
            distiller.basic_details.company_owner_info.pan_image = formData.owner_pan_image;
        }

        if (formData.state || formData.district || formData.taluka || formData.village) {
            distiller.address.registered = {
                ...distiller.address.registered,
                state: formData.state || distiller.address.registered?.state,
                district: formData.district || distiller.address.registered?.district,
                taluka: formData.taluka || distiller.address.registered?.taluka,
                village: formData.village || distiller.address.registered?.village,
                country: 'India'
            };
        }

        if (formData.cin_number) {
            distiller.company_details.cin_number = formData.cin_number;
        }
        if (formData.cin_image) {
            distiller.company_details.cin_image = formData.cin_image;
        }
        if (formData.tan_number) {
            distiller.company_details.tan_number = formData.tan_number;
        }
        if (formData.tan_image) {
            distiller.company_details.tan_image = formData.tan_image;
        }
        if (formData.pan_card) {
            distiller.company_details.pan_card = formData.pan_card;
        }
        if (formData.pan_image) {
            distiller.company_details.pan_image = formData.pan_image;
        }
        if (formData.gst_no) {
            distiller.company_details.gst_no = formData.gst_no;
        }
        if (formData.pacs_reg_date) {
            distiller.company_details.pacs_reg_date = formData.pacs_reg_date;
        }

        if (formData.authorised_name) {
            distiller.authorised.name = formData.authorised_name;
        }
        if (formData.authorised_designation) {
            distiller.authorised.designation = formData.authorised_designation;
        }
        if (formData.authorised_phone) {
            distiller.authorised.phone = formData.authorised_phone;
        }
        if (formData.authorised_email) {
            distiller.authorised.email = formData.authorised_email;
        }
        if (formData.authorised_aadhar_number) {
            distiller.authorised.aadhar_number = formData.authorised_aadhar_number;
        }
        if (formData.authorised_aadhar_front || formData.authorised_aadhar_back) {
            distiller.authorised.aadhar_certificate = {
                front: formData.authorised_aadhar_front || distiller.authorised.aadhar_certificate?.front,
                back: formData.authorised_aadhar_back || distiller.authorised.aadhar_certificate?.back
            };
        }
        if (formData.authorised_pan_card) {
            distiller.authorised.pan_card = formData.authorised_pan_card;
        }
        if (formData.authorised_pan_image) {
            distiller.authorised.pan_image = formData.authorised_pan_image;
        }

        if (formData.bank_name) {
            distiller.bank_details.bank_name = formData.bank_name;
        }
        if (formData.branch_name) {
            distiller.bank_details.branch_name = formData.branch_name;
        }
        if (formData.account_holder_name) {
            distiller.bank_details.account_holder_name = formData.account_holder_name;
        }
        if (formData.ifsc_code) {
            distiller.bank_details.ifsc_code = formData.ifsc_code;
        }
        if (formData.account_number) {
            distiller.bank_details.account_number = formData.account_number;
        }
        if (formData.upload_proof) {
            distiller.bank_details.upload_proof = formData.upload_proof;
        }

        if (formData.manufactoring_details !== undefined || formData.storage_details !== undefined) {
            distiller.manufactoring_storage = {
                manufactoring_details: formData.manufactoring_details || false,
                storage_details: formData.storage_details || false
            };
        }

        await distiller.save({ session });
        result = { user_code: distiller.user_code, user_id: distiller._id };
    });
    session.endSession();
    return result;
};

const getOnboardingStatus = async (userId) => {
    const record = await Distiller.findOne({ _id: userId }).lean();
    if (!record) throw new Error(_response_message.notFound("user"));
    return [
        { label: "organization", status: record?.basic_details?.distiller_details?.organization_name ? "completed" : "pending" },
        { label: "Basic Details", status: record?.basic_details?.point_of_contact ? "completed" : "pending" },
        { label: "Address", status: record.address ? "completed" : "pending" },
        { label: "Company Details", status: record.company_details ? "completed" : "pending" },
        { label: "Authorised Person", status: record.authorised ? "completed" : "pending" },
        { label: "Bank Details", status: record.bank_details ? "completed" : "pending" },
    ];
};

const getFormPreview = async (userId) => {
    const response = await Distiller.findById({ _id: userId });
    if (!response) throw new Error(_response_message.notFound('User'));
    return response;
};

const finalFormSubmit = async (userId) => {
    const session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
        const distiller = await Distiller.findById(userId).session(session);
        if (!distiller) throw new Error(_response_message.notFound('User'));
        distiller.is_form_submitted = true;
        await distiller.save({ session });
        result = distiller.is_form_submitted;
    });
    session.endSession();
    return result;
};


async function updateDistillerAndUnitsAtomic(distillerId, distillerUpdates, unitsUpdates) {
    const session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
        const distiller = await Distiller.findById(distillerId).session(session);
        if (!distiller) throw new Error('Distiller not found');
        Object.assign(distiller, distillerUpdates);
        await distiller.save({ session });

        const updatedUnits = [];
        for (const { unitId, updates } of unitsUpdates) {
            const unit = await ManufacturingUnit.findById(unitId).session(session);
            if (!unit) throw new Error(`ManufacturingUnit not found: ${unitId}`);
            Object.assign(unit, updates);
            await unit.save({ session });
            updatedUnits.push(unit);
        }
        result = { distiller, updatedUnits };
    });
    session.endSession();
    return result;
}

module.exports = {
    saveThirdPartyDistillerDetails,
    getOnboardingStatus,
    getFormPreview,
    finalFormSubmit,
    getManufacturingUnitsWithLocation,
    updateDistillerAndUnitsAtomic, 
};
