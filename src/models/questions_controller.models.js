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

questionControllerSchema.statics.initializeQuestionTypes = async function () {
   try {
       const existingQuestionTypes = await this.find();
       if (existingQuestionTypes.length === 0) {
           const defaultQuestionTypes = [
               { question_type: 'Range' },
               { question_type: 'Multiple selection' },
               { question_type: 'Single selection' },
               { question_type: 'Text' },
           ];

           await this.create(defaultQuestionTypes);
           console.log('Default question types inserted successfully.');
       }
   } catch (error) {
       console.error('Error initializing question types:', error);
   }
};

module.exports = model('question_controller', questionControllerSchema);