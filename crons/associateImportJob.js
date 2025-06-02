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
  
  try {
    const RAW_COLLECTION_NAME = "AssociateData";
    const associatesData = await fetchFromCollection(RAW_COLLECTION_NAME)

    //  if (!Array.isArray(associatesData )) {
    //         throw new Error(`Expected an array but got: ${typeof associatesData}`);
    //     }

     console.log(`📝 Fetched ${associatesData.length} records from "${RAW_COLLECTION_NAME}".`);

    const logDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

    let inserted = 0,
      duplicate = 0;
    const errors = [],
      duplicateMobiles = [];
      

    for (const [index, data] of associatesData.entries()) {
      try {
        const associate_name = data["Cooperative Society Name"] || data.cooperativeSocietyName;
        const mobile_no = data["Contact Number"] || data.contactNumber;
        const functional_status = data["Functional Status"] || data.functionalStatus;
        const location = data["Location"] || data.location;
        const registration_number = data["Registration Number"] || data.registrationNumber;
        const pacs_reg_date = data["Date of Registration"] || data.dateOfRegistration;
        const sector = data["Sector"] || data.sector;
        const contact_name = data["Contact Name"] || data.contactName;
        const email = data.email || null;
        const address_line1 = data["Address"] || data.address || null;
        const stateName = data["State/UT"] || data.state || data.stateName;
        const districtName = data["District"] || data.district || data.districtName;
        // const associate_name = transliterateToEnglish(raw_associate_name);
        if (!mobile_no) {
          console.warn(`⚠️ Record ${index + 1} skipped: Missing mobile number.`);
           errors.push({
        ...data,
        Error: "Mobile number required"
      });
      continue;
        }
       if (!/^\d{10}$/.test(mobile_no)) {
          console.warn(`⚠️ Record ${index + 1} skipped: Invalid mobile number format.`);
          duplicateMobiles.push({ ...data, Error: "Invalid mobile number (must be 10 digits)" });
          continue;
        }
        const existing = await User.findOne({ "basic_details.point_of_contact.mobile": mobile_no });
        if (existing) {
          duplicate++;
          duplicateMobiles.push({
            ...data, Error: "Duplicate mobile number"
          });
          console.log(`❗ Duplicate found: ${mobile_no}`);
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
        // console.log(`✅ Inserted: ${mobile_no}`);
      } catch (err) {
        // console.error(`❌ Error in record ${index + 1}:`, err.message);
        errors.push({ record: index + 1, error: err.message });
      }
    }

    // Save duplicates to Excel
    if (duplicateMobiles.length > 0) {
      const duplicateFileName = `duplicates-from-db-${Date.now()}.xlsx`;
      await dumpJSONToExcel(duplicateMobiles, duplicateFileName, "Duplicates", logDir);
      // console.log(`📄 Duplicate report saved: ${duplicateFileName}`);
    }

    // Save log file (JSON)
    const logData = {
      inserted,
      duplicate,
      total: associatesData.length,
      errors,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(logDir, `log-from-db-${Date.now()}.json`), JSON.stringify(logData, null, 2));

    console.log(`✅ Job finished.`);
    console.log(`➡️ Inserted: ${inserted}, Duplicates: ${duplicate}, Errors: ${errors.length}`);

    const rawCollection = mongoose.connection.collection(RAW_COLLECTION_NAME);
    const deleteResult = await rawCollection.deleteMany({});
    console.log(`🧹 AssociateData collection cleared. Deleted ${deleteResult.deletedCount} records.`);

    
  } catch (error) {
    console.error("❌ Job failed:", error);
   
  }
}
// function transliterateToEnglish(text, stripDiacritics = true) {
//   if (!text || typeof text !== 'string') return text;

//   const isHindi = /[\u0900-\u097F]/.test(text);
//   if (!isHindi) return text;

//   let transliterated = Sanscript.t(text, 'devanagari', 'iast');

//   if (stripDiacritics) {
//     transliterated = transliterated.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
//   }

//   return transliterated;
// }
module.exports = importAssociates;
