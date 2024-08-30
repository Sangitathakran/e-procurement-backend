
const mongoose = require("mongoose") ;  
const { _collectionName , _status} = require("@src/v1/utils/constants") ; 
const { _commonKeys } = require("@src/v1/utils/helpers/collection")

const varietySchema = new mongoose.Schema({ 

     name : { type : String , required : true , trim : true}, 
     status : { type : String , enum : Object.values(_status) , default: _status.active } ,   
     ..._commonKeys , 

},{timestamps : true })


const Variety = mongoose.model(_collectionName.Variety , varietySchema );  

module.exports = { Variety } ; 