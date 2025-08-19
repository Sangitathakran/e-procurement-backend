const { NA } = require("xlsx-populate/lib/FormulaError")
const { FRONTEND_URLS } = require("@config/index")

const _collectionName = {
    statewisemanditax: "statewisemanditax",
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
    Whr: "Whr",
    WhrDetail: "WhrDetail",
    Branch: "Branch",
    DummyWarehouse: "DummyWarehouse",
    Warehouse: "WarehouseV2",
    WarehouseDetails: "WarehouseDetails",
    FarmerOrder: "FarmerOrder",
    PaymentLog: "PaymentLog",
    FeatureList: "FeatureList",  // need to change to Features
    UserRole: "UserRoles",
    MasterUser: "MasterUser",
    AgentPayment: "AgentPayment",
    Associate: "Associate",
    Agency: "Agency",
    NccfAdmin: "NccfAdmin",
    Types: "Types",
    AssociateInvoice: "AssociateInvoice",
    AgentInvoice: "AgentInvoice",
    AgentPaymentFile: "AgentPaymentFile",
    FarmerPaymentFile: "FarmerPaymentFile",
    Distiller: "Distiller",
    ManufacturingUnit: "ManufacturingUnit",
    StorageFacility: "StorageFacility",
    PurchaseOrder: "PurchaseOrder",
    BatchOrderProcess: "batchOrderProcess",
    TrackOrder: "TrackOrder",
    Truck: "Truck",
    ExternalBatch: "ExternalBatch",
    ExternalOrder: "ExternalOrder",
    Scheme: "Scheme",
    commodityStandard: "commodityStandard",
    SchemeAssign: "SchemeAssign",
    ClientToken: "ClientToken",
    Scheme: "Scheme",
    SLA: "SLA",
    CCAvenueResponse: "CCAvenueResponse",
    PaymentLogsHistory: "PaymentLogsHistory",
    eKharidHaryana: "ekharidprocurements",
    states: "states",
    // eKharidHaryana: "ekharidprocurements",
    agristackLog: "agristackLog",
    commodityStandard: "commodityStandard",
    SchemeAssign: "SchemeAssign",
    ClientToken: "ClientToken",
    centerProjection: "centerProjection",
    statewisemanditax: "statewisemanditax",
    AgristackFarmerDetail: 'AgristackFarmerDetails',
    LoginHistory: "loginhistory",
    loginAttempt: "loginAttempt",
    forgetHistory: "forgetHistory",
    agristackLog: "agristackLog",
    verfiyFarmer: "verfiyfarmer",
    associateMandiName: "associateMandiName",
    eKharidHaryana: "ekhridnewprocs",
    nafedstatshistory: "nafedstatshistory",
    nafedstats: "nafedstats",
    ApprovalLog: "approvalLog",
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
    associate: "Associate",
    distiller: "Distiller",
    SLA: "SLA",
    warehouse: "Warehouse"
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


const _verfiycationStatus = {
    pending: 1,
    succeed: 2,
    failed: 3
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
const _farmerOrderDeliverdStatus = {
    pending: "Pending",
    partially: "Partially",
    completed: "Completed",
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
    warehouse: "7",
    distiller: "8",
    nccf: "9",
    admin: "10",
    ministry: "11"
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
    PACS: 'PACS',
    MULTIPURPOSE: 'MULTIPURPOSE',
    CAMPS: 'CAMPS',
    Agricultural: 'Agricultural',
}

const _center_type = {
    associate: 'associate',
    agent: 'agent',
    head_office: 'head_office',
    distiller: 'distiller'
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
    "N/A": "N/A",
}
const _religion = {
    Hindu: "hindu",
    Muslim: "muslim",
    Sikh: "sikh",
    Isai: "isai",
    Parsi: "parsi",
    "N/A": "N/A",
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
    Other: "Other",
    Bigha: "bigha",
}
const _soilType = {
    Sandy: "sandy",
    Loamy: "loamy",
    Clayey: "clayey",
    Red_soil: "red_soil",
    Alkaline: "alkaline",
    Other: "other",
    Brown_soil: "brown soil",
}
const _landType = {
    OwnLand: "own land",
    Partnership: "partnership",
    Leaser: "leaser",
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
    FinalPayApproved: "Final Payment Approved",
    paymentInTransit: "Payment In Progress",
    paymentComplete: "Payment Complete",
    failed: "Failed",
    partiallyCompleted: "Partially Completed",
}

const _paymentmethod = {
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    net_banking: "Net Banking",
}

const _paymentstatus = {
    pending: "Pending",
    inProgress: "In Progress",
    failed: "Failed",
    completed: "Completed",
    rejected: "Rejected"
}

const _billstatus = {
    pending: "Pending",
    completed: "Completed",
}

const _paymentApproval = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected"
}

const _wareHouseApproval = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    received: "Received"
}

