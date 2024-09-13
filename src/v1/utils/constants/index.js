const _collectionName = {
    emandi_orders: "emandi_orders",
    emandi_order_details: "emandi_order_details",
    farmers: "farmers",
    individualFarmers: "individual_farmers",
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
    FarmerOrder: "FarmerOrder",
    StateDistrictCity: "StateDistrictCity",
    AssociateOrders: "AssociateOrders",
    Payment: "Payment",
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

const _procurementRequestStatus = {
    open: 'Open',
    partially_fulfulled: 'Partially Fulfilled',
    fulfilled: 'Fulfilled',
    closed: 'Closed'
}

const _sellerOfferStatus = {
    accepted: 'Accepted',
    rejected: 'Rejected',
    pending: 'Pending',
    ordered: "Ordered",
}

const _procuredStatus = {
    received: "Received",
    pending: "Pending",
    rejected: "Rejected",
}
const _userType = {
    admin: "Admin",
    trader: "Trader",
    ho: "HO",
    bo: "BO",
    associate: "Associate",
    farmer: "farmer",
}

const _trader_type = {
    ORGANISATION: 'Organisation',
    SOCIETY: 'Society',
    TRUST: 'Trust',
    INDIVIDUAL: 'Individual',
    PROPRITER: 'Propriter',
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
    Aadhar: "Aadhar",
    Pancard: "Pancard",
    VoterId: "VoterId",
}
const _titles = {
    Mr: "Mr",
    Mrs: "Mrs",
    Miss: "Miss",
}
const _gender = {
    Male: "Male",
    Female: "Female",
    Other: "Other",
}
const _maritalStatus = {
    Married: "Married",
    Unmarried: "Unmarried",
}
const _religion = {
    Hindu: "Hindu",
    Muslim: "Muslim",
    Sikh: "Sikh",
    Isai: "Isai",
    Parsi: "Parsi",
}
const _category = {
    GEN: "GEN",
    OBC: "OBC",
    SC: "SC",
    ST: "ST",
}
const _areaUnit = {
    Hectares: "Hectares",
    Acres: "Acres",
    Bigha: "Bigha",
}
const _soilType = {
    Sandy: "Sandy",
    Loamy: "Loamy",
    Clayey: "Clayey",
    Red_soil: "Red_soil",
    Alkaline: "Alkaline",
    Other: "Other",
}
const _distanceUnit = {
    Km: "Km",
    Metre: "Metre",
}
const _seedUsed = {
    farmseved: "Farmseved",
    Company: "Company",
}
const _yesNo = {
    Yes: "Yes",
    No: "No",
}
const _seasons = {
    Rabi: "Rabi",
    Kharif: "Kharif",
    Zaid: "Zaid",
    Others: "Others",
}
const _education = {
    Nonmatric: "Nonmatric",
    Matric: "Matric",
    Intermidiate: "Intermidiate",
    Graduate: "Graduate",
    Postgraduate: "Postgraduate",
    Others: "Others",
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
        label: "basic_details",
        screen_number: 1,
        status: "pending"
    },
    {
        label: "address",
        screen_number: 2,
        status: "pending"
    },
    {
        label: "land_details",
        screen_number: 3,
        status: "pending"
    },
    {
        label: "documents",
        screen_number: 4,
        status: "pending"
    },
    {
        label: "bank_details",
        screen_number: 5,
        status: "pending"
    },

]


const _associateOrderStatus = {
    pending: "Pending",
    dispatched: "Dispatched",
    intransit: "In-Transit",
    delivered: "Delivered",
}

const _paymentmethod = {
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
}

const _paymentstatus = {
    pending: "Pending",
    completed: "Completed",
}

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
    _associateOrderStatus,
    _paymentmethod,
    _paymentstatus,
    _center_type,
    _address_type
}