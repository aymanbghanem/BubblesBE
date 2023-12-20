const express = require("express");
const router = express.Router();

const config = require('../../config')
const auth = require('../middleware/auth')

const responseModel = require('../models/response.model')
const questionModel = require('../models/questions.models')
require('dotenv').config()


router.post('/api/v1/createResponse', async (req, res) => {
    try {
        const { survey_id } = req.body;
        const { location_id, user_number } = req.headers;
        const responseArray = req.body.responses; // Assuming the array is passed as 'responses' in the request body

        // Iterate over each response object in the array
        for (const responseObj of responseArray) {
            const { question_id, user_answer } = responseObj;

            // Find the question details including answers and question type
            const questionType = await questionModel.findOne({ _id: question_id, active: 1 }).populate([
                {
                    path: 'answers',
                    model: 'answer',
                    select: 'answer',
                },
                {
                    path: 'question_type',
                    model: 'question_controller',
                    select: 'question_type',
                },
            ]).select('answers question_type');

            // Extract question type from the result
            const { question_type } = questionType;
            console.log(question_type)
            if (question_type === 'text') {
                // If the question type is 'text', store the response directly
                await responseModel.create({
                    survey_id,
                    question_id,
                    location_id,
                    user_number,
                    user_answer,
                });
                 
            }
            else if (question_type === 'range') {
                await responseModel.create({
                    survey_id,
                    question_id,
                    location_id,
                    user_number,
                    user_answer,
                });
                
            }
            else {
                // For other question types, compare user's answer with existing answers using regex
                const userAnswerLower = user_answer.toLowerCase();

                // Function to check if the user's answer matches any of the existing answers using regex
                const isMatch = (answer, userAnswer) => {
                    const regex = new RegExp(answer, 'i'); // 'i' flag for case-insensitive matching
                    return regex.test(userAnswer);
                };

                // Find the matching answer (using regex)
                const matchedAnswer = questionType.answers.find(answer =>
                    isMatch(answer.answer, userAnswerLower)
                );

                if (matchedAnswer) {
                    // If a matching answer is found, store the response with the answer's ID
                    await responseModel.create({
                        survey_id,
                        question_id,
                        answer_id: matchedAnswer._id, // Use the ID of the matched answer
                        location_id,
                        user_number,
                        user_answer,
                    });
                   
                } else {
                    res.json({ message: "There is no answer matching your answer" })
                }
            }
        }
        res.json({ message: 'Stored responses successfully' });
    } catch (error) {
        res.json({ message: 'Catch error' + error });
    }
});


module.exports = router


// let responseCreation = await responseModel.create({
//     survey_id,
//     question_id,
//     user_answer,
//     location_id,
//     user_number
// })