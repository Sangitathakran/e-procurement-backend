const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const xlsx = require("xlsx");
require("module-alias/register");
const { User } = require("@src/v1/models/app/auth/User");
require("dotenv").config();
const {fetchFromCollection} = require("@config/database")
const dumpJSONToExcel = require("@src/v1/utils/helpers/dumpJSONToExcel");

async function importAssociates() {

  // if (process.env.NODE_ENV === "local") {
  //   console.log("Import script aborted: Environment is set to LOCAL.");
  //   return;
  // }
  
  try {
    const RAW_COLLECTION_NAME = "AssociateData";
    const associatesData = await fetchFromCollection(RAW_COLLECTION_NAME)


    const logDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

    let inserted = 0,
      duplicate = 0;
    const errors = [],
      duplicateMobiles = [];
      
    for (const [index, data] of associatesData.entries()) {
      try {
        const associate_name = (data["cooperative_socity_name"] || "").trim();
        const stateName = (data["state/ut"] || "").trim();
        const districtName = (data["district"] || "").trim();
        const functional_status = (data["fuctional_status"] || "").trim();
        const location = (data["location"] || "").trim();
        const registration_number = (data["registration_number"] || "").trim();
        const pacs_reg_date = (data["date_of_registration"] || "").trim();
        const sector = (data["sector"] || "").trim();
        const contact_name = (data["contact_name"] || "").trim();
        const mobile_no = (data["contact_number"] || "").trim();
        const address_line1 = (data["address"] || "").trim();
        const email =  (data["email"] || "" ).trim();
        if (!mobile_no) {
          errors.push({
            ...data,
            Error: "Mobile number required"
          });
          continue;
        }
        if (!/^\d{10}$/.test(mobile_no)) {
          duplicateMobiles.push({ ...data, Error: "Invalid mobile number (must be 10 digits)" });
          console.log(`Skipping record ${index + 1}: Invalid mobile number`);
          continue;
        }
        const existing = await User.findOne({ "basic_details.associate_details.phone": mobile_no });
        if (existing) {
          duplicate++;
          duplicateMobiles.push({
            ...data, Error: "Duplicate mobile number"
          });
          console.log(`Skipping record ${index + 1}: Duplicate mobile number`);
          continue;
        }
        const newAssociate = new User({
          client_id: "9876",
          basic_details: {
            associate_details: {
              associate_type: "PACS",
              associate_name,
              organization_name: associate_name,
              email,
              phone: mobile_no,
            },
            point_of_contact: {
              name: contact_name,
              mobile: mobile_no,
              email,
            },
          },
          company_details: {
            registration_number,
            pacs_reg_date,
          },
          address: {
            registered: {
              line1: address_line1,
              state: stateName,
              district: districtName,
            },
          },
          user_type: "4",
          functional_status,
          location,
          sector,
          is_mobile_verified: true,
          is_email_verified: true,
          is_form_submitted: true,
          is_approved: "approved",
          active: true,
          term_condition: true,
          is_sms_send: true,
        });

        await newAssociate.save();
        inserted++;
        console.log(`Record ${index + 1} inserted successfully with mobile number: ${mobile_no}`);
      } catch (err) {
        errors.push({ record: index + 1, error: err.message });
      }
    }

    if (duplicateMobiles.length > 0) {
      const duplicateFileName = `duplicates-from-db-${Date.now()}.xlsx`;
      await dumpJSONToExcel(duplicateMobiles, duplicateFileName, "Duplicates", logDir);
    }

    const logData = {
      inserted,
      duplicate,
      total: associatesData.length,
      errors,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(logDir, `log-from-db-${Date.now()}.json`), JSON.stringify(logData, null, 2));
    console.log("Import process completed.");

    const rawCollection = mongoose.connection.collection(RAW_COLLECTION_NAME);
    const deleteResult = await rawCollection.deleteMany({});

    
  } catch (error) {
    
  }
}
module.exports = importAssociates;
