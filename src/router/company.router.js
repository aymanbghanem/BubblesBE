const express = require("express");
const router = express.Router();
const config = require('../../config')
const companyModel = require('../models/company.models')
const {hashPassword,compareHashedPassword} = require('../helper/hashPass.helper')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()

router.post('/api/v1/addCompany', auth, async (req, res) => {
    try {
        if (req.user.user_role === 'superadmin') {
            const { companies } = req.body;

            if (!Array.isArray(companies)) {
                return res.status(400).json({ message: "Invalid input format. 'companies' should be an array of object." });
            }

            const addedCompanies = [];

            for (const companyData of companies) {
                const { company_name } = companyData;
                const caseInsensitiveRegex = new RegExp(`^${company_name}$`, 'i');

                const existingCompany = await companyModel.findOne({ company_name: caseInsensitiveRegex });

                if (existingCompany) {
                    addedCompanies.push({ message: `The company name '${company_name}' already exists`, company: existingCompany });
                } else {
                    const newCompany = await companyModel.create({
                        company_name: company_name,
                    });
                    addedCompanies.push({ message: `Successfully added company '${company_name}'`, company: newCompany });
                }
            }

            res.json({ addedCompanies });
        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }

    } catch (error) {
        res.status(500).json({ message: "Catch error: " + error });
    }
});
router.get('/api/v1/getCompanies',auth,async(req,res)=>{
    try {
       let companies = await companyModel.find({active:1}).select('company_name') 
       if(companies.length>0){
        res.json(companies)
       }
       else{
        res.json({message:"No data found"})
       }
    } catch (error) {
        res.json({message:"catch error "+error})
    }
})

module.exports = router