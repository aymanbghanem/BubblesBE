const express = require("express");
const router = express.Router();

const config = require('../../config')
const auth = require('../middleware/auth')

const responseModel = require('../models/response.model')
const questionModel = require('../models/questions.models');
const surveyModels = require("../models/survey.models");
require('dotenv').config()

router.post('/api/v1/createResponse', async (req, res) => {
    try {
        const { survey_id } = req.body;
        const { location_id, user_number } = req.headers;
        const responseArray = req.body.answered_questions;

        let surveyInfo = await surveyModels.findOne({_id:survey_id})
        if(surveyInfo){
        let department_id = surveyInfo.department_id
        let company_id = surveyInfo.company_id
        for (const responseObj of responseArray) {
            const { _id, answers } = responseObj;
            let question_id = _id;
            let user_answer = answers;

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

            if (['text', 'range','Range','Text'].includes(question_type.question_type)) {
                // If the question type is 'text' or 'range', store the response directly
                await responseModel.create({
                    survey_id,
                    question_id,
                    location_id,
                    user_number,
                    department_id:department_id,
                    company_id:company_id,
                    user_answer : user_answer[0],
                    question_type : question_type.question_type
                });
            } else if (question_type.question_type === 'Multiple choice') {
                if (Array.isArray(user_answer)) {
                    // If it's an array of answers, iterate over each selected answer
                    for (const selectedAnswer of user_answer) {
                        // Find the matching answer using strict equality
                        const matchedAnswer = questionType.answers.find(answer =>
                            answer.answer == selectedAnswer
                        );

                        if (matchedAnswer) {
                            // If a matching answer is found, store the response with the answer's ID
                            await responseModel.create({
                                survey_id,
                                question_id,
                                answer_id: matchedAnswer._id,
                                location_id,
                                user_number,
                                department_id:department_id,
                                company_id:company_id,
                                user_answer: selectedAnswer,
                                question_type : question_type.question_type
                            });
                        } else {
                            console.log(selectedAnswer);
                        }
                    }
                } else {
                    // If it's a single answer, store the response as usual
                    await responseModel.create({
                        survey_id,
                        question_id,
                        location_id,
                        user_number,
                        department_id:department_id,
                        company_id:company_id,
                        user_answer,
                        question_type : question_type.question_type
                    });
                }
            } else if (question_type.question_type === 'Single choice')  {
                // For other question types, compare user's answer with existing answers using strict equality
                const matchedAnswer = questionType.answers.find(answer =>
                    answer.answer === user_answer[0]
                );

                if (matchedAnswer) {
                    await responseModel.create({
                        survey_id,
                        question_id,
                        answer_id: matchedAnswer._id,
                        location_id,
                        user_number,
                        department_id:department_id,
                        company_id:company_id,
                        user_answer : user_answer[0],
                        question_type : question_type.question_type
                    });
                } else {
                    console.log(user_answer);
                }
            }
        }
        res.json({ message: 'Stored responses successfully' });
    } 
    else{
        res.json({message:"The survey that you try to answer does not exist"})
    }
    } catch (error) {
        res.json({ message: 'Catch error' + error });
    }
});

router.get('/api/v1/getResponses', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        if (role == 'admin' || role == "survey-reader") {
            let department_id = req.user.department_id;
           
            let responses = await responseModel.find({ department_id , active:1}).populate([
                {
                    path: 'survey_id',
                    model: 'survey',
                    select: 'survey_title -_id'
                },
                {
                    path: 'question_id',
                    model: 'question',
                    select: 'question_title -_id'
                },
                {
                    path: 'location_id',
                    model: 'location',
                    select: 'location_name -_id'
                },
            ]).select('user_answer createdAt active');

            if (responses) {
                // Transform the responses array
                const formattedResponses = responses.map(response => ({
                    _id: response._id,
                    question_title: response.question_id.question_title,
                    survey_title: response.survey_id.survey_title,
                    location_name: response.location_id.location_name,
                    user_answer: response.user_answer,
                    createdAt: response.createdAt
                }));

                res.json({ message: formattedResponses });
            } else {
                res.json({ message: "No data found" });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});


module.exports = router

