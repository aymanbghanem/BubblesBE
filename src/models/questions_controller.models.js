const { Schema, model } = require('mongoose')

const questionControllerSchema = new Schema({
   active:{
    type:Number,
    default:1
   },
   question_type:{
    type:String
   },

}, { timestamps: true })

module.exports = model('question_controller', questionControllerSchema)