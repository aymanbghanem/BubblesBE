const { Schema, model } = require('mongoose')

const surveyReaderSchema = new Schema({
    survey_title: {
        type: String
    },
    company_id: {
        type: Schema.Types.ObjectId,
        ref: 'company'
    },
    department_id: {
        type: Schema.Types.ObjectId,
        ref: 'department'
    },
    reader_id: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    
    active: {
        type: Number,
        default: 1
    },
    created_by:{
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    survey_id:{
        type: Schema.Types.ObjectId,
        ref: 'survey'
    }

}, { timestamps: true })

module.exports = model('survey_reader', surveyReaderSchema)