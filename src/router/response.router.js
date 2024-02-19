const express = require("express");
const router = express.Router();
const CryptoJS = require('crypto-js');
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
const sendNotificationEmail = require("../middleware/notification");
const restricted_urlModel = require("../models/restricted_url.model");
require('dotenv').config()

router.post(`${process.env.BASE_URL}/createResponse`, async (req, res) => {
    try {
        let survey_id = req.query.survey_id
        let location_id = req.query.location_id;
        // let user_number = req.query.user_number
        const user_id = new ObjectId();
        let responseRecord;
        const responseArray = req.body.answered_questions;

        let surveyInfo = await surveyModels.findOne({ _id: survey_id, active: 1 })
        if (surveyInfo) {
            if (surveyInfo.restricted == 0) {
                let user_number = req.query.user_number
                let response_message = surveyInfo.response_message
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

                        if (['text', 'range', 'Range', 'Text', 'Single selection'].includes(question_type.question_type)) {
                            // If the question type is 'text' or 'range', store the response directly
                            responseRecord = await responseModel.create({
                                survey_id,
                                question_id,
                                location_id,
                                user_number: user_number || "",
                                department_id: department_id,
                                company_id: company_id,
                                user_id,
                                user_answer: user_answer[0] ? user_answer[0] : "No answer",
                                question_type: question_type.question_type
                            });
                        } else if (question_type.question_type === 'Multiple selection') {
                            if (Array.isArray(user_answer)) {
                                // If it's an array of answers, iterate over each selected answer
                                for (const selectedAnswer of user_answer) {
                                    // Find the matching answer using strict equality
                                    const matchedAnswer = questionType.answers.find(answer =>
                                        answer.answer == selectedAnswer
                                    );

                                    if (matchedAnswer) {
                                        // If a matching answer is found, store the response with the answer's ID
                                        responseRecord = await responseModel.create({
                                            survey_id,
                                            question_id,
                                            answer_id: matchedAnswer._id,
                                            location_id,
                                            user_number: user_number || "",
                                            user_id,
                                            department_id: department_id,
                                            company_id: company_id,
                                            user_answer: selectedAnswer ? selectedAnswer : "No answer",
                                            question_type: question_type.question_type
                                        });
                                    }
                                }
                            } else {
                                // If it's a single answer, store the response as usual
                                responseRecord = await responseModel.create({
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
                        }
                        for (const notify of existingNotify) {
                            // Check if the question is in existingNotify
                            const isQuestionInNotify = notify.question_id.equals(responseRecord.question_id);
                            let location_id = notify.location_id

                            if (isQuestionInNotify) {
                                let question_title = await questionModel.findOne({ _id: question_id }).select('question_title -_id')
                                if (location_id != null) {
                                    location_name = await locationModels.findOne({ _id: location_id }).select('location_name -_id')
                                    location_name = location_name.location_name
                                }
                                else {
                                    location_name = await locationModels.findOne({ _id: locationExist._id }).select('location_name -_id')
                                    location_name = location_name.location_name
                                }


                                // Check if it's an array of answers
                                if (Array.isArray(user_answer)) {
                                    // Iterate through each element in the array
                                    for (const individualAnswer of user_answer) {
                                        // Check conditions for creating a notification based on location
                                        const isLocationMatch = notify.location_id === null || notify.location_id.equals(location_id);

                                        // Check conditions for creating a notification based on answer text
                                        const isAnswerTextMatch = notify.answer_text === null ||
                                            notify.answer_text === ""
                                            || notify.answer_text === individualAnswer;

                                        // If both location and answer text conditions are met, create a notification
                                        if (isLocationMatch && isAnswerTextMatch) {
                                            await notificationModel.create({
                                                location_id: isLocationMatch ? notify.location_id : null,
                                                department_id: department_id,
                                                company_id: company_id,
                                                survey_reader_id: notify.survey_reader_id,
                                                response_id: responseRecord._id,
                                                created_by: notify.created_by,
                                                survey_id: notify.survey_id
                                                // Add other properties as needed
                                            });

                                            let email = await sendNotificationEmail(notify.reader_name, notify.reader_email, "User Response Alert"
                                                , question_title.question_title, location_name, individualAnswer)

                                        }
                                    }
                                }
                            }
                        }
                    }
                    res.json({ message: response_message, type: 2 });
                }
                else {
                    res.json({ message: "Location not found", type: 0 });
                }
            }
            else if (surveyInfo.restricted == 1) {
                const encodedLink = decodeURIComponent(req.query.user_number);
                // Base64 decode the URL parameter
                const decodedString = Buffer.from(encodedLink, 'base64').toString('utf-8');
                // Split the decoded string if needed
                let user_link = decodedString
                let link = await restricted_urlModel.findOne({ link: user_link, active: 1 })
                if (link) {
                    let user_number = decodedString.split('/')[0];
                    let response_message = surveyInfo.response_message
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

                            if (['text', 'range', 'Range', 'Text', 'Single selection'].includes(question_type.question_type)) {
                                // If the question type is 'text' or 'range', store the response directly
                                responseRecord = await responseModel.create({
                                    survey_id,
                                    question_id,
                                    location_id,
                                    user_number: user_number,
                                    department_id: department_id,
                                    company_id: company_id,
                                    user_id,
                                    user_answer: user_answer[0] ? user_answer[0] : "No answer",
                                    question_type: question_type.question_type
                                });
                            } else if (question_type.question_type === 'Multiple selection') {
                                if (Array.isArray(user_answer)) {
                                    // If it's an array of answers, iterate over each selected answer
                                    for (const selectedAnswer of user_answer) {
                                        // Find the matching answer using strict equality
                                        const matchedAnswer = questionType.answers.find(answer =>
                                            answer.answer == selectedAnswer
                                        );

                                        if (matchedAnswer) {
                                            // If a matching answer is found, store the response with the answer's ID
                                            responseRecord = await responseModel.create({
                                                survey_id,
                                                question_id,
                                                answer_id: matchedAnswer._id,
                                                location_id,
                                                user_number: user_number,
                                                user_id,
                                                department_id: department_id,
                                                company_id: company_id,
                                                user_answer: selectedAnswer ? selectedAnswer : "No answer",
                                                question_type: question_type.question_type
                                            });
                                        }
                                    }
                                } else {
                                    // If it's a single answer, store the response as usual
                                    responseRecord = await responseModel.create({
                                        survey_id,
                                        question_id,
                                        location_id,
                                        user_number: user_number,
                                        user_id,
                                        department_id: department_id,
                                        company_id: company_id,
                                        user_answer,
                                        question_type: question_type.question_type
                                    });
                                }
                            }
                            for (const notify of existingNotify) {
                                // Check if the question is in existingNotify
                                const isQuestionInNotify = notify.question_id.equals(responseRecord.question_id);
                                let location_id = notify.location_id

                                if (isQuestionInNotify) {
                                    let question_title = await questionModel.findOne({ _id: question_id }).select('question_title -_id')
                                    if (location_id != null) {
                                        location_name = await locationModels.findOne({ _id: location_id }).select('location_name -_id')
                                        location_name = location_name.location_name
                                    }
                                    else {
                                        location_name = await locationModels.findOne({ _id: locationExist._id }).select('location_name -_id')
                                        location_name = location_name.location_name
                                    }


                                    // Check if it's an array of answers
                                    if (Array.isArray(user_answer)) {
                                        // Iterate through each element in the array
                                        for (const individualAnswer of user_answer) {
                                            // Check conditions for creating a notification based on location
                                            const isLocationMatch = notify.location_id === null || notify.location_id.equals(location_id);

                                            // Check conditions for creating a notification based on answer text
                                            const isAnswerTextMatch = notify.answer_text === null ||
                                                notify.answer_text === ""
                                                || notify.answer_text === individualAnswer;

                                            // If both location and answer text conditions are met, create a notification
                                            if (isLocationMatch && isAnswerTextMatch) {
                                                await notificationModel.create({
                                                    location_id: isLocationMatch ? notify.location_id : null,
                                                    department_id: department_id,
                                                    company_id: company_id,
                                                    survey_reader_id: notify.survey_reader_id,
                                                    response_id: responseRecord._id,
                                                    created_by: notify.created_by,
                                                    survey_id: notify.survey_id
                                                    // Add other properties as needed
                                                });

                                                let email = await sendNotificationEmail(notify.reader_name, notify.reader_email, "User Response Alert"
                                                    , question_title.question_title, location_name, individualAnswer)

                                            }
                                        }
                                    }
                                }
                            }
                        }
                        link = await restricted_urlModel.findOneAndUpdate({ link: user_link, active: 1 }, { active: 0 })
                        res.json({ message: response_message, type: 2 });
                    }
                    else {
                        res.json({ message: "Location not found", type: 0 });
                    }
                }
                else {
                    res.json({ message: "This link is not valid", type: 0 })
                }

            }
        }
        else {
            res.json({ message: "Survey not found for answering", type: 0 });
        }
    } catch (error) {
        res.json({ message: 'Internal server error ' + error });
    }
});

