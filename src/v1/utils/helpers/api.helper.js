const { default: mongoose } = require("mongoose");

function convertToObjecId(id){
    return new mongoose.Types.ObjectId(id);
}



module.exports = { convertToObjecId};