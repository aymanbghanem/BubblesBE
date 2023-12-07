const { Schema, model } = require('mongoose')

const answerSchema = new Schema({
   active: {
        type: Number,
        default: 1
    },
    question_id:{
        type:Schema.Types.ObjectId,
        ref : 'question'
    },
    answer:{
        type:String
    },
    priority:{
        type:Number,
        default:0
    },
    image:{
        type:String
    },
    survey_id:{
        type:Schema.Types.ObjectId,
        ref : 'survey'
    }
    
}, { timestamps: true })

module.exports = model('answer', answerSchema)