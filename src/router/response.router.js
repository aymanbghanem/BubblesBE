const express = require("express");
const router = express.Router();

const config = require('../../config')
const auth = require('../middleware/auth')

const responseModel = require('../models/response.model')
require('dotenv').config()

router.post('/api/v1/createResponse',async(req,res)=>{
    try {
        let {survey_id,question_id,user_answer} = req.body
        let {location_id,user_number} = req.headers
        
        let responseCreation = await responseModel.create({
            survey_id,
            question_id,
            user_answer,
            location_id,
            user_number
        })
        res.json({responseCreation})
    } catch (error) {
        res.json({message:"catch error"+error})
    }
})
module.exports = router