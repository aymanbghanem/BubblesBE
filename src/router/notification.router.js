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
                    const { user_id, question_id, location_id, user_answer } = notification.response_id;

                    // Extract necessary fields
                    const result = {
                        notification_id:notification._id,
                        user_id,
                        createdAt:notification.createdAt,
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
                processed: 0
            }).populate([
                {
                    path: 'response_id',
                    populate: [
                        {
                            path: 'location_id',
                            model: 'location'
                        }
                        ,
                        {
                            path: 'survey_id',
                            model: 'survey'
                        }
                    ]
                },
                {
                    path: 'survey_reader_id',
                    model: 'user' // assuming 'user' is the model name for the user schema
                }
            ]);
        
            if (notifications.length > 0) {
                // Initialize groupedData to store results by survey reader
                const groupedData = notifications.reduce((result, notification) => {
                    const { response_id, survey_reader_id,createdAt } = notification;
                    const { processed, user_answer,survey_id,location_id } = response_id;
        
                    if (survey_reader_id) {
                        const readerId = survey_reader_id._id.toString();
        
                        // Initialize entry if not already set
                        result[readerId] = result[readerId] || {
                            readerName: survey_reader_id.user_name, // replace 'name' with the actual field in your user schema
                            unprocessed: 0,
                            survey_title:survey_id.survey_title,
                            location_name:location_id.location_name,
                            createdAt:createdAt
                        };
        
                        // Update counter for unprocessed notifications
                        if (!processed) {
                            result[readerId].unprocessed++;
                        }
                    }
                    return result;
                }, {});
        
                // Process the groupedData and create a flattened response
                const responseData = Object.keys(groupedData).map(readerId => {
                    const reader = groupedData[readerId];
        
                    return {
                        survey_title:reader.survey_title,
                        reader_name: reader.readerName,
                        unprocessed: reader.unprocessed,
                        createdAt:reader.createdAt,
                        location_name: reader.location_name
                    };
                });
        
                res.json(responseData);
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

router.put('/api/v1/processedNotification', auth, async (req, res) => {
    try {
        let role = req.user.user_role
        let notification_id = req.headers['notification_id']
        if (role == 'survey-reader') {
            let notification = await notificationModel.findOneAndUpdate({ _id: notification_id, processed: 0 }, { processed: 1 })
            if (notification) {
                res.json({ message: "The notification has been successfully processed" })
            }
            else {
                res.json({ message: "Processing failed: Notification not found or already processed" })
            }
        }
        else {
            res.json({ message: "Sorry, you are unauthorized" })
        }
    } catch (error) {
        res.json({ message: "An error occurred while processing the notification: " + error })
    }
})


module.exports = router