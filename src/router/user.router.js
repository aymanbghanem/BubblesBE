const express = require("express");
const router = express.Router();
const userModels = require("../models/user.models");
const departmentModel = require('../models/department.models')
const companyModel = require('../models/company.models')
const { hashPassword } = require('../helper/hashPass.helper')
const generateMixedID = require('../helper/passwordGenerator.helper')
const sendEmail = require('../middleware/email')
const surveyReaderModel = require('../models/surveyReader.model')
const surveyModel = require('../models/survey.models')
const config = require('../../config')
const auth = require('../middleware/auth')
var jwt = require('jsonwebtoken');
const companyModels = require("../models/company.models");
const departmentModels = require("../models/department.models");
require('dotenv').config()


const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const addOwner = async (company) => {
    const existingOwner = await userModels.findOne({
        user_role: 'owner',
        company_id: company._id,
        active:1
    });

    if (existingOwner) {
       return("There is already an owner for this company");
    }
};

router.post('/api/v1/addUsers', auth, async (req, res) => {
    try {
        let hashedPassword;
        const role = req.user.user_role.toLowerCase();

        let newPassword = await generateMixedID()
        console.log(newPassword)
        let { user_name, email_address, company_name, department_name, survey } = req.body;
        user_name = user_name.toLowerCase()
        if (!config.roles.includes(role)) {
            return res.json({ message: "sorry, you are unauthorized",type:0 });
        }

        if (!validateEmail(email_address)) {
            return res.json({ message: "Invalid email address",type:0 });
        }

        const existingUser = await userModels.findOne({
            //on the platform
            $and: [
                { $or: [{ email_address: email_address }, { user_name: user_name }] }],
        });

        if (existingUser) {
            return res.json({ message: "The email address or username already exists",type:0 });
        }

        //let token = jwt.sign({ user_name: user_name }, process.env.TOKEN_KEY);

        if (role == "superadmin") {
            // check if the company is exists
            let company = await companyModel.findOne({

                company_name: { $regex: new RegExp(`^${company_name}$`, 'i') },
                active: 1,
            });
            if (company) {
                const ownerError = await addOwner(company);
                if (ownerError) {
                   res.json({
                    type: 0,
                    message: "There is already an owner for this company"
                });
                }
                else {
                     await hashPassword(newPassword, async (hash) => {
                    hashedPassword = hash;

                    const user = await userModels.create({
                        user_name: user_name,
                        password: hashedPassword,
                        email_address: email_address,
                        company_id: company._id,
                        user_role: "owner",
                        token: null,
                    });

                    await sendEmail(user_name, email_address, "Account Password ", newPassword, "for your account password.");
                    return res.json({
                        message: "New owner added successfully",
                        type:1
                    });
                     })
                }
            }
            else {
                res.json({ message: "Company not found", type: 0 });
            }
        }
        else if (department_name && role == 'owner') {
            await hashPassword(newPassword, async (hash) => {
             hashedPassword = hash;

            const department = await departmentModel.findOne({
                department_name: { $regex: new RegExp("^" + department_name, "i") },
                company_id: req.user.company_id,
                active: 1,
            });

            if (!department) {
                return res.json({ message: "Department not found or inactive", type: 0 });
            }

            // Continue with the user creation
            const userParams = {
                user_name: user_name,
                password: hashedPassword,
                email_address: email_address,
                user_role: "admin",
                token: null,
            };

            const user = await userModels.create({
                ...userParams,
                company_id: req.user.company_id,
                department_id: department._id,
            });

            await sendEmail(user_name, email_address, "Account Password ", newPassword, "for your account password.");
            return res.json({
                message: "New admin added successfully ",
                type:1
            });
             })
        }
        else if (role === 'admin') {

            await hashPassword(newPassword, async (hash) => {
            hashedPassword = hash;

            const department = await departmentModels.findOne({
                _id:req.user.department_id,
                active: 1,
            });
            
            if (!department) {
                return res.json({ message: "Department not found or inactive", type: 0 });
            }

            let user;
            // Set user parameters
            const userParams = {
                user_name: user_name,
                password: hashedPassword,
                email_address: email_address,
                user_role: 'survey-reader',
                token: null,
                created_by: req.user._id
            };
            // Create a new user
            user = await userModels.create({
                ...userParams,
                company_id: req.user.company_id,
                department_id: req.user.department_id,
            });
            // Check if there are surveys to assign
            if (survey.length != 0) {

                // Get the survey information
                const surveyInfo = await surveyModel.findOne({
                    _id: survey,
                    company_id: req.user.company_id,
                    active: 1,
                });
                if (surveyInfo) {
                    let survey_reader = await surveyReaderModel.create({
                        survey_id: survey,
                        company_id: req.user.company_id,
                        department_id: user.department_id,
                        reader_id: user._id,
                        created_by: req.user._id, // Assign the survey reader creator
                        active: 1,
                    });
                } else {

                    console.error(`Survey not found`);
                }

            }
            await sendEmail(user_name, email_address, "Account Password ", newPassword, "for your account password.");
            return res.json({
                message: "New reader added successfully",
                type:1
            });
             });

        }
        else {
            return res.json({ message: "sorry, you are unauthorized",type:0 });
        }
    } catch (error) {
        return res.json({ message: error.message });
    }
});

