const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');
const notificationModel = require("../models/notification.model");

router.get('/api/v1/getNotifications', auth, async (req, res) => {
    try {
        let id = req.user._id;
        let role = req.user.user_role;

        if (role == 'survey-reader') {
            let notifications = await notificationModel.find({
                survey_reader_id: id,
                active: 1,
                processed:0
            }).populate([
                {
                    path: 'response_id',
                    populate: [
                        {
                            path: 'question_id',
                            model: 'question' // Replace 'question' with your actual question model
                        },
                        {
                            path: 'location_id',
                            model: 'location' // Replace 'location' with your actual location model
                        }
                    ]
                }
            ]);
          
            if (notifications.length > 0) {
                // Process and flatten the data before sending the response
                const flattenedData = notifications.map(notification => {
                    const { user_id, question_id, location_id, user_answer } = notification.response_id;

                    // Extract necessary fields
                    const result = {
                        user_id,
                        answer_text: user_answer,
                        question_title: question_id ? question_id.question_title : null,
                        location_name: location_id ? location_id.location_name : null
                    };

                    return result;
                });

                res.json(flattenedData);
            } else {
                res.json({ message: "No data found" });
            }
        }
        else if (role == 'admin') {
            let notifications = await notificationModel.find({
                created_by: id,
                active: 1,
                processed:0
            }).populate([
                {
                    path: 'response_id',
                    populate: [
                        {
                            path: 'question_id',
                            model: 'question'
                        },
                        {
                            path: 'location_id',
                            model: 'location'
                        }
                    ]
                }
                ,
                        {
                            path: 'survey_reader_id',
                            model: 'user' // assuming 'user' is the model name for the user schema
                        }
            ]);
        
            if (notifications.length > 0) {
                // Initialize countByReader
                const countByReader = {};
        
                // Process and create a response with the desired information
                const responseData = notifications.map(notification => {
                    const { response_id, survey_reader_id } = notification;
                    const { processed, user_answer } = response_id;
        
                    if (survey_reader_id ) {
                        const readerId = survey_reader_id.toString();
        
                        // Update counter in countByReader
                        if (countByReader[readerId]) {
                            countByReader[readerId]++;
                        } else {
                            countByReader[readerId] = 1;
                        }
        
                        return {
                            readerName: survey_reader_id.user_name, // replace 'name' with the actual field in your user schema
                            unprocessed: countByReader[readerId],
                            questionTitle: response_id.question_id ? response_id.question_id.question_title : null,
                            answer: user_answer
                        };
                    }
                });
        
                res.json(responseData); // Remove undefined values
            } else {
                res.json({ message: "No data found" });
            }
        }
         else {
            res.json({ message: "Sorry, you are unauthorized" });
        }
    } catch (error) {
        res.json({ message: "Catch error " + error });
    }
});



module.exports = router