const express = require("express");
const router = express.Router();

const config = require('../../config')
const auth = require('../middleware/auth')

const responseModel = require('../models/response.model')
const questionModel = require('../models/questions.models')
require('dotenv').config()

// router.post('/api/v1/createResponse', async (req, res) => {
//     try {
//         let { survey_id, question_id, user_answer } = req.body;
//         let { location_id, user_number } = req.headers;

//         // Find the question details including answers and question type
//         let questionType = await questionModel.findOne({ _id: question_id, active: 1 }).populate([
//             {
//                 path: 'answers',
//                 model: 'answer',
//                 select: 'answer',
//             },
//             {
//                 path: 'question_type',
//                 model: 'question_controller',
//                 select: 'question_type',
//             },
//         ]).select('answers question_type');

//         // Extract question type from the result
//         const { question_type } = questionType;

//         if (question_type === 'text') {
//             const response =await responseModel.create({
//                 survey_id,
//                 question_id,
//                 location_id,
//                 user_number,
//                 user_answer :user_answer
//             });

//             res.json({ message: 'Stored user answer for text question' });
//         } else {
//             // For other question types, compare user's answer with existing answers
//             const userAnswerLower = user_answer.toLowerCase();

//             // Find the matching answer (case-insensitive)
//             const matchedAnswer = questionType.answers.find(answer =>
//                 answer.answer.toLowerCase() === userAnswerLower
//             );

//             if (matchedAnswer) {
//                 // If a matching answer is found, store the response with the answer's ID
//                 const response =await responseModel.create({
//                     survey_id,
//                     question_id,
//                     answer_id: matchedAnswer._id, // Use the ID of the matched answer
//                     location_id,
//                     user_number,
//                     user_answer :user_answer
//                 });

//                 // Your logic to store the response goes here

//                 res.json({ message: 'Stored response with matched answer ID' });
//             } else {
//                 res.json({ message: 'No matching answer found' });
//             }
//         }
//     } catch (error) {
//         res.json({ message: 'Catch error' + error });
//     }
// });

module.exports = router


        // let responseCreation = await responseModel.create({
        //     survey_id,
        //     question_id,
        //     user_answer,
        //     location_id,
        //     user_number
        // })