router.post('/api/v1/addSuperadmin', async (req, res) => {
    try {
        let { user_name, email_address, password } = req.body;
        user_name = user_name.toLowerCase();
        let newPassword = await generateMixedID()

        if (!validateEmail(email_address)) {
            return res.json({ message: "Invalid email address", type: 0 });
        }

        let hashedPassword;
        // Check if either the email_address or user_name already exists
        const existingUser = await userModels.findOne({
            $or: [{ email_address: email_address }, { user_name: user_name }],
        });

        if (existingUser) {
            return res.json({ message: "Email address or username already exists", type: 0 });
        } else {
            await hashPassword(newPassword, async (hash) => {
                hashedPassword = hash;
                let token = jwt.sign({ user_name: user_name }, process.env.TOKEN_KEY);
                let new_user = await userModels.create({
                    user_name: user_name,
                    user_role: 'superadmin',
                    email_address: email_address,
                    password: hashedPassword,
                    token: token,
                });

                try {
                    await sendEmail(user_name, email_address, "Account Password ", newPassword, "for your account password.");
                    res.json({ message: "successfully added", type: 1 });
                } catch (emailError) {
                    // Handle the email sending error
                    console.error("Email sending error:", emailError);
                    res.json({ message: "successfully added, but email not sent", type: 1 });
                }
            });
        }
    } catch (error) {
        res.status(500).json({ message: "catch error " + error });
    }
});


router.get('/api/v1/userById', async (req, res) => {
    try {
        let id = req.headers['id'];
        let user = await userModels.findOne({ _id: id, active: 1 }).populate([
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
                _id: user._id,
                user_name: user.user_name,
                user_role: user.user_role,
                token: user.token,
                email_address: user.email_address,
                company_name: user.company_id ? user.company_id.company_name || " " : " ",
                department_name: user.department_id ? user.department_id.department_name || " " : " ",
                image: user.company_id && user.image != "" ? `${user.company_id.company_name}/${user.image}` : "",
            };

            res.json({ message: response,type:2 });
        } else {
            res.json({ message: "User not found in the system", type: 0 });
        }
    } catch (error) {
        res.status(500).json({ message: "catch error " + error });
    }
});

