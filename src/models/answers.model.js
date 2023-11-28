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
    }
    
}, { timestamps: true })

module.exports = model('answer', answerSchema)