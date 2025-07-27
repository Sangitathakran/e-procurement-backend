const mongoose = require('mongoose');
const { DistillerDraft } = require('@src/v1/models/app/auth/DistillerDraft');
const { Distiller } = require('@src/v1/models/app/auth/Distiller');
const { ManufacturingUnit } = require('@src/v1/models/app/auth/ManufacturingUnit');
const { StorageFacility } = require('@src/v1/models/app/auth/storageFacility');
const { MasterUser } = require('@src/v1/models/master/MasterUser');
const { _userType, _userStatus, _statusType, _collectionName } = require('@src/v1/utils/constants');
const { getStateId, getDistrictId } = require('@src/v1/utils/helpers');
const { sendResponse } = require('@src/v1/utils/helpers/api_response');
const { ObjectId } = require('mongodb');

exports.createDistiller = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const {
        organization_name,
        mobile_no,
        email,
        associate_type,
        poc_name,
        poc_email,
        designation,
        state,
        district,
        taluka,
        village,
        aadhar_front,
        aadhar_back,
        pan_image,
        mou_document,

        // Optional manufacturing
        manufacturing_address_line1,
        manufacturing_address_line2,
        manufacturing_state,
        manufacturing_district,
        production_capacity_value,
        production_capacity_unit,
        product_produced,
        supply_chain_capabilities,

        // Optional storage
        storage_address_line1,
        storage_address_line2,
        storage_state,
        storage_district,
        storage_capacity_value,
        storage_capacity_unit,
        storage_condition

        
      } = req.body;

      //  1. Store request body in Draft table
      await DistillerDraft.create({ data: req.body, createdBy: req.user._id ,status:"pending"});

      //  2. Check if mobile exists
      const existing = await Distiller.findOne({ 'basic_details.point_of_contact.mobile': mobile_no });
      if (existing) {

        return sendResponse(res, {
          status: 400,
          message: "Distiller with this mobile number already exists.",
          errors: [{ message: "Mobile number already registered." }]
        });
      }

      //  3. Create distiller

      const newDistiller = new Distiller({
        client_id: '9876',
        basic_details: {
          distiller_details: {
            organization_name,
            phone: mobile_no,
            email,
            associate_type,
          },
          point_of_contact: {
            name: poc_name,
            email: poc_email,
            mobile: mobile_no,
            designation,
            aadhar_image: {
              front: aadhar_front,
              back: aadhar_back
            }
          },
          company_owner_info: {
            pan_image
          }
        },
        address: {
          registered: {
            state,
            district,
            taluka,
            village,
            country: 'India'
          }
        },
        mou: true,
        mou_document,
        user_type: _userType.distiller,
        is_approved: _userStatus.approved
      });

      const distillerCreate = await newDistiller.save({ session });

      //  4. Create MasterUser
      const masterUser = await MasterUser.create([{
        firstName: poc_name,
        email: poc_email,
        isAdmin: true,
        isSuperAdmin: false,
        mobile: mobile_no,
        user_type: _userType.distiller,
        portalId: distillerCreate._id,
        portalRef: _collectionName.Distiller,
        status: _statusType.active,
        createdBy: req.user._id,
        userRole: [ObjectId('64f0c8d1e4b0f3a2c8e5d6e7')]
      }], { session });

      //  5. Manufacturing Unit
      if (manufacturing_address_line1 || product_produced) {
        await ManufacturingUnit.create([{
          distiller_id: distillerCreate._id,
          manufacturing_address_line1,
          manufacturing_address_line2,
          manufacturing_state: await getStateId(manufacturing_state),
          manufacturing_district: await getDistrictId(manufacturing_district),
          production_capacity: {
            value: production_capacity_value || 0,
            unit: production_capacity_unit || "square meters"
          },
          product_produced,
          supply_chain_capabilities
        }], { session });
      }else{
         await session.endSession();
        return sendResponse(res, {
          status: 400,
          message: "Manufacturing unit details are required.",
          errors: [{ message: "Please provide manufacturing address or product produced." }]
        });
      }

      //  6. Storage Facility
      if (storage_address_line1 || storage_condition) {
        await StorageFacility.create([{
          distiller_id: distillerCreate._id,
          storage_address_line1,
          storage_address_line2,
          storage_state: await getStateId(storage_state),
          storage_district: await getDistrictId(storage_district),
          storage_capacity: {
            value: storage_capacity_value || 0,
            unit: storage_capacity_unit || "Square meters"
          },
          storage_condition: storage_condition || "Cool"
        }], { session });
      }else{
         await session.endSession();
        return sendResponse(res, {
          status: 400,
          message: "Storage facility details are required.",
          errors: [{ message: "Please provide storage address or storage condition." }]
        });
      }

      //  All done
      return sendResponse(res, {
        status: 201,
        message: "Distiller & MasterUser created successfully.",
        data: {
          user_code: newDistiller.user_code,
          master_user_id: masterUser[0]._id
        }
      });
    });
  } catch (error) {
    console.error("Transaction Error:", error.message);
    return sendResponse(res, {
      status: 500,
      message: "Transaction failed while creating distiller.",
      errors: [{ message: error.message }]
    });
  } finally {
    await session.endSession();
  }
};


