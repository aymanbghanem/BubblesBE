const { Schema, model } = require('mongoose')

const companySchema = new Schema({
    company_name: {
        type: String
    },

    active: {
        type: Number,
        default: 1
    },
    company_logo:String
    
}, { timestamps: true })

module.exports = model('company', companySchema)