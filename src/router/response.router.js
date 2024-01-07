const express = require("express");
const router = express.Router();

const config = require('../../config')
const auth = require('../middleware/auth')
const { MongoClient, ObjectId } = require('mongodb');
const _ = require('lodash');
const responseModel = require('../models/response.model')
const questionModel = require('../models/questions.models');
const surveyModels = require("../models/survey.models");
const locationModels = require("../models/location.models");
const notifyModels = require("../models/notify.models");
const notificationModel = require("../models/notification.model");
const surveyReaderModel = require("../models/surveyReader.model");
require('dotenv').config()

router.post('/api/v1/createResponse', async (req, res) => {
    try {
        let survey_id = req.query.survey_id
        let location_id = req.query.location_id;
        let user_number = req.query.user_number
        const user_id = new ObjectId();

        const responseArray = req.body.answered_questions;

        let surveyInfo = await surveyModels.findOne({ _id: survey_id, active: 1 })
        if (surveyInfo) {
            let locationExist = await locationModels.findOne({ _id: location_id, active: 1 })
            if (locationExist) {
                let department_id = surveyInfo.department_id
                let company_id = surveyInfo.company_id

                let existingNotify = await notifyModels.find({
                    survey_id: survey_id,
                    active: 1
                })

                for (const responseObj of responseArray) {
                    const { _id, answers } = responseObj;
                    let question_id = _id;
                    let user_answer = answers;
    
                    for (const notify of existingNotify) {
                        // Check if the question is in existingNotify
                        const isQuestionInNotify = notify.question_id.equals(question_id);
                
                        if (isQuestionInNotify) {
                            let question_title = await questionModel.findOne({_id:question_id}).select('question_title -_id')
                            console.log(question_title)
                            // Check if it's an array of answers
                            if (Array.isArray(user_answer)) {
                                // Iterate through each element in the array
                                for (const individualAnswer of user_answer) {
                                    // Check conditions for creating a notification based on location
                                    const isLocationMatch = notify.location_id === null || notify.location_id.equals(location_id);
                
                                    // Check conditions for creating a notification based on answer text
                                    const isAnswerTextMatch = notify.answer_text === null || notify.answer_text === individualAnswer;
                
                                    // If both location and answer text conditions are met, create a notification
                                    if (isLocationMatch && isAnswerTextMatch) {
                                        await notificationModel.create({
                                            survey_id,
                                            question_id,
                                            location_id: isLocationMatch ? notify.location_id : null,
                                            department_id: department_id,
                                            company_id: company_id,
                                            answer_text: individualAnswer,
                                            survey_reader_id:notify.survey_reader_id
                                            // Add other properties as needed
                                        });
                                        

                                    }
                                }
                            }
                        }
                    }
                
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

                    if (['text', 'range', 'Range', 'Text'].includes(question_type.question_type)) {
                        // If the question type is 'text' or 'range', store the response directly
                        await responseModel.create({
                            survey_id,
                            question_id,
                            location_id,
                            user_number: user_number || "",
                            department_id: department_id,
                            company_id: company_id,
                            user_id,
                            user_answer: user_answer[0],
                            question_type: question_type.question_type
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
                                        user_number: user_number || "",
                                        user_id,
                                        department_id: department_id,
                                        company_id: company_id,
                                        user_answer: selectedAnswer,
                                        question_type: question_type.question_type
                                    });
                                }
                            }
                        } else {
                            // If it's a single answer, store the response as usual
                            await responseModel.create({
                                survey_id,
                                question_id,
                                location_id,
                                user_number: user_number || "",
                                user_id,
                                department_id: department_id,
                                company_id: company_id,
                                user_answer,
                                question_type: question_type.question_type
                            });
                        }
                    } else if (question_type.question_type === 'Single choice') {
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
                                user_number: user_number || "",
                                user_id,
                                department_id: department_id,
                                company_id: company_id,
                                user_answer: user_answer[0],
                                question_type: question_type.question_type
                            });
                        } else {
                            console.log(user_answer);
                        }
                    }
                }
                res.json({ message: 'Stored responses successfully' });
            }
            else {
                res.json({ message: "The location you are looking for does not exist" })
            }
        }
        else {
            res.json({ message: "The survey that you try to answer does not exist" })
        }
    } catch (error) {
        res.json({ message: 'Internal server error ' + error });
    }
});

router.get('/api/v1/getResponses', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let id = req.user._id
        if (role == 'admin') {
            let department_id = req.user.department_id;

            let responses = await responseModel.find({ department_id, active: 1 }).populate([
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
            ]).select('user_answer createdAt active user_id');

            if (responses) {
                // Group responses by user_id
                const groupedResponses = _.groupBy(responses, 'user_id');

                // Select only the first response for each user_id
                const uniqueResponses = _.map(groupedResponses, group => group[0]);

                // Transform the unique responses array
                const formattedResponses = uniqueResponses.map(response => ({
                    _id: response._id,
                    survey_title: response.survey_id.survey_title,
                    location_name: response.location_id.location_name,
                    createdAt: response.createdAt,
                    user_id: response.user_id
                }));

                res.json({ message: formattedResponses });
            } else {
                res.json({ message: "No data found" });
            }
        }
        else if(role == 'survey-reader'){
            let surveys = await surveyReaderModel.find({
                reader_id: id,
                active: 1
            }).select('survey_id');

            if (surveys && surveys.length > 0) {
                const surveyIds = surveys.map(survey => survey.survey_id);

                let responses = await responseModel.find({ survey_id: { $in: surveyIds }, active: 1 }).populate([
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
                ]).select('user_answer createdAt active user_id');

                if (responses) {
                    const formattedResponses = responses.map(response => ({
                        _id: response._id,
                        survey_title: response.survey_id.survey_title,
                        location_name: response.location_id.location_name,
                        createdAt: response.createdAt,
                        user_id: response.user_id,
                        user_answer: response.user_answer
                    }));

                    res.json({ message: formattedResponses });
                } else {
                    res.json({ message: "No responses found for the surveys" });
                }
            } else {
                res.json({ message: "No surveys found for the survey-reader" });
            }
        }
        else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});

router.get('/api/v1/getResponseById', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let user_id = req.headers['user_id'];
        if (role == 'admin' || role == "survey-reader" || role == 'owner') {
            let userResponses = await responseModel.find({
                user_id: user_id,
                active: 1
            });

            if (userResponses.length > 0) {
                // Fetch question titles for each response
                let responsesWithQuestions = await Promise.all(userResponses.map(async (response) => {
                    let question = await questionModel.findOne(response.question_id);
                    return {
                        ...response.toObject(),
                        question_title: question ? question.question_title : 'Question Not Found'
                    };
                }));

                console.log(responsesWithQuestions);
                res.json({ message: responsesWithQuestions });
            } else {
                res.json({ message: "No data found" });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error: " + error });
    }
});

module.exports = router

