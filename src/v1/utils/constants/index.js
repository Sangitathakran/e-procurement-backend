const _collectionName = {
    emandi_orders: "emandi_orders",
    emandi_order_details: "emandi_order_details",
    farmers: "farmers",
    individualFarmers:"individual_farmers",
    Users: "Users",
    Category: "Category",
    Variety: "variety",
    Unit: "unit",
    Grade: "grade",
    Commodity: "Commodity",
    product: "Product",
    ProductRequest: "ref_productRequest",
    TraderQuote: "ref_traderQuote",
    Order: "ref_order",
    PaymentTransaction: "ref_paymentTransaction",
    ShippingDocument: "ref_shippingDocument",
    Account: "account",
    Organization: "organization",
    ProcurementRequest: "ProcurementRequest",
    SellerOffers: "SellerOffers",
    ContributedFarmers: "ContributedFarmers",
    CollectionCenter: "CollectionCenter",
    Lands: "Lands",
    Banks: "Banks",
    Crops: "Crops",
}
const _status = {
    active: "active",
    inactive: "inactive",
}

const _individualStatus = {
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

const _procurementRequestStatus = {
    open: 'Open',
    partially_fulfulled: 'Partially Fulfilled',
    fulfilled: 'Fulfilled',
    closed: 'Closed'
}

const _sellerOfferStatus = {
    accepted: 'Accepted',
    rejected: 'Rejected',
    pending: 'Pending'
}

const userType = {
    admin: "Admin",
    trader: "Trader",
    ho: "HO",
    bo: "BO",
}

const _webSocketEvents = {
    procurement: "procurement"
}

const _traderType = {
    government_organisation: 'Government Organisation',
    exporter: 'Exporter',
    ocmmission_agent: 'Commission Agent',
    individual: 'Individual',
    FPO: 'FPO',
    non_profit: 'Non-Profit',
    private_company: 'Private Company',
    HO: 'HO',
    BO: 'BO',

}
const _proofType = {
    aadhar: "aadhar",
    pancard: "pancard",
    voterId: "voterId",
}
const _titles = {
    mr: "mr",
    mrs: "mrs",
    miss: "miss",
}
const _gender = {
    male: "male",
    female: "female",
    other: "other",
}
const _maritalStatus = {
    married: "married",
    unmarried: "unmarried",
}
const _religion = {
    hindu: "hindu",
    muslim: "muslim",
    sikh: "sikh",
    isai: "isai",
    parsi: "parsi",
}
const _category = {
    gen: "gen",
    obc: "obc",
    sc: "sc",
    st: "st",
}
const _areaUnit ={
    hectares: "hectares",
    acres: "acres",
    bigha: "bigha",
}
const _soilType ={
    sandy: "sandy",
    loamy: "loamy",
    clayey: "clayey",
    red_soil:"red_soil",
    alkaline: "alkaline",
    other: "other",
}
const _distanceUnit ={
    km: "km",
    metre: "metre",
}
const _seedUsed ={
    farmseved: "farmseved",
    company: "company",
}
const _yesNo ={
    yes: "yes",
    no: "no",
}
const _seasons ={
    rabi: "rabi",
    kharif: "kharif",
    zaid: "zaid",
    others: "others",
}
const _education ={
    nonmatric: "nonmatric",
    matric: "matric",
    intermidiate: "intermidiate",
    graduate: "graduate",
    postgraduate: "postgraduate",
    others: "others",
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

}

const _zaidCrops = { 
    onion: "onion",
    tur: "tur",
    moong: "moong",
}

const _individual_farmer_onboarding_steps = [ 
    { 
        screen_name: "basic_details",
        screen_number: 1,
        isCompleted: false
    },
    { 
        screen_name: "address",
        screen_number: 2,
        isCompleted: false
    },
    { 
        screen_name: "land_details",
        screen_number: 3,
        isCompleted: false
    },
    { 
        screen_name: "documents",
        screen_number: 4,
        isCompleted: false
    },
    { 
        screen_name: "bank_details",
        screen_number: 5,
        isCompleted: false
    },

]

module.exports = {
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
    _procurementRequestStatus,
    _sellerOfferStatus,
    _webSocketEvents,
    userType,
    _traderType,
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
    _individual_farmer_onboarding_steps
}