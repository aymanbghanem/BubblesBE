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
require('dotenv').config()

router.get('/api/v1/getNotifyData', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        if (role === "admin") {
            // Find surveys created by the logged-in user
            let surveys = await surveyModel.find({ created_by: req.user._id, active: 1 })
                .select('survey_title');

            // Find survey readers created by the logged-in user
            let surveyReaders = await userModels.find({ department_id: req.user.department_id})
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


module.exports = router