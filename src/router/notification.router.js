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
                    const { user_id, question_id, location_id, user_answer,survey_id } = notification.response_id;

                    // Extract necessary fields
                    const result = {
                        notification_id:notification._id,
                        user_id,
                        createdAt:notification.createdAt,
                        survey_title:survey_id.survey_title,
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
                            path: 'question_id',
                            model: 'question'
                        },
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
                    model: 'user' // assuming 'user' is the model name for the user schema
                }
            ]);
        
            if (notifications.length > 0) {
                // Initialize groupedData to store results by question ID and reader
                const groupedData = notifications.reduce((result, notification) => {
                    const { response_id, survey_reader_id } = notification;
                    const { processed, user_answer,survey_id } = response_id;
        
                    if (survey_reader_id) {
                        const readerId = survey_reader_id._id.toString();
                        const questionId = response_id.question_id ? response_id.question_id._id.toString() : null;
        
                        // Initialize entry if not already set
                        result[questionId] = result[questionId] || {};
                        result[questionId][readerId] = result[questionId][readerId] || {
                            readerName: survey_reader_id.user_name, // replace 'name' with the actual field in your user schema
                            unprocessed: 0,
                            questionTitle: questionId ? response_id.question_id.question_title : null,
                            answer: user_answer
                        };
        
                        // Update counter for unprocessed notifications
                        if (!processed) {
                            result[questionId][readerId].unprocessed++;
                        }
                    }
                    return result;
                }, {});
        
                // Process the groupedData and create a flattened response
                const responseData = Object.keys(groupedData).reduce((flattenedResult, questionId) => {
                    const question = groupedData[questionId];
        
                    Object.keys(question).forEach(readerId => {
                        const reader = question[readerId];
        
                        flattenedResult.push({
                           
                            reader_name: reader.readerName,
                            unprocessed: reader.unprocessed,
                           
                        });
                    });
        
                    return flattenedResult;
                }, []);
        
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