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
        
    } catch (error) {
        res.status(500).json({message:"catch error "+error})
    }
})


module.exports = router