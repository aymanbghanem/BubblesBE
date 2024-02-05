const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');
const notificationModel = require("../models/notification.model");
require('dotenv').config()

router.get(`${process.env.BASE_URL}/getNotifications`, auth, async (req, res) => {
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
                        },
                        {
                            path: 'survey_id',
                            model: 'survey'
                        }
                    ]
                }
            ]);
          
            if (notifications.length > 0) {
                // Process and flatten the data before sending the response
                const flattenedData = notifications.map(notification => {
                    const { user_id, question_id, location_id, user_answer,survey_id } = notification.response_id;

                    // Extract necessary fields
                    const result = {
                        notification_id:notification._id,
                        user_id,
                        processed:notification.processed,
                        survey_title:survey_id.survey_title,
                        createdAt:notification.createdAt,
                        location_name: location_id ? location_id.location_name : null
                    };

                    return result;
                });

                res.json({message:flattenedData,type:2});
            } else {
                res.json({ message: "No data found",type:0 });
            }
        }
        else if (role === 'admin') {
         
                // Find notifications based on the specified criteria
                let notifications = await notificationModel.find({
                    created_by: id,
                    active: 1,
                    processed: 0
                }).populate([
                    {
                        path: 'response_id',
                        populate: [
                            {
                                path: 'location_id',
                                model: 'location'
                            },
                            {
                                path: 'survey_id',
                                model: 'survey'
                            }
                        ]
                    },
                    {
                        path: 'survey_reader_id',
                        model: 'user'
                    }
                ]);
        
                if (notifications.length > 0) {
                    // Initialize groupedData to store results by survey reader and user_id
                    const groupedData = notifications.reduce((result, notification) => {
                        const { response_id, survey_reader_id, createdAt, processed, _id } = notification;
                        const { user_answer, survey_id, location_id, user_id } = response_id;
        
                        if (survey_reader_id) {
                            const readerId = survey_reader_id._id.toString();
                            const key = `${readerId}-${user_id}`; // Create a unique key based on reader and user_id
        
                            result[key] = result[key] || {
                                readerName: survey_reader_id.user_name,
                                processed,
                                survey_title: survey_id.survey_title,
                                location_name: location_id.location_name,
                                createdAt: createdAt,
                                user_id: user_id,
                                notification_id: _id
                            };
                        }
                        return result;
                    }, {});
        
                    // Map the groupedData to the desired responseData format
                    const responseData = Object.values(groupedData).map(reader => ({
                        notification_id: reader.notification_id,
                        survey_title: reader.survey_title,
                        reader_name: reader.readerName,
                        processed: reader.processed,
                        createdAt: reader.createdAt,
                        location_name: reader.location_name,
                        user_id: reader.user_id
                    }));
        
                    res.json({ message: responseData, type: 2 });
                } else {
                    res.json({ message: "No data found", type: 0 });
                }
        }

        else {
            res.json({ message: "Sorry, you are unauthorized",type:0});
        }
    } 
    catch (error) {
        res.json({ message: "Catch error " + error });
    }
});

router.put(`${process.env.BASE_URL}/processedNotification`, auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let notification_id = req.headers['notification_id']
        if (role == 'survey-reader' || role == 'admin') {
            let notification = await notificationModel.findOneAndUpdate({ _id: notification_id, processed: 0 }, { processed: 1 })
            if (notification) {
                res.json({ message: "The notification has been successfully processed",type:1 })
            }
            else {
                res.json({ message: "Processing failed: Notification not found or already processed",type:0 })
            }
        }
        else {
            res.json({ message: "Sorry, you are unauthorized",type:0 })
        }
    } catch (error) {
        res.json({ message: "An error occurred while processing the notification: " + error })
    }
})


module.exports = router