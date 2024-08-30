
// templates to export 
const templates = {
    eMandiOrder_template: {
        "Farmer Name": '',
        "Aadhar Number": '',
        "Procured Quantity": '',
        "Order Value": '',
        "Bank Name": '',
        "Bank Account Number": '',
        "IFSC Code": '',
    },
    farmer_details_template: {
        "FPO NAME*": '',
        "TITLE": '',
        "NAME*": '',
        "FATHER NAME*": '',
        "MOTHER NAME": '',
        "DATE OF BIRTH(DD/MM/YYYY)*": '',
        "GENDER*": '',
        "MARITAL STATUS": '',
        "RELIGION": '',
        "CATEGORY": '',
        "EDUCATION LEVEL": '',
        "EDU DETAILS": '',
        "ID PROOF TYPE": '',
        "AADHAR NUMBER*": '',
        "TYPE OF ALTERNATE ID": '',
        "ADDRESS LINE*": '',
        "STATE NAME*": '',
        "DISTRICT NAME*": '',
        "BLOCK NAME": '',
        "VILLAGE NAME": '',
        "PINCODE": '',
        "MOBILE NO*": '',
        "EMAIL ID": '',
        "TOTAL AREA*": '',
        "AREA UNIT*": '',
        "KHASRA NUMBER*": '',
        "SUB dISTRICT":  '',
        "KHATAUNI": '',
        "VILLAGE":  '',
        "SOW AREA":  '',
        "EXPECTED PRODUCTION(MT)":'',
        "LAND STATE NAME*": '',
        "LAND DISTRICT NAME*": '',
        "SOIL TYPE*": '',
        "SOIL TESTED": '',
        "SOIL HEALTH CARD": '',
        "SOIL HEALTH CARD FILE": '',
        "SOIL TESTING LAB": '',
        "SOIL TESTING LAB DISTANCE UNIT": '',
        "SOWING DATE(MM/YYYY)*": '',
        "HARVESTING DATE(MM/YYYY)*": '',
        "CROPS NAME*": '',
        "PRODUCTION QUANTITY*": '',
        "PRODUCTIVITY": '',
        "SELLING PRICE": '',
        "MARKETABLE PRICE": '',
        "YIELD(KG)": '',
        "SEED USED": '',
        "FERTILIZER USED": '',
        "FERTILIZER NAME": '',
        "FERTILIZER DOSE": '',
        "PESTICIDE USED": '',
        "PESTICIDE NAME": '',
        "PESTICIDE DOSE": '',
        "INSECTICIDE USED": '',
        "INSECTICIDE NAME": '',
        "INSECTICIDE DOSE": '',
        "CROP INSURANCE": '',
        "INSURANCE COMPANY": '',
        "INSURANCE WORTH": '',
        "CROP SEASONS*": '',
        "BANK NAME": '',
        "ACCOUNT NUMBER": '',
        "BRANCH": '',
        "FULL ADDRESS": '',
        "IFSC CODE": '',
        "ACCOUNT HOLDER NAME": '',
        "BANK STATE NAME*": '',
        "BANK DISTRICT NAME*": '',
        "CITY": ''
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
    }
}

function exportTemplate(tableName) {
    switch (tableName) {
        case "emandi-orders":
            return templates.eMandiOrder_template;
        case "farmer-detail":
            return templates.farmer_details_template;
        case "fpo_registration":
            return templates.fpo_registration_template;

        default:
            throw new Error('Invalid table name');
    }
}

module.exports = exportTemplate;

