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
        const responseArray = req.body.responses;

        for (const responseObj of responseArray) {
            const { question_id, user_answer } = responseObj;

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

            const { question_type } = questionType;

            if (question_type.question_type === 'text' || question_type.question_type === 'Text' || question_type.question_type === 'range' || question_type.question_type === 'Range') {
                // If the question type is 'text' or 'range', store the response directly
                await responseModel.create({
                    survey_id,
                    question_id,
                    location_id,
                    user_number,
                    user_answer,
                });
            } else if (question_type.question_type === 'Multiple choice') {
                if (Array.isArray(user_answer)) {
                    // If it's an array of answers, iterate over each selected answer
                    for (const selectedAnswer of user_answer) {
                        // Check if the selected answer matches any of the existing answers using regex
                        const userAnswerLower = selectedAnswer.toLowerCase();
                        const isMatch = (answer, userAnswer) => {
                            const regex = new RegExp(answer, 'i');
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
                                answer_id: matchedAnswer._id,
                                location_id,
                                user_number,
                                user_answer: selectedAnswer,
                            });
                        } else {
                            console.log(userAnswerLower);
                        }
                    }
                } else {
                    // If it's a single answer, store the response as usual
                    await responseModel.create({
                        survey_id,
                        question_id,
                        location_id,
                        user_number,
                        user_answer,
                    });
                }
            } else {
                // For other question types, compare user's answer with existing answers using regex
                const userAnswerLower = user_answer.toLowerCase();
                const isMatch = (answer, userAnswer) => {
                    const regex = new RegExp(answer, 'i');
                    return regex.test(userAnswer);
                };

                const matchedAnswer = questionType.answers.find(answer =>
                    isMatch(answer.answer, userAnswerLower)
                );

                if (matchedAnswer) {
                    await responseModel.create({
                        survey_id,
                        question_id,
                        answer_id: matchedAnswer._id,
                        location_id,
                        user_number,
                        user_answer,
                    });
                } else {
                    console.log(userAnswerLower);
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