const mongoose = require("mongoose");
const { DistillerDraft } = require("@src/v1/models/app/auth/DistillerDraft");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const {
  ManufacturingUnit,
} = require("@src/v1/models/app/auth/ManufacturingUnit");
const { StorageFacility } = require("@src/v1/models/app/auth/storageFacility");
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const {
  _userType,
  _userStatus,
  _statusType,
  _collectionName,
} = require("@src/v1/utils/constants");
const { getStateId, getDistrictId } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");

const service = require("./service");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");

function replaceUndefinedWithNull(obj) {
  if (Array.isArray(obj)) {
    return obj.map(replaceUndefinedWithNull);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        v === undefined ? null : replaceUndefinedWithNull(v),
      ])
    );
  }
  return obj;
}

exports.createDistiller = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Support draft structure: extract onboarding, po_receipt, batches if present
      const onboarding = req.body.onboarding || req.body;
      const po_receipt = req.body.po_receipt || {};
      const batches = req.body.batches || [];

      // Extract manufacturing and storage fields from onboarding
      const manufacturing_address_line1 =
        onboarding.manufacturing_address_line1;
      const manufacturing_address_line2 =
        onboarding.manufacturing_address_line2;
      const manufacturing_state = onboarding.manufacturing_state;
      const manufacturing_district = onboarding.manufacturing_district;
      const production_capacity_value = onboarding.production_capacity_value;
      const production_capacity_unit = onboarding.production_capacity_unit;
      const product_produced = onboarding.product_produced;
      const supply_chain_capabilities = onboarding.supply_chain_capabilities;

      const storage_address_line1 = onboarding.storage_address_line1;
      const storage_address_line2 = onboarding.storage_address_line2;
      const storage_state = onboarding.storage_state;
      const storage_district = onboarding.storage_district;
      const storage_capacity_value = onboarding.storage_capacity_value;
      const storage_condition = onboarding.storage_condition;

      // Always check required fields inside onboarding
      
      let mobile_no = req.body.mobile_no;
      if (!mobile_no) {
        mobile_no = onboarding.basic_details?.distiller_details?.phone;
      }
      if (!mobile_no) {
        return sendResponse({
          res,
          status: 400,
          message: "Mobile number is required in the 'mobile_no' field.",
          errors: [
            {
              message:
                "Please provide a valid and unique mobile_no in your request body.",
            },
          ],
        });
      }
      let poc_name = req.body.poc_name;
      if (!poc_name) {
        poc_name = onboarding.basic_details?.point_of_contact?.name;
      }
      let poc_email = req.body.poc_email;
      if (!poc_email) {
        poc_email = onboarding.basic_details?.point_of_contact?.email;
      }

      // Always save onboarding, po_receipt, and batches in the draft data
      await DistillerDraft.create({
        data: {
          onboarding,
          po_receipt,
          batches
        },
        createdBy: req.user_id,
        status: "pending",
      });

      const existing = await Distiller.findOne({
        "basic_details.point_of_contact.mobile": mobile_no,
      });
      if (existing) {
        return sendResponse({
          res,
          status: 400,
          message: "Distiller with this mobile number already exists.",
          errors: [
            {
              message: `Mobile number '${mobile_no}' already registered. Please use a different mobile_no.`,
            },
          ],
        });
      }

      onboarding.active = true;
      const staticFields = {
        user_type: "8",
        is_mobile_verified: "true",
        is_approved: "approved",
        is_email_verified: "true",
        is_form_submitted: "true",
        is_welcome_email_send: "true",
        is_sms_send: "true",
        term_condition: "true",
        mou: "true",
        mou_document: onboarding.mou_document,
        mou_approval: onboarding.mou_approval,
        active: true,
        source_by: onboarding.source_by || "NAFED",
        country: onboarding.country || "India",
        client_id: onboarding.client_id || "9877"
      };
      const onboardingWithStatic = { ...onboarding, ...staticFields };

      let userReq = createDistllerPayload(onboardingWithStatic);

      console.log("Creating Distiller with payload:", userReq);
      const newDistiller = new Distiller(userReq);

      const distillerCreate = await newDistiller.save({ session });

      await Distiller.updateOne(
        { _id: distillerCreate._id },
        { $set: { is_form_submitted: "true" } },
        { session }
      );

      const masterUser = await MasterUser.create(
        [
          {
            firstName: poc_name,
            email: poc_email,
            isAdmin: true,
            isSuperAdmin: false,
            mobile: mobile_no,
            user_type: _userType.distiller,
            portalId: distillerCreate._id,
            portalRef: _collectionName.Distiller,
            status: _statusType.active,
            createdBy: req.user_id,
            userRole: [new mongoose.Types.ObjectId("67addf7fab0f886017049ed7")],
          },
        ],
        { session }
      );

      if (manufacturing_address_line1 || product_produced) {
        await ManufacturingUnit.create(
          [
            {
              distiller_id: distillerCreate._id,
              manufacturing_address_line1,
              manufacturing_address_line2,
              manufacturing_state: await getStateId(manufacturing_state),
              manufacturing_district: await getDistrictId(
                manufacturing_district
              ),
              production_capacity: {
                value: production_capacity_value || 0,
                unit: production_capacity_unit || "square meters",
              },
              product_produced,
              supply_chain_capabilities,
            },
          ],
          { session }
        );
      } else {
        await session.endSession();
        return sendResponse({
          res,
          status: 400,
          message: "Manufacturing unit details are required.",
          errors: [
            {
              message:
                "Please provide manufacturing address or product produced.",
            },
          ],
        });
      }

      if (storage_address_line1 || storage_condition) {
        await StorageFacility.create(
          [
            {
              distiller_id: distillerCreate._id,
              storage_address_line1,
              storage_address_line2,
              storage_state: await getStateId(storage_state),
              storage_district: await getDistrictId(storage_district),
              storage_capacity: {
                value: storage_capacity_value || 0,
                unit: "Square meters",
              },
              storage_condition: "Cool",
            },
          ],
          { session }
        );
      } else {
        await session.endSession();
        return sendResponse({
          res,
          status: 400,
          message: "Storage facility details are required.",
          errors: [
            { message: "Please provide storage address or storage condition." },
          ],
        });
      }

      return sendResponse({
        res,
        status: 201,
        message: "Distiller & MasterUser created successfully.",
        data: {
          user_code: newDistiller.user_code,
          master_user_id: masterUser[0]._id,
          onboarding,
          po_receipt,
          batches,
          status: false,
          source_by: onboarding.source_by || "NAFED",
        },
      });
    });
    } catch (error) {
    console.error("Transaction Error:", error.message);
    return sendResponse({
      res,
      status: 500,
      message: "Transaction failed while creating distiller.",
      errors: [{ message: error.message }],
    });
  } finally {
    await session.endSession();
  }
};

