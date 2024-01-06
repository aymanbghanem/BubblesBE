const { Schema, model } = require('mongoose')

const notifySchema = new Schema({
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
    question_id: {
        type: Schema.Types.ObjectId,
        ref: 'question'
    },
    answer_id: {
        type: Schema.Types.ObjectId,
        ref: 'answer'
    },
    answer_text:String,
    survey_reader_id: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },  created_by:{
        type: Schema.Types.ObjectId,
        ref: 'user'
    },

}, { timestamps: true })

module.exports = model('notify', notifySchema)