const received_qc_status = {
    accepted: "Accepted",
    rejected: "Rejected",
    pending: "Pending",
}

const _trackOrderStatus = {
    pending: "pending",
    readyToShip: "shipped",
    inTransit: "in-transit",
    rejected: "rejected",
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
    others: "others",
    "N/A": "N/A",
}

const _statusType = {
    active: 'active',
    inactive: 'inactive'
}

const _whr_status = {
    active: "active",
    inactive: "inactive",
    approved: 'approved',
    rejected: 'rejected',
    pending: 'pending',
    archived: "archived",
    deleted: "deleted",
    created: "created",
    completed: "completed",
}

const _frontendLoginRoutes = {
    // agent: "/agent/sign-in",
    // ho: "/head-office/sign-in",
    // bo: "/branch-office/sign-in"
    slaDev: "https://testing.sla.khetisauda.com/sla/sign-in",
    slaProd: "https://ep.navbazar.com/sla/sign-in",
    agent: "https://ep.navbazar.com/agent/sign-in",
    ho: "https://ep.navbazar.com/head-office/sign-in",
    bo: "https://ep.navbazar.com/branch-office/sign-in",
    nccf: "https://ep.navbazar.com/nccf/sign-in",
    sla: "https://sla.khetisauda.com/sla/sign-in",
}

const _userTypeFrontendRouteMapping = {
    "agent": "6",
    "head-office": "2",
    "branch-office": "3",
    "NccfAdmin": "9",
    "admin": "10",
    "ministry": "11"
}

const _poRequestStatus = {
    pending: 'Pending',
    approved: 'Approved',
    reject: 'Rejected'
}

const _poAdvancePaymentStatus = {
    pending: "Pending",
    paid: 'Paid',
    reject: 'Reject',
    failed: 'Failed'
}

const _poPaymentStatus = {
    pending: 'Pending',
    paid: 'Paid',
    Unpaid: 'Unpaid',
    reject: 'Reject',
    failed: 'Failed'
}

const _poPickupStatus = {
    pending: 'Pending',
    completed: 'Completed',
    failed: 'Failed'
}

const _poBatchStatus = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    scheduled: 'Scheduled',
    inProgress: 'In Progress',
    completed: 'Completed',
}

const _poBatchPaymentStatus = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed'
}

const _penaltypaymentStatus = {
    NA: 'Not Applicable',
    pending: 'Pending',
    paid: 'Paid',
    overdue: 'Overdue',
    waiveOff: 'Waive Off',
}
const _commodityType = {
    grade: 'Grade',
    quality: "Quality"
}
const _gradeType = {
    gradeA: 'Grade A',
    gradeB: 'Grade B',
    gradeC: 'Grade C',
}
const _qualityType = {
    poor: 'Poor',
    average: "Average",
    good: 'Good'
}

const _season = {
    Kharif: 'Kharif',
    Rabi: "Rabi",
    Zaid: 'Zaid',
    Other: 'Other'
}
const _period = {
    currentYear: '2025',
    previourYear: "2024",
    range: '2024-2025',
    range1: '2024-2025',
    range2: '2025-2026'
}

const _centralNodalAgency = {
    nodal1: 'nodal1',
    nodal2: "nodal2",
    nodal3: 'nodal3'
}

const _schemeName = {
    PSS: 'PSS',
    PSP: "PSP",
    PDPS: 'PDPS',
    PPPS: "PPPS",
    Open: "Open"
}

const _ccAvenuePaymentStatus = {
    SUCCESS: "Success",
    DECLINED: "Unsuccessful",
    ABORTED_SYSTEM: "Aborted/ Transaction aborted by system",
    ABORTED_BANK: "Aborted/ Transaction aborted at the bank end",
    ABORTED_CLIENT: "Aborted/Browser closed/Cancel reason is not specified by the customer",
    ABORTED_CLIENT: "Aborted/Browser closed/Cancel reason is not specified by the customer",
    INITIATED: "Initiated",
    AUTO_CANCELLED: "Auto-Cancelled",
    AUTO_REVERSED: "Auto-Reversed",
    AWAITED: "Awaited",
    INVALID: "Invalid",
    CANCELLED: "Cancelled",
    SHIPPED: "Shipped",
    TIMEOUT: "Timeout",
    UNKNOWN: "Unknown",
    FAILURE: "Failure"
}


