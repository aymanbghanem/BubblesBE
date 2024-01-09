const { Schema, model } = require('mongoose')

const surveySchema = new Schema({
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
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    company_logo: String,

    active: {
        type: Number,
        default: 1
    },
    survey_description:String,
    logo:{
        type:String
    },
    submission_pwd:{
        type:Number,
        default:1
    },
    background_color:{
        type:String
    }
    ,
    question_text_color:{
        type:String
    },
    location_id:{
        type: Schema.Types.ObjectId,
        ref: 'location'
    },
    responses:{
        type:Number,
        default:0
    },
    title_font_size: {
        type: String
    },
    description_font_size: {
        type: String
    },
    symbol_size: {
        type:String,

    },
    response_message:{
        type:String,
    }

}, { timestamps: true })

module.exports = model('survey', surveySchema)