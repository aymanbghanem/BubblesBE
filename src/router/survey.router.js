const express = require("express");
const router = express.Router();
const surveyModel = require('../models/survey.models')
const {hashPassword} = require('../helper/hashPass.helper')
const {myMulter} = require('../middleware/upload');
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()



router.post('/api/v1/createSurvey',auth,async(req,res)=>{
      try {
    
        let role = req.user.user_role
        
        let {survey_title,survey_description,company_id,logo,submission_pwd} = req.body
        survey_title = survey_title.toLowerCase()
        if (role=='admin'){
            let department_id = req.user.department_id
           let existingSurvey = await surveyModel.findOne({survey_title:survey_title,department_id:department_id,active:1})
           if(existingSurvey){
              res.json({message:"survey title already exist"})
           }
           else{
              let survey = await surveyModel.create({
                survey_title : survey_title,
                survey_description:survey_description,
                logo:logo,
                department_id:department_id,
                submission_pwd:submission_pwd,
                created_by:req.user._id,
                company_id:req.user.company_id
              })
              res.json({message:"successfully added",survey})
           }
        }
        else{
         res.json({ message: "sorry you are unauthorized" })
        }
      } catch (error) {
        res.json({message:"catch error "+error})
      }
})

router.get('/api/v1/getSurvey',auth,async(req,res)=>{
  try {
    let role = req.user.user_role
    if(role=='admin'||role =='owner'){
       let existingSurvey = await surveyModel.find({
        company_id:req.user.company_id,
        active:1
       })
       if(existingSurvey.length!=0){
        res.json({message:existingSurvey})
       }
       else{
        res.json({message:"sorry , there is no survey"})
       }
    }
    else if(role=='survey-reader'){
           
    }
    else{
      res.json({message:"sorry you are unauthorized"})
    }
  } catch (error) {
    res.json({message:"catch error "+error})
  }
})

module.exports = router
