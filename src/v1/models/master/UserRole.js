const { _collectionName } = require('@src/v1/utils/constants')
const mongoose = require('mongoose')

const userRoleSchema = new mongoose.Schema({

    userRoleName: { 
        type: String, 
        required: true
    },
    userAssigned: { 
        type: Number, 
        default: 0
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: _collectionName.MasterUser,
        default: null
    },
    updatedBy : { 
        type: mongoose.Schema.Types.ObjectId,
        ref: _collectionName.MasterUser,
        default: null
    },
    features: [
        {
            featureName: { 
                type: String
            },
            enabled : { 
                type: Boolean
            },
            subFeatures: [
                { 
                    subFeatureName: { 
                        type: String
                    },
                    enabled : { 
                        type: Boolean
                    },
                    permissions: {
                        
                        view : {
                            type: Boolean,
                            default: false
                        },
                        add : {
                            type: Boolean,
                            default: false
                        },
                        edit : {
                            type: Boolean,
                            default: false
                        },
                        delete : {
                            type: Boolean,
                            default: false
                        },
                        export : {
                            type: Boolean,
                            default: false
                        },
                        status : {
                            type: Boolean,
                            default: false
                        },
                        takeAction: {
                            type: Boolean,
                            default: false
                        }
                    },
                    components: [{
                        componentName: {type: String},
                        enabled: {type: Boolean}
                    }]
                }    
            ],
        }
    ],
    history: [{
        data: {
            userRoleName: { 
                type: String, 
                required: true
            },
            userAssigned: { 
                type: Number, 
                default: 0
            },
            createdBy: { 
                type: mongoose.Schema.Types.ObjectId,
                ref: _collectionName.MasterUser,
                default: null
            },
            updatedBy : { 
                type: mongoose.Schema.Types.ObjectId,
                ref: _collectionName.MasterUser,
                default: null
            },
            features: [
                {
                    featureName: { 
                        type: String
                    },
                    enabled : { 
                        type: Boolean
                    },
                    subFeatures: [
                        { 
                            subFeatureName: { 
                                type: String
                            },
                            enabled : { 
                                type: Boolean
                            },
                            permissions: {
                                
                                view : {
                                    type: Boolean,
                                    default: false
                                },
                                add : {
                                    type: Boolean,
                                    default: false
                                },
                                edit : {
                                    type: Boolean,
                                    default: false
                                },
                                delete : {
                                    type: Boolean,
                                    default: false
                                },
                                export : {
                                    type: Boolean,
                                    default: false
                                },
                                status : {
                                    type: Boolean,
                                    default: false
                                },
                                takeAction: {
                                    type: Boolean,
                                    default: false
                                }
                            },
                            components: [{
                                componentName: {type: String},
                                enabled: {type: Boolean}
                            }]
                        }    
                    ],
                }
            ]
        },
        version: {
            type: Number,
            default: 1
        },
        updatedAt: { type: Date, default: Date.now },
        updatedBy : { 
            type: mongoose.Schema.Types.ObjectId,
            ref: _collectionName.MasterUser,
            default: null
        }
    }] 
},
    { timestamps : true}
)

const UserRole = mongoose.model(_collectionName.UserRole, userRoleSchema)
module.exports = UserRole