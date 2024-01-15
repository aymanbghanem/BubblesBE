const express = require("express");
const router = express.Router();
const surveyModel = require('../models/survey.models')
const questionControllerModel = require('../models/questions_controller.models')
const {myMulter} = require('../middleware/upload');
const config = require('../../config')
const auth = require('../middleware/auth')

require('dotenv').config()

router.post('/api/v1/addQuestionType', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let { question_type } = req.body;

        if (role === "superadmin") {
            // Use a case-insensitive regular expression for the query
            let existingType = await questionControllerModel.findOne({
                question_type: { $regex: new RegExp(question_type, 'i') }
            });

            if (existingType) {
                res.json({ message: "This type already exists",type:0 });
            } else {
                let newType = await questionControllerModel.create({
                    question_type: question_type
                });
                res.json({ message: 'New question type added successfully', type: 1 });
            }
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error: " + error });
    }
});

router.get('/api/v1/getQuestionsTypes',auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        if(role === 'admin'){
           let questionTypes = await questionControllerModel.find({active:1})
           if(questionTypes.length!=0){
            res.json({message:questionTypes,type:2})
           }
           else{
            res.json({message:"No data found",type:0})
           }
        }
        else{
            res.json({message:"sorry, you are unauthorized",type:0})
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})
module.exports = router