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
        const role = req.user.user_role.toLowerCase();
        const { user_name, password, email_address, user_role, company_name, department_name } = req.body;

        if (!config.roles.includes(role)) {
            return res.json({ message: "Sorry, you are unauthorized" });
        }
        // Find the company by name
        let company = await companyModel.findOne({
            company_name: company_name.toLowerCase(),
            active: 1,
        });
        if (!company) {
            // If the company doesn't exist, create it
            company = await companyModel.create({
                company_name: company_name,
            });
        }

        // Check if an owner already exists for the company
        const existingOwner = await userModels.findOne({
            user_role: 'owner',
            company_id: company._id,
        });

        if (existingOwner) {
            return res.json({ message: "There is already an owner for this company" });
        }

        // Check for existing users within the company
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

        if (user_role.toLowerCase() === 'owner') {
            hashPassword(password, async (hashedPassword) => {
                let user = await userModels.create({
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
            });
        } else if (department_name && (user_role.toLowerCase() === 'admin' || user_role.toLowerCase() === 'survey-reader')) {
            let company_id = company._id;

            let department = await departmentModel
                .find({ department_name: department_name.toLowerCase(), company_id: company_id })
                .populate({
                    path: 'company_id',
                    select: 'company_name',
                });

            let department_id;

            if (department.length !== 0) {
                const filteredData = department.filter((entry) => entry.company_id !== null);
                department_id = filteredData[0]._id.toString();
            } else {
                let department = await departmentModel.create({
                    department_name: department_name,
                    company_id: company_id,
                });
                department_id = department._id;
            }

            hashPassword(password, async (hashedPassword) => {
                let user = await userModels.create({
                    user_name: user_name,
                    password: password,
                    email_address: email_address,
                    company_id: company_id,
                    department_id: department_id,
                    user_role: user_role,
                    token: token,
                });

                return res.json({
                    message: "Successfully added",
                    token: user.token,
                    user_role: user.user_role,
                    email_address: user.email_address,
                });
            });
        } else {
            return res.json({ message: "Sorry, you are trying to add a new role without enough info" });
        }
    } catch (error) {
        return res.json({ message: "Catch error: " + error });
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

