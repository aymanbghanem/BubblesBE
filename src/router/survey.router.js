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
        
        let {survey_title,survey_description,company_id,logo} = req.body
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
                department_id:department_id
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
router.post('/api/v1/uploadImage',auth,myMulter().single('image'),async(req,res)=>{
    try {
        let logo=req.file.filename;
        if (req.file) {
          if (req.file.mimetype.startsWith("image/")) {
            res.json(logo);
          } 
          else {
            try {
              const filePath = path.resolve(__dirname, '..', '..', 'logo', req.file.filename);
              fs.unlink(filePath, (error) => {
                if (error) {
                  res.json(`An error occurred while trying to delete the file: ${error}`);
                } else {
                  res.json(`wrong image type 1`);
                }
              });
            } catch (error) {
              res.json({ message: "catch error " + error });
            }
          }
        }
      } catch (error) {
        res.json("wrong image type "+error);
      }
})

module.exports = router
