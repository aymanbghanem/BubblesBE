const express = require("express");
const auth = require("../middleware/auth");
const locationModels = require("../models/location.models");
const surveyModels = require("../models/survey.models");
const { create } = require("../models/user.models");const qrModel = require("../models/qr.model");
const router = express.Router();



router.post('/api/v1/addQR',auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        let location_id = req.headers['location_id']
        let survey_id = req.headers['survey_id']
        let {link} = req.body
        if(role=="admin"){
           let existingLocation = await locationModels.findOne({_id:location_id,active:1})
           let existingSurvey = await surveyModels.findOne({_id:survey_id,active:1})
           if(existingLocation && existingSurvey ){
              let qr = await qrModel.create({
                location_id : location_id,
                survey_id : survey_id,
                link:link
              })
              res.json({message:"The QR code link successfully added",qr})
           }
           else{
            res.json({message:"The survey or the location does not exist"})
           }
        }
        else{
            res.json({message:"sorry, you are unauthorized"})
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

module.exports = router