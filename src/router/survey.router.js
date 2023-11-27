const express = require("express");
const router = express.Router();
const surveyModel = require('../models/survey.models')
const { hashPassword } = require('../helper/hashPass.helper')
const { myMulter } = require('../middleware/upload');
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
const surveyReaderModel = require("../models/surveyReader.model");
require('dotenv').config()

//department_name: user.department_id ? user.department_id.department_name || " " : " " ,

router.post('/api/v1/createSurvey', auth, async (req, res) => {
  try {

    let role = req.user.user_role

    let { survey_title, survey_description, company_id, logo, submission_pwd,background_color,question_text_color} = req.body
    survey_title = survey_title.toLowerCase()
    if (role == 'admin') {
      let department_id = req.user.department_id
      let existingSurvey = await surveyModel.findOne({ survey_title: survey_title, department_id: department_id, active: 1 })
      if (existingSurvey) {
        res.json({ message: "survey title already exist" })
      }
      else {
        let survey = await surveyModel.create({
          survey_title: survey_title,
          survey_description: survey_description,
          logo: logo,
          department_id: department_id,
          submission_pwd: submission_pwd,
          created_by: req.user._id,
          company_id: req.user.company_id,
          background_color:background_color,
          question_text_color:question_text_color,
        })
        res.json({ message: "successfully added", survey })
      }
    }
    else {
      res.json({ message: "sorry you are unauthorized" })
    }
  } catch (error) {
    res.json({ message: "catch error " + error })
  }
})

router.get('/api/v1/getSurvey', auth, async (req, res) => {
  try {
    let role = req.user.user_role
    let id = req.user._id
    if (role == 'owner') {
      let existingSurvey = await surveyModel.find({
        company_id: req.user.company_id,
        active: 1
      }).select('survey_title active -_id').populate([
        {
          path: 'department_id',
          select: 'department_name',
        },
        {
          path: 'created_by',
          select: 'user',
        },
      ])
      if (existingSurvey.length != 0) {

        res.json({ message: existingSurvey })
      }
      else {
        res.json({ message: "sorry , there is no survey" })
      }
    }

    else if (role == 'admin') {
      let existingSurvey = await surveyModel.find({
        department_id: req.user.department_id,
        active: 1
      }).select('survey_title active -_id').populate([
        {
          path: 'department_id',
          select: 'department_name -_id',
        },
        {
          path: 'created_by',
          select: 'user_name -_id',
        },
      ])
      if (existingSurvey.length != 0) {
        res.json({ message: existingSurvey })
      }
      else {
        res.json({ message: "sorry , there is no survey" })
      }
    }

    else if (role == 'survey-reader') {
      let surveys = await surveyReaderModel.find({
        reader_id: id,
        active: 1
      }).select('survey_title active -_id').populate([
        {
          path: 'department_id',
          select: 'department_name -_id'
        },
        {
          path: 'reader_id',
          select: 'user_name -_id'
        },
        {
          path: 'created_by',
          select: 'user_name -_id'
        }
      ])
      if (surveys.length != 0) {
        res.json({ message: surveys })
      }
      else {
        res.json({ message: "sorry, there are no surveys for you" })
      }
    }
    else {
      res.json({ message: "sorry you are unauthorized" })
    }
  } catch (error) {
    res.json({ message: "catch error " + error })
  }
})


router.delete('/api/v1/deleteSurvey', auth, async (req, res) => {
  try {
      let role = req.user.user_role;
      let department_id = req.user.department_id;
      let survey_title = req.body.survey_title.toLowerCase(); 

      if (role === 'admin') {
          let existingSurvey = await surveyModel.findOne({ survey_title, department_id, active: 1 });

          if (existingSurvey) {
              // Soft delete by updating the 'active' field to 0
              await surveyModel.updateOne({ _id: existingSurvey._id }, { active: 0 });

              res.json({ message: "Survey deleted successfully" });
          } else {
              res.json({ message: "The survey you are looking for does not exist" });
          }
      } else {
          res.json({ message: "Sorry, you are unauthorized" });
      }
  } catch (error) {
      res.json({ message: "Catch error " + error });
  }
});

module.exports = router
