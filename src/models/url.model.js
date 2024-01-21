const { Schema, model } = require('mongoose')

const urlSchema = new Schema({
    active: {
        type: Number,
        default: 1
    },
    location_id: {
        type: Schema.Types.ObjectId,
        ref: 'location'
    },
    survey_id: {
        type: Schema.Types.ObjectId,
        ref: 'survey'
    },
    link:{
        type:String
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    }

}, { timestamps: true })

module.exports = model('url', urlSchema)