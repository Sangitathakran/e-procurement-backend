
// templates to export 
const templates = {
    farmer_details_template: {
        "NAME*": '',
        "FATHER NAME*": '',
        "MOTHER NAME": '',
        "DATE OF BIRTH(DD-MM-YYYY)*": '',
        "GENDER*": '',
        "MARITAL STATUS*": '',
        "RELIGION*": '',
        "CATEGORY*": '',
        "EDUCATION LEVEL*": '',
        "EDU DETAILS": '',
        "ID PROOF TYPE*": '',
        "AADHAR NUMBER*": '',
        "ADDRESS LINE*": '',
        "COUNTRY NAME": '',
        "STATE NAME*": '',
        "DISTRICT NAME*": '',
        "BLOCK NAME": '',
        "VILLAGE NAME": '',
        "PINCODE*": '',
        "MOBILE NO*": '',
        "EMAIL ID": '',
        "TOTAL AREA*": '',
        "AREA UNIT*": '',
        "KHASRA NUMBER*": '',
        "KHATAUNI": '',
        "STATE": '',
        "DISTRICT": '',
        "ViLLAGE": '',
        "SOIL TYPE*": '',
        "SOIL TESTED": '',
        "SOWING DATE(MM-YYYY)*": '',
        "HARVESTING DATE(MM-YYYY)*": '',
        "CROPS NAME*": '',
        "PRODUCTION QUANTITY*": '',
        "SELLING PRICE": '',
        "YIELD(KG)": '',
        "CROP SEASONS*": '',
        "BANK NAME": '',
        "ACCOUNT NUMBER*": '',
        "BRANCH": '',
        "IFSC CODE": '',
        "ACCOUNT HOLDER NAME": '',
    },

    fpo_registration_template: {
        "IA NAME*": '',
        "CBBO NAME": '',
        "FPO NAME*": '',
        "TYPE OF REGISTRATION*": '',
        "COOPERATIVE REGISTRATION NUMBER*": '',
        "DATE OF INCORPORATION(DD/MM/YYYY)": '',
        "FPO CONTACT PERSON NAME": '',
        "CONTACT PERSON MOBILE NUMBER": '',
        "FPO EMAIL ID": '',
        "ADDRESS": '',
        "BLOCK": '',
        "STATE NAME": '',
        "DISTRICT NAME": '',
        "LANDMARK": '',
        "PIN CODE": '',
        "FPO POST OFFICE": '',
        "LICENSE NUMBER": '',
        "LICENSE TYPE*": '',
        "DATE OF ISSUANCE(DD/MM/YYYY)": '',
        "SCOPE OF MANDI LICENSE*": '',
        "STATE": '',
        "PAN CARD OF FPO": '',
        "TAN OF FPO": '',
        "AADHAR NUMBER*": '',
        "GST CERTIFICATE": ''
    },
    distiller_registration_template: {
        "Company Name*": '',
        "Company PAN*": '',
        "Company CIN*": '',
        "Email ID*": '',
        "Company Mobile Number*": '',
        "Company Registered address*": '',
        "Pincode*": '',
        "State*": '',
        "District*": '',
        "Village/Town/City": '',
        "Owner Name*": '',
        "Owner Aadhar Number*": '',
        "Owner PAN Number*": '',
        "POC Name*": '',
        "Designation": '',
        "POC Mobile Number*": '',
        "PocEmail*": '',
        "POC Aadhar Number*": '',
        "Authorized Person Name*": '',
        "AuthDesignation": '',
        "Mobile Number*": '',
        "AuthEmail*": '',
        "Authorized Person Aadhar Number*": '',
        "Authorized Person PAN Number": '',
        "Bank Name*": '',
        "Branch Name*": '',
        "Account Holder Name*": '',
        "IFSC Code*": '',
        "Account Number*": '',
        "Confirm Account Number*": ''
    }
    
}

function exportTemplate(tableName) {
    switch (tableName) {
        case "farmer-detail":
            return templates.farmer_details_template;
        case "fpo_registration":
            return templates.fpo_registration_template;
        case "distiller_registration":
            return templates.distiller_registration_template;

        default:
            throw new Error('Invalid table name');
    }
}

module.exports = exportTemplate;