function createDistllerPayload(input) {
  const {
    client_id,
    basic_details = {},
    address = {},
    mou_document,
    user_type = "8",
    is_approved = "approved",
    user_code = "DIST_" + Date.now(),
    is_mobile_verified = "false",
    is_email_verified = "false",
    is_form_submitted = "false",
    is_welcome_email_send = false,
    is_sms_send = false,
    term_condition = "false",
    mou = "true",
    mou_approval = "approved",
    active = true,
  } = input;

  const {
    distiller_details = {},
    point_of_contact = {},
    company_owner_info = {},
    implementation_agency = null,
    cbbo_name = null,
  } = basic_details;

  const { registered = {}, operational = {} } = address;

  const payload = {
    client_id :"9877",
    basic_details: {
      distiller_details: {
        associate_type: distiller_details.associate_type,
        organization_name: distiller_details.organization_name,
        email: distiller_details.email,
        phone: distiller_details.phone,
        company_logo: distiller_details.company_logo || null,
      },
      point_of_contact: {
        name: point_of_contact.name,
        email: point_of_contact.email,
        mobile: point_of_contact.mobile,
        designation: point_of_contact.designation,
        aadhar_number: point_of_contact.aadhar_number,
        aadhar_image: {
          front: point_of_contact.aadhar_image?.front,
          back: point_of_contact.aadhar_image?.back,
        },
      },
      company_owner_info: {
        name: company_owner_info.name,
        aadhar_number: company_owner_info.aadhar_number,
        aadhar_image: {
          front: company_owner_info.aadhar_image?.front,
          back: company_owner_info.aadhar_image?.back,
        },
        pan_card: company_owner_info.pan_card,
        pan_image: company_owner_info.pan_image,
      },
      implementation_agency,
      cbbo_name,
    },
    address: {
      registered: {
        line1: registered.line1 || null,
        line2: registered.line2 || null,
        country:  "India",
        state: registered.state,
        district: registered.district,
        taluka: registered.taluka,
        pinCode: registered.pinCode || null,
        village: registered.village,
        ar_circle: registered.ar_circle || null,
      },
      operational: {
        line1: operational.line1 || null,
        line2: operational.line2 || null,
        country: operational.country || null,
        state: operational.state || null,
        district: operational.district || null,
        taluka: operational.taluka || null,
        pinCode: operational.pinCode || null,
        village: operational.village || null,
      },
    },
    company_details: input.company_details || {
      cin_number: null,
      cin_image: null,
      tan_number: null,
      tan_image: null,
      pan_card: null,
      pan_image: null,
      gst_no: null,
      pacs_reg_date: null,
    },
    manufactoring_storage: input.manufactoring_storage || {
      manufactoring_details: false,
      storage_details: false,
    },
    authorised: input.authorised || {
      name: null,
      designation: null,
      phone: null,
      email: null,
      aadhar_number: null,
      aadhar_certificate: { front: null, back: null },
      pan_card: null,
      pan_image: null,
    },
    bank_details: input.bank_details || {
      bank_name: null,
      branch_name: null,
      account_holder_name: null,
      ifsc_code: null,
      account_number: null,
      upload_proof: null,
    },
    user_type :"8",
    is_mobile_verified:"true",
    is_approved :"approved",
    is_email_verified :"true",
    is_form_submitted :"true",
    is_welcome_email_send :"true",
    is_sms_send :"true",
    term_condition :"true",
    mou :"true",
    mou_document,
    mou_approval,
    active : true,
    source_by: "NAFED",
  };

  return replaceUndefinedWithNull(payload);
}
