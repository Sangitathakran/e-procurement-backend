

const _collectionName = {
    emandi_orders: "emandi_orders",
    emandi_order_details: "emandi_order_details",
    farmers: "farmers",
    agency: "agency",
    individualFarmers: "individual_farmers",
    Users: "Users",
    HeadOffice: "HeadOffice", // change headoffices to HeadOffice
    Category: "Category",
    Variety: "variety",
    Unit: "unit",
    Grade: "grade",
    Commodity: "Commodity",
    product: "Product",
    Account: "account",
    Organization: "organization",
    Request: "Request",
    AssociateOffers: "AssociateOffers",
    FarmerOffers: "FarmerOffers",
    ProcurementCenter: "ProcurementCenter",
    Lands: "Lands",
    Banks: "Banks",
    Crops: "Crops",
    FarmerOrder: "FarmerOrder",
    StateDistrictCity: "StateDistrictCity",
    Batch: "Batch",
    Payment: "Payment",
    Branch: "Branch",
    DummyWarehouse: "DummyWarehouse",
    FarmerOrder: "FarmerOrder",
    PaymentLog: "PaymentLog",
    FeatureList: "FeatureList",  // need to change to Features
    UserRole: "UserRoles",
    MasterUser: "MasterUser",
    AgentPayment: "AgentPayment",
    Associate: "Associate",
    Agency: "Agency",
    Types: "Types"
}

const _userType_Feature_Collection = {
    
}

const _userAction = { 
    created: "created",
    deleted: "deleted",
    updated: "updated",
    disabled: "disabled",
    enabled: "enabled"
}

const _featureType = {
    branchOffice: "BranchOffice",
    headOffice: "HeadOffice",
    agency: "Agency",
    associate: "Associate"

}

const _status = {
    active: "active",
    inactive: "inactive",
}

const _farmerType = {
    marginal: "marginal",
    small: "small",
    large: "large",
    other: "other"
}

const _envMode = {
    local: 'local',
    development: "development",
    production: "production",
    staging: "staging"
}

const _orderStatus = {
    pending: "pending",
    processing: "processing",
    succeed: "succeed",
    failed: "failed",
    drop: "drop"
}

const _farmingType = {
    natural: 'Natural',
    organic: 'Organic',
}
const _deliveryType = {
    doorstep: 'Doorstep',
    selfPickup: 'Self Pickup'
}
const _productRequestStatus = {
    pending: 'Pending',
    quoted: 'Quoted',
    cancelled: 'Cancelled',
    orderGenerated: 'Order Generated'
}
const _requestType = {
    singleUser: 'Single User',
    multipleUser: 'Multiple User'
}
const _sellerQuoteSellerStatus = {
    pending: 'Pending',
    quoted: 'Quoted',
    accepted: 'Accepted',
    rejected: 'Cancelled'
}

const _sellerQuoteAdminStatus = {
    waitingforapproval: 'Waiting for approval',
    approved: 'Approved',
    pending: 'Pending'
}

const _quotesStatus = {
    queryrecieved: 'Query Recieved',
    quotesubmitted: 'Quote submitted',
    quoteaccepted: 'Quote Accepted',
    cancelled: 'Cancelled',
}

const _sellerQuoteStatus = {
    accepted: 'Accepted',
    rejected: 'Cancelled',
    pending: 'Pending'
}

const _requestStatus = {
    open: 'Open',
    partially_fulfulled: 'Partially Fulfilled',
    fulfilled: 'Fulfilled',
    closed: 'Closed'
}

const _associateOfferStatus = {
    accepted: 'Accepted',
    rejected: 'Rejected',
    pending: 'Pending',
    partially_ordered: "Partially_Ordered",
    ordered: "Ordered",
}

const _procuredStatus = {
    received: "Received",
    pending: "Pending",
    rejected: "Rejected",
}
const _userType = {
    ho: "2",
    bo: "3",
    associate: "4",
    farmer: "5",
    agent: "6",
}

const _userStatus = {
    approved: 'approved',
    rejected: 'rejected',
    pending: 'pending',
}

const _trader_type = {
    ORGANISATION: 'Organisation',
    SOCIETY: 'Society',
    TRUST: 'Trust',
    INDIVIDUAL: 'Individual',
    PROPRIETOR: 'Proprietor',
}

const _center_type = {
    associate: 'associate',
    agent: 'agent',
    head_office: 'head_office',
}

const _address_type = {
    Residential: 'Residential',
    Business: 'Business',
    Billing: 'Billing',
    Shipping: 'Shipping'
}

const _webSocketEvents = {
    procurement: "procurement"
}