const _statesAndUTs = [
    { name: "Andaman and Nicobar Islands", code: "AN" },
    { name: "Andhra Pradesh", code: "AP" },
    { name: "Arunachal Pradesh", code: "AR" },
    { name: "Assam", code: "AS" },
    { name: "Bihar", code: "BR" },
    { name: "Chandigarh", code: "CH" },
    { name: "Chhattisgarh", code: "CG" },
    { name: "Dadra and Nagar Haveli and Daman and Diu", code: "DN" },
    { name: "Delhi", code: "DL" },
    { name: "Goa", code: "GA" },
    { name: "Gujarat", code: "GJ" },
    { name: "Haryana", code: "HR" },
    { name: "Himachal Pradesh", code: "HP" },
    { name: "Jammu and Kashmir", code: "JK" },
    { name: "Jharkhand", code: "JH" },
    { name: "Karnataka", code: "KA" },
    { name: "Kerala", code: "KL" },
    { name: "Ladakh", code: "LA" },
    { name: "Lakshadweep", code: "LD" },
    { name: "Madhya Pradesh", code: "MP" },
    { name: "Maharashtra", code: "MH" },
    { name: "Manipur", code: "MN" },
    { name: "Meghalaya", code: "ML" },
    { name: "Mizoram", code: "MZ" },
    { name: "Nagaland", code: "NL" },
    { name: "Odisha", code: "OD" },
    { name: "Puducherry", code: "PY" },
    { name: "Punjab", code: "PB" },
    { name: "Rajasthan", code: "RJ" },
    { name: "Sikkim", code: "SK" },
    { name: "Tamil Nadu", code: "TN" },
    { name: "Telangana", code: "TS" },
    { name: "Tripura", code: "TR" },
    { name: "Uttar Pradesh", code: "UP" },
    { name: "Uttarakhand", code: "UK" },
    { name: "West Bengal", code: "WB" }
];

const _verificationStatus = {
    pending: 1,
    succeed: 2,
    failed: 3
};

const dateRanges = ['currentMonth', 'lastMonth', 'last3Months', 'last6Months', 'custom'];
const dateRangesObj = {
    currentMonth: "currentMonth",
    lastMonth: "lastMonth",
    last3Months: "last3Months",
    last6Months: "last6Months",
    custom: "custom"
};
const mailProviders = {
    mailtrap: "mailtrap",
    ses: "ses"
};

const userTypeToURL = {
    [_userType.ho]: `${FRONTEND_URLS["head-office"]}`,
    [_userType.bo]: FRONTEND_URLS["branch-office"],
    [_userType.admin]: FRONTEND_URLS.admin,
    [_userType.distiller]: FRONTEND_URLS.distiller,
    [_userType.nccf]: FRONTEND_URLS.Nccfadmin,
    [_userType.warehouse]: FRONTEND_URLS.warehouse,
    [_userType.farmer]: FRONTEND_URLS.farmer,
    [_userType.agent]: FRONTEND_URLS.agent,
    [_userType.associate]: FRONTEND_URLS.associate,
};

const redisKeys = {
    STATES_DATA: "statesData",
    DISTRICTS_BY_STATE: "districtsByState"
}


const allowedEmailDomains = ['navankur', 'radiantinfonet'];

const _approvalEntityType = {
    Batch: "Batch",
    Payment: "Payment"
};

const _approvalLevel = {
    SLA: "SLA",
    Admin: "Admin",
    BO: "BO",
    HO: "HO"
};

module.exports = {
    redisKeys,
    mailProviders,
    allowedEmailDomains,
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
    _landType,
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
    _frontendLoginRoutes,
    _userTypeFrontendRouteMapping,
    _billstatus,
    _farmerOrderDeliverdStatus,
    _wareHouseApproval,
    _poRequestStatus,
    _poAdvancePaymentStatus,
    _poPaymentStatus,
    _poPickupStatus,
    _poBatchStatus,
    _penaltypaymentStatus,
    _poBatchPaymentStatus,
    _trackOrderStatus,
    _whr_status,
    _commodityType,
    _gradeType,
    _qualityType,
    _season,
    _period,
    _centralNodalAgency,
    _schemeName,
    _verfiycationStatus,
    _ccAvenuePaymentStatus,
    _statesAndUTs,
    _verificationStatus,
    dateRanges,
    dateRangesObj,
    userTypeToURL,
    _approvalEntityType,
    _approvalLevel
}