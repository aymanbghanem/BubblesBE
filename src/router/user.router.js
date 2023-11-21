const express = require("express");
const router = express.Router();
const userModels = require("../models/user.models");
const departmentModel = require('../models/department.models')
const companyModel = require('../models/company.models')
const { hashPassword } = require('../helper/hashPass.helper')
const generateMixedID = require('../helper/passwordGenerator.helper')
const sendEmail = require('../middleware/email')
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
require('dotenv').config()


const addOwner = async (company) => {
    const existingOwner = await userModels.findOne({
        user_role: 'owner',
        company_id: company._id,
    });

    if (existingOwner) {
        throw new Error("There is already an owner for this company");
    }
};

const addDepartmentAndUser = async (userParams, company_id, department_name) => {
    let department_id;

    const department = await departmentModel
        .find({ department_name: department_name.toLowerCase(), company_id: company_id })
        .populate({
            path: 'company_id',
            select: 'company_name',
        });

    if (department.length !== 0) {
        const filteredData = department.filter((entry) => entry.company_id !== null);
        department_id = filteredData[0]._id.toString();
    } else {
        const newDepartment = await departmentModel.create({
            department_name: department_name,
            company_id: company_id,
        });
        department_id = newDepartment._id;
    }

    const user = await userModels.create({
        ...userParams,
        company_id: company_id,
        department_id: department_id,
    });

    return user;
};

router.post('/api/v1/addUsers', auth, async (req, res) => {
    try {
        const role = req.user.user_role.toLowerCase();
        const { user_name, password,email_address, user_role, company_name, department_name } = req.body;
    //     let password = generateMixedID()
    //    let info =  await sendEmail(password)
    //     res.json({message:password,info})
        // if (!config.roles.includes(role)) {
        //     return res.json({ message: "sorry, you are unauthorized" });
        // }

        let company = await companyModel.findOne({
            company_name: company_name.toLowerCase(),
            active: 1,
        });

        if (!company) {
            company = await companyModel.create({
                company_name: company_name,
            });
        }

        if (user_role.toLowerCase() == 'owner') {
            await addOwner(company);
        }

        const existingUser = await userModels.findOne({
            $and: [
                { $or: [{ email_address: email_address }, { user_name: user_name }] },
                { company_id: company._id },
            ],
        });

        if (existingUser) {
            return res.json({ message: "The email address or username already exists within the company" });
        }

        let token = jwt.sign({ email: email_address }, process.env.TOKEN_KEY);

        if (user_role.toLowerCase() === 'owner' && role == "superadmin") {
            const user = await userModels.create({
                user_name: user_name,
                password: password,
                email_address: email_address,
                company_id: company._id,
                user_role: user_role,
                token: token,
            });

            return res.json({
                message: "Successfully added",
                token: user.token,
                user_role: user.user_role,
                email_address: user.email_address,
            });
        } 
        
        else if (department_name && (user_role.toLowerCase() === 'admin') && role == 'owner') {
            const userParams = {
                user_name: user_name,
                password: password,
                email_address: email_address,
                user_role: user_role,
                token: token,
            };
            const user = await addDepartmentAndUser(userParams, req.user.company_id, department_name);

            return res.json({
                message: "Successfully added",
                token: user.token,
                user_role: user.user_role,
                email_address: user.email_address,
            });
        } 
        else if (department_name && (user_role.toLowerCase() === 'survey-reader') && role == 'admin') {
            const userParams = {
                user_name: user_name,
                password: password,
                email_address: email_address,
                user_role: user_role,
                token: token,
            };
            const user = await addDepartmentAndUser(userParams, req.user.company_id, department_name);

            return res.json({
                message: "Successfully added",
                token: user.token,
                user_role: user.user_role,
                email_address: user.email_address,
            });
        } 
        else {
            return res.json({ message: "sorry, you are unauthorized" });
        }
    } 
    catch (error) {
        return res.json({ message:error.message });
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

router.get('/api/v1/userInfo', auth, async (req, res) => {
    try {
        let id = req.user._id
        let user = await userModels.findById({ _id: id, active: 1 }).populate([
            {
                path: 'company_id',
                select: 'company_name -_id',
            },
            {
                path: 'department_id',
                select: 'department_name',
            },
        ]);
        if (user) {
            let response = {
                user_name: user.user_name,
                user_role: user.user_role,
                token: user.token,
                email_address: user.email_address,
                company_name: user.company_id.company_name || " ", // Add a check here
                department_name: user.department_id ? user.department_id.department_name || " " : " " // Add a check here
            }
            res.json({ message: response })
        } else {
            res.json({ message: "The user is not in the system" })
        }
    } catch (error) {
        res.status(500).json({ message: "catch error " + error })
    }
})

module.exports = router

