const express = require("express");
const router = express.Router();
const surveyModels = require("../models/survey.models");
const locationModels = require("../models/location.models");
const reportsModel = require("../models/reports.model");
const auth = require('../middleware/auth')


router.post('/api/v1/createReport',auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        let {survey_id,location_id,start_date,end_date,chart_type} = req.body
        if(role=='admin'|| role == 'owner' || role=='survey-reader'){
           let surveyExist = await surveyModels.findOne({_id:survey_id,active:1})
            if(surveyExist){
               let locationExist = await locationModels.findOne({_id:location_id , active:1})
               if(locationExist){
                   let reportRecord = await reportsModel.create({
                        survey_id,
                        location_id,
                        company_id : surveyExist.company_id,
                        department_id:surveyExist.department_id,
                        start_date:start_date?start_date:new Date(),
                        end_date:end_date?end_date:new Date(),
                        chart_type,
                   })
                   if(reportRecord){
                    res.json({message:"Report successfully created",reportRecord})
                   }
                   else{
                    res.json({message:"sorry,something wrong"})
                   }
               }
               else{
                res.json({message:"The location you are looking for does not exist"})
               }
            }
            else{
                res.json({message:"The survey you are looking for does not exist"})
            }
        }
        else{
            res.json({message:"sorry, you are unauthorized"})  
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

router.get('/api/v1/getReport',auth,async(req,res)=>{
    try {
        let role = req.user.user_role
        if(role=="owner"){
            let reports = await reportsModel.find({company_id:req.user.company_id})
            
        }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})
module.exports = router