const _user_status = {
    APPROVED: 'approved',
    DISAPPROVED: 'disapproved',
    PENDING: 'pending',
    BANNED: 'banned',

}
const _proofType = {
    Aadhar: "aadhar",
    Pancard: "pancard",
    VoterId: "voterId",
}
const _titles = {
    Mr: "mr",
    Mrs: "mrs",
    Miss: "miss",
}
const _gender = {
    male: "male",
    female: "female",
    transgender: "transgender",
    other: "others",
}
const _maritalStatus = {
    Married: "married",
    Unmarried: "unmarried",
}
const _religion = {
    Hindu: "hindu",
    Muslim: "muslim",
    Sikh: "sikh",
    Isai: "isai",
    Parsi: "parsi",
}
const _category = {
    GEN: "gen",
    OBC: "obc",
    SC: "sc",
    ST: "st",
    Others: "others",
}

const _areaUnit = {
    Hectares: "hectares",
    Acres: "acres",
    Bigha: "bigha",
}
const _soilType = {
    Sandy: "sandy",
    Loamy: "loamy",
    Clayey: "clayey",
    Red_soil: "red_soil",
    Alkaline: "alkaline",
    Other: "other"
}
const _distanceUnit = {
    Km: "km",
    Metre: "metre",
}
const _seedUsed = {
    farmseved: "farmseved",
    Company: "company",
}
const _yesNo = {
    Yes: "yes",
    No: "no",
}
const _seasons = {
    Rabi: "rabi",
    Kharif: "kharif",
    Zaid: "zaid",
    Others: "others",
}
const _education = {
    Nonmatric: "nonmatric",
    Matric: "matric",
    Intermidiate: "intermidiate",
    Graduate: "graduate",
    Postgraduate: "postgraduate",
    Others: "others",
}

const _khaifCrops = {
    onion: "onion",
    tur: "tur",
    moong: "moong",
    masoor: "masoor",
    copra: "copra"

}

const _rabiCrops = {
    tur: "tur",
    moong: "moong",
    masoor: "masoor",
    sunflower: "sunflower",
    wheat: "wheat"

}

const _zaidCrops = {
    onion: "onion",
    tur: "tur",
    moong: "moong",
}


const _batchStatus = {
    pending: "Pending",
    mark_ready: "Mark-Ready",
    intransit: "In-Transit",
    delivered: "Delivered",
    finalQc: "Final Qc",
    paymentApproved: "Payment Approved",
    paymentComplete: "Payment Complete"
}

const _paymentmethod = {
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
}

const _paymentstatus = {
    pending: "Pending",
    completed: "Completed",
}

const _paymentApproval = {
    pending: "Pending",
    approved: "Approved",
}

const received_qc_status = {
    accepted: "Accepted",
    rejected: "Rejected",
    pending: "Pending",
}

const _individual_farmer_onboarding_steps = [
    {
        label: "Basic Details",
        screen_number: 0,
        status: "active"
    },
    {
        label: "Address",
        screen_number: 1,
        status: "pending"
    },
    {
        label: "Land Details",
        screen_number: 2,
        status: "pending"
    },
    {
        label: "Documents",
        screen_number: 3,
        status: "pending"
    },
    {
        label: "Bank Details",
        screen_number: 4,
        status: "pending"
    },

]

const _individual_category = {
    gen: "general",
    obc: "obc",
    sc: "sc",
    st: "st",
    women: "women",
    others: "others"
}

const _statusType = { 
    active: 'active',
    inactive: 'inactive'
}

module.exports = {
    _userAction,
    _farmerType,
    _collectionName,
    _status,
    _envMode,
    _orderStatus,
    _farmingType,
    _deliveryType,
    _productRequestStatus,
    _requestType,
    _sellerQuoteSellerStatus,
    _sellerQuoteAdminStatus,
    _quotesStatus,
    _sellerQuoteStatus,
    _requestStatus,
    _associateOfferStatus,
    _webSocketEvents,
    _proofType,
    _titles,
    _gender,
    _maritalStatus,
    _religion,
    _category,
    _areaUnit,
    _soilType,
    _distanceUnit,
    _seedUsed,
    _yesNo,
    _seasons,
    _education,
    _khaifCrops,
    _rabiCrops,
    _zaidCrops,
    _individual_farmer_onboarding_steps,
    _procuredStatus,
    _userType,
    _trader_type,
    _user_status,
    _batchStatus,
    _paymentmethod,
    _paymentstatus,
    _paymentApproval,
    _center_type,
    _address_type,
    _individual_category,
    _userStatus,
    _featureType,
    _statusType,
    received_qc_status,
}