router.get('/api/v1/userInfo', auth, async (req, res) => {
    try {
        let id = req.user._id;
        let readerUser
       
        let user = await userModels.findById({ _id: id, active: 1 }).populate([
            {
                path: 'company_id',
                select: 'company_name dashboard notifier -_id',
            },
            {
                path: 'department_id',
                select: 'department_name',
            },
        ]);
        if(req.user.user_role == 'survey-reader'){
           readerUser = await userModels.findById({ _id: id, active: 1 }).populate([
                {
                    path: 'created_by',
                    select: 'user_name -_id',
                }
            ]);
        }
        if (user && req.user.user_role!="superadmin") {
          
            let response = {
                _id: user._id,
                user_name: user.user_name,
                user_role: user.user_role,
                created_by:readerUser?readerUser.created_by.user_name:"",
                token: user.token,
                email_address: user.email_address,
                company_name: user.company_id ? user.company_id.company_name || " " : " ",
                department_name: user.department_id ? user.department_id.department_name || " " : " ",
                image: user.company_id && user.image != "" ? `${user.company_id.company_name}/${user.image}` : "",
            };
            let companyInfo={
                dashboard:user.company_id.dashboard ?user.company_id.dashboard :0 ,
                notifier : user.company_id.notifier ? user.company_id.notifier: 0
            }
            res.json({ message: response,companyInfo,type:2});
        }
        else if(user && req.user.user_role=="superadmin"){
            let response = {
                _id: user._id,
                user_name: user.user_name,
                user_role: user.user_role,
                created_by:readerUser?readerUser.created_by.user_name:"",
                token: user.token,
                email_address: user.email_address,
                company_name: user.company_id ? user.company_id.company_name || " " : " ",
                department_name: user.department_id ? user.department_id.department_name || " " : " ",
                image: user.company_id && user.image != "" ? `${user.company_id.company_name}/${user.image}` : "",
            };
            res.json({ message: response,type:2});
        }
        else {
            res.json({ message: "User not found in the system", type: 0 });
        }
    } catch (error) {
        res.status(500).json({ message: "catch error " + error });
    }
});

