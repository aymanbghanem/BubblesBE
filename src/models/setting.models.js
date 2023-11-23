const { Schema, model } = require('mongoose')

const settingSchema = new Schema({
    title_weight: {
        type: String
    },
    title_font_size: {
        type: String
    },
    description_font_size: {
        type: String
    },
    question_font_size: {
        type: String
    },
    active: {
        type: Number,
        default: 1
    },

    location_limitation:{
        type: Number,
        default: 5
    },
   
    range_limitation:{
        type: Number,
        default: 5
    },
    char_limitation:{
        type: Number,
        default: 120
    },

}, { timestamps: true })

module.exports = model('setting', settingSchema)