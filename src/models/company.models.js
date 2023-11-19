const { Schema, model } = require('mongoose')

const companySchema = new Schema({
    company_name: {
        type: String
    },

    active: {
        type: Number,
        default: 1
    },
    
}, { timestamps: true })

module.exports = model('company', companySchema)