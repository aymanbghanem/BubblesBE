const { Schema, model } = require('mongoose')

const qrSchema = new Schema({
    active: {
        type: Number,
        default: 1
    },
    location_id: {
        type: Schema.Types.ObjectId,
        ref: 'survey'
    },
    survey_id: {
        type: Schema.Types.ObjectId,
        ref: 'survey'
    },
    link:{
        type:String
    }

}, { timestamps: true })

module.exports = model('QR', qrSchema)