router.get(`${process.env.BASE_URL}/getResponses`, auth, async (req, res) => {
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
            ]).select('user_answer createdAt active user_id user_number');

            if (responses.length > 0) {
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
                    user_id: response.user_id,
                    user_number: response.user_number
                }));

                res.json({ message: formattedResponses, type: 2 });
            } else {
                res.json({ message: "No data found", type: 0 });
            }
        }
        else if (role == 'survey-reader') {
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
                ]).select('user_answer createdAt active user_id user_number');
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
                        user_id: response.user_id,
                        user_answer: response.user_answer,
                        user_number: response.user_number
                    }));

                    res.json({ message: formattedResponses, type: 2 });
                }

                else {
                    res.json({ message: "No responses found for the surveys", type: 0 });
                }
            } else {
                res.json({ message: "No surveys found for the survey-reader", type: 0 });

            }
        }
        else {
            res.json({ message: "Sorry, you are unauthorized", type: 0 });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});

router.get(`${process.env.BASE_URL}/getResponseById`, auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let user_id = req.headers['user_id'];
        if (role == 'admin' || role == "survey-reader" || role == 'owner') {
            let userResponses = await responseModel.find({
                user_id: user_id,
                active: 1
            });

            if (userResponses.length > 0) {
                // Group responses by question_id
                let groupedResponses = userResponses.reduce((acc, response) => {
                    let key = response.question_id;
                    if (!acc[key]) {
                        acc[key] = [];
                    }
                    acc[key].push(response);
                    return acc;
                }, {});

                // Fetch question titles and combined answers for each question
                let responsesWithQuestions = await Promise.all(Object.keys(groupedResponses).map(async (questionId) => {
                    let question = await questionModel.findOne({ _id: questionId }); // Corrected line
                    let combinedAnswers = groupedResponses[questionId].map(response => response.user_answer);

                    return {
                        question_id: questionId,
                        question_title: question ? question.question_title : 'Question Not Found',
                        user_answer: combinedAnswers,
                    };
                }));

                res.json({ message: responsesWithQuestions, type: 2 });
            } else {
                res.json({ message: "No data found", type: 0 });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized", type: 0 });
        }
    } catch (error) {
        res.json({ message: "Catch error: " + error });
    }
});


module.exports = router

