const express = require("express");
const router = express.Router();
const userModels = require("../models/user.models");
const departmentModel = require('../models/department.models')
const companyModel = require('../models/company.models')
const { hashPassword } = require('../helper/hashPass.helper')
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()

router.post('/api/v1/addUsers', auth, async (req, res) => {
    try {
        let department;
        let department_id;
        let role = (req.user.user_role).toLowerCase();
        let { user_name, password, email_address, company_name, user_role, department_name } = req.body;

        if (config.roles.includes(role)) {
            const existingUser = await userModels.findOne({
                $or: [{ email_address: email_address }, { user_name: user_name }],
            });

            if (existingUser) {
                res.json({ message: "The email address or username already exists" });
            }
            else {
                let token = jwt.sign({ email: email_address }, process.env.TOKEN_KEY);
                if ((user_role.toLowerCase()) == 'owner' && company_name != null) {
                    //we need the company id , we will use the company_name to get the company_id from the table

                    //check if the company exist or not 
                    let company = await companyModel.findOne({ company_name: company_name.toLowerCase(), active: 1 }).select('company_name')

                    if (company) {
                        hashPassword(password, async (hashedPassword) => {
                            password = hashedPassword;

                            let user = await userModels.create({
                                user_name: user_name,
                                password: password,
                                email_address: email_address,
                                company_id: company._id,
                                user_role: user_role,
                                token: token,
                            });

                            let response = {
                                message: "Successfully added",
                                token: user.token,
                                user_role: user.user_role,
                                email_address: user.email_address,
                            };
                            res.json({ response });
                        });
                    }
                    else{
                        res.json({ message: "Company name does not exist" });
                    }

                }
                else if ((department_name!=null) && (((user_role.toLowerCase()) == 'admin') || ((user_role.toLowerCase()) == 'survey-reader'))) {
                    department = await departmentModel.find({ department_name: department_name.toLowerCase() })
                        .populate({
                            path: 'company_id',
                            match: { company_name: company_name },
                            select: 'company_name'
                        });
                   if(department.length!=0){
                    const filteredData = department.filter(entry => entry.company_id !== null);
                    department_id = filteredData[0]._id.toString();
                    hashPassword(password, async (hashedPassword) => {
                        password = hashedPassword;

                        let user = await userModels.create({
                            user_name: user_name,
                            password: password,
                            email_address: email_address,
                            company_id: company._id,
                            department_id : department_id,
                            user_role: user_role,
                            token: token,
                        });

                        let response = {
                            message: "Successfully added",
                            token: user.token,
                            user_role: user.user_role,
                            email_address: user.email_address,
                        };
                        res.json({ response });
                    });
                   }
                   else{
                        res.json({ message: "Department name does not exist" });
                   }
                }
                else {
                    res.json({ message:"Sorry, you are try to add new role without enough info" })
                }
            }

        } else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error: " + error });
    }
});


router.post('/api/v1/addSuperadmin', async (req, res) => {
    try {
        let { user_name, email_address, password } = req.body;
        user_name = user_name.toLowerCase();

        // Check if either the email_address or user_name already exists
        const existingUser = await userModels.findOne({
            $or: [{ email_address: email_address }, { user_name: user_name }],
        });

        if (existingUser) {
            res.json({ message: "The email address or username already exists" });
        } else {
            hashPassword(password, async (hashedPassword) => {
                password = hashedPassword;
                let token = jwt.sign({ email: email_address }, process.env.TOKEN_KEY);
                let new_user = await userModels.create({
                    user_name: user_name,
                    user_role: 'superadmin',
                    email_address: email_address,
                    password: password,
                    token: token,
                });
                let response = {
                    message: "successfully added",
                    token: new_user.token,
                    user_role: new_user.user_role,
                    email_address: new_user.email_address,
                };
                res.json({ response });
            });
        }
    } catch (error) {
        res.status(500).json({ message: "catch error " + error });
    }
});

module.exports = router
/*

 else {
                if (department_name !== null && (user_role=='admin' || user_role=='survey-reader')) {
                    department = await departmentModel.find({ department_name: department_name })
                        .populate({
                            path: 'company_id',
                            match: { company_name: company_name },
                            select: 'company_name'
                        });

                    const filteredData = department.filter(entry => entry.company_id !== null);

                    if (filteredData.length > 0) {
                        department_id = filteredData[0]._id.toString();
                        company_id = filteredData[0].company_id._id.toString();
                    } else {
                        // Handle the case where the department is empty or not found
                        res.json({ message: "Department name cannot be empty" });
                    }
                } 
                           
                hashPassword(password, async (hashedPassword) => {
                    password = hashedPassword;
                    let token = jwt.sign({ email: email_address }, process.env.TOKEN_KEY);
                    let user = await userModels.create({
                        user_name: user_name,
                        password: password,
                        email_address: email_address,
                        company_id: company_id,
                        user_role: user_role,
                        token: token,
                    });

                    let response = {
                        message: "Successfully added",
                        token: user.token,
                        user_role: user.user_role,
                        email_address: user.email_address,
                    };
                    res.json({ response });
                });
            }


*/

/*

    if (company_name == null) {
                    res.json({ message: "Company name cannot be empty" });
                }
                else {
                    if (department_name == null && (user_role == 'admin' || user_role == 'survey-reader')) {
                        res.json({ message: "Department name cannot be empty for this role" });
                    }
                    else {
                        department = await departmentModel.find({ department_name: department_name })
                            .populate({
                                path: 'company_id',
                                match: { company_name: company_name },
                                select: 'company_name'
                            });

                        const filteredData = department.filter(entry => entry.company_id !== null);

                        if (filteredData.length > 0) {
                            department_id = filteredData[0]._id.toString();
                            company_id = filteredData[0].company_id._id.toString();
                        } else {
                            // Handle the case where the department is empty or not found
                            res.json({ message: "Department name cannot be empty" });
                        }
                    }

                    hashPassword(password, async (hashedPassword) => {
                        password = hashedPassword;
                        let token = jwt.sign({ email: email_address }, process.env.TOKEN_KEY);
                        let user = await userModels.create({
                            user_name: user_name,
                            password: password,
                            email_address: email_address,
                            company_id: company_id,
                            user_role: user_role,
                            token: token,
                        });

                        let response = {
                            message: "Successfully added",
                            token: user.token,
                            user_role: user.user_role,
                            email_address: user.email_address,
                        };
                        res.json({ response });
                    });
                }

*/