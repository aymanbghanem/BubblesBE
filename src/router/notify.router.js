const express = require("express");
const router = express.Router();
const surveyModel = require('../models/survey.models')
const { hashPassword } = require('../helper/hashPass.helper')
const { myMulter } = require('../middleware/upload');
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
const surveyReaderModel = require("../models/surveyReader.model");
const Question = require("../models/questions.models");
const Answer = require("../models/answers.model")
const QuestionController = require('../models/questions_controller.models')
const Location = require("../../src/models/location.models");
const questionsModels = require("../models/questions.models");
const Response = require("../models/response.model")
const mongoose = require('mongoose');
const userModels = require("../models/user.models");
const notifyModels = require("../models/notify.models")
require('dotenv').config()

router.get('/api/v1/getNotifyData', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        if (role === "admin") {
            // Find surveys created by the logged-in user
            let surveys = await surveyModel.find({ created_by: req.user._id, active: 1 })
                .select('survey_title');

            // Find survey readers created by the logged-in user
            let surveyReaders = await userModels.find({ department_id: req.user.department_id,user_role:"survey-reader" })
            .select('user_name ');

            let locations = await Location.find({ department_id: req.user.department_id, active: 1 })
                .populate({
                    path: 'survey_id',
                    model: 'survey',
                    select: 'created_by survey_title',
                })
                .select('_id created_by location_name');

            locations = locations.filter(location => location.survey_id.created_by.toString() === req.user._id.toString());

            const locationData = locations.map(location => ({
                location_id: location._id,
                location_name: location.location_name,
            }));

            // Correct the model from Location to Question for the questions query
            let questions = await Question.find({ survey_id: { $in: surveys.map(survey => survey._id) } })
                .select('_id question_title');

            // Retrieve answers associated with the questions
            let answers = await Answer.find({ question_id: { $in: questions.map(question => question._id) } })
                .select('_id answer');

            res.json({ surveys, surveyReaders, locationData, questions, answers });
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});

router.get('/api/getReaderBySurvey', auth, async (req, res) => {
    try {
        let survey_id = req.headers['survey_id'];
        let role = req.user.user_role;

        if (role == "admin") {
            let existingSurvey = await surveyModel.findOne({_id:survey_id,active:1})
            if(existingSurvey){
                let readers = await surveyReaderModel.find({ survey_id: survey_id, active: 1 })
                .populate({
                    path: 'reader_id',
                    model: 'user',
                    select: 'user_name _id', // Specify the fields you want to select
                });

            // Extract only the necessary fields
            let formattedReaders = readers.map(reader => ({
                user_id: reader.reader_id._id,
                user_name: reader.reader_id.user_name,
            }));
             if(formattedReaders.length>0){
                res.json(formattedReaders);
             }
            else{
                res.json({message:"No data found"});
            }
            }
            else{
                res.json({message:"The survey you are looking for does not exist"})
            }
         
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});


router.post('/api/v1/addNotifier', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let { survey_id, location_id, surveyReaders_id, question_id, answer_id } = req.body;
        let existLocation;
        let  existAnswer;
        if (role == "admin") {
            // Check if the survey, location, question, and answer exist and are active
            let existSurvey = await surveyModel.findOne({ _id: survey_id, active: 1 });
            if(location_id){
                 existLocation = await Location.findOne({ _id: location_id, active: 1 });
            }
            
            let existQuestion = await Question.findOne({ _id: question_id, active: 1 });
            if(answer_id){
                existAnswer = await Answer.findOne({ _id: answer_id, active: 1 });
            }
          

            // Check if all survey reader ids exist and are active
            let existReaders = await surveyReaderModel.findOne({ reader_id: surveyReaders_id, active: 1 });

            if (existSurvey && existQuestion && existReaders) {
                // Save data in the notify table
                
                const notifyData = {
                    location_id: location_id?existLocation._id:null,
                    survey_id: existSurvey._id,
                    question_id: existQuestion._id,
                    answer_id: answer_id ?existAnswer._id:null ,
                    answer_text : answer_id? existAnswer.answer:null,
                    survey_reader_id: surveyReaders_id
                };
                // const surveyReaderData = {
                //     company_id:req.user.company_id,
                //     department_id:req.user.department_id,
                //     reader_id : existReaders.map(reader => reader._id),
                //     created_by: req.user._id,
                //     survey_id:existSurvey._id
                // }   
                const notifyEntry = await notifyModels.create(notifyData);
                // const surveyReaderEntry = await surveyReaderModel.create(surveyReaderData);

                res.json({ message: "Data saved successfully", notifyEntry });
            } else {
                res.json({ message: "One or more entities do not exist or are inactive" });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error: " + error });
    }
});



module.exports = router