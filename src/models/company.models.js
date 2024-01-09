const { Schema, model } = require('mongoose')

const companySchema = new Schema({
    company_name: {
        type: String
    },

    active: {
        type: Number,
        default: 1
    },
    company_logo:String,
    basic:{
        type: Number,
        default:1
    },
    dashboard:{
        type: Number,
        default:0
    }
    ,
    notifier:{
        type: Number,
        default:0
    }
    
}, { timestamps: true })

module.exports = model('company', companySchema)