router.get('/api/v1/getUserAccordingToMyRole', auth, async (req, res) => {
    try {
        const role = req.user.user_role;
        const company_id = req.user.company_id;

        if (!config.roles.includes(role)) {
            return res.json({ message: "Sorry, you are unauthorized",type:0 });
        }

        let users;

        if (role === 'superadmin') {
            users = await userModels.find({ user_role: 'owner'}).populate({
                path: "company_id",
                select: "company_name -_id"
            });
        } else if (role === 'owner') {
            users = await userModels.find({ user_role: 'admin', company_id: company_id}).populate([
                {
                    path: "company_id",
                    select: "company_name -_id"
                },
                {
                    path: "department_id",
                    select: "department_name"
                }
            ]);
        } else if (role === 'admin') {
            users = await userModels.find({
                user_role: 'survey-reader',
                company_id: company_id,
                department_id: req.user.department_id
            }).populate([
                {
                    path: "company_id",
                    select: "company_name -_id"
                },
                {
                    path: "department_id",
                    select: "department_name"
                }
            ]);
            
            const usersWithSurveys = await Promise.all(users.map(async user => {
                const surveyReaders = await surveyReaderModel.find({
                    company_id: company_id,
                    department_id: req.user.department_id,
                    reader_id: user._id,
                    active: 1
                }).populate({
                    path: 'survey_id',
                    select: 'survey_title',  
                    model: 'survey'
                });
            
                const responseArray = surveyReaders.map(reader => {
                    const response = {
                        active: user.active,
                        _id: user._id,
                        user_name: user.user_name,
                        user_role: user.user_role,
                        token: user.token,
                        email_address: user.email_address,
                        company_name: user.company_id ? user.company_id.company_name || "" : "",
                        department_name: user.department_id ? user.department_id.department_name || "" : "",
                        image: user.company_id && user.image != "" ? `${user.company_id.company_name}/${user.image}` : "",
                        survey_reader_id: reader.reader_id,
                        survey_name: reader.survey_id ? reader.survey_id.survey_title : null,
                    };
                    return response;
                });
            
                // If the user is a survey reader but has no associated surveys, add a record with null values
                if (surveyReaders.length === 0) {
                    const response = {
                        active: user.active,
                        _id: user._id,
                        user_name: user.user_name,
                        user_role: user.user_role,
                        token: user.token,
                        email_address: user.email_address,
                        company_name: user.company_id ? user.company_id.company_name || "" : "",
                        department_name: user.department_id ? user.department_id.department_name || "" : "",
                        image: user.company_id && user.image != "" ? `${user.company_id.company_name}/${user.image}` : "",
                        survey_reader_id: null,
                        survey_name: null,
                    };
                    responseArray.push(response);
                }
            
                return responseArray;
            }));
            
            return res.json({ message: usersWithSurveys.flat(),type:2 });
            
        } 
        
        else {
            return res.json({ message: "Invalid user role" ,type:0});
        }

        if (users.length !== 0) {
            const simplifiedUsers = users.map(user => {
                const response = {
                    active: user.active,
                    _id: user._id,
                    user_name: user.user_name,
                    user_role: user.user_role,
                    token: user.token,
                    email_address: user.email_address,
                    company_name: user.company_id ? user.company_id.company_name || "" : "",
                    department_name: user.department_id ? user.department_id.department_name || "" : "",
                    image: user.company_id && user.image != "" ? `${user.company_id.company_name}/${user.image}` : "",
                };
                return response;
            });

            return res.json({ message: simplifiedUsers,type:2 });
        } else {
            return res.json({ message: "No users found under your role", type: 0 });

        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get('/api/v1/getSurveysForSurveyReader', auth, async (req, res) => {
    try {
        let role = req.user.user_role; //from the token
        let id = req.headers['id']; // from the front

        if (role == 'admin' || role == 'survey-reader') {
            let userSurveys = await surveyReaderModel.find({
                reader_id: id,
                active: 1
            }).populate([{
                path: 'survey_id',
                select: 'survey_title active',
                model: 'survey'
            }]).select('survey_id -_id active');

            if (userSurveys.length != 0) {
                // Map the response to return only the survey titles
                const surveysWithoutId = userSurveys.map(survey => ({
                    survey_title: survey.survey_id.survey_title,
                    survey_id: survey.survey_id._id,
                    active:survey.survey_id.active
                }));

                res.json({ message: surveysWithoutId,type:2 });
            } else {
                res.json({ message: "No data found", type: 0 });
            }
        } else {
            res.json({ message: "sorry, you are unauthorized" ,type:0});
        }
    } catch (error) {
        res.json({ message: "catch error " + error });
    }
});

router.put('/api/v1/updateUserInfo', auth, async (req, res) => {
    try {
        let { user_name, email_address, image } = req.body
        let role = req.user.user_role
        let company_id = req.user.company_id

        if (config.roles.includes(role)) {
            let existingUser = await userModels.findOne({
                user_name: user_name,
                active: 1,
            })

            if (existingUser) {
                // Check if the updated email is unique
                if (email_address && email_address !== existingUser.email_address) {
                    const isEmailUnique = await userModels.findOne({
                        email_address: email_address,
                        _id: { $ne: existingUser._id } // Exclude the current user from the check
                    });

                    if (isEmailUnique) {
                        return res.json({ message: "Email address is not unique. Please choose a different email.",type:0 });
                    }
                }

                let updateUser = await userModels.findByIdAndUpdate(
                    { _id: existingUser._id },
                    {
                        email_address: email_address ? email_address : existingUser.email_address,
                        image: image ? image : existingUser.image
                    },
                    { new: true }
                );

                return res.json({ message: "successfully updated",type:1 });


            } else {
                return res.json({ message: "User not found in the system", type: 0 });
            }
        } else {
            return res.json({ message: "sorry, you are unauthorized",type:0 });
        }
    } catch (error) {
        return res.json({ message: "catch error " + error });
    }
});

// //Update this api not only 
// router.put('/api/v1/deleteAssignedSurveyReader', auth, async (req, res) => {
//     try {
//         let role = req.user.user_role
//         let { survey_id, reader_id } = req.body
//         if (role == "admin") {
//             const surveyInfo = await surveyModel.findOne({
//                 _id: survey_id,
//                 company_id: req.user.company_id,
//                 active: 1,
//             });
//             const user = await userModels.findOne({
//                 _id: reader_id,
//                 active: 1
//             })
//             if (user) {
//                 if (surveyInfo) {

//                     let deletedSurveyReader = await surveyReaderModel.updateMany({
//                         reader_id: reader_id,
//                         survey_id: survey_id,
//                         active: 1
//                     }, { active: 0 })
//                     res.json({ message: "The data deleted sucssfully" })
//                 }
//                 else {
//                     res.json({ message: "The survey you are looking for does not exist" })
//                 }
//             }
//             else {
//                 res.json({ message: "The user you are looking for does not exist" })
//             }
//         }
//         else {
//             res.json({ message: "sorry, you are unauthorized" })
//         }
//     } catch (error) {
//         res.json({ message: "catch error" })
//     }
// })
// router.post('/api/v1/assignSurveysReader', auth, async (req, res) => {
//     try {
//         let role = req.user.user_role
//         let { survey_id, reader_id } = req.body
//         if (role == "admin" && survey_id) {

//             const surveyInfo = await surveyModel.findOne({
//                 _id: survey_id,
//                 company_id: req.user.company_id,
//                 active: 1,
//             });
//             const user = await userModels.findOne({
//                 _id: reader_id,
//                 active: 1
//             })
//             if (user) {
//                 if (surveyInfo) {
//                     let survey_reader = await surveyReaderModel.create({
//                         survey_id: survey_id,
//                         company_id: surveyInfo.company_id,
//                         department_id: surveyInfo.department_id,
//                         reader_id: reader_id,
//                         created_by: req.user._id, // Assign the survey creator
//                         active: 1,
//                     });
//                     res.json({ message: "Successfully added" })
//                 }
//                 else {
//                     res.json({ message: "The survey you are looking for does not found" })
//                 }
//             }
//             else {
//                 res.json({ message: "The user you are looking for does not found" })
//             }
//         }
//         else {
//             res.json({ message: "sorry, you are unauthorized" })
//         }
//     } catch (error) {
//         res.json({ message: "catch error " + error })
//     }
// })

router.put('/api/v1/assignOrDeleteSurveyForReader', auth, async (req, res) => {
    try {
        let role = req.user.user_role;
        let reader_id = req.headers['reader_id']; // Get reader_id from headers

        if (role === "admin") {
            const user = await userModels.findOne({
                _id: reader_id,
                active: 1,
            });

            if (!user) {
                return res.json({ message: "User not found",type:0 });
            }

            const assignments = req.body.assignments; // Extract assignments from req.body

            // Ensure assignments is an array
            if (!Array.isArray(assignments)) {
                return res.json({ message: "Invalid format for assignments",type:0 });
            }

            for (const assignment of assignments) {
                const { survey_id, active } = assignment;

                let existingAssignment = await surveyReaderModel.findOne({
                    reader_id: reader_id,
                    survey_id: survey_id,
                    active:1
                });

                let surveyInfo = await surveyModel.findOne({ _id: survey_id, company_id: req.user.company_id, active: 1 });

                if (!surveyInfo) {
                    return res.json({ message: `The survey with ID ${survey_id} does not exist`,type:0 });
                }

                if (!existingAssignment) {
                    // If assignment is new, store it
                    await surveyReaderModel.create({
                        survey_id: surveyInfo._id,
                        company_id: surveyInfo.company_id,
                        department_id: surveyInfo.department_id,
                        reader_id: reader_id,
                        created_by: req.user._id,
                        active: 1,
                    });
                } else {
                    // If assignment exists and active is 0, update the active to 0
                    if (active === 0) {
                        await surveyReaderModel.updateMany({
                            reader_id: reader_id,
                            survey_id: survey_id,
                        }, { active: 0 });
                    }
                }
            }

            return res.json({ message: "Survey assignments updated successfully",type:1 });
        } else {
            return res.json({ message: "Sorry, you are unauthorized",type:0 });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});


router.post('/api/v1/resetPassword', async (req, res) => {
    try {
        let { email_address } = req.body
        let newPassword = await generateMixedID()
        console.log(newPassword)
        let response;
        let existingUser = await userModels.findOne({
            email_address: email_address
        })
        if (existingUser) {
            await hashPassword(newPassword, async (hash) => {
                hashedPassword = hash;
                existingUser = await userModels.findOneAndUpdate({ email_address: email_address }, { password: hashedPassword }, { new: true })
            })

             let user_name = existingUser.user_name
            response = await sendEmail(user_name,existingUser.email_address, "Reset password", newPassword,"to reset your password")
            res.json({ message: "Password successful updated",type:1 })
        }
        else {
            res.json({ message: "User does not exist", type: 0 });
        }
    } catch (error) {
        res.json({ message: "catch error " + error })
    }
})

router.post('/api/v1/deleteUsers', auth, async (req, res) => {
    try {
        const role = req.user.user_role;
        const { user_ids, active } = req.body;
        let id = user_ids
        if (!config.roles.includes(role)) {
          return  res.json({message:"sorry, you are unauthorized",type:0})
        }

        if (role === "superadmin") {
            // Find the currently active owners
            let user = await userModels.findOne({_id:id}).select('company_id -_id')
            if(user){
                let company = await companyModels.findOne({_id:user.company_id,active:1})
                if(company){
                    const currentActiveOwners = await userModels.find({
                        user_role: 'owner',
                        active: 1,
                        company_id:user.company_id,
                        deleted:0
                    });
                    
                    // Check if there is more than one active owner
                    if (currentActiveOwners.length > 0 && active === 1) {
                        return res.json({ message: "Cannot activate user, another owner is already active" ,type:0});
                    }
                
                    // Update all users in user_ids to be active or inactive based on the 'active' parameter
                    const updatedUsers = await userModels.updateMany(
                        { _id: id },
                        { $set: { active: active,deleted:!active } }
                    );
                
                    if (updatedUsers.modifiedCount === updatedUsers.matchedCount) {
                     return res.json({ message: active === 1 ? "User activated successfully" : "User deactivated successfully" ,type:1});
                    }
                }
                else{
                    res.json({ message: "Your company is currently inactive. We are unable to complete the requested process.", type: 0 });
                }
                }
                else {
                    return res.json({ message: "No valid users found to update",type:0 });
                }
              
        }
         else {
            let user = await userModels.findOne({_id:id}).select('department_id -_id')
            if(user){
                let department = await departmentModels.findOne({_id:user.department_id,active:1})
                if(department){
                    const deletedUsers = await userModels.updateMany(
                        { _id:id },
                        { $set: { active: active,deleted:!active } }
                    );
        
                    const deletedSurveyReader = await surveyReaderModel.updateMany(
                        { reader_id: id },
                        { $set: { active: active,deleted:!active } }
                    );
        
                    if (deletedUsers.modifiedCount === deletedUsers.matchedCount && active === 0) {
                        return res.json({ message: "Users deleted successfully",type:1 });
                    } else if (deletedUsers.modifiedCount === deletedUsers.matchedCount && active === 1) {
                        return res.json({ message: "Users activated successfully",type:1 });
                    }
                }
               else{
                res.json({ message: "Your department is currently inactive. We are unable to complete the requested process.", type: 0 });
               }
            }
           else {
            return res.json({ message: "No valid user found to delete", type: 0 });

            }
        }
    } catch (error) {
        return res.json({ message: "Error occurred: " + error.message });
    }
});

module.exports = router

