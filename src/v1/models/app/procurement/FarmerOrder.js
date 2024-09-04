
const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');


const FarmerOrderSchema = new mongoose.Schema({
    sellerOffers_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.SellerOffers, required: true },
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true },
    metaData: { type: Object, required: true },
    offeredQty: { type: Number, required: true },
    orderNo: { type: String, require: true },
    collectionCenter_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.CollectionCenter },
    // recevingdate 
    // farmerDetails , 
    // wiehgt beidgenamne ,  
    // weight bridgenumber , 
    // grosswieght ,  
    // tare weight ,   
    // qty avaiable, 
    // qty procured 
    // net weight  
    // wiehgt slip  
    // status "pending , recieved , reject" , 


}, { timestamps: true });

const FarmerOrder = mongoose.model(_collectionName.FarmerOrder, FarmerOrderSchema);

module.exports = { FarmerOrder };