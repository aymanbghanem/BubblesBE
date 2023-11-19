const express = require("express");
const router = express.Router();
const config = require('../../config')
const companyModel = require('../models/company.models')
const {hashPassword,compareHashedPassword} = require('../helper/hashPass.helper')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()

router.post('/api/v1/addCompany',auth,async(req,res)=>{
    try {
        let {company_name,company_logo} = req.body
        company_name = company_name.toLowerCase()
        if(req.user.user_role=='superadmin'){
            let existingCompany = await companyModel.findOne({company_name:company_name})
            if(existingCompany){
                let company = existingCompany
                res.json({ message: "The company name  already exists",company});
            }
            else{
                let company = await companyModel.create({
                    company_name:company_name,
                    company_logo
                })
                res.json({message:"successfully added",company})
            }
        }
        else{
            res.json({ message: "sorry you are unauthorized" })
        }
       
    } catch (error) {
        res.status(500).json({message:"catch error "+error})
    }
})

module.exports = router