const { _collectionName, _userType, _statusType, _userAction } = require("@src/v1/utils/constants")
const mongoose = require("mongoose")

const { TypesModel } = require("@src/v1/models/master/Types")
const generateUserId = require("@src/v1/utils/helpers/generateUserId")

const getType = async () => { 
    const type = await TypesModel.find()
    return type
}

const userSchema = new mongoose.Schema({

    firstName : { 
        type: String, 
    },
    lastName : { 
        type: String, 
    },
    isSuperAdmin: { 
        type: Boolean,
        default: false
    },
    isAdmin: { 
        type: Boolean,
        default: false
    },
    mobile: { 
        type: String
    },
    email : { 
        type: String, 
        // required: true  // commented it due to warehouse portal because it is email is non mendatory 
    },
    userId : { 
        type: String,
    },
    isProfilePicUploaded : { 
        type: Boolean,
        default: false
    },
    ProfileKey : { 
        type: String,
        default: null
    },
    status: { 
        type: String,
        enum: Object.values(_statusType),
        default: _statusType.inactive
    },
    isPasswordChangeEmailSend: { 
        type: Boolean,
        default: false
    },
    passwordChangedAt: { 
        type: Date
    },
    isInitialPasswordChanged: { 
        type: Boolean, 
        default: false
    },
    password: { 
        type: String,
    },
    user_type: { 
        type:String,
        enum: Object.values(_userType)
    },
    portalId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'portalRef' 
    },
    portalRef: {
        type: String 
    },
    userRole : [ { type: mongoose.Schema.Types.ObjectId , ref: _collectionName.UserRole } ],

    createdBy: {type: mongoose.Schema.Types.ObjectId , ref: _collectionName.MasterUser },

    updatedBy: {type: mongoose.Schema.Types.ObjectId , ref: _collectionName.MasterUser , default: null },

    ipAddress: {type: String, default: null},

    history: {
        type: [mongoose.Schema.Types.Mixed], 
        default: [] 
    }
},

{ timestamps : true }


)

userSchema.pre('save', async function (next) {
     const typeData = await getType()
     typeData.forEach(item=> {
        
        if(this.user_type === item.user_type){
            this.portalRef = item.collectionName;
        }
        
    })


    const historyEntry = { ...this.toObject() };
    delete historyEntry.history
    delete historyEntry._id
    this.history.push(historyEntry);
    
    next();
});

userSchema.post('save', async function (doc, next){

    if(!doc.userId){
        
        let uniqueUserId;
        while (true) {
            const userId = generateUserId();
            const isUserAlreadyExist = await MasterUser.findOne({ userId: {$exists : true }, userId: { $eq: userId }  } );
            if (!isUserAlreadyExist) {
                uniqueUserId = userId;
                break; 
            }
        } 
        doc.userId = uniqueUserId
        await doc.save()
        next()
    }
    

})


const MasterUser = mongoose.model(_collectionName.MasterUser, userSchema) // need to change the collection name

module.exports = {MasterUser}