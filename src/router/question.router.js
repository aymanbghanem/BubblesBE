const express = require("express");
const router = express.Router();
const surveyModel = require('../models/survey.models')
const {hashPassword} = require('../helper/hashPass.helper')
const {myMulter} = require('../middleware/upload');
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()

router.post('/api/v1/addQuestion',auth,async(req,res)=>{
    try {
        let role = req.user.user_id
        let department_id = req.user.department_id
        let {questions}= req.body
        if(role=='admin'){
           
        }
        else{
            res.json({ message: "sorry, you are unauthorized" });
        }
    } catch (error) {
        res.status(500).json({message:"catch error "+error})
    }
})


